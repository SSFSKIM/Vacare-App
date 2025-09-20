# backend/app/apis/career_recommendation/__init__.py
# Enhanced version with multi-category matching

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import databutton as db
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from scipy.stats import pearsonr
import logging

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

# Optional category importance multipliers
CATEGORY_IMPORTANCE = {
    'interests': 1.2,  # Slightly favor interests for job satisfaction
    'abilities': 1.0,  # Baseline - harder to change
    'knowledge': 0.9,  # Can be learned
    'skills': 0.9      # Can be trained
}

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

def calculate_interest_correlations_all(
    user_interests: List[InterestScore]
) -> Tuple[Dict[str, float], Dict[str, int], Dict[str, List[str]]]:
    """
    Calculate RIASEC correlations for all occupations
    """
    scores = {}
    overlaps = {}
    matched_elements = {}
    
    try:
        # Load interests data
        interests_df = db.storage.dataframes.get("elements-interests-csv")
        
        # Create occupation interest profiles
        occupation_interests = {}
        for _, row in interests_df.iterrows():
            occupation = row['Title']
            interest_type = row['Element Name']
            value = row['Data Value']
            
            if occupation not in occupation_interests:
                occupation_interests[occupation] = {}
            occupation_interests[occupation][interest_type] = value
        
        # Create normalized user profile
        user_dict = {item.name: item.rating for item in user_interests}
        total = sum(user_dict.values())
        if total > 0:
            user_dict = {k: v/total for k, v in user_dict.items()}
        
        # RIASEC categories
        riasec_categories = ['Realistic', 'Investigative', 'Artistic', 
                            'Social', 'Enterprising', 'Conventional']
        
        # Calculate correlation for each occupation
        for occupation, occ_interests in occupation_interests.items():
            # Get values for all RIASEC categories
            user_values = [user_dict.get(cat, 0) for cat in riasec_categories]
            occ_values = [occ_interests.get(cat, 0) for cat in riasec_categories]
            
            # Count how many categories have data
            matched_cats = [cat for cat in riasec_categories 
                           if cat in user_dict and cat in occ_interests]
            
            if len(matched_cats) < MIN_OVERLAP_THRESHOLD.get('interests', 3):
                continue
            
            # Calculate correlation
            if np.std(user_values) > 0 and np.std(occ_values) > 0:
                r, _ = pearsonr(user_values, occ_values)
                score = (r + 1) / 2  # Convert to 0-1
                
                scores[occupation] = score
                overlaps[occupation] = len(matched_cats)
                matched_elements[occupation] = matched_cats
                
    except Exception as e:
        logger.error(f"Error calculating interest correlations: {str(e)}")
        
    return scores, overlaps, matched_elements

def aggregate_multi_category_scores(
    category_data: Dict[str, Tuple[Dict, Dict, Dict]],
    use_importance_weights: bool = True
) -> Dict[str, Tuple[float, List[CategoryContribution]]]:
    """
    Aggregate scores across multiple categories using weighted average
    
    Args:
        category_data: {category: (scores, overlaps, matched_elements)}
        use_importance_weights: Whether to apply category importance multipliers
    
    Returns:
        {occupation: (final_score, [contributions])}
    """
    aggregated = {}
    
    # Get all unique occupations
    all_occupations = set()
    for category, (scores, _, _) in category_data.items():
        all_occupations.update(scores.keys())
    
    # Calculate aggregated score for each occupation
    for occupation in all_occupations:
        weighted_sum = 0
        weight_sum = 0
        contributions = []
        
        for category, (scores, overlaps, matched_elements) in category_data.items():
            if occupation in scores:
                score = scores[occupation]
                overlap = overlaps[occupation]
                elements = matched_elements[occupation]
                
                # Calculate weight
                weight = overlap
                if use_importance_weights:
                    weight *= CATEGORY_IMPORTANCE.get(category, 1.0)
                
                weighted_sum += weight * score
                weight_sum += weight
                
                contributions.append(CategoryContribution(
                    category=category,
                    score=round(score, 3),
                    weight=round(weight, 2),
                    overlap_count=overlap,
                    elements_matched=elements[:5]  # Top 5 for brevity
                ))
        
        if weight_sum > 0:
            final_score = weighted_sum / weight_sum
            aggregated[occupation] = (final_score, contributions)
    
    return aggregated

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

# ============= Main Endpoints =============

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
    category_data = {}
    
    for category_name, category_scores in categories.items():
        if category_name == 'interests':
            scores, overlaps, elements = calculate_interest_correlations_all(
                category_scores
            )
        elif category_name == 'abilities':
            scores, overlaps, elements = calculate_element_correlations_all(
                category_scores,
                "elements-abilities-csv",
                'abilities',
                scale="Level",
                normalization_method='minmax'
            )
        elif category_name == 'knowledge':
            scores, overlaps, elements = calculate_element_correlations_all(
                category_scores,
                "elements-knowledge-2-csv",
                'knowledge',
                scale="Level",
                normalization_method='minmax'
            )
        elif category_name == 'skills':
            scores, overlaps, elements = calculate_element_correlations_all(
                category_scores,
                "elements-skills-csv",
                'skills',
                scale="Level",
                normalization_method='minmax'
            )
        
        if scores:  # Only add if we got valid scores
            category_data[category_name] = (scores, overlaps, elements)
            logger.info(f"{category_name}: {len(scores)} occupations scored")
    
    if not category_data:
        raise HTTPException(
            status_code=400,
            detail="No valid correlations could be calculated"
        )
    
    # Step 3: Aggregate scores
    aggregated = aggregate_multi_category_scores(
        category_data,
        use_importance_weights=True
    )
    
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
        
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(score, 3),
            description=description,
            contributions=contributions
        ))
    
    return RecommendationResponse(
        matches=matches,
        category="combined",
        methodology=f"Multi-category weighted aggregation using {len(categories)} assessment types",
        total_occupations_analyzed=len(aggregated),
        categories_used=list(categories.keys())
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
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(score, 3),
            description=f"Based on {overlaps[occupation]} matching skills"
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
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(score, 3),
            description=f"Based on {overlaps[occupation]} matching abilities"
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
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(score, 3),
            description=f"Based on {overlaps[occupation]} matching knowledge areas"
        ))
    
    return matches

def _get_interest_recommendations(user_interests: List[InterestScore]) -> List[OccupationMatch]:
    """Legacy single-category interest recommendations"""
    scores, overlaps, elements = calculate_interest_correlations_all(user_interests)
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    matches = []
    for occupation, score in sorted_scores[:20]:
        matches.append(OccupationMatch(
            title=occupation,
            correlation=round(score, 3),
            description=f"Based on RIASEC interest profile"
        ))
    
    return matches
