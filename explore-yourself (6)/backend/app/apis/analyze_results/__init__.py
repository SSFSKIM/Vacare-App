from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import databutton as db
import pandas as pd
import numpy as np
from typing import List, Dict, Optional

router = APIRouter()

# Define the request model for each type of assessment
class ScoreItem(BaseModel):
    name: str
    rating: float

class AnalysisRequest(BaseModel):
    skills: Optional[List[ScoreItem]] = None
    abilities: Optional[List[ScoreItem]] = None
    knowledge: Optional[List[ScoreItem]] = None

# Define the response model
class CareerMatch(BaseModel):
    title: str
    correlation: float

class AnalysisResponse(BaseModel):
    matches: List[CareerMatch]
    category: str

@router.post("/analyze-results")
def analyze_assessment_results(request: AnalysisRequest) -> AnalysisResponse:
    """Analyze user assessment results and recommend matching occupations"""
    try:
        # Determine which data to use based on what was provided
        if request.skills and len(request.skills) > 0:
            return _analyze_skills(request.skills)
        elif request.abilities and len(request.abilities) > 0:
            return _analyze_abilities(request.abilities)
        elif request.knowledge and len(request.knowledge) > 0:
            return _analyze_knowledge(request.knowledge)
        else:
            raise HTTPException(status_code=400, detail="No assessment data provided")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing results: {str(e)}")

def _analyze_skills(skills: List[ScoreItem]) -> AnalysisResponse:
    """Analyze user skills and find matching occupations"""
    try:
        # Load the skills data
        skills_df = db.storage.dataframes.get("elements-skills-csv")
        
        # Filter to importance scores only
        skills_df = skills_df[skills_df["Scale Name"] == "Importance"]
        
        # Create pivot table with occupations as rows and skills as columns
        occupation_skills = pd.pivot_table(
            skills_df, 
            values="Data Value", 
            index="Title", 
            columns="Element Name",
            aggfunc="mean"
        )
        
        # Create user profile dictionary
        user_skill_dict = {item.name: item.rating for item in skills}
        
        # Create a Series for the user's skill profile
        user_profile = pd.Series(user_skill_dict)
        
        # Find matching skills
        common_skills = set(user_profile.index) & set(occupation_skills.columns)
        
        if not common_skills:
            raise ValueError("No matching skills found")
        
        # Filter data to common skills
        user_profile = user_profile[list(common_skills)]
        occupation_skills = occupation_skills[list(common_skills)]
        
        # Calculate correlations
        correlations = _calculate_correlations(user_profile, occupation_skills)
        
        return AnalysisResponse(
            matches=correlations[:20],  # Top 20 matches
            category="skills"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing skills: {str(e)}")

def _analyze_abilities(abilities: List[ScoreItem]) -> AnalysisResponse:
    """Analyze user abilities and find matching occupations"""
    try:
        # Load the abilities data
        abilities_df = db.storage.dataframes.get("elements-abilities-csv")
        
        # Filter to importance scores only
        abilities_df = abilities_df[abilities_df["Scale Name"] == "Importance"]
        
        # Create pivot table with occupations as rows and abilities as columns
        occupation_abilities = pd.pivot_table(
            abilities_df, 
            values="Data Value", 
            index="Title", 
            columns="Element Name",
            aggfunc="mean"
        )
        
        # Create user profile dictionary
        user_ability_dict = {item.name: item.rating for item in abilities}
        
        # Create a Series for the user's ability profile
        user_profile = pd.Series(user_ability_dict)
        
        # Find matching abilities
        common_abilities = set(user_profile.index) & set(occupation_abilities.columns)
        
        if not common_abilities:
            raise ValueError("No matching abilities found")
        
        # Filter data to common abilities
        user_profile = user_profile[list(common_abilities)]
        occupation_abilities = occupation_abilities[list(common_abilities)]
        
        # Calculate correlations
        correlations = _calculate_correlations(user_profile, occupation_abilities)
        
        return AnalysisResponse(
            matches=correlations[:20],  # Top 20 matches
            category="abilities"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing abilities: {str(e)}")

def _analyze_knowledge(knowledge: List[ScoreItem]) -> AnalysisResponse:
    """Analyze user knowledge and find matching occupations"""
    try:
        # Load the knowledge data
        knowledge_df = db.storage.dataframes.get("elements-knowledge-2-csv")
        
        # Filter to importance scores only
        knowledge_df = knowledge_df[knowledge_df["Scale Name"] == "Importance"]
        
        # Create pivot table with occupations as rows and knowledge areas as columns
        occupation_knowledge = pd.pivot_table(
            knowledge_df, 
            values="Data Value", 
            index="Title", 
            columns="Element Name",
            aggfunc="mean"
        )
        
        # Create user profile dictionary
        user_knowledge_dict = {item.name: item.rating for item in knowledge}
        
        # Create a Series for the user's knowledge profile
        user_profile = pd.Series(user_knowledge_dict)
        
        # Find matching knowledge areas
        common_knowledge = set(user_profile.index) & set(occupation_knowledge.columns)
        
        if not common_knowledge:
            raise ValueError("No matching knowledge areas found")
        
        # Filter data to common knowledge areas
        user_profile = user_profile[list(common_knowledge)]
        occupation_knowledge = occupation_knowledge[list(common_knowledge)]
        
        # Calculate correlations
        correlations = _calculate_correlations(user_profile, occupation_knowledge)
        
        return AnalysisResponse(
            matches=correlations[:20],  # Top 20 matches
            category="knowledge"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing knowledge: {str(e)}")

def _calculate_correlations(user_profile: pd.Series, occupation_data: pd.DataFrame) -> List[CareerMatch]:
    """Calculate Pearson correlation coefficient between user profile and occupations"""
    # User profile statistics
    user_mean = user_profile.mean()
    user_std = user_profile.std()
    
    # Number of items being compared
    n_items = len(user_profile)
    
    # Results list
    results = []
    
    # Calculate correlation for each occupation
    for occupation, row in occupation_data.iterrows():
        # Skip if either has zero standard deviation
        if user_std == 0 or row.std() == 0:
            continue
            
        # Occupation profile statistics
        occ_mean = row.mean()
        occ_std = row.std()
        
        # Calculate the numerator: sum of products of deviations
        sum_product = sum((user_profile - user_mean) * (row - occ_mean))
        
        # Calculate Pearson correlation
        correlation = sum_product / (n_items * user_std * occ_std)
        
        # Only include positive correlations
        if correlation > 0:
            results.append(CareerMatch(
                title=occupation,
                correlation=float(correlation)
            ))
    
    # Sort by correlation in descending order
    results.sort(key=lambda x: x.correlation, reverse=True)
    
    return results