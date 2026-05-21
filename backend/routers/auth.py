import asyncio
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


class ValidateRequest(BaseModel):
    url: str
    username: str
    password: str

    @field_validator("url")
    @classmethod
    def normalise_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not v.startswith("https://"):
            raise ValueError("Instance URL must start with https://")
        return v


class UserInfo(BaseModel):
    username: str
    display_name: str
    email: str


class ApplicationInfo(BaseModel):
    sys_id: str
    name: str
    scope: str


class UpdateSetInfo(BaseModel):
    sys_id: str
    name: str
    state: str


class ValidateResponse(BaseModel):
    valid: bool
    user: UserInfo
    application: Optional[ApplicationInfo] = None
    update_set:  Optional[UpdateSetInfo]   = None


async def _fetch_user(client: httpx.AsyncClient, url: str, username: str, password: str):
    return await client.get(
        f"{url}/api/now/table/sys_user",
        params={
            "sysparm_query":  f"user_name={username}",
            "sysparm_limit":  "1",
            "sysparm_fields": "sys_id,name,user_name,email",
        },
        auth=(username, password),
        headers={"Accept": "application/json"},
    )


async def _fetch_context(client: httpx.AsyncClient, url: str, username: str, password: str):
    return await client.get(
        f"{url}/api/now/ui/concoursepicker/current",
        auth=(username, password),
        headers={"Accept": "application/json"},
    )


def _parse_application(data: dict) -> Optional[ApplicationInfo]:
    """
    Tries multiple field name patterns from concoursepicker.
    Logs the raw block so you can see the actual structure in the console.
    """
    if not data:
        return None

    # sys_id: try 'value', 'sys_id', 'id'
    sys_id = data.get("value") or data.get("sys_id") or data.get("id", "")

    # name: try 'label', 'displayValue', 'displayName', 'name'
    name = (
        data.get("label")
        or data.get("displayValue")
        or data.get("displayName")
        or data.get("name", "Unknown")
    )

    # scope: try 'scope', 'value' (when scope IS the value)
    scope = data.get("scope") or data.get("value", "")

    if not sys_id:
        return None

    return ApplicationInfo(sys_id=sys_id, name=name, scope=scope)


def _parse_update_set(data: dict) -> Optional[UpdateSetInfo]:
    """
    Tries multiple field name patterns from concoursepicker.
    """
    if not data:
        return None

    sys_id = data.get("value") or data.get("sys_id") or data.get("id", "")
    name   = (
        data.get("label")
        or data.get("displayValue")
        or data.get("displayName")
        or data.get("name", "Unknown")
    )
    state  = data.get("state", "")

    if not sys_id:
        return None

    return UpdateSetInfo(sys_id=sys_id, name=name, state=state)


@router.post("/validate", response_model=ValidateResponse)
async def validate_instance(body: ValidateRequest) -> ValidateResponse:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            user_resp, ctx_resp = await asyncio.gather(
                _fetch_user(client, body.url, body.username, body.password),
                _fetch_context(client, body.url, body.username, body.password),
                return_exceptions=True,
            )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail=f"Cannot reach instance at {body.url}. Check the URL and try again.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to ServiceNow timed out.",
        )

    # ── user (mandatory) ──────────────────────────────────
    if isinstance(user_resp, Exception):
        raise HTTPException(status_code=502, detail="Failed to reach ServiceNow.")
    if user_resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if user_resp.status_code == 403:
        raise HTTPException(status_code=403, detail="Credentials valid but user lacks REST API access.")
    if user_resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"ServiceNow returned {user_resp.status_code}.")

    record = (user_resp.json().get("result") or [{}])[0]
    user   = UserInfo(
        username=record.get("user_name", body.username),
        display_name=record.get("name", body.username),
        email=record.get("email", ""),
    )

    # ── context (best-effort) ─────────────────────────────
    application = None
    update_set  = None

    if not isinstance(ctx_resp, Exception) and ctx_resp.status_code == 200:
        raw = ctx_resp.json()
        ctx = raw.get("result", {})
        logger.info("[concoursepicker raw] %s", raw)

        app_raw = ctx.get("application") or ctx.get("scope") or {}
        application = _parse_application(app_raw)

        us_raw = ctx.get("update_set") or ctx.get("updateSet") or {}
        update_set = _parse_update_set(us_raw)
    else:
        status = getattr(ctx_resp, "status_code", "exception")
        logger.warning("[concoursepicker] failed with: %s", status)

    # ── update set fallback: query sys_update_set directly ──
    if update_set is None:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                us_resp = await client.get(
                    f"{body.url}/api/now/table/sys_update_set",
                    params={
                        "sysparm_query": f"state=in progress^sys_created_by={body.username}^ORstate=in progress^application.scope=global",
                        "sysparm_limit":  "1",
                        "sysparm_fields": "sys_id,name,state",
                        "sysparm_order_by_direction": "DESC",
                        "sysparm_order_by": "sys_updated_on",
                    },
                    auth=(body.username, body.password),
                    headers={"Accept": "application/json"},
                )
            if us_resp.status_code == 200:
                records = us_resp.json().get("result", [])
                if records:
                    r = records[0]
                    update_set = UpdateSetInfo(
                        sys_id=r.get("sys_id", ""),
                        name=r.get("name", "Unknown"),
                        state=r.get("state", ""),
                    )
                    logger.info("[sys_update_set fallback] found: %s", update_set.name)
        except Exception as exc:
            logger.warning("[sys_update_set fallback] failed: %s", exc)

    return ValidateResponse(
        valid=True,
        user=user,
        application=application,
        update_set=update_set,
    )
