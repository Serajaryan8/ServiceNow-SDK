import httpx
from fastapi import APIRouter, HTTPException, Header, Query

router = APIRouter()


async def _sn_get(url: str, username: str, password: str, path: str, params: dict) -> list:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                f"{url}{path}",
                params=params,
                auth=(username, password),
                headers={"Accept": "application/json"},
            )
    except httpx.ConnectError:
        raise HTTPException(502, f"Cannot reach {url}")
    except httpx.TimeoutException:
        raise HTTPException(504, "ServiceNow timed out")

    if r.status_code == 401:
        raise HTTPException(401, "Invalid credentials")
    if r.status_code != 200:
        raise HTTPException(502, f"ServiceNow returned {r.status_code}")

    return r.json().get("result", [])


@router.get("/tables")
async def list_tables(
    q: str = Query(default=""),
    x_sn_url:      str = Header(...),
    x_sn_username: str = Header(...),
    x_sn_password: str = Header(...),
):
    query = f"labelSTARTSWITH{q}^ORnameSTARTSWITH{q}" if q else "nameISNOTEMPTY"
    return await _sn_get(
        x_sn_url, x_sn_username, x_sn_password,
        "/api/now/table/sys_db_object",
        {
            "sysparm_query":    query,
            "sysparm_limit":    "30",
            "sysparm_fields":   "name,label,sys_id",
            "sysparm_order_by": "label",
        },
    )


@router.get("/tables/{table}/fields")
async def list_fields(
    table: str,
    x_sn_url:      str = Header(...),
    x_sn_username: str = Header(...),
    x_sn_password: str = Header(...),
):
    return await _sn_get(
        x_sn_url, x_sn_username, x_sn_password,
        "/api/now/table/sys_dictionary",
        {
            "sysparm_query":  f"name={table}^internal_type!=collection^element!=NULL",
            "sysparm_limit":  "300",
            "sysparm_fields": "element,column_label,internal_type,choice,mandatory",
            "sysparm_order_by": "column_label",
        },
    )


@router.get("/tables/{table}/choices")
async def list_choices(
    table: str,
    field: str = Query(...),
    x_sn_url:      str = Header(...),
    x_sn_username: str = Header(...),
    x_sn_password: str = Header(...),
):
    return await _sn_get(
        x_sn_url, x_sn_username, x_sn_password,
        "/api/now/table/sys_choice",
        {
            "sysparm_query":    f"name={table}^element={field}^language=en^inactive=false",
            "sysparm_limit":    "100",
            "sysparm_fields":   "value,label,sequence",
            "sysparm_order_by": "sequence",
        },
    )
