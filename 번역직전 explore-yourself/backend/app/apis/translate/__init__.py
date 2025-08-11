from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
import databutton as db
import os

router = APIRouter()

# Initialize OpenAI client
client = OpenAI(api_key=db.secrets.get("OPENAI_API_KEY"))

class TranslationRequest(BaseModel):
    text: str
    target_language: str = "Korean"

class TranslationResponse(BaseModel):
    translated_text: str

@router.post("/translate", response_model=TranslationResponse)
def translate_text(request: TranslationRequest) -> TranslationResponse:
    """
    Translates the given text to the target language using OpenAI.
    """
    print(f"Received translation request for: '{request.text}' to {request.target_language}")
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant that translates text from English to {request.target_language}.",
                },
                {"role": "user", "content": request.text},
            ],
            temperature=0,
        )
        print(f"OpenAI response: {completion}")
        translated_text = completion.choices[0].message.content
        if not translated_text:
            print("Translation result is empty, returning original text.")
            return TranslationResponse(translated_text=request.text)

        return TranslationResponse(translated_text=translated_text.strip())
    except Exception as e:
        print(f"Error during translation: {e}")
        # In case of an error, return the original text
        return TranslationResponse(translated_text=request.text)
