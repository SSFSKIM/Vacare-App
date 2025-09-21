#  backend/app/apis/career_recommendation/__init__.py
# Enhanced version with multi-category matching

from contextlib import contextmanager
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from scipy.stats import pearsonr
import logging
import json

try:
    import databutton as db  # type: ignore
except ImportError:  # pragma: no cover - handled gracefully in tests
    db = None

router = APIRouter(prefix="/career-recommendation")

# Configure logging
logger = logging.getLogger(__name__)

# ============= Configuration =============
MIN_OVERLAP_THRESHOLD = {
    'interests': 3,  # At least 3 RIASEC dimensions
    'abilities': 5,  # At least 5 abilities
    'knowledge': 4,  # At least 4 knowledge areas
    'skills': 4      # At least 4 skills
}

# Dimension-level aggregation weights
DEFAULT_DIMENSION_WEIGHTS = {
    'interests': 0.35,
    'abilities': 0.25,
    'knowledge': 0.20,
    'skills': 0.20
}
DIMENSION_WEIGHTS = DEFAULT_DIMENSION_WEIGHTS.copy()

# Threshold configuration for critical requirements
DEFAULT_IMPORTANCE_CRITICAL_THRESHOLD = 80.0
DEFAULT_MIN_REQUIREMENT_RATIO = 0.75
OVERQUALIFICATION_DAMPING = 0.3
DEFAULT_COMBINATION_WEIGHTS = {
    'fit': 0.4,
    'cosine': 0.3,
    'mahalanobis': 0.3,
}
IMPORTANCE_CRITICAL_THRESHOLD = DEFAULT_IMPORTANCE_CRITICAL_THRESHOLD
MIN_REQUIREMENT_RATIO = DEFAULT_MIN_REQUIREMENT_RATIO
COMBINATION_WEIGHTS = DEFAULT_COMBINATION_WEIGHTS.copy()
DEFAULT_SCORE_CALIBRATION = {
    'A': 0.0,
    'B': 0.0,
    'enabled': False
}
SCORE_CALIBRATION = DEFAULT_SCORE_CALIBRATION.copy()

BASE_CRITICAL_REQUIREMENTS = [
    {
        "element": "Near Vision",
        "threshold_ratio": 0.8,
        "keywords": ["surgeon", "dentist", "jeweler"]
    },
    {
        "element": "Physical Strength",
        "threshold_ratio": 0.82,
        "keywords": ["firefighter", "construction", "responder"]
    },
    {
        "element": "Mathematical Reasoning",
        "threshold_ratio": 0.88,
        "keywords": ["actuary", "statistician", "data scientist"]
    }
]

MAHALANOBIS_REGULARIZATION = 1e-3
RIASEC_ORDER = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
IACHAN_WEIGHTS = [3, 2, 1]
IACHAN_WEIGHTED_TOTAL = sum(IACHAN_WEIGHTS)
HEXAGON_CONGRUENCE_BLEND = 0.6  # weight for Iachan vs continuous distance

# Cache for Mahalanobis inverse covariance matrices per dataset and element subset
COVARIANCE_CACHE: Dict[str, Dict[Tuple[str, ...], Optional[np.ndarray]]] = {}


@contextmanager
def temporary_weight_overrides(
    dimension_weights: Optional[Dict[str, float]] = None,
    combination_weights: Optional[Dict[str, float]] = None
):
    original_dim = DIMENSION_WEIGHTS.copy()
    original_comb = COMBINATION_WEIGHTS.copy()

    try:
        if dimension_weights:
            DIMENSION_WEIGHTS.clear()
            DIMENSION_WEIGHTS.update(dimension_weights)
        if combination_weights:
            COMBINATION_WEIGHTS.clear()
            COMBINATION_WEIGHTS.update(combination_weights)
        yield
    finally:
        DIMENSION_WEIGHTS.clear()
        DIMENSION_WEIGHTS.update(original_dim)
        COMBINATION_WEIGHTS.clear()
        COMBINATION_WEIGHTS.update(original_comb)


@contextmanager
def temporary_threshold_overrides(
    importance_threshold: Optional[float] = None,
    min_requirement_ratio: Optional[float] = None
):
    global IMPORTANCE_CRITICAL_THRESHOLD, MIN_REQUIREMENT_RATIO, CRITICAL_REQUIREMENTS

    original_importance = IMPORTANCE_CRITICAL_THRESHOLD
    original_ratio = MIN_REQUIREMENT_RATIO
    original_rules = CRITICAL_REQUIREMENTS

    try:
        if importance_threshold is not None:
            IMPORTANCE_CRITICAL_THRESHOLD = float(importance_threshold)
        if min_requirement_ratio is not None:
            MIN_REQUIREMENT_RATIO = float(min_requirement_ratio)

        if importance_threshold is not None or min_requirement_ratio is not None:
            CRITICAL_REQUIREMENTS = _calibrate_critical_requirements(
                BASE_CRITICAL_REQUIREMENTS,
                importance_threshold=IMPORTANCE_CRITICAL_THRESHOLD,
                level_ratio=MIN_REQUIREMENT_RATIO
            )
        yield
    finally:
        IMPORTANCE_CRITICAL_THRESHOLD = original_importance
        MIN_REQUIREMENT_RATIO = original_ratio
        CRITICAL_REQUIREMENTS = original_rules


def _calibrate_thresholds(
    importance_percentile: float = 75.0,
    level_percentile: float = 65.0,
) -> Tuple[float, float]:
    """Estimate thresholds from O*NET data when available.

    Args:
        importance_percentile: Percentile to define "critical" Importance.
        level_percentile: Percentile of Level used to derive min requirement ratio.
    """
    if db is None:
        return DEFAULT_IMPORTANCE_CRITICAL_THRESHOLD, DEFAULT_MIN_REQUIREMENT_RATIO

    datasets = [
        "elements-abilities-csv",
        "elements-knowledge-2-csv",
        "elements-skills-csv"
    ]

    importance_values: List[float] = []
    level_values: List[float] = []

    try:
        for dataset in datasets:
            df = db.storage.dataframes.get(dataset)
            if df is None:
                continue

            importance_values.extend(
                df[df["Scale Name"] == "Importance"]["Data Value"].dropna().tolist()
            )
            level_values.extend(
                df[df["Scale Name"] == "Level"]["Data Value"].dropna().tolist()
            )

        if importance_values:
            importance_threshold = float(np.percentile(importance_values, importance_percentile))
        else:
            importance_threshold = DEFAULT_IMPORTANCE_CRITICAL_THRESHOLD

        if level_values:
            estimated_ratio = float(np.percentile(level_values, level_percentile) / 100.0)
            min_requirement_ratio = float(max(0.65, min(0.9, estimated_ratio)))
        else:
            min_requirement_ratio = DEFAULT_MIN_REQUIREMENT_RATIO

        if importance_values or level_values:
            logger.info(
                "Calibrated thresholds - importance: %.2f, min_ratio: %.2f",
                importance_threshold,
                min_requirement_ratio
            )
        return importance_threshold, min_requirement_ratio
    except Exception as exc:  # pragma: no cover - data access dependent
        logger.warning(
            "Falling back to default thresholds; calibration failed: %s",
            exc
        )
        return DEFAULT_IMPORTANCE_CRITICAL_THRESHOLD, DEFAULT_MIN_REQUIREMENT_RATIO


def _calibrate_critical_requirements(
    base_rules: List[Dict[str, Any]],
    top_k: int = 20,
    importance_threshold: Optional[float] = None,
    level_ratio: Optional[float] = None
) -> List[Dict[str, Any]]:
    """Augment critical requirement rules with occupation lists when possible."""
    if db is None:
        return base_rules

    try:
        abilities_df = db.storage.dataframes.get("elements-abilities-csv")
        if abilities_df is None:
            return base_rules

        level_df = abilities_df[abilities_df["Scale Name"] == "Level"]
        importance_df = abilities_df[abilities_df["Scale Name"] == "Importance"]
        imp_threshold = importance_threshold if importance_threshold is not None else IMPORTANCE_CRITICAL_THRESHOLD
        lvl_threshold = level_ratio if level_ratio is not None else MIN_REQUIREMENT_RATIO
        calibrated_rules: List[Dict[str, Any]] = []

        for rule in base_rules:
            element_mask = level_df["Element Name"] == rule["element"]
            level_subset = level_df[element_mask]

            importance_subset = importance_df[importance_df["Element Name"] == rule["element"]]
            merged = level_subset.merge(
                importance_subset,
                on="Title",
                suffixes=('_level', '_importance')
            )

            if not merged.empty:
                merged = merged[
                    (merged['Data Value_importance'] >= imp_threshold)
                    & (merged['Data Value_level'] >= lvl_threshold * 100.0)
                ]

            merged = merged.sort_values(by='Data Value_level', ascending=False).head(top_k)

            occupations = [
                str(title).lower()
                for title in merged['Title'].tolist()
                if isinstance(title, str)
            ]

            calibrated_rule = dict(rule)
            if occupations:
                calibrated_rule["occupations"] = occupations
                calibrated_rule["source"] = "soc-derived"
            calibrated_rules.append(calibrated_rule)

        return calibrated_rules
    except Exception as exc:  # pragma: no cover - data access dependent
        logger.warning(
            "Unable to calibrate critical requirements: %s",
            exc
        )
        return base_rules


IMPORTANCE_CRITICAL_THRESHOLD, MIN_REQUIREMENT_RATIO = _calibrate_thresholds()
CRITICAL_REQUIREMENTS = _calibrate_critical_requirements(
    BASE_CRITICAL_REQUIREMENTS,
    importance_threshold=IMPORTANCE_CRITICAL_THRESHOLD,
    level_ratio=MIN_REQUIREMENT_RATIO
)


def _run_calibration(
    importance_percentile: float = 75.0,
    level_percentile: float = 65.0,
    top_k: int = 20,
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """Run calibration and return thresholds and calibrated rules."""
    imp_thr, min_ratio = _calibrate_thresholds(
        importance_percentile=importance_percentile,
        level_percentile=level_percentile,
    )
    rules = _calibrate_critical_requirements(
        BASE_CRITICAL_REQUIREMENTS,
        top_k=top_k,
        importance_threshold=imp_thr,
        level_ratio=min_ratio
    )
    return imp_thr, min_ratio, rules

# ============= Request/Response Models =============
class InterestScore(BaseModel):
    name: str
    rating: float

class AbilityScore(BaseModel):
    name: str
    rating: float

class KnowledgeScore(BaseModel):
    name: str
    rating: float

class SkillScore(BaseModel):
    name: str
    rating: float

class UserScores(BaseModel):
    abilities: Optional[List[AbilityScore]] = None
    skills: Optional[List[SkillScore]] = None
    knowledge: Optional[List[KnowledgeScore]] = None
    interests: Optional[List[InterestScore]] = None

class CategoryContribution(BaseModel):
    category: str
    score: float
    weight: float
    overlap_count: int
    elements_matched: List[str] = []  # Which specific elements matched

class OccupationMatch(BaseModel):
    title: str
    correlation: float
    description: Optional[str] = None
    contributions: Optional[List[CategoryContribution]] = None
    raw_score: Optional[float] = None
    calibrated: Optional[bool] = None

class RecommendationResponse(BaseModel):
    matches: List[OccupationMatch]
    category: str  # Will be "combined" for multi-category
    methodology: str = "Multi-category weighted aggregation"
    total_occupations_analyzed: int = 0
    categories_used: List[str] = []

# ============= Helper Functions =============

def get_non_empty_categories(user_scores: UserScores) -> Dict[str, List]:
    """
    Get all categories that have user data
    Returns dict of {category_name: data_list}
    """
    categories = {}
    
    if user_scores.interests and len(user_scores.interests) > 0:
        categories['interests'] = user_scores.interests
    if user_scores.abilities and len(user_scores.abilities) > 0:
        categories['abilities'] = user_scores.abilities
    if user_scores.knowledge and len(user_scores.knowledge) > 0:
        categories['knowledge'] = user_scores.knowledge
    if user_scores.skills and len(user_scores.skills) > 0:
        categories['skills'] = user_scores.skills
    
    return categories


def build_category_matches(user_scores: UserScores) -> Dict[str, Dict[str, Dict[str, Any]]]:
    categories = get_non_empty_categories(user_scores)
    category_matches: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for category_name, category_scores in categories.items():
        if category_name == 'interests':
            matches = calculate_interest_matches(category_scores)
        elif category_name == 'abilities':
            matches = calculate_importance_weighted_matches(
                category_scores,
                "elements-abilities-csv",
                'abilities'
            )
        elif category_name == 'knowledge':
            matches = calculate_importance_weighted_matches(
                category_scores,
                "elements-knowledge-2-csv",
                'knowledge'
            )
        elif category_name == 'skills':
            matches = calculate_importance_weighted_matches(
                category_scores,
                "elements-skills-csv",
                'skills'
            )
        else:
            matches = {}

        if matches:
            category_matches[category_name] = matches

    return category_matches


def load_element_matrices(
    dataframe_name: str,
    level_scale: str = "Level",
    importance_scale: str = "Importance"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load Level and Importance pivots for an O*NET data table."""
    if db is None:
        raise RuntimeError("Databutton storage is not available in this environment")

    df = db.storage.dataframes.get(dataframe_name)

    level_df = df[df["Scale Name"] == level_scale]
    importance_df = df[df["Scale Name"] == importance_scale]

    level_pivot = pd.pivot_table(
        level_df,
        values="Data Value",
        index="Title",
        columns="Element Name",
        aggfunc="mean"
    )

    importance_pivot = pd.pivot_table(
        importance_df,
        values="Data Value",
        index="Title",
        columns="Element Name",
        aggfunc="mean"
    )

    # Align indices and columns across matrices
    common_titles = level_pivot.index.intersection(importance_pivot.index)
    level_pivot = level_pivot.loc[common_titles]
    importance_pivot = importance_pivot.loc[common_titles]

    common_elements = level_pivot.columns.intersection(importance_pivot.columns)
    level_pivot = level_pivot[common_elements]
    importance_pivot = importance_pivot[common_elements]

    level_pivot = rescale_level_matrix(level_pivot)
    importance_pivot = importance_pivot.fillna(0.0)

    return level_pivot, importance_pivot


def rescale_level_matrix(matrix: pd.DataFrame) -> pd.DataFrame:
    """Rescale level values to 0-100 if the original scale is small."""
    if matrix.empty:
        return matrix

    rescaled = matrix.copy()
    max_value = rescaled.max().max()

    if pd.isna(max_value) or max_value == 0:
        return rescaled

    if max_value <= 10:
        rescaled = (rescaled / max_value) * 100.0

    return rescaled


def occupation_matches_keywords(occupation: str, keywords: List[str]) -> bool:
    """Check if any keyword is present in the occupation title."""
    lowered = occupation.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def apply_threshold_requirements(
    occupation: str,
    element_type: str,
    user_values: pd.Series,
    required_levels: pd.Series,
    importance_weights: pd.Series
) -> bool:
    """Filter out occupations that fail critical or high-importance thresholds."""
    for element in required_levels.index:
        importance = float(importance_weights.get(element, 0.0))
        if importance >= IMPORTANCE_CRITICAL_THRESHOLD:
            required = float(required_levels[element])
            user_level = float(user_values.get(element, 0.0))
            minimum = required * MIN_REQUIREMENT_RATIO
            if user_level < minimum:
                return False

    if element_type == 'abilities':
        occupation_lower = occupation.lower()
        for rule in CRITICAL_REQUIREMENTS:
            element = rule.get("element")
            if element not in required_levels.index:
                continue

            occupations = rule.get("occupations") or []
            keywords = rule.get("keywords") or []

            is_target_occupation = False
            if occupations:
                is_target_occupation = occupation_lower in occupations
            if not is_target_occupation and keywords:
                is_target_occupation = occupation_matches_keywords(occupation, keywords)

            if not is_target_occupation:
                continue

            required = float(required_levels[element])
            user_level = float(user_values.get(element, 0.0))
            minimum = required * rule.get("threshold_ratio", MIN_REQUIREMENT_RATIO)
            if user_level < minimum:
                return False

    return True


def calculate_weighted_fit(
    user_values: pd.Series,
    required_levels: pd.Series,
    importance_weights: pd.Series
) -> Tuple[float, float]:
    """Compute importance-weighted fit with diminishing returns."""
    weighted_score = 0.0
    total_weight = 0.0

    for element in required_levels.index:
        importance = float(importance_weights.get(element, 0.0))
        if importance <= 0:
            continue

        required_level = float(required_levels[element])
        user_level = float(user_values.get(element, 0.0))

        if required_level <= 0:
            fit = 1.0
        elif user_level < required_level:
            ratio = user_level / required_level if required_level > 0 else 0.0
            fit = ratio ** 2
        else:
            overage = (user_level - required_level) / 100.0
            fit = 1.0 - (1.0 - required_level / 100.0) * overage * OVERQUALIFICATION_DAMPING

        fit = max(0.0, min(fit, 1.0))

        weighted_score += fit * importance
        total_weight += importance

    if total_weight == 0:
        return 0.0, 0.0

    return weighted_score / total_weight, total_weight


def importance_weighted_cosine(
    user_values: pd.Series,
    required_levels: pd.Series,
    importance_weights: pd.Series
) -> float:
    """Calculate cosine similarity with importance weighting."""
    importance = importance_weights / 100.0
    weighted_user = (user_values * importance).to_numpy()
    weighted_required = (required_levels * importance).to_numpy()

    numerator = float(np.dot(weighted_user, weighted_required))
    denominator = float(np.linalg.norm(weighted_user) * np.linalg.norm(weighted_required))

    if denominator == 0:
        return 0.0

    cosine = numerator / denominator
    cosine = max(-1.0, min(cosine, 1.0))
    return (cosine + 1.0) / 2.0


def calculate_importance_weighted_matches(
    user_elements: List[Any],
    dataframe_name: str,
    element_type: str
) -> Dict[str, Dict[str, Any]]:
    """Calculate matches using importance-weighted fit and cosine similarity."""
    matches: Dict[str, Dict[str, Any]] = {}

    if not user_elements:
        return matches

    level_matrix, importance_matrix = load_element_matrices(dataframe_name)

    user_dict = {item.name: float(item.rating) for item in user_elements}
    user_profile = pd.Series(user_dict)

    common_elements = sorted(
        set(user_profile.index)
        & set(level_matrix.columns)
        & set(importance_matrix.columns)
    )

    if not common_elements:
        return matches

    min_overlap = MIN_OVERLAP_THRESHOLD.get(element_type, 3)

    dataset_cache = COVARIANCE_CACHE.setdefault(dataframe_name, {})

    for occupation in level_matrix.index:
        required_levels = level_matrix.loc[occupation, common_elements]
        importance_weights = importance_matrix.loc[occupation, common_elements]

        mask = ~(required_levels.isna() | importance_weights.isna())
        filtered_elements = [elem for elem, keep in zip(common_elements, mask) if keep]

        if len(filtered_elements) < min_overlap:
            continue

        required_series = required_levels[mask].astype(float)
        importance_series = importance_weights[mask].astype(float)
        user_series = user_profile[filtered_elements].astype(float).fillna(0.0)

        if not apply_threshold_requirements(
            occupation,
            element_type,
            user_series,
            required_series,
            importance_series
        ):
            continue

        fit_score, total_weight = calculate_weighted_fit(
            user_series,
            required_series,
            importance_series
        )

        if total_weight == 0:
            continue

        cosine_score = importance_weighted_cosine(
            user_series,
            required_series,
            importance_series
        )

        inv_cov = dataset_cache.get(tuple(filtered_elements))
        mahalanobis_score: Optional[float] = None
        if inv_cov is None:
            try:
                subset_matrix = level_matrix.loc[:, filtered_elements].dropna()
                if subset_matrix.shape[0] >= len(filtered_elements) and subset_matrix.shape[1] > 0:
                    cov = np.cov(subset_matrix.to_numpy(dtype=float), rowvar=False)
                    if cov.ndim == 0:
                        cov = np.array([[float(cov)]])
                    cov = cov + (MAHALANOBIS_REGULARIZATION * np.eye(cov.shape[0]))
                    inv_cov = np.linalg.inv(cov)
                else:
                    inv_cov = None
            except Exception as exc:  # pragma: no cover - numeric robustness
                logger.debug("Mahalanobis cache build failed for %s (%s)", filtered_elements, exc)
                inv_cov = None
            dataset_cache[tuple(filtered_elements)] = inv_cov

        if inv_cov is not None:
            try:
                diff = user_series.to_numpy(dtype=float) - required_series.to_numpy(dtype=float)
                m_dist_sq = float(np.dot(np.dot(diff, inv_cov), diff.T))
                if m_dist_sq < 0:
                    m_dist_sq = 0.0
                denom = max(len(filtered_elements), 1)
                mahalanobis_score = float(np.exp(-0.5 * m_dist_sq / denom))
            except Exception as exc:  # pragma: no cover - numeric robustness
                logger.debug("Mahalanobis similarity failed for %s (%s)", occupation, exc)
                mahalanobis_score = None

        weights = COMBINATION_WEIGHTS
        fit_weight = max(float(weights.get('fit', 0.0)), 0.0)
        cosine_weight = max(float(weights.get('cosine', 0.0)), 0.0)
        mahal_weight = max(float(weights.get('mahalanobis', 0.0)), 0.0) if mahalanobis_score is not None else 0.0

        total_weight = fit_weight + (cosine_weight if cosine_score is not None else 0.0) + mahal_weight
        if total_weight <= 0:
            combined_score = fit_score
        else:
            combined_score = (
                (fit_weight * fit_score)
                + (cosine_weight * cosine_score if cosine_score is not None else 0.0)
                + (mahal_weight * mahalanobis_score if mahalanobis_score is not None else 0.0)
            ) / total_weight

        matches[occupation] = {
            "score": combined_score,
            "overlap": len(filtered_elements),
            "elements": filtered_elements,
            "total_weight": total_weight,
            "fit_score": fit_score,
            "cosine_score": cosine_score,
            "mahalanobis_score": mahalanobis_score
        }

    return matches


def calculate_interest_matches(
    user_interests: List[InterestScore]
) -> Dict[str, Dict[str, Any]]:
    """Wrap interest correlations into unified match structure."""
    scores, overlaps, matched_elements = calculate_interest_congruence_all(user_interests)

    matches: Dict[str, Dict[str, Any]] = {}
    for occupation, score in scores.items():
        matches[occupation] = {
            "score": score,
            "overlap": overlaps.get(occupation, 0),
            "elements": matched_elements.get(occupation, []),
            "total_weight": overlaps.get(occupation, 0)
        }

    return matches

def calculate_element_correlations_all(
    user_elements: List[Any],
    dataframe_name: str,
    element_type: str,
    scale: str = "Level",
    normalization_method: str = 'minmax'
) -> Tuple[Dict[str, float], Dict[str, int], Dict[str, List[str]]]:
    """
    Calculate correlations for all occupations in a category
    
    Args:
        user_elements: List of user scores (SkillScore, AbilityScore, etc.)
        dataframe_name: Name of the O*NET dataset to load
        element_type: Type of element ('skills', 'abilities', 'knowledge')
        scale: Scale to filter on (default 'Level')
        normalization_method: 'minmax' or 'zscore' for scale normalization
    
    Returns:
        - scores: {occupation: correlation_score}
        - overlaps: {occupation: overlap_count}
        - matched_elements: {occupation: [list of matched element names]}
    """
    scores = {}
    overlaps = {}
    matched_elements = {}
    
    if db is None:
        logger.error("Databutton storage unavailable for element correlations")
        return scores, overlaps, matched_elements

    try:
        # Load O*NET data
        df = db.storage.dataframes.get(dataframe_name)
        
        # Filter to the specified scale (Level for most, Importance as option)
        df_filtered = df[df["Scale Name"] == scale]
        
        # Create pivot table: occupations × elements
        pivot = pd.pivot_table(
            df_filtered,
            values="Data Value",
            index="Title",
            columns="Element Name",
            aggfunc="mean"
        )
        
        # Create user profile
        user_dict = {item.name: item.rating for item in user_elements}
        user_profile = pd.Series(user_dict)
        
        # Check minimum overlap threshold BEFORE normalization
        common_elements = list(
            set(user_profile.index) & set(pivot.columns)
        )
        
        if len(common_elements) < MIN_OVERLAP_THRESHOLD.get(element_type, 3):
            print(f"Warning: Too few common {element_type} elements ({len(common_elements)} < {MIN_OVERLAP_THRESHOLD.get(element_type, 3)})")
            return scores, overlaps, matched_elements
        
        # Apply normalization to get common elements and normalized values
        normalized_pivot, normalized_user = normalize_vectors(
            pivot, user_profile, method=normalization_method
        )
        
        if normalized_pivot.empty or normalized_user.empty:
            print(f"Warning: No common elements found for {element_type} normalization")
            return scores, overlaps, matched_elements
            
        common_elements = list(normalized_user.index)
        print(f"Processing {element_type}: {len(common_elements)} normalized elements")
        
        # Process each occupation - now we know all have enough overlap
        for occupation in normalized_pivot.index:
            # Get normalized profiles
            occupation_profile = normalized_pivot.loc[occupation]
            
            # Calculate Pearson correlation on normalized data
            if normalized_user.std() > 0 and occupation_profile.std() > 0:
                r, _ = pearsonr(normalized_user, occupation_profile)
                # Convert to 0-1 range
                score = (r + 1) / 2
                
                scores[occupation] = score
                overlaps[occupation] = len(common_elements)
                matched_elements[occupation] = common_elements
            
    except Exception as e:
        print(f"Error calculating {element_type} correlations: {str(e)}")
        
    return scores, overlaps, matched_elements

def _hexagon_distance(code_a: str, code_b: str) -> int:
    try:
        idx_a = RIASEC_ORDER.index(code_a)
        idx_b = RIASEC_ORDER.index(code_b)
    except ValueError:
        return 3
    diff = abs(idx_a - idx_b)
    return min(diff, 6 - diff)


def _vectorize_riasec(profile: Dict[str, float]) -> np.ndarray:
    angles = np.linspace(0, 2 * np.pi, num=6, endpoint=False)
    weights = np.array([profile.get(cat, 0.0) for cat in RIASEC_ORDER], dtype=float)
    total = weights.sum()
    if total > 0:
        weights = weights / total
    x = float(np.dot(weights, np.cos(angles)))
    y = float(np.dot(weights, np.sin(angles)))
    magnitude = float(np.linalg.norm([x, y]))
    return np.array([x, y, magnitude], dtype=float)


def calculate_holland_congruence(
    user_profile: Dict[str, float],
    occupation_profile: Dict[str, float]
) -> float:
    user_sorted = sorted(user_profile.items(), key=lambda kv: kv[1], reverse=True)
    occ_sorted = sorted(occupation_profile.items(), key=lambda kv: kv[1], reverse=True)

    top_user = [item[0] for item in user_sorted[:3]]
    top_occ = [item[0] for item in occ_sorted[:3]]

    if len(top_user) < 3 or len(top_occ) < 3:
        return 0.0

    discrete_score = 0.0
    for idx, weight in enumerate(IACHAN_WEIGHTS):
        dist = _hexagon_distance(top_user[idx], top_occ[idx])
        discrete_score += max(0.0, weight - dist)

    discrete_component = discrete_score / IACHAN_WEIGHTED_TOTAL

    user_vec = _vectorize_riasec(user_profile)
    occ_vec = _vectorize_riasec(occupation_profile)

    # Angular similarity from 2D components
    user_angle = np.arctan2(user_vec[1], user_vec[0])
    occ_angle = np.arctan2(occ_vec[1], occ_vec[0])
    angle_diff = np.abs(user_angle - occ_angle)
    angle_diff = np.minimum(angle_diff, 2 * np.pi - angle_diff)
    continuous_component = 0.5 * (1 + np.cos(angle_diff))

    # Balance with vector magnitude similarity to reward focus overlap
    magnitude_diff = abs(user_vec[2] - occ_vec[2])
    magnitude_component = max(0.0, 1.0 - magnitude_diff)

    continuous_score = (continuous_component * 0.7) + (magnitude_component * 0.3)

    return float(
        HEXAGON_CONGRUENCE_BLEND * discrete_component
        + (1 - HEXAGON_CONGRUENCE_BLEND) * continuous_score
    )


def calculate_interest_congruence_all(
    user_interests: List[InterestScore]
) -> Tuple[Dict[str, float], Dict[str, int], Dict[str, List[str]]]:
    """Calculate Holland congruence-based interest similarity for occupations."""
    scores: Dict[str, float] = {}
    overlaps: Dict[str, int] = {}
    matched_elements: Dict[str, List[str]] = {}

    if db is None:
        logger.error("Databutton storage unavailable for interest congruence")
        return scores, overlaps, matched_elements

    try:
        interests_df = db.storage.dataframes.get("elements-interests-csv")

        occupation_interests: Dict[str, Dict[str, float]] = {}
        for _, row in interests_df.iterrows():
            occupation = row['Title']
            interest_type = row['Element Name']
            value = float(row['Data Value'])
            occupation_interests.setdefault(occupation, {})[interest_type] = value

        user_dict = {item.name: float(item.rating) for item in user_interests}
        total = sum(user_dict.values())
        if total > 0:
            user_dict = {k: v / total for k, v in user_dict.items()}

        for occupation, occ_interests in occupation_interests.items():
            matched_cats = [cat for cat in RIASEC_ORDER if cat in user_dict and cat in occ_interests]
            if len(matched_cats) < MIN_OVERLAP_THRESHOLD.get('interests', 3):
                continue

            score = calculate_holland_congruence(user_dict, occ_interests)
            scores[occupation] = score
            overlaps[occupation] = len(matched_cats)

            top_occ = sorted(occ_interests.items(), key=lambda kv: kv[1], reverse=True)
            matched_elements[occupation] = [cat for cat, _ in top_occ[:3]]

    except Exception as e:
        logger.error(f"Error calculating interest congruence: {str(e)}")

    return scores, overlaps, matched_elements

def aggregate_multi_category_scores(
    category_matches: Dict[str, Dict[str, Dict[str, Any]]]
) -> Dict[str, Tuple[float, List[CategoryContribution]]]:
    """Aggregate matches across categories using dimension weights."""
    aggregated: Dict[str, Tuple[float, List[CategoryContribution]]] = {}

    all_occupations = set()
    for matches in category_matches.values():
        all_occupations.update(matches.keys())

    for occupation in all_occupations:
        contributions: List[CategoryContribution] = []
        weighted_sum = 0.0
        weight_sum = 0.0

        for category, matches in category_matches.items():
            if occupation not in matches:
                continue

            match = matches[occupation]
            dimension_weight = DIMENSION_WEIGHTS.get(category, 0.0)
            if dimension_weight <= 0:
                continue

            weighted_sum += match["score"] * dimension_weight
            weight_sum += dimension_weight

            contributions.append(CategoryContribution(
                category=category,
                score=round(match["score"], 3),
                weight=round(dimension_weight, 2),
                overlap_count=match.get("overlap", 0),
                elements_matched=match.get("elements", [])[:5]
            ))

        if weight_sum > 0:
            final_score = weighted_sum / weight_sum
            aggregated[occupation] = (final_score, contributions)

    return aggregated


def compute_aggregated_scores(user_scores: UserScores) -> Dict[str, Tuple[float, List[CategoryContribution]]]:
    category_matches = build_category_matches(user_scores)
    if not category_matches:
        return {}
    return aggregate_multi_category_scores(category_matches)


def normalize_vectors(
    occupation_df: pd.DataFrame, 
    user_series: pd.Series, 
    method: str = 'minmax'
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Normalize both occupation data and user vector to comparable scales.
    
    Args:
        occupation_df: DataFrame with occupations as rows, elements as columns
        user_series: Series with user ratings for elements
        method: 'minmax' for 0-1 scaling or 'zscore' for z-score normalization
    
    Returns:
        Tuple of (normalized_occupation_df, normalized_user_series)
        Both will only include common elements/features.
    """
    # Find common elements between user and occupation data
    common_elements = list(
        set(user_series.index) & set(occupation_df.columns)
    )
    
    if len(common_elements) == 0:
        logger.warning("No common elements found for normalization")
        return pd.DataFrame(), pd.Series()
    
    # Subset to common elements only
    occ_subset = occupation_df[common_elements].copy()
    user_subset = user_series[common_elements].copy()
    
    if method == 'minmax':
        # Min-max normalization: (x - min) / (max - min)
        for element in common_elements:
            col_min = occ_subset[element].min()
            col_max = occ_subset[element].max()
            
            # Add epsilon to prevent division by zero
            range_val = col_max - col_min
            if range_val < 1e-8:  # Nearly constant column
                logger.debug(f"Element '{element}' has near-zero variance, setting to 0.5")
                occ_subset[element] = 0.5
                user_subset[element] = 0.5
            else:
                # Normalize occupation data
                occ_subset[element] = (occ_subset[element] - col_min) / range_val
                # Normalize user data using same min/max
                user_subset[element] = (user_subset[element] - col_min) / range_val
                # Clip user values to [0,1] in case they fall outside occupation range
                user_subset[element] = np.clip(user_subset[element], 0, 1)
    
    elif method == 'zscore':
        # Z-score normalization: (x - mean) / std
        for element in common_elements:
            col_mean = occ_subset[element].mean()
            col_std = occ_subset[element].std()
            
            # Add epsilon to prevent division by zero
            if col_std < 1e-8:  # Nearly constant column
                logger.debug(f"Element '{element}' has near-zero std, setting to 0")
                occ_subset[element] = 0.0
                user_subset[element] = 0.0
            else:
                # Normalize occupation data
                occ_subset[element] = (occ_subset[element] - col_mean) / col_std
                # Normalize user data using same mean/std
                user_subset[element] = (user_subset[element] - col_mean) / col_std
    
    else:
        raise ValueError(f"Unsupported normalization method: {method}")
    
    logger.debug(f"Normalized {len(common_elements)} elements using {method} method")
    return occ_subset, user_subset


# ============= Parameter Optimization Utilities =============

def _get_first_available(row: pd.Series, candidates: List[str]) -> Any:
    for column in candidates:
        if column in row and row[column] is not None:
            value = row[column]
            if isinstance(value, float) and np.isnan(value):
                continue
            return value
    return None


def _parse_score_items(raw_value: Any, model_cls) -> List[Any]:
    if raw_value is None:
        return []

    if isinstance(raw_value, str):
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError:
            return []
    elif isinstance(raw_value, list):
        parsed = raw_value
    elif isinstance(raw_value, dict):
        parsed = [raw_value]
    else:
        return []

    results = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        name = item.get('name') or item.get('category')
        rating = item.get('rating', item.get('score'))
        if name is None or rating is None:
            continue
        try:
            results.append(model_cls(name=name, rating=float(rating)))
        except Exception:
            continue
    return results


def _build_user_scores_from_row(row: pd.Series) -> UserScores:
    interests = _parse_score_items(
        _get_first_available(row, ['user_interests', 'interests']),
        InterestScore
    )
    abilities = _parse_score_items(
        _get_first_available(row, ['user_abilities', 'abilities']),
        AbilityScore
    )
    knowledge = _parse_score_items(
        _get_first_available(row, ['user_knowledge', 'knowledge']),
        KnowledgeScore
    )
    skills = _parse_score_items(
        _get_first_available(row, ['user_skills', 'skills']),
        SkillScore
    )

    return UserScores(
        interests=interests or None,
        abilities=abilities or None,
        knowledge=knowledge or None,
        skills=skills or None
    )


def _load_validation_dataframe(dataset_name: str) -> Optional[pd.DataFrame]:
    if db is None:
        logger.error("Databutton storage unavailable for weight optimization")
        return None
    try:
        df = db.storage.dataframes.get(dataset_name)
        if df is None or len(df) == 0:
            logger.warning("Validation dataset '%s' is empty or missing", dataset_name)
            return None
        return df
    except Exception as exc:  # pragma: no cover - external dependency
        logger.error("Failed to load validation dataset '%s': %s", dataset_name, exc)
        return None


def _normalize_weights(weight_dict: Dict[str, float], expected_keys: List[str]) -> Dict[str, float]:
    normalized: Dict[str, float] = {key: max(float(weight_dict.get(key, 0.0)), 0.0) for key in expected_keys}
    total = sum(normalized.values())
    if total <= 0:
        total = 1.0
        normalized = {key: 1.0 / len(expected_keys) for key in expected_keys}
    else:
        normalized = {key: value / total for key, value in normalized.items()}
    return normalized


def compute_auc(labels: List[int], scores: List[float]) -> Optional[float]:
    if not labels or not scores or len(labels) != len(scores):
        return None
    labels_array = np.array(labels, dtype=int)
    scores_array = np.array(scores, dtype=float)

    n_pos = int(labels_array.sum())
    n_neg = len(labels_array) - n_pos
    if n_pos == 0 or n_neg == 0:
        return None

    order = np.argsort(scores_array)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(len(scores_array)) + 1  # 1-based ranks
    sum_ranks_pos = ranks[labels_array == 1].sum()
    auc = (sum_ranks_pos - (n_pos * (n_pos + 1) / 2.0)) / (n_pos * n_neg)
    return float(auc)


def generate_predictions_for_dataset(
    df: pd.DataFrame,
    label_columns: List[str],
    occupation_columns: List[str]
) -> Tuple[List[int], List[float]]:
    predictions: List[float] = []
    labels: List[int] = []

    for _, row in df.iterrows():
        label_value = _get_first_available(row, label_columns)
        occupation_value = _get_first_available(row, occupation_columns)

        if occupation_value is None or label_value is None:
            continue

        try:
            label_int = int(label_value)
        except (TypeError, ValueError):
            continue

        user_scores = _build_user_scores_from_row(row)
        aggregated = compute_aggregated_scores(user_scores)
        match = aggregated.get(str(occupation_value))
        if not match:
            continue

        predictions.append(float(match[0]))
        labels.append(label_int)

    return labels, predictions


def optimize_weights_from_dataset(
    dataset_name: str,
    dimension_candidates: Optional[List[Dict[str, float]]] = None,
    combination_candidates: Optional[List[Dict[str, float]]] = None
) -> Optional[Dict[str, Any]]:
    df = _load_validation_dataframe(dataset_name)
    if df is None:
        return None

    default_dimension_candidates = dimension_candidates or [
        DEFAULT_DIMENSION_WEIGHTS,
        {'interests': 0.30, 'abilities': 0.30, 'knowledge': 0.20, 'skills': 0.20},
        {'interests': 0.40, 'abilities': 0.25, 'knowledge': 0.20, 'skills': 0.15},
        {'interests': 0.33, 'abilities': 0.27, 'knowledge': 0.20, 'skills': 0.20},
    ]
    default_combination_candidates = combination_candidates or [
        DEFAULT_COMBINATION_WEIGHTS,
        {'fit': 0.50, 'cosine': 0.25, 'mahalanobis': 0.25},
        {'fit': 0.45, 'cosine': 0.30, 'mahalanobis': 0.25},
        {'fit': 0.35, 'cosine': 0.35, 'mahalanobis': 0.30},
    ]

    best_result: Optional[Dict[str, Any]] = None

    label_columns = ['label', 'success', 'outcome']
    occupation_columns = ['occupation', 'target_occupation', 'job', 'title']

    for dim_candidate in default_dimension_candidates:
        normalized_dim = _normalize_weights(dim_candidate, list(DEFAULT_DIMENSION_WEIGHTS.keys()))
        for comb_candidate in default_combination_candidates:
            normalized_comb = _normalize_weights(comb_candidate, list(DEFAULT_COMBINATION_WEIGHTS.keys()))

            with temporary_weight_overrides(normalized_dim, normalized_comb):
                labels, predictions = generate_predictions_for_dataset(df, label_columns, occupation_columns)

            auc = compute_auc(labels, predictions)
            if auc is None:
                continue

            if best_result is None or auc > best_result['auc']:
                best_result = {
                    'dimension_weights': normalized_dim,
                    'combination_weights': normalized_comb,
                    'auc': auc,
                    'evaluated_pairs': len(predictions)
                }

    if best_result:
        DIMENSION_WEIGHTS.clear()
        DIMENSION_WEIGHTS.update(best_result['dimension_weights'])
        COMBINATION_WEIGHTS.clear()
        COMBINATION_WEIGHTS.update(best_result['combination_weights'])

    return best_result


def optimize_thresholds_from_dataset(
    dataset_name: str,
    importance_candidates: Optional[List[float]] = None,
    ratio_candidates: Optional[List[float]] = None
) -> Optional[Dict[str, Any]]:
    global IMPORTANCE_CRITICAL_THRESHOLD, MIN_REQUIREMENT_RATIO, CRITICAL_REQUIREMENTS
    df = _load_validation_dataframe(dataset_name)
    if df is None:
        return None

    importance_values = importance_candidates or [60.0, 70.0, 80.0, 85.0, 90.0]
    ratio_values = ratio_candidates or [0.6, 0.7, 0.8, 0.85, 0.9]

    label_columns = ['label', 'success', 'outcome']
    occupation_columns = ['occupation', 'target_occupation', 'job', 'title']

    best_result: Optional[Dict[str, Any]] = None

    for imp_thr in importance_values:
        for ratio in ratio_values:
            with temporary_threshold_overrides(imp_thr, ratio):
                labels, predictions = generate_predictions_for_dataset(df, label_columns, occupation_columns)

            auc = compute_auc(labels, predictions)
            if auc is None:
                continue

            if best_result is None or auc > best_result['auc']:
                best_result = {
                    'importance_threshold': float(imp_thr),
                    'min_requirement_ratio': float(ratio),
                    'auc': auc,
                    'evaluated_pairs': len(predictions)
                }

    if best_result:
        IMPORTANCE_CRITICAL_THRESHOLD = best_result['importance_threshold']
        MIN_REQUIREMENT_RATIO = best_result['min_requirement_ratio']
        CRITICAL_REQUIREMENTS = _calibrate_critical_requirements(
            BASE_CRITICAL_REQUIREMENTS,
            importance_threshold=IMPORTANCE_CRITICAL_THRESHOLD,
            level_ratio=MIN_REQUIREMENT_RATIO
        )

    return best_result


def platt_scale(
    scores: np.ndarray,
    labels: np.ndarray,
    learning_rate: float = 0.01,
    max_iter: int = 500,
    regularization: float = 1e-4
) -> Tuple[float, float, int]:
    A = 0.0
    n_pos = labels.sum()
    n_neg = len(labels) - n_pos
    if n_pos == 0 or n_neg == 0:
        return 0.0, 0.0, 0

    B = float(np.log((n_pos + 1) / (n_neg + 1)))

    for iteration in range(1, max_iter + 1):
        logits = A * scores + B
        preds = 1.0 / (1.0 + np.exp(-logits))
        error = preds - labels

        grad_A = (error * scores).mean() + regularization * A
        grad_B = error.mean() + regularization * B

        A -= learning_rate * grad_A
        B -= learning_rate * grad_B

        if max(abs(grad_A), abs(grad_B)) < 1e-6:
            return float(A), float(B), iteration

    return float(A), float(B), max_iter


def apply_score_calibration(score: float) -> float:
    if not SCORE_CALIBRATION.get('enabled', False):
        return score

    A = float(SCORE_CALIBRATION.get('A', 0.0))
    B = float(SCORE_CALIBRATION.get('B', 0.0))
    calibrated = 1.0 / (1.0 + np.exp(-(A * score + B)))
    return float(np.clip(calibrated, 0.0, 1.0))


def calibrate_scores_from_dataset(
    dataset_name: str,
    learning_rate: float = 0.01,
    max_iter: int = 500
) -> Optional[Dict[str, Any]]:
    global SCORE_CALIBRATION

    df = _load_validation_dataframe(dataset_name)
    if df is None:
        return None

    label_columns = ['label', 'success', 'outcome']
    occupation_columns = ['occupation', 'target_occupation', 'job', 'title']

    labels, predictions = generate_predictions_for_dataset(df, label_columns, occupation_columns)
    auc_before = compute_auc(labels, predictions)
    if auc_before is None:
        return None

    scores_array = np.array(predictions, dtype=float)
    labels_array = np.array(labels, dtype=float)

    A, B, iterations = platt_scale(scores_array, labels_array, learning_rate=learning_rate, max_iter=max_iter)
    calibrated_scores = 1.0 / (1.0 + np.exp(-(A * scores_array + B)))
    auc_after = compute_auc(labels, calibrated_scores.tolist())

    SCORE_CALIBRATION = {
        'A': A,
        'B': B,
        'enabled': True
    }

    return {
        'A': A,
        'B': B,
        'iterations': iterations,
        'auc_before': auc_before,
        'auc_after': auc_after,
        'samples': len(predictions)
    }

# ============= Main Endpoints =============

class CalibrationRequest(BaseModel):
    importance_percentile: Optional[float] = 75.0
    level_percentile: Optional[float] = 65.0
    top_k: Optional[int] = 20
    dataset_name: Optional[str] = None
    importance_candidates: Optional[List[float]] = None
    ratio_candidates: Optional[List[float]] = None

class CalibrationResponse(BaseModel):
    importance_critical_threshold: float
    min_requirement_ratio: float
    rules_count: int
    sample_rules: List[Dict[str, Any]]
    dimension_weights: Dict[str, float]
    combination_weights: Dict[str, float]
    score_calibration: Dict[str, Any]


class OptimizationRequest(BaseModel):
    dataset_name: Optional[str] = "career-validation-csv"
    dimension_candidates: Optional[List[Dict[str, float]]] = None
    combination_candidates: Optional[List[Dict[str, float]]] = None


class OptimizationResponse(BaseModel):
    dimension_weights: Dict[str, float]
    combination_weights: Dict[str, float]
    auc: float
    evaluated_pairs: int


class ScoreCalibrationRequest(BaseModel):
    dataset_name: Optional[str] = "career-validation-csv"
    learning_rate: Optional[float] = 0.01
    max_iter: Optional[int] = 500


class ScoreCalibrationResponse(BaseModel):
    A: float
    B: float
    iterations: int
    auc_before: float
    auc_after: Optional[float] = None
    samples: int

@router.post("/analyze")
def analyze_results(user_scores: UserScores) -> RecommendationResponse:
    """
    Original single-category endpoint (backward compatibility)
    """
    # Determine primary category with most data
    category = _determine_primary_category(user_scores)
    
    if category == "skills":
        matches = _calculate_skill_correlations(user_scores.skills)
    elif category == "abilities":
        matches = _calculate_ability_correlations(user_scores.abilities)
    elif category == "knowledge":
        matches = _calculate_knowledge_correlations(user_scores.knowledge)
    elif category == "interests":
        matches = _get_interest_recommendations(user_scores.interests)
    else:
        raise HTTPException(status_code=400, detail="Insufficient assessment data")
    
    return RecommendationResponse(
        matches=matches,
        category=category,
        methodology="Single category correlation"
    )

@router.get("/calibration")
async def get_calibration() -> CalibrationResponse:
    """Return the current calibration values and a small sample of rules."""
    sample = CRITICAL_REQUIREMENTS[:5]
    return CalibrationResponse(
        importance_critical_threshold=float(IMPORTANCE_CRITICAL_THRESHOLD),
        min_requirement_ratio=float(MIN_REQUIREMENT_RATIO),
        rules_count=len(CRITICAL_REQUIREMENTS),
        sample_rules=sample,
        dimension_weights=dict(DIMENSION_WEIGHTS),
        combination_weights=dict(COMBINATION_WEIGHTS),
        score_calibration=dict(SCORE_CALIBRATION),
    )

@router.post("/calibrate")
async def calibrate(req: CalibrationRequest) -> CalibrationResponse:
    """Re-run calibration using live O*NET frames from Databutton storage."""
    if db is None:
        raise HTTPException(status_code=503, detail="Databutton storage unavailable in this environment")
    global IMPORTANCE_CRITICAL_THRESHOLD, MIN_REQUIREMENT_RATIO, CRITICAL_REQUIREMENTS

    top_k = int(req.top_k or 20)
    dataset_used = False

    if req.dataset_name:
        threshold_result = optimize_thresholds_from_dataset(
            req.dataset_name,
            importance_candidates=req.importance_candidates,
            ratio_candidates=req.ratio_candidates
        )
        if threshold_result:
            dataset_used = True
            # Recompute rules with requested top_k under chosen thresholds
            CRITICAL_REQUIREMENTS = _calibrate_critical_requirements(
                BASE_CRITICAL_REQUIREMENTS,
                top_k=top_k,
                importance_threshold=IMPORTANCE_CRITICAL_THRESHOLD,
                level_ratio=MIN_REQUIREMENT_RATIO
            )

    if not dataset_used:
        importance_thr, min_ratio, rules = _run_calibration(
            importance_percentile=float(req.importance_percentile or 75.0),
            level_percentile=float(req.level_percentile or 65.0),
            top_k=top_k,
        )
        IMPORTANCE_CRITICAL_THRESHOLD = importance_thr
        MIN_REQUIREMENT_RATIO = min_ratio
        CRITICAL_REQUIREMENTS = rules

    return CalibrationResponse(
        importance_critical_threshold=float(IMPORTANCE_CRITICAL_THRESHOLD),
        min_requirement_ratio=float(MIN_REQUIREMENT_RATIO),
        rules_count=len(CRITICAL_REQUIREMENTS),
        sample_rules=CRITICAL_REQUIREMENTS[:5],
        dimension_weights=dict(DIMENSION_WEIGHTS),
        combination_weights=dict(COMBINATION_WEIGHTS),
        score_calibration=dict(SCORE_CALIBRATION),
    )

@router.post("/optimize-weights")
async def optimize_weights(req: OptimizationRequest) -> OptimizationResponse:
    if db is None:
        raise HTTPException(status_code=503, detail="Databutton storage unavailable in this environment")

    result = optimize_weights_from_dataset(
        req.dataset_name or "career-validation-csv",
        dimension_candidates=req.dimension_candidates,
        combination_candidates=req.combination_candidates
    )

    if not result:
        raise HTTPException(status_code=503, detail="Weight optimization dataset unavailable or insufficient")

    return OptimizationResponse(
        dimension_weights=result['dimension_weights'],
        combination_weights=result['combination_weights'],
        auc=float(result['auc']),
        evaluated_pairs=int(result['evaluated_pairs'])
    )


@router.post("/calibrate-scores")
async def calibrate_scores(req: ScoreCalibrationRequest) -> ScoreCalibrationResponse:
    if db is None:
        raise HTTPException(status_code=503, detail="Databutton storage unavailable in this environment")

    result = calibrate_scores_from_dataset(
        req.dataset_name or "career-validation-csv",
        learning_rate=float(req.learning_rate or 0.01),
        max_iter=int(req.max_iter or 500)
    )

    if not result:
        raise HTTPException(status_code=503, detail="Score calibration dataset unavailable or insufficient")

    return ScoreCalibrationResponse(**result)


@router.post("/analyze-multi")
def analyze_multi_category(user_scores: UserScores) -> RecommendationResponse:
    """
    New multi-category weighted aggregation endpoint
    """
    # Step 1: Get non-empty categories
    categories = get_non_empty_categories(user_scores)
    
    if not categories:
        raise HTTPException(
            status_code=400, 
            detail="No assessment data provided"
        )
    
    logger.info(f"Analyzing with categories: {list(categories.keys())}")
    
    # Step 2: Calculate scores for each category
    category_matches = build_category_matches(user_scores)
    for category_name, matches in category_matches.items():
        logger.info(f"{category_name}: {len(matches)} occupations scored")
    
    if not category_matches:
        raise HTTPException(
            status_code=400,
            detail="No valid correlations could be calculated"
        )
    
    # Step 3: Aggregate scores
    aggregated = aggregate_multi_category_scores(category_matches)
    
    # Step 4: Sort and create response
    sorted_occupations = sorted(
        aggregated.items(),
        key=lambda x: x[1][0],  # Sort by final score
        reverse=True
    )
    
    # Create match objects
    matches = []
    for occupation, (score, contributions) in sorted_occupations[:20]:
        # Generate description based on top contributing categories
        top_categories = sorted(
            contributions, 
            key=lambda c: c.weight * c.score, 
            reverse=True
        )[:2]
        
        description = f"Strong match based on your {' and '.join([c.category for c in top_categories])}"

        raw_score = float(score)
        calibrated_score = apply_score_calibration(raw_score)

        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(calibrated_score, 3),
            description=description,
            contributions=contributions,
            raw_score=round(raw_score, 3),
            calibrated=SCORE_CALIBRATION.get('enabled', False)
        ))
    
    return RecommendationResponse(
        matches=matches,
        category="combined",
        methodology=f"Importance-weighted multi-category aggregation using {len(category_matches)} assessment types",
        total_occupations_analyzed=len(aggregated),
        categories_used=list(category_matches.keys())
    )

# ============= Legacy Single-Category Functions =============
# (Keep these for backward compatibility)

def _determine_primary_category(user_scores: UserScores) -> str:
    """Determine which category has the most data"""
    categories = {
        "skills": len(user_scores.skills) if user_scores.skills else 0,
        "abilities": len(user_scores.abilities) if user_scores.abilities else 0,
        "knowledge": len(user_scores.knowledge) if user_scores.knowledge else 0,
        "interests": len(user_scores.interests) if user_scores.interests else 0
    }
    
    max_length = 0
    primary_category = ""
    
    for category, length in categories.items():
        if length > max_length:
            max_length = length
            primary_category = category
    
    return primary_category

def _calculate_skill_correlations(user_skills: List[SkillScore]) -> List[OccupationMatch]:
    """Legacy single-category skill correlation"""
    scores, overlaps, elements = calculate_element_correlations_all(
        user_skills,
        "elements-skills-csv",
        'skills',
        scale="Level",
        normalization_method='minmax'
    )
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    matches = []
    for occupation, score in sorted_scores[:20]:
        raw_score = float(score)
        calibrated_score = apply_score_calibration(raw_score)
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(calibrated_score, 3),
            description=f"Based on {overlaps[occupation]} matching skills",
            raw_score=round(raw_score, 3),
            calibrated=SCORE_CALIBRATION.get('enabled', False)
        ))
    
    return matches

def _calculate_ability_correlations(user_abilities: List[AbilityScore]) -> List[OccupationMatch]:
    """Legacy single-category ability correlation"""
    scores, overlaps, elements = calculate_element_correlations_all(
        user_abilities,
        "elements-abilities-csv",
        'abilities',
        scale="Level",
        normalization_method='minmax'
    )
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    matches = []
    for occupation, score in sorted_scores[:20]:
        raw_score = float(score)
        calibrated_score = apply_score_calibration(raw_score)
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(calibrated_score, 3),
            description=f"Based on {overlaps[occupation]} matching abilities",
            raw_score=round(raw_score, 3),
            calibrated=SCORE_CALIBRATION.get('enabled', False)
        ))
    
    return matches

def _calculate_knowledge_correlations(user_knowledge: List[KnowledgeScore]) -> List[OccupationMatch]:
    """Legacy single-category knowledge correlation"""
    scores, overlaps, elements = calculate_element_correlations_all(
        user_knowledge,
        "elements-knowledge-2-csv",
        'knowledge',
        scale="Level",
        normalization_method='minmax'
    )
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    matches = []
    for occupation, score in sorted_scores[:20]:
        raw_score = float(score)
        calibrated_score = apply_score_calibration(raw_score)
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(calibrated_score, 3),
            description=f"Based on {overlaps[occupation]} matching knowledge areas",
            raw_score=round(raw_score, 3),
            calibrated=SCORE_CALIBRATION.get('enabled', False)
        ))
    
    return matches

def _get_interest_recommendations(user_interests: List[InterestScore]) -> List[OccupationMatch]:
    """Legacy single-category interest recommendations"""
    scores, overlaps, elements = calculate_interest_correlations_all(user_interests)
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    matches = []
    for occupation, score in sorted_scores[:20]:
        raw_score = float(score)
        calibrated_score = apply_score_calibration(raw_score)
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(calibrated_score, 3),
            description=f"Based on RIASEC interest profile",
            raw_score=round(raw_score, 3),
            calibrated=SCORE_CALIBRATION.get('enabled', False)
        ))
    
    return matches