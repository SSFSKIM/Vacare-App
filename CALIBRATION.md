# Career Recommendation Calibration

This document describes the calibration values used by the career recommendation system.

## Current Calibration (Default Values)

Last updated: 2025-10-04

### Threshold Configuration
- **Importance Critical Threshold**: 3.12
  - Elements with importance above this threshold are considered critical requirements

- **Minimum Requirement Ratio**: 0.65 (65%)
  - Users must meet at least 65% of the level requirement for critical elements

### Dimension Weights
How different assessment categories are weighted in the overall match score:

```json
{
  "interests": 0.35,   // 35% - RIASEC interest alignment
  "abilities": 0.25,   // 25% - Cognitive and physical abilities
  "knowledge": 0.20,   // 20% - Knowledge areas
  "skills": 0.20       // 20% - Technical and soft skills
}
```

### Combination Weights
How different similarity metrics are combined:

```json
{
  "fit": 0.40,          // 40% - Requirement-based fit score
  "cosine": 0.30,       // 30% - Cosine similarity
  "mahalanobis": 0.30   // 30% - Mahalanobis distance
}
```

### Score Calibration (Platt Scaling)
Currently disabled - using raw scores:

```json
{
  "A": 0.0,
  "B": 0.0,
  "enabled": false
}
```

## Critical Requirements Sample

Example elements that trigger stricter matching:

1. **Near Vision** (threshold_ratio: 0.80)
   - Keywords: surgeon, dentist, jeweler

2. **Physical Strength** (threshold_ratio: 0.82)
   - Keywords: firefighter, construction, responder

3. **Mathematical Reasoning** (threshold_ratio: 0.88)
   - Keywords: actuary, statistician, data scientist

## Calibration Methodology

### Why These Defaults?

The default values were chosen based on:
1. **Domain expertise** - Career counseling best practices
2. **RIASEC methodology** - Validated career assessment framework
3. **O*NET data structure** - Element importance and level distributions

### Running Calibration (Optional)

Full calibration is computationally expensive and takes 20+ minutes locally. It's only needed if:
- You have new validation data from real user outcomes
- You want to tune for a specific population
- O*NET data structure changes significantly

To run calibration locally:

```bash
# 1. Start backend
cd "explore-yourself (6)/backend"
uv run uvicorn main:app --port 8000

# 2. Disable auth in routers.json
# Set career_recommendation.disableAuth = true

# 3. Run calibration script
python3 ../../run_calibration.py
```

**Note**: The optimize-weights step can take 10-30 minutes depending on dataset size.

## Performance Notes

- **Bootstrap** (200 occupations): ~20 minutes
- **Optimize-weights**: ~10-30 minutes
- **Calibrate thresholds**: ~5-10 minutes
- **Calibrate scores**: ~5-10 minutes

For production use, the default values are recommended unless you have specific validation data suggesting changes.

## Deployment

The current calibration values are hardcoded in:
- `backend/app/apis/career_recommendation/__init__.py` (lines 28-50)

Any changes require rebuilding and redeploying the backend.
