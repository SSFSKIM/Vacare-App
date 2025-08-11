from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import databutton as db
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Union, Any
from scipy.stats import pearsonr

router = APIRouter(prefix="/career-recommendation")

# Define the request model
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

# Define the response model
class OccupationMatch(BaseModel):
    title: str
    correlation: float
    description: Optional[str] = None

class RecommendationResponse(BaseModel):
    matches: List[OccupationMatch]
    category: str

@router.post("/analyze")
def analyze_results(user_scores: UserScores) -> RecommendationResponse:
    """Analyze user assessment results and recommend matching occupations"""
    # Get the category with the most data
    category = _determine_primary_category(user_scores)
    
    # Calculate correlations based on the primary category
    if category == "skills":
        matches = _calculate_skill_correlations(user_scores.skills)
    elif category == "abilities":
        matches = _calculate_ability_correlations(user_scores.abilities)
    elif category == "knowledge":
        matches = _calculate_knowledge_correlations(user_scores.knowledge)
    elif category == "interests":
        # For interests, return a list of recommended occupations based on Holland codes
        matches = _get_interest_recommendations(user_scores.interests)
    else:
        raise HTTPException(status_code=400, detail="Insufficient assessment data provided")
    
    return RecommendationResponse(
        matches=matches,
        category=category
    )

def _determine_primary_category(user_scores: UserScores) -> str:
    """Determine which category has the most data to use for correlation"""
    categories = {
        "skills": user_scores.skills,
        "abilities": user_scores.abilities,
        "knowledge": user_scores.knowledge,
        "interests": user_scores.interests
    }
    
    # Find category with the most data points
    max_length = 0
    primary_category = ""
    
    for category, scores in categories.items():
        if scores and len(scores) > max_length:
            max_length = len(scores)
            primary_category = category
    
    return primary_category

def _calculate_skill_correlations(user_skills: List[SkillScore]) -> List[OccupationMatch]:
    """Calculate Pearson correlations between user skills and occupational profiles"""
    # Load occupation skill data
    try:
        skills_df = db.storage.dataframes.get("elements-skills-csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading skills data: {str(e)}")
    
    # Filter to level scores only
    skills_df = skills_df[skills_df["Scale Name"] == "Level"]
    
    # Create pivot table with occupations as rows and skills as columns
    occupation_skills = pd.pivot_table(
        skills_df, 
        values="Data Value", 
        index="Title", 
        columns="Element Name",
        aggfunc="mean"
    )
    
    # Create a dictionary of user's skill scores
    user_skill_dict = {item.name: item.rating for item in user_skills}
    
    # Create a Series for the user's skill profile
    user_profile = pd.Series(user_skill_dict)
    
    # Calculate correlations between user profile and each occupation
    correlations = []
    
    # Get only the skills that exist in both the user profile and occupation data
    common_skills = set(user_profile.index) & set(occupation_skills.columns)
    
    if not common_skills:
        raise HTTPException(status_code=400, detail="No matching skills found between user data and occupation data")
    
    # Filter data to include only common skills
    user_profile = user_profile[list(common_skills)]
    occupation_skills = occupation_skills[list(common_skills)]
    
    # User profile statistics
    user_mean = user_profile.mean()
    user_std = user_profile.std()
    
    # Calculate Pearson correlation for each occupation
    for occupation, row in occupation_skills.iterrows():
        # Occupation profile statistics
        occ_mean = row.mean()
        occ_std = row.std()
        
        # Skip occupations with zero standard deviation (all same values)
        if user_std == 0 or occ_std == 0:
            continue
        
        # Calculate the Pearson correlation coefficient
        sum_product = sum((user_profile - user_mean) * (row - occ_mean))
        correlation = sum_product / (len(common_skills) * user_std * occ_std)
        
        correlations.append(OccupationMatch(
            title=occupation,
            correlation=float(correlation)
        ))
    
    # Sort by correlation in descending order
    correlations.sort(key=lambda x: x.correlation, reverse=True)
    
    # Return top matches
    return correlations[:20]

def _get_interest_recommendations(user_interests: List[InterestScore]) -> List[OccupationMatch]:
    """Get occupation recommendations based on user's Holland (RIASEC) interest scores"""
    try:
        # Create a dictionary of user's interest scores
        user_interest_dict = {item.name: item.rating for item in user_interests}
        
        # Normalize user interest scores to percentages
        total_score = sum(user_interest_dict.values())
        if total_score == 0:
            raise HTTPException(status_code=400, detail="Invalid interest scores - all values are zero")
            
        norm_user_interests = {k: v/total_score for k, v in user_interest_dict.items()}
        
        # Get user's top interests (Holland code)
        sorted_interests = sorted(norm_user_interests.items(), key=lambda x: x[1], reverse=True)
        user_holland_code = [code for code, _ in sorted_interests[:3]]
        
        # Load O*NET occupation interest data
        try:
            interests_df = db.storage.dataframes.get("elements-interests-csv")
            
            # Create a dictionary to store occupation interest profiles
            occupation_interests = {}
            
            # Process the dataframe to get interest profiles for each occupation
            for _, row in interests_df.iterrows():
                occupation = row['Title']
                interest_type = row['Element Name']
                value = row['Data Value']
                
                if occupation not in occupation_interests:
                    occupation_interests[occupation] = {}
                    
                occupation_interests[occupation][interest_type] = value
            
            # Calculate similarity using Pearson's r correlation
            correlation_scores = {}
            for occupation, interests in occupation_interests.items():
                # Get values for all RIASEC categories for both user and occupation
                riasec_categories = ['Realistic', 'Investigative', 'Artistic', 'Social', 'Enterprising', 'Conventional']
                
                # Get user values (use 0 if not rated)
                user_values = [norm_user_interests.get(interest, 0) for interest in riasec_categories]
                
                # Get occupation values (use 0 if not available)
                occupation_values = [interests.get(interest, 0) for interest in riasec_categories]
                
                # Calculate Pearson's r correlation coefficient
                try:
                    # Check for constant values which could cause issues with pearsonr
                    if np.std(user_values) == 0 or np.std(occupation_values) == 0:
                        # If either set is constant, we can't calculate correlation accurately
                        # Log error and skip this occupation
                        print(f"Cannot calculate correlation for {occupation} - constant values detected")
                        continue
                    else:
                        # Calculate Pearson correlation
                        r_value, _ = pearsonr(user_values, occupation_values)
                        # Convert from -1:1 range to 0:1 range (where 1 is perfect positive correlation)
                        # This gives us a more intuitive percentage match
                        adjusted_r = (r_value + 1) / 2
                        correlation_scores[occupation] = adjusted_r
                except Exception as e:
                    # Log error and skip this occupation
                    print(f"Error calculating correlation for {occupation}: {e}")
                    continue
            
            # Convert to OccupationMatch objects
            matches = [
                OccupationMatch(
                    title=occupation,
                    correlation=float(score),  # Already in 0-1 range
                    description=f"Recommended based on your {', '.join(user_holland_code)} interests profile"
                )
                for occupation, score in sorted(correlation_scores.items(), key=lambda x: x[1], reverse=True)
            ]
            
            return matches[:20]
            
        except Exception as e:
            print(f"Error using O*NET data: {e}")
            # Fallback if O*NET data cannot be loaded
            # Use the skills data which contains occupation titles
            try:
                skills_df = db.storage.dataframes.get("elements-skills-csv")
                occupation_titles = skills_df['Title'].unique()
                
                # Map RIASEC to occupation categories (simplified mapping)
                riasec_occupations = {
                    'Realistic': ['Mechanics', 'Engineers', 'Technicians', 'Construction', 'Manufacturing', 'Transportation'],
                    'Investigative': ['Scientists', 'Researchers', 'Analysts', 'Medical', 'Technology', 'Mathematics'],
                    'Artistic': ['Artists', 'Designers', 'Writers', 'Musicians', 'Actors', 'Architects'],
                    'Social': ['Teachers', 'Counselors', 'Social Workers', 'Nurses', 'Therapists', 'Healthcare'],
                    'Enterprising': ['Managers', 'Executives', 'Sales', 'Marketing', 'Lawyers', 'Business'],
                    'Conventional': ['Accountants', 'Financial', 'Administrative', 'Analysts', 'Clerks', 'Office']
                }
                
                # Score occupations based on keyword matches
                occupation_scores = {}
                for occupation in occupation_titles:
                    score = 0
                    for interest, keywords in riasec_occupations.items():
                        if interest in norm_user_interests:
                            for keyword in keywords:
                                if keyword.lower() in occupation.lower():
                                    score += norm_user_interests[interest]
                                    break
                    
                    occupation_scores[occupation] = score
                
                # Convert to OccupationMatch objects
                matches = [
                    OccupationMatch(
                        title=occupation,
                        correlation=float(min(score, 0.95)),  # Cap at 0.95 to avoid perfect scores
                        description=f"Recommended based on your {', '.join(user_holland_code)} interests"
                    )
                    for occupation, score in sorted(occupation_scores.items(), key=lambda x: x[1], reverse=True) 
                    if score > 0  # Only include matches with some relevance
                ]
                
                return matches[:20]
                
            except Exception as e2:
                print(f"Error using skills data as fallback: {e2}")
                # Final fallback with hardcoded occupations if all else fails
                riasec_occupations = {
                    'Realistic': [
                        "Civil Engineers", "Mechanical Engineers", "Aircraft Mechanics", "Electricians", "Construction Managers", 
                        "Commercial Pilots", "Farmers & Ranchers", "Industrial Production Managers", "Wind Turbine Technicians", "HVAC Mechanics & Installers"
                    ],
                    'Investigative': [
                        "Biochemists & Biophysicists", "Medical Scientists", "Physicians", "Computer & Information Research Scientists", "Economists", 
                        "Software Developers", "Veterinarians", "Chemists", "Biological Scientists", "Environmental Scientists"
                    ],
                    'Artistic': [
                        "Fine Artists", "Creative Writers", "Musicians & Composers", "Fashion Designers", "Actors", 
                        "Professional Photographers", "Interior Designers", "Film & Video Editors", "Dancers & Choreographers", "Architects"
                    ],
                    'Social': [
                        "Elementary School Teachers", "Mental Health Counselors", "Clinical Social Workers", "Registered Nurses", "Occupational Therapists", 
                        "Human Resources Specialists", "Speech-Language Pathologists", "School Psychologists", "Community Health Workers", "Physical Therapists"
                    ],
                    'Enterprising': [
                        "Chief Executives", "Lawyers", "Sales Managers", "Management Analysts", "Marketing Managers", 
                        "Financial Advisors", "Real Estate Brokers", "Public Relations Specialists", "Investment Bankers", "Operations Managers"
                    ],
                    'Conventional': [
                        "Accountants & Auditors", "Financial Managers", "Executive Assistants", "Budget Analysts", "Tax Preparers", 
                        "Office Managers", "Paralegals & Legal Assistants", "Actuaries", "Database Administrators", "Librarians"
                    ]
                }
                
                # Assign scores to occupations based on user's interest profile
                occupation_scores = {}
                for interest, score in norm_user_interests.items():
                    if interest in riasec_occupations:
                        for occupation in riasec_occupations[interest]:
                            occupation_scores[occupation] = occupation_scores.get(occupation, 0) + score
                
                # Convert to OccupationMatch objects
                matches = [
                    OccupationMatch(
                        title=occupation,
                        correlation=float(score),
                        description=f"Recommended based on your {', '.join(user_holland_code)} interests"
                    )
                    for occupation, score in sorted(occupation_scores.items(), key=lambda x: x[1], reverse=True)
                ]
                
                return matches[:20]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating interest-based recommendations: {str(e)}")

def _calculate_ability_correlations(user_abilities: List[AbilityScore]) -> List[OccupationMatch]:
    """Calculate Pearson correlations between user abilities and occupational profiles"""
    # Load occupation ability data
    try:
        abilities_df = db.storage.dataframes.get("elements-abilities-csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading abilities data: {str(e)}")
    
    # Filter to level scores only
    abilities_df = abilities_df[abilities_df["Scale Name"] == "Level"]
    
    # Create pivot table with occupations as rows and abilities as columns
    occupation_abilities = pd.pivot_table(
        abilities_df, 
        values="Data Value", 
        index="Title", 
        columns="Element Name",
        aggfunc="mean"
    )
    
    # Create a dictionary of user's ability scores
    user_ability_dict = {item.name: item.rating for item in user_abilities}
    
    # Create a Series for the user's ability profile
    user_profile = pd.Series(user_ability_dict)
    
    # Calculate correlations between user profile and each occupation
    correlations = []
    
    # Get only the abilities that exist in both the user profile and occupation data
    common_abilities = set(user_profile.index) & set(occupation_abilities.columns)
    
    if not common_abilities:
        raise HTTPException(status_code=400, detail="No matching abilities found between user data and occupation data")
    
    # Filter data to include only common abilities
    user_profile = user_profile[list(common_abilities)]
    occupation_abilities = occupation_abilities[list(common_abilities)]
    
    # User profile statistics
    user_mean = user_profile.mean()
    user_std = user_profile.std()
    
    # Calculate Pearson correlation for each occupation
    for occupation, row in occupation_abilities.iterrows():
        # Occupation profile statistics
        occ_mean = row.mean()
        occ_std = row.std()
        
        # Skip occupations with zero standard deviation (all same values)
        if user_std == 0 or occ_std == 0:
            continue
        
        # Calculate the Pearson correlation coefficient
        sum_product = sum((user_profile - user_mean) * (row - occ_mean))
        correlation = sum_product / (len(common_abilities) * user_std * occ_std)
        
        correlations.append(OccupationMatch(
            title=occupation,
            correlation=float(correlation)
        ))
    
    # Sort by correlation in descending order
    correlations.sort(key=lambda x: x.correlation, reverse=True)
    
    # Return top matches
    return correlations[:20]

def _calculate_knowledge_correlations(user_knowledge: List[KnowledgeScore]) -> List[OccupationMatch]:
    """Calculate Pearson correlations between user knowledge and occupational profiles"""
    # Load occupation knowledge data
    try:
        knowledge_df = db.storage.dataframes.get("elements-knowledge-2-csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading knowledge data: {str(e)}")
    
    # Filter to level scores only
    knowledge_df = knowledge_df[knowledge_df["Scale Name"] == "Level"]
    
    # Create pivot table with occupations as rows and knowledge areas as columns
    occupation_knowledge = pd.pivot_table(
        knowledge_df, 
        values="Data Value", 
        index="Title", 
        columns="Element Name",
        aggfunc="mean"
    )
    
    # Create a dictionary of user's knowledge scores
    user_knowledge_dict = {item.name: item.rating for item in user_knowledge}
    
    # Create a Series for the user's knowledge profile
    user_profile = pd.Series(user_knowledge_dict)
    
    # Calculate correlations between user profile and each occupation
    correlations = []
    
    # Get only the knowledge areas that exist in both the user profile and occupation data
    common_knowledge = set(user_profile.index) & set(occupation_knowledge.columns)
    
    if not common_knowledge:
        raise HTTPException(status_code=400, detail="No matching knowledge areas found between user data and occupation data")
    
    # Filter data to include only common knowledge areas
    user_profile = user_profile[list(common_knowledge)]
    occupation_knowledge = occupation_knowledge[list(common_knowledge)]
    
    # User profile statistics
    user_mean = user_profile.mean()
    user_std = user_profile.std()
    
    # Calculate Pearson correlation for each occupation
    for occupation, row in occupation_knowledge.iterrows():
        # Occupation profile statistics
        occ_mean = row.mean()
        occ_std = row.std()
        
        # Skip occupations with zero standard deviation (all same values)
        if user_std == 0 or occ_std == 0:
            continue
        
        # Calculate the Pearson correlation coefficient
        sum_product = sum((user_profile - user_mean) * (row - occ_mean))
        correlation = sum_product / (len(common_knowledge) * user_std * occ_std)
        
        correlations.append(OccupationMatch(
            title=occupation,
            correlation=float(correlation)
        ))
    
    # Sort by correlation in descending order
    correlations.sort(key=lambda x: x.correlation, reverse=True)
    
    # Return top matches
    return correlations[:20]