"""Shared Firebase Admin initialization and Firestore helpers."""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Optional

import databutton as db
import firebase_admin
from firebase_admin import credentials, firestore


class FirebaseInitializationError(RuntimeError):
    """Raised when the Firebase Admin SDK cannot be initialised."""


def _load_service_account() -> dict:
    """Load the Firebase service account credentials from env or Databutton secrets."""
    raw_credentials: Optional[str] = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")

    if not raw_credentials:
        try:
            raw_credentials = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        except Exception as exc:  # pragma: no cover - secret lookup failure is logged and raised
            raise FirebaseInitializationError(
                "FIREBASE_SERVICE_ACCOUNT_KEY secret is not available"
            ) from exc

    try:
        return json.loads(raw_credentials)
    except json.JSONDecodeError as exc:
        raise FirebaseInitializationError("Invalid Firebase service account JSON") from exc


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.Client:
    """Initialise (once) and return a Firestore client."""
    if not firebase_admin._apps:
        credentials_dict = _load_service_account()
        cred = credentials.Certificate(credentials_dict)
        firebase_admin.initialize_app(cred)

    try:
        return firestore.client()
    except Exception as exc:  # pragma: no cover - firestore client errors surfaced to caller
        raise FirebaseInitializationError("Unable to obtain Firestore client") from exc


def get_assessments_collection() -> firestore.CollectionReference:
    """Return the root collection reference for assessments."""
    return get_firestore_client().collection("assessments")


def get_reports_collection(user_id: str) -> firestore.CollectionReference:
    """Return the reports sub-collection for a user."""
    return get_assessments_collection().document(user_id).collection("reports")
