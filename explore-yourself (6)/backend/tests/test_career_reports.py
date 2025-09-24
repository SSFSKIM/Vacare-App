from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import types
from types import SimpleNamespace

databutton_app = types.ModuleType("databutton_app")
mw_module = types.ModuleType("databutton_app.mw")
auth_module = types.ModuleType("databutton_app.mw.auth_mw")


class _DummyUser:  # pragma: no cover - simple shim for imports
    sub: str = "test-user"


def _dummy_get_authorized_user(*_args, **_kwargs):  # pragma: no cover
    return _DummyUser()


auth_module.User = _DummyUser
auth_module.get_authorized_user = _dummy_get_authorized_user

sys.modules.setdefault("databutton_app", databutton_app)
sys.modules.setdefault("databutton_app.mw", mw_module)
sys.modules.setdefault("databutton_app.mw.auth_mw", auth_module)

databutton_stub = types.ModuleType("databutton")
databutton_stub.secrets = SimpleNamespace(get=lambda _key: "{}")
sys.modules.setdefault("databutton", databutton_stub)

firebase_admin_stub = types.ModuleType("firebase_admin")
firebase_admin_stub._apps = []
firebase_admin_stub.initialize_app = lambda *_args, **_kwargs: None  # pragma: no cover

firebase_credentials_stub = types.ModuleType("firebase_admin.credentials")
firebase_credentials_stub.Certificate = lambda data: data  # pragma: no cover

firebase_firestore_stub = types.ModuleType("firebase_admin.firestore")
firebase_firestore_stub.client = lambda: None  # pragma: no cover

sys.modules.setdefault("firebase_admin", firebase_admin_stub)
sys.modules.setdefault("firebase_admin.credentials", firebase_credentials_stub)
sys.modules.setdefault("firebase_admin.firestore", firebase_firestore_stub)

from app.apis.career_reports import (  # noqa: E402
    CareerRecommendation,
    ComprehensiveReport,
    InterestExplorationEntry,
    NextSteps,
    ReportSections,
    StrengthItem,
    _extract_json_content,
    _render_report_to_text,
    _summarise_snapshot,
)


def test_summarise_snapshot_counts_completed_sections() -> None:
    snapshot = {
        "interest": {"results": [1, 2]},
        "ability": {"results": []},
        "knowledge": {"results": [1]},
        "skills": {"results": []},
    }

    summary = _summarise_snapshot(snapshot)

    assert summary["completed_assessments"] == ["interest", "knowledge"]
    assert summary["data_quality"] == "Medium"


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("{\"foo\": \"bar\"}", {"foo": "bar"}),
        ("```json\n{\\\"foo\\\": \\\"bar\\\"}\n```", {"foo": "bar"}),
    ],
)
def test_extract_json_content_parses_valid_payload(raw: str, expected: dict) -> None:
    assert _extract_json_content(raw) == expected


def test_extract_json_content_raises_for_invalid_json() -> None:
    with pytest.raises(HTTPException):
        _extract_json_content("not-json")


def test_render_report_to_text_includes_major_sections() -> None:
    report = ComprehensiveReport(
        reportId="report-1",
        userId="user-1",
        generatedAt=datetime.now(timezone.utc),
        lastUpdated=datetime.now(timezone.utc),
        model="gpt-5.0",
        promptVersion="1.0",
        dataQuality="High",
        completedAssessments=["interest", "ability"],
        sections=ReportSections(
            executiveSummary="Strong fit for collaborative work.",
            strengthsAnalysis=[
                StrengthItem(
                    title="Empathy",
                    category="Social",
                    score=88,
                    insight="You build trust quickly and support peers effectively.",
                )
            ],
            careerPathRecommendations=[
                CareerRecommendation(
                    title="Career Coach",
                    matchScore=92,
                    rationale="Aligns with interpersonal strengths and reflective interests.",
                    developmentActions=["Shadow an experienced coach"]
                )
            ],
            interestExplorationGuide=[
                InterestExplorationEntry(
                    area="Learning & Development",
                    insight="You enjoy facilitating growth in others.",
                    suggestedActivities=["Volunteer for mentorship programs"],
                )
            ],
            nextSteps=NextSteps(
                immediate=["Document recent achievements"],
                shortTerm=["Complete a coaching certification"],
                longTerm=["Launch a group coaching practice"],
            ),
            additionalResources=["International Coaching Federation"]
        ),
        rawAssessmentSnapshot={"mock": True},
        parentReportId=None,
    )

    text_output = _render_report_to_text(report)

    assert "EXECUTIVE SUMMARY" in text_output
    assert "CAREER PATH RECOMMENDATIONS" in text_output
    assert "NEXT STEPS" in text_output
