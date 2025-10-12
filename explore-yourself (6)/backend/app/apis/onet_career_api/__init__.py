"""O*NET Career Overview API integration."""
import os
import logging
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import urlparse
import json
import html
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/onet-career")
logger = logging.getLogger(__name__)

# O*NET API Configuration
ONET_API_BASE = "https://services.onetcenter.org/ws/mnm/careers"
ONET_USERNAME = os.getenv("ONET_USERNAME", "exploreyourself")
ONET_PASSWORD = os.getenv("ONET_PASSWORD", "3364miw")
ONET_TIMEOUT = 30.0


class AlsoCalled(BaseModel):
    title: List[str] = []


class OnTheJob(BaseModel):
    task: List[str] = []


class CareerTags(BaseModel):
    bright_outlook: bool = False
    green: bool = False
    apprenticeship: bool = False


class ResourceLink(BaseModel):
    href: str
    title: str


class ResourceList(BaseModel):
    resource: List[ResourceLink] = []


class CareerOverview(BaseModel):
    code: str
    title: str
    tags: Optional[CareerTags] = None
    also_called: Optional[AlsoCalled] = None
    what_they_do: Optional[str] = None
    on_the_job: Optional[OnTheJob] = None
    career_video: bool = False
    resources: Optional[ResourceList] = None


@router.get("/overview/{onet_code}", response_model=CareerOverview)
async def get_career_overview(onet_code: str) -> CareerOverview:
    """
    Fetch career overview from O*NET API.

    Args:
        onet_code: O*NET-SOC code (e.g., "17-2071.00")

    Returns:
        CareerOverview object with detailed career information
    """
    # Validate O*NET code format (basic validation)
    if not onet_code or len(onet_code) < 7:
        raise HTTPException(
            status_code=400,
            detail="Invalid O*NET-SOC code format"
        )

    url = f"{ONET_API_BASE}/{onet_code}"

    try:
        async with httpx.AsyncClient(timeout=ONET_TIMEOUT) as client:
            response = await client.get(
                url,
                auth=(ONET_USERNAME, ONET_PASSWORD),
                headers={"Accept": "application/json"}
            )

            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Career with O*NET code {onet_code} not found"
                )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=500,
                    detail="O*NET API authentication failed"
                )

            if response.status_code != 200:
                logger.error(f"O*NET API returned status {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"O*NET API error: {response.status_code}"
                )

            data = response.json()

            # Parse and validate response
            try:
                career_overview = CareerOverview(**data)
                return career_overview
            except Exception as parse_error:
                logger.error(f"Failed to parse O*NET response: {parse_error}")
                logger.debug(f"Response data: {data}")
                raise HTTPException(
                    status_code=502,
                    detail="Failed to parse O*NET API response"
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="O*NET API request timed out"
        )
    except httpx.RequestError as req_error:
        logger.error(f"O*NET API request failed: {req_error}")
        raise HTTPException(
            status_code=502,
            detail="Failed to connect to O*NET API"
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Unexpected error fetching O*NET data: {error}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching career data"
        )


# Hostname allow list with rendering mode
ALLOWED_HOSTS: Dict[str, str] = {
    "www.onetonline.org": "html",
    "services.onetcenter.org": "json",
}


def _render_json_to_html(source_url: str, payload: Dict[str, Any]) -> str:
    """Convert O*NET JSON payload to a simple HTML document for display."""

    pretty_json = html.escape(json.dumps(payload, indent=2, ensure_ascii=False))
    return (
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        "<title>O*NET Detail</title>"
        "<style>body{font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;"
        "margin:40px;line-height:1.6;background:#f8fafc;color:#0f172a;}"
        "pre{background:#0f172a;color:#f8fafc;padding:24px;border-radius:12px;"
        "overflow:auto;box-shadow:0 20px 45px rgba(15,23,42,0.2);}"
        "a{color:#2563eb;text-decoration:none;}a:hover{text-decoration:underline;}"
        "header{margin-bottom:24px;}h1{margin:0 0 8px 0;font-size:28px;}"
        "p{margin:0 0 16px 0;max-width:720px;}</style></head><body>"
        f"<header><h1>O*NET Web Services Detail</h1>"
        f"<p>This data was retrieved from <a href=\"{html.escape(source_url)}\" target=\"_blank\" rel=\"noopener noreferrer\">{html.escape(source_url)}</a>.</p>"
        "<p>Below is the raw response formatted for readability.</p></header>"
        f"<pre>{pretty_json}</pre>"
        "</body></html>"
    )


def _normalize_onet_url(url: str) -> Tuple[str, str]:
    """Validate and normalize O*NET URL returning (url, mode)."""

    try:
        parsed = urlparse(url)
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.debug("Failed to parse O*NET URL %s: %s", url, exc)
        raise HTTPException(status_code=400, detail="Invalid O*NET URL provided")

    if not parsed.scheme:
        raise HTTPException(status_code=400, detail="O*NET URL must include scheme")

    if parsed.scheme not in {"https", "http"}:
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")

    host_mode = ALLOWED_HOSTS.get(parsed.hostname or "")
    if host_mode is None:
        raise HTTPException(status_code=400, detail="Only O*NET Online URLs are allowed")

    normalized_url = parsed.geturl()
    return normalized_url, host_mode


@router.get("/proxy")
async def proxy_onet_resource(url: str):
    """
    Proxy endpoint to fetch O*NET resources with authentication.
    This allows users to access O*NET resources without being prompted for credentials.

    Args:
        url: The full O*NET resource URL to fetch

    Returns:
        The HTML content from the O*NET resource
    """
    normalized_url, host_mode = _normalize_onet_url(url)

    try:
        async with httpx.AsyncClient(timeout=ONET_TIMEOUT, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; VACareApp/1.0)",
            }

            if host_mode == "html":
                headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            else:
                headers["Accept"] = "application/json"

            response = await client.get(
                normalized_url,
                auth=(ONET_USERNAME, ONET_PASSWORD),
                headers=headers,
            )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=500,
                    detail="O*NET authentication failed"
                )

            if response.status_code != 200:
                logger.error(f"O*NET resource returned status {response.status_code}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to fetch O*NET resource: {response.status_code}"
                )

            from fastapi.responses import HTMLResponse

            if host_mode == "html":
                return HTMLResponse(content=response.text, status_code=200)

            # Convert JSON payload to readable HTML
            try:
                payload = response.json()
            except ValueError:
                logger.error("Expected JSON payload from O*NET services but received non-JSON content")
                raise HTTPException(
                    status_code=502,
                    detail="Received unexpected data format from O*NET"
                )

            html_doc = _render_json_to_html(normalized_url, payload)
            return HTMLResponse(content=html_doc, status_code=200)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request timed out"
        )
    except httpx.RequestError as req_error:
        logger.error(f"Request to O*NET failed: {req_error}")
        raise HTTPException(
            status_code=502,
            detail="Failed to connect to O*NET"
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Unexpected error proxying O*NET resource: {error}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.get("/resource-data")
async def get_onet_resource_json(url: str) -> Dict[str, Any]:
    """Return raw JSON payload for an O*NET resource endpoint."""

    normalized_url, host_mode = _normalize_onet_url(url)

    if host_mode != "json":
        raise HTTPException(
            status_code=400,
            detail="Only O*NET Web Services URLs are allowed"
        )

    try:
        async with httpx.AsyncClient(timeout=ONET_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(
                normalized_url,
                auth=(ONET_USERNAME, ONET_PASSWORD),
                headers={
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (compatible; VACareApp/1.0)",
                },
            )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=500,
                    detail="O*NET authentication failed"
                )

            if response.status_code != 200:
                logger.error(
                    "O*NET resource data returned status %s for %s",
                    response.status_code,
                    normalized_url,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to fetch O*NET resource: {response.status_code}"
                )

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request timed out"
        )
    except httpx.RequestError as req_error:
        logger.error(f"Request to O*NET failed: {req_error}")
        raise HTTPException(
            status_code=502,
            detail="Failed to connect to O*NET"
        )
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover - defensive guard
        logger.error(f"Unexpected error fetching O*NET resource JSON: {error}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.get("/search/{occupation_title}")
async def search_career_by_title(occupation_title: str) -> Dict[str, Any]:
    """
    Helper endpoint to find O*NET code by occupation title.
    This is useful when you have a title but need the code.

    Note: This is a simplified search - for production use,
    consider implementing a proper search/matching service.
    """
    # For now, return a placeholder
    # In production, you'd want to:
    # 1. Load O*NET occupation list
    # 2. Perform fuzzy matching
    # 3. Return best matches with codes

    return {
        "message": "Search functionality not yet implemented",
        "suggestion": "Use the occupation code directly with /overview/{onet_code}",
        "occupation_title": occupation_title
    }
