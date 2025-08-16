

# Re-saving to trigger reload
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import firebase_admin
from firebase_admin import credentials, firestore
import databutton as db
import json

# Initialize Firebase Admin SDK only if it hasn't been initialized yet.
if not firebase_admin._apps:
    try:
        # Retrieve the service account key from Databutton secrets
        key_json_string = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        key_dict = json.loads(key_json_string)
        cred = credentials.Certificate(key_dict)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        # Log the error for debugging. The API endpoints will fail if this part fails.
        print(f"ERROR: Firebase Admin SDK initialization failed: {e}")

# Get the Firestore client
try:
    db_client = firestore.client()
except Exception as e:
    db_client = None
    print(f"ERROR: Could not get Firestore client: {e}")


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
    if db_client is None:
        raise HTTPException(status_code=500, detail="Firestore client not initialized")
        
    try:
        assessments_ref = db_client.collection('assessments').document(user_id)
        doc = assessments_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="User assessments not found")

        data = doc.to_dict()

        return UserAssessments(
            interest=data.get('interest'),
            ability=data.get('ability'),
            knowledge=data.get('knowledge'),
            skills=data.get('skills'),
            career_recommendations=data.get('careerRecommendations')
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"An error occurred while fetching user assessments for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error") from e
