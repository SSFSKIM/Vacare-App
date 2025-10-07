"""Endpoints for AI-powered career report generation and management."""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

try:  # OpenAI SDK 1.x
    from openai import APIConnectionError, APIError, RateLimitError
except ImportError:  # pragma: no cover - fallback for legacy SDKs
    from openai.error import APIConnectionError, APIError, RateLimitError  # type: ignore
from pydantic import BaseModel, ConfigDict, Field

from app.auth.user import AuthorizedUser
from app.services.firebase import (
    FirebaseInitializationError,
    get_assessments_collection,
    get_reports_collection,
)
from app.storage_utils import get_text_data

# Constants -----------------------------------------------------------------
OPENAI_MODEL = os.getenv("OPENAI_REPORT_MODEL", "gpt-4")
PROMPT_VERSION = "2025-10-05-personality-insights"
GENERATION_COOLDOWN_SECONDS = int(os.getenv("REPORT_GENERATION_COOLDOWN_SECONDS", "45"))
OPENAI_TIMEOUT_SECONDS = int(os.getenv("OPENAI_REPORT_TIMEOUT_SECONDS", "120"))
OPENAI_MAX_RETRIES = int(os.getenv("OPENAI_REPORT_MAX_RETRIES", "3"))

_EXECUTIVE_SCHEMA_HINT = {
    "reportId": "string",
    "userId": "string",
    "generatedAt": "ISO-8601 timestamp",
    "model": "string",
    "promptVersion": "string",
    "dataQuality": "High | Medium | Low",
    "completedAssessments": ["interest", "ability", "knowledge", "skills"],
    "sections": {
        "executiveSummary": "string",
        "strengthsAnalysis": [
            {
                "title": "string",
                "category": "string",
                "score": "number",
                "insight": "string"
            }
        ],
        "careerPathRecommendations": [
            {
                "title": "string",
                "matchScore": "number",
                "rationale": "string",
                "developmentActions": ["string"],
            }
        ],
        "interestExplorationGuide": [
            {
                "area": "string",
                "insight": "string",
                "suggestedActivities": ["string"],
            }
        ],
        "nextSteps": {
            "immediate": ["string"],
            "shortTerm": ["string"],
            "longTerm": ["string"],
        },
        "additionalResources": ["string"]
    },
    "rawAssessmentSnapshot": "Assessment data used to build the report (object)"
}

# Models --------------------------------------------------------------------


class StrengthItem(BaseModel):
    title: str
    category: Optional[str] = None
    score: Optional[float] = None
    insight: str


class CareerRecommendation(BaseModel):
    title: str
    rationale: str
    matchScore: Optional[float] = None
    developmentActions: List[str] = Field(default_factory=list)


class InterestExplorationEntry(BaseModel):
    area: str
    insight: str
    suggestedActivities: List[str] = Field(default_factory=list)


class NextSteps(BaseModel):
    immediate: List[str] = Field(default_factory=list)
    shortTerm: List[str] = Field(default_factory=list)
    longTerm: List[str] = Field(default_factory=list)


class ReportSections(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    executiveSummary: str
    strengthsAnalysis: List[StrengthItem] = Field(default_factory=list)
    careerPathRecommendations: List[CareerRecommendation] = Field(default_factory=list)
    interestExplorationGuide: List[InterestExplorationEntry] = Field(default_factory=list)
    nextSteps: NextSteps
    additionalResources: List[str] = Field(default_factory=list)


class ComprehensiveReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    reportId: str
    userId: str
    generatedAt: datetime
    lastUpdated: datetime
    model: str
    promptVersion: str
    dataQuality: str
    completedAssessments: List[str]
    sections: ReportSections
    rawAssessmentSnapshot: Dict[str, Any]
    parentReportId: Optional[str] = None


class ReportSummary(BaseModel):
    reportId: str
    generatedAt: datetime
    dataQuality: str
    completedAssessments: List[str]
    model: str
    promptVersion: str


class GenerateReportResponse(BaseModel):
    success: bool
    report: ComprehensiveReport


class GenerateReportRequest(BaseModel):
    userId: str = Field(..., alias="userId")
    forceRegenerate: bool = Field(False, alias="forceRegenerate")
    sourceReportId: Optional[str] = Field(default=None, alias="sourceReportId")

    model_config = ConfigDict(populate_by_name=True)


class ReportListResponse(BaseModel):
    reports: List[ReportSummary]


# Router --------------------------------------------------------------------

router = APIRouter()


# Helpers -------------------------------------------------------------------


def _load_assessment_element_definitions() -> Dict[str, Dict[str, Any]]:
    """Load detailed definitions for all assessment elements (abilities, knowledge, skills)."""
    definitions = {}

    # Load abilities
    try:
        ability_data = get_text_data("abilty-cleaned-1-txt")
        current_element = None

        for line in ability_data.split('\n'):
            line = line.strip()
            if not line:
                continue

            if line.startswith('Element Name:'):
                if current_element:
                    definitions[current_element['name']] = current_element
                name = line.replace('Element Name:', '').strip()
                current_element = {
                    'name': name,
                    'type': 'ability',
                    'description': '',
                    'examples': []
                }
            elif line.startswith('Description:') and current_element:
                current_element['description'] = line.replace('Description:', '').strip()
            elif line.startswith('Level ') and current_element:
                try:
                    example = line.split(':', 1)[1].strip()
                    current_element['examples'].append(example)
                except IndexError:
                    pass

        if current_element:
            definitions[current_element['name']] = current_element
    except Exception as e:
        print(f"Warning: Could not load ability definitions: {e}")

    # Load knowledge
    try:
        knowledge_data = get_text_data("knowledge-cleaned-1-txt")
        current_element = None

        for line in knowledge_data.split('\n'):
            line = line.strip()
            if not line:
                continue

            if line.startswith('Element Name:'):
                if current_element:
                    definitions[current_element['name']] = current_element
                name = line.replace('Element Name:', '').strip()
                current_element = {
                    'name': name,
                    'type': 'knowledge',
                    'description': '',
                    'examples': []
                }
            elif line.startswith('Description:') and current_element:
                current_element['description'] = line.replace('Description:', '').strip()
            elif line.startswith('Level ') and current_element:
                try:
                    example = line.split(':', 1)[1].strip()
                    current_element['examples'].append(example)
                except IndexError:
                    pass

        if current_element:
            definitions[current_element['name']] = current_element
    except Exception as e:
        print(f"Warning: Could not load knowledge definitions: {e}")

    # Load skills
    try:
        skills_data = get_text_data("skills-cleaned-1-txt")
        current_element = None

        for line in skills_data.split('\n'):
            line = line.strip()
            if not line:
                continue

            if line.startswith('Element Name:'):
                if current_element:
                    definitions[current_element['name']] = current_element
                name = line.replace('Element Name:', '').strip()
                current_element = {
                    'name': name,
                    'type': 'skill',
                    'description': '',
                    'examples': []
                }
            elif line.startswith('Description:') and current_element:
                current_element['description'] = line.replace('Description:', '').strip()
            elif line.startswith('Level ') and current_element:
                try:
                    example = line.split(':', 1)[1].strip()
                    current_element['examples'].append(example)
                except IndexError:
                    pass

        if current_element:
            definitions[current_element['name']] = current_element
    except Exception as e:
        print(f"Warning: Could not load skills definitions: {e}")

    return definitions


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_assessment_snapshot(user_id: str) -> Dict[str, Any]:
    def _get_snapshot() -> Dict[str, Any]:
        doc = get_assessments_collection().document(user_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Assessment data not found")
        return doc.to_dict()

    try:
        return await asyncio.to_thread(_get_snapshot)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _summarise_snapshot(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    completed = []
    if snapshot.get("interest", {}).get("results"):
        completed.append("interest")
    if snapshot.get("ability", {}).get("results"):
        completed.append("ability")
    if snapshot.get("knowledge", {}).get("results"):
        completed.append("knowledge")
    if snapshot.get("skills", {}).get("results"):
        completed.append("skills")

    data_quality = "Low"
    if len(completed) >= 3:
        data_quality = "High"
    elif len(completed) >= 2:
        data_quality = "Medium"

    return {
        "completed_assessments": completed,
        "data_quality": data_quality,
    }


def _build_system_prompt() -> str:
    return (
        "You are a deeply insightful career counselor and personality analyst with expertise in vocational psychology, "
        "the RIASEC model, and O*NET career frameworks such as ability/skill/knowledge. Your mission is to provide profound, meaningful insights about "
        "who this person truly is - not just what they scored on tests.\n\n"

        "CRITICAL GUIDELINES:\n"
        "1. GO BEYOND SUMMARIZATION: Don't just repeat test scores. Instead, synthesize patterns to reveal:\n"
        "   - The person's core nature and intrinsic motivations\n"
        "   - What kinds of activities would bring them genuine joy and fulfillment\n"
        "   - What they're naturally gifted at (even if they don't realize it yet)\n"
        "   - What types of environments would energize vs drain them\n"
        "   - The unique combination of traits that makes them who they are\n\n"

        "2. UNDERSTAND THE ELEMENTS DEEPLY:\n"
        "   - Each ability, knowledge area, and skill has been defined with examples at different proficiency levels\n"
        "   - Use these definitions to understand what high/low scores truly mean about the person\n"
        "   - Consider the interplay between different elements (e.g., high visual-spatial + high originality suggests creative visual thinking)\n\n"

        "3. PROVIDE MEANINGFUL INSIGHTS:\n"
        "   - Identify what drives and excites this person\n"
        "   - Reveal potential they might not see in themselves\n"
        "   - Explain HOW their unique pattern of strengths can be leveraged\n"
        "   - Suggest what types of work would feel 'right' vs 'wrong' for them\n"
        "   - Paint a picture of their ideal work environment and activities\n\n"

        "4. BE SPECIFIC AND PERSONALIZED:\n"
        "   - Avoid generic statements that could apply to anyone\n"
        "   - Reference specific combinations of their results\n"
        "   - Give concrete examples of how their strengths manifest in real activities\n"
        "   - Suggest specific types of projects, roles, or pursuits they'd find meaningful\n\n"

        "5. FOCUS ON PASSION AND PURPOSE:\n"
        "   - What would this person find genuinely fun or engaging?\n"
        "   - What causes or types of problems would they care about solving?\n"
        "   - What kind of impact would be most fulfilling for them?\n\n"

        "Your tone should be warm, insightful, validating, and empowering. Make the person feel truly SEEN and understood. "
        "Help them recognize their unique gifts and potential paths to fulfillment.\n\n"

        "Output must be valid JSON matching the schema provided, but the CONTENT should be rich with psychological insight and meaning."
    )


def _build_user_payload(user_id: str, snapshot: Dict[str, Any], summary: Dict[str, Any]) -> Dict[str, Any]:
    # Load element definitions for context
    element_definitions = _load_assessment_element_definitions()

    # Build contextual information about what the scores mean
    context_insights = {
        "elementDefinitions": element_definitions,
        "interpretationGuide": {
            "abilities": "Each ability score represents proficiency level. Use the examples to understand what high/low scores mean in practical terms.",
            "knowledge": "Knowledge areas indicate familiarity and depth. High scores suggest genuine expertise and interest in that domain.",
            "skills": "Skills represent learned capabilities. Consider which skills the person has developed and what that reveals about their experiences and interests.",
            "interests": "RIASEC scores reveal core motivations. The highest areas show what energizes them; combinations reveal unique personality patterns."
        },
        "analysisPrompts": [
            "What unique combination of traits does this person possess?",
            "What would genuinely excite and fulfill this person?",
            "What natural gifts might they not fully recognize in themselves?",
            "What type of work environment would bring out their best?",
            "What kinds of problems or causes would they be passionate about?",
            "How do their interests, abilities, knowledge, and skills work together?",
            "What activities would feel intrinsically rewarding to them?"
        ]
    }

    return {
        "instructions": (
            "Produce valid JSON (no markdown) that matches the schema hints exactly.\n\n"
            "YOUR PRIMARY GOAL: Provide deep, meaningful insights about who this person is - their core nature, "
            "what drives them, what they'd find fulfilling, and their unique gifts. Go FAR beyond just summarizing scores.\n\n"
            "USE THE ELEMENT DEFINITIONS: Understand what each ability/knowledge/skill actually means by reading the "
            "descriptions and examples. This will help you interpret scores in a meaningful way.\n\n"
            "SYNTHESIZE PATTERNS: Look for the interplay between different assessment areas. How do their interests "
            "align with their abilities? What unique combinations emerge? What does this reveal about them?\n\n"
            "BE INSIGHTFUL: Every section should reveal something meaningful about the person - not just report data."
        ),
        "schema": _EXECUTIVE_SCHEMA_HINT,
        "userContext": {
            "userId": user_id,
            "timestamp": _now().isoformat(),
            "completedAssessments": summary["completed_assessments"],
            "dataQuality": summary["data_quality"],
        },
        "assessmentData": snapshot,
        "context": context_insights,
        "reportingGuidance": {
            "executiveSummary": "Paint a vivid picture of who this person is at their core. What makes them unique? What drives them? What would bring them fulfillment?",
            "strengthsAnalysis": "Go beyond listing strengths - explain what each strength reveals about the person and how it manifests in their life. Make connections between different strengths.",
            "careerPathRecommendations": "Explain WHY each career would be fulfilling (not just a good match). What about it would excite them? What needs would it satisfy?",
            "interestExplorationGuide": "Suggest activities they'd find genuinely fun, meaningful, or energizing. Help them discover passions they might not have considered.",
            "nextSteps": "Provide actionable steps that align with who they are and what would be meaningful to them."
        },
        "style": {
            "tone": "Warm, insightful, validating, empowering - make them feel truly seen and understood",
            "approach": "Psychological depth with practical application",
            "focus": "Meaning, fulfillment, and self-understanding",
            "format": "JSON"
        },
    }


def _extract_json_content(raw_output: str) -> Dict[str, Any]:
    content = raw_output.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.lower().startswith("json"):
            content = content[4:]
    content = content.strip()
    content = bytes(content, "utf-8").decode("unicode_escape")
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="OpenAI returned invalid JSON") from exc


async def _call_openai(messages: List[Dict[str, str]]) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=api_key, timeout=OPENAI_TIMEOUT_SECONDS)

    last_error: Optional[Exception] = None

    for attempt in range(1, OPENAI_MAX_RETRIES + 1):
        try:
            # Use max_completion_tokens for newer models (gpt-5-mini), max_tokens for older models
            completion_params = {
                "model": OPENAI_MODEL,
                "messages": messages,
            }

            # GPT-5-mini and newer models use max_completion_tokens and only support temperature=1
            if "gpt-5" in OPENAI_MODEL.lower():
                completion_params["max_completion_tokens"] = 2048
                # GPT-5 only supports default temperature of 1, so we don't set it
            else:
                completion_params["max_tokens"] = 2048
                completion_params["temperature"] = 0.4

            response = await client.chat.completions.create(**completion_params)
            if response.choices and len(response.choices) > 0:
                choice = response.choices[0]
                if choice.message and choice.message.content:
                    return choice.message.content

            raise HTTPException(status_code=502, detail="Empty response from OpenAI")
        except (RateLimitError, APIConnectionError) as exc:
            last_error = exc
            await asyncio.sleep(min(10, 2 ** attempt))
        except APIError as exc:
            last_error = exc
            break

    raise HTTPException(status_code=502, detail=f"OpenAI request failed: {last_error}")


async def _store_report(report: ComprehensiveReport) -> None:
    def _persist() -> None:
        reports_ref = get_reports_collection(report.userId)
        reports_ref.document(report.reportId).set(report.model_dump(mode="json"))

    try:
        await asyncio.to_thread(_persist)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _load_reports(user_id: str) -> List[ComprehensiveReport]:
    def _fetch() -> List[ComprehensiveReport]:
        reports_ref = get_reports_collection(user_id)
        docs = (
            reports_ref.order_by("generatedAt", direction="DESCENDING").stream()
        )
        results: List[ComprehensiveReport] = []
        for doc in docs:
            payload = doc.to_dict()
            results.append(ComprehensiveReport.model_validate(payload))
        return results

    try:
        return await asyncio.to_thread(_fetch)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _load_report(user_id: str, report_id: str) -> ComprehensiveReport:
    def _fetch() -> ComprehensiveReport:
        doc = get_reports_collection(user_id).document(report_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Report not found")
        payload = doc.to_dict()
        return ComprehensiveReport.model_validate(payload)

    try:
        return await asyncio.to_thread(_fetch)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _assert_cooldown(user_id: str, force_regenerate: bool) -> None:
    if force_regenerate:
        return

    def _latest_timestamp() -> Optional[datetime]:
        reports_ref = get_reports_collection(user_id)
        docs = (
            reports_ref.order_by("generatedAt", direction="DESCENDING").limit(1).stream()
        )
        for doc in docs:
            payload = doc.to_dict()
            ts = payload.get("generatedAt")
            if isinstance(ts, datetime):
                return ts
        return None

    try:
        last_ts = await asyncio.to_thread(_latest_timestamp)
    except FirebaseInitializationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if last_ts:
        delta = _now() - last_ts
        if delta < timedelta(seconds=GENERATION_COOLDOWN_SECONDS):
            wait_seconds = int((timedelta(seconds=GENERATION_COOLDOWN_SECONDS) - delta).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait_seconds} seconds before generating another report.",
            )


def _prepare_report_payload(
    user_id: str,
    report_json: Dict[str, Any],
    summary: Dict[str, Any],
    snapshot: Dict[str, Any],
    source_report_id: Optional[str],
) -> ComprehensiveReport:
    report_id = report_json.get("reportId") or str(uuid4())
    generated_at = _now()

    payload = {
        **report_json,
        "reportId": report_id,
        "userId": user_id,
        "generatedAt": generated_at,
        "lastUpdated": generated_at,
        "model": report_json.get("model", OPENAI_MODEL),
        "promptVersion": report_json.get("promptVersion", PROMPT_VERSION),
        "dataQuality": summary["data_quality"],
        "completedAssessments": summary["completed_assessments"],
        "rawAssessmentSnapshot": snapshot,
        "parentReportId": source_report_id,
    }

    try:
        return ComprehensiveReport.model_validate(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Report generation returned unexpected structure") from exc


def _render_report_to_text(report: ComprehensiveReport) -> str:
    sections = report.sections
    lines = [
        f"Comprehensive Career Report for {report.userId}",
        f"Generated: {report.generatedAt.isoformat()}",
        f"Model: {report.model}",
        "",
        "EXECUTIVE SUMMARY",
        sections.executiveSummary,
        "",
        "STRENGTHS ANALYSIS",
    ]

    for strength in sections.strengthsAnalysis:
        score = f" (score: {strength.score})" if strength.score is not None else ""
        category = f"[{strength.category}] " if strength.category else ""
        lines.append(f"- {category}{strength.title}{score}: {strength.insight}")

    lines.append("")
    lines.append("CAREER PATH RECOMMENDATIONS")
    for rec in sections.careerPathRecommendations:
        score = f" (match: {rec.matchScore}%)" if rec.matchScore is not None else ""
        lines.append(f"- {rec.title}{score}: {rec.rationale}")
        for action in rec.developmentActions:
            lines.append(f"    • {action}")

    lines.append("")
    lines.append("INTEREST EXPLORATION GUIDE")
    for guide in sections.interestExplorationGuide:
        lines.append(f"- {guide.area}: {guide.insight}")
        for activity in guide.suggestedActivities:
            lines.append(f"    • {activity}")

    lines.append("")
    lines.append("NEXT STEPS")
    lines.append("Immediate:")
    lines.extend(f"  • {item}" for item in sections.nextSteps.immediate)
    lines.append("Short term:")
    lines.extend(f"  • {item}" for item in sections.nextSteps.shortTerm)
    lines.append("Long term:")
    lines.extend(f"  • {item}" for item in sections.nextSteps.longTerm)

    if sections.additionalResources:
        lines.append("")
        lines.append("ADDITIONAL RESOURCES")
        lines.extend(f"- {item}" for item in sections.additionalResources)

    return "\n".join(lines)


def _render_report_to_pdf(report: ComprehensiveReport) -> bytes:
    try:
        from fpdf import FPDF
    except ImportError as exc:  # pragma: no cover - dependency issues surfaced to caller
        raise HTTPException(status_code=500, detail="PDF generation dependency missing") from exc

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, "Comprehensive Career Report")

    pdf.set_font("Helvetica", size=12)
    pdf.multi_cell(0, 8, f"User: {report.userId}")
    pdf.multi_cell(0, 8, f"Generated: {report.generatedAt.strftime('%Y-%m-%d %H:%M %Z')}")
    pdf.multi_cell(0, 8, f"Model: {report.model}")
    pdf.ln(4)

    def write_section(title: str, body: str) -> None:
        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(0, 8, title)
        pdf.set_font("Helvetica", size=11)
        pdf.multi_cell(0, 6, body)
        pdf.ln(2)

    sections = report.sections
    write_section("Executive Summary", sections.executiveSummary)

    pdf.set_font("Helvetica", "B", 13)
    pdf.multi_cell(0, 8, "Strengths Analysis")
    pdf.set_font("Helvetica", size=11)
    for strength in sections.strengthsAnalysis:
        score = f" (score: {strength.score})" if strength.score is not None else ""
        category = f"[{strength.category}] " if strength.category else ""
        pdf.multi_cell(0, 6, f"• {category}{strength.title}{score}")
        pdf.multi_cell(0, 6, f"  {strength.insight}")
        pdf.ln(1)

    pdf.set_font("Helvetica", "B", 13)
    pdf.multi_cell(0, 8, "Career Path Recommendations")
    pdf.set_font("Helvetica", size=11)
    for rec in sections.careerPathRecommendations:
        score = f" (match: {rec.matchScore}%)" if rec.matchScore is not None else ""
        pdf.multi_cell(0, 6, f"• {rec.title}{score}")
        pdf.multi_cell(0, 6, f"  {rec.rationale}")
        for action in rec.developmentActions:
            pdf.multi_cell(0, 6, f"    - {action}")
        pdf.ln(1)

    pdf.set_font("Helvetica", "B", 13)
    pdf.multi_cell(0, 8, "Interest Exploration Guide")
    pdf.set_font("Helvetica", size=11)
    for guide in sections.interestExplorationGuide:
        pdf.multi_cell(0, 6, f"• {guide.area}")
        pdf.multi_cell(0, 6, f"  {guide.insight}")
        for activity in guide.suggestedActivities:
            pdf.multi_cell(0, 6, f"    - {activity}")
        pdf.ln(1)

    pdf.set_font("Helvetica", "B", 13)
    pdf.multi_cell(0, 8, "Next Steps")
    pdf.set_font("Helvetica", size=11)
    pdf.multi_cell(0, 6, "Immediate:")
    for item in sections.nextSteps.immediate:
        pdf.multi_cell(0, 6, f"  - {item}")
    pdf.multi_cell(0, 6, "Short term:")
    for item in sections.nextSteps.shortTerm:
        pdf.multi_cell(0, 6, f"  - {item}")
    pdf.multi_cell(0, 6, "Long term:")
    for item in sections.nextSteps.longTerm:
        pdf.multi_cell(0, 6, f"  - {item}")

    if sections.additionalResources:
        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(0, 8, "Additional Resources")
        pdf.set_font("Helvetica", size=11)
        for item in sections.additionalResources:
            pdf.multi_cell(0, 6, f"• {item}")

    return pdf.output(dest="S").encode("latin1")


# Routes --------------------------------------------------------------------


@router.post("/reports/generate", response_model=GenerateReportResponse)
async def generate_report(
    payload: GenerateReportRequest,
    user: AuthorizedUser,
) -> GenerateReportResponse:
    if payload.userId != user.sub:
        raise HTTPException(status_code=403, detail="User mismatch for report generation")

    await _assert_cooldown(user.sub, payload.forceRegenerate)

    snapshot = await _fetch_assessment_snapshot(user.sub)
    summary = _summarise_snapshot(snapshot)
    if not summary["completed_assessments"]:
        raise HTTPException(status_code=400, detail="Complete at least one assessment before generating a report")

    system_prompt = _build_system_prompt()
    user_payload = _build_user_payload(user.sub, snapshot, summary)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
    ]

    raw_output = await _call_openai(messages)
    report_json = _extract_json_content(raw_output)

    report = _prepare_report_payload(user.sub, report_json, summary, snapshot, payload.sourceReportId)
    await _store_report(report)

    return GenerateReportResponse(success=True, report=report)


@router.get("/reports", response_model=ReportListResponse)
async def list_reports(user: AuthorizedUser) -> ReportListResponse:
    reports = await _load_reports(user.sub)
    summaries = [
        ReportSummary(
            reportId=report.reportId,
            generatedAt=report.generatedAt,
            dataQuality=report.dataQuality,
            completedAssessments=report.completedAssessments,
            model=report.model,
            promptVersion=report.promptVersion,
        )
        for report in reports
    ]
    return ReportListResponse(reports=summaries)


@router.get("/reports/{report_id}", response_model=ComprehensiveReport)
async def get_report(report_id: str, user: AuthorizedUser) -> ComprehensiveReport:
    report = await _load_report(user.sub, report_id)
    return report


@router.post("/reports/{report_id}/regenerate", response_model=GenerateReportResponse)
async def regenerate_report(report_id: str, user: AuthorizedUser) -> GenerateReportResponse:
    report = await _load_report(user.sub, report_id)
    payload = GenerateReportRequest(userId=user.sub, forceRegenerate=True, sourceReportId=report.reportId)
    return await generate_report(payload, user)


@router.get("/reports/{report_id}/export")
async def export_report(
    report_id: str,
    user: AuthorizedUser,
    format: str = Query("text", pattern="^(text|pdf)$"),
):
    report = await _load_report(user.sub, report_id)

    if format == "text":
        text_output = _render_report_to_text(report)
        filename = f"career-report-{report.reportId}.txt"
        return StreamingResponse(
            content=iter([text_output.encode("utf-8")]),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    pdf_bytes = _render_report_to_pdf(report)
    filename = f"career-report-{report.reportId}.pdf"
    return StreamingResponse(
        content=iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )
