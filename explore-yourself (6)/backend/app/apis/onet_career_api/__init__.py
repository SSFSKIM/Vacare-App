"""O*NET Career Overview API integration."""
import os
import logging
from typing import Optional, Dict, Any, List
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
    # Validate that the URL is from O*NET
    if not url.startswith("https://www.onetonline.org/") and not url.startswith("http://www.onetonline.org/"):
        raise HTTPException(
            status_code=400,
            detail="Only O*NET Online URLs are allowed"
        )

    try:
        async with httpx.AsyncClient(timeout=ONET_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(
                url,
                auth=(ONET_USERNAME, ONET_PASSWORD),
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "User-Agent": "Mozilla/5.0 (compatible; VACareApp/1.0)"
                }
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

            # Return HTML response
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=response.text, status_code=200)

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
