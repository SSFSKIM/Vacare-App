


# Re-saving to trigger reload
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.services.firebase import FirebaseInitializationError, get_assessments_collection


router = APIRouter()

class UserAssessments(BaseModel):
    interest: Optional[Dict[str, Any]] = Field(None, description="Interest assessment results")
    ability: Optional[Dict[str, Any]] = Field(None, description="Ability assessment results")
    knowledge: Optional[Dict[str, Any]] = Field(None, description="Knowledge assessment results")
    skills: Optional[Dict[str, Any]] = Field(None, description="Skills assessment results")
    career_recommendations: Optional[Dict[str, Any]] = Field(None, description="Career recommendations")


@router.get("/user-assessments/{user_id}", response_model=UserAssessments)
async def get_user_assessments(user_id: str):
    """
    Retrieves all assessment results for a given user from Firestore.
    This includes interest, ability, knowledge, skills, and career recommendations.
    The data is intended for use by an n8n workflow to generate a comprehensive report.
    """
    try:
        assessments_ref = get_assessments_collection().document(user_id)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        doc = assessments_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User assessments not found")

        data = doc.to_dict()

        return UserAssessments(
            interest=data.get('interest'),
            ability=data.get('ability'),
            knowledge=data.get('knowledge'),
            skills=data.get('skills'),
            career_recommendations=data.get('career_recommendations') or data.get('careerRecommendations')
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"An error occurred while fetching user assessments for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error") from e
