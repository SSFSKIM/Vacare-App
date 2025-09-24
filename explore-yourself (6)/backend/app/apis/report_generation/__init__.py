"""Endpoints for orchestrating comprehensive report generation workflows."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import databutton as db
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

router = APIRouter()


def _resolve_webhook_url() -> Optional[str]:
    """Resolve the downstream automation webhook URL from env or Databutton secrets."""
    env_value = os.getenv("COMPREHENSIVE_REPORT_WEBHOOK_URL")
    if env_value:
        return env_value

    try:
        return db.secrets.get("COMPREHENSIVE_REPORT_WEBHOOK_URL")
    except Exception as exc:  # pragma: no cover - secret access errors logged for observability
        print(f"Failed to load COMPREHENSIVE_REPORT_WEBHOOK_URL secret: {exc}")
        return None


WEBHOOK_URL = _resolve_webhook_url()


class GenerateReportRequest(BaseModel):
    """Payload submitted by the frontend to trigger report generation."""

    user_id: str = Field(..., alias="userId", description="Firebase user identifier")
    user_email: Optional[EmailStr] = Field(
        None, alias="userEmail", description="Optional email for notifications"
    )

    model_config = ConfigDict(populate_by_name=True)


class GenerateReportResponse(BaseModel):
    """Structured response returned after the workflow completes."""

    success: bool = Field(..., description="Indicates whether the workflow completed successfully")
    report: Optional[Dict[str, Any]] = Field(
        None, description="Detailed report payload returned by downstream automation"
    )
    summary: Optional[Dict[str, Any]] = Field(
        None, description="High-level metadata summarising the generated report"
    )

    model_config = ConfigDict(extra="allow")


@router.post("/generate-comprehensive-report", response_model=GenerateReportResponse)
async def generate_comprehensive_report(payload: GenerateReportRequest) -> GenerateReportResponse:
    """Trigger the comprehensive report workflow via the configured automation webhook."""
    if not WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="Report generation service is not configured")

    request_body = {
        "userId": payload.user_id,
        "userEmail": payload.user_email,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(WEBHOOK_URL, json=request_body)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text
            raise HTTPException(status_code=exc.response.status_code, detail=detail)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Failed to reach report service: {exc}") from exc

    try:
        response_payload: Dict[str, Any] = response.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Invalid response from report service") from exc

    try:
        return GenerateReportResponse.model_validate(response_payload)
    except Exception as exc:
        print(f"Report response validation failed: {exc}")
        raise HTTPException(status_code=502, detail="Unexpected report response structure") from exc
