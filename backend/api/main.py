from __future__ import annotations
import traceback
from typing import List, Optional

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.auth import (
    get_email_by_token,
    login,
    name_from_email,
    register,
    revoke_token,
)
from api.cache import (
    is_cache_stale,
    load_items_with_meta,
    load_nutrition_cache,
    save_items,
    save_nutrition_cache,
    save_raw_debug,
)
from api.planner.planner import build_plan
from api.scrape.daily_menu import (
    _today_str,
    fetch_daily_menu_html,
    get_menu_mids_and_names,
)
from api.scrape.nutrition_label import (
    fetch_nutrition_html,
    nutrition_url_from_mid,
    parse_nutrition,
)
from api.tracker import add_entry, get_week_entries, remove_entry
from fastapi.responses import Response
from api.exercises import get_exercise_image, get_exercises_by_target, get_target_list

app = FastAPI(title="PSU Macro Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LOCATIONS = {
    "11": "UP: East Food District @ Findlay",
    "17": "UP: North Food District @ Warnock",
    "14": "UP: Pollock Dining Commons",
    "13": "UP: South Food District @ Redifer",
    "16": "UP: West Food District @ Waring",
    "40": "Altoona - Port Sky Cafe",
    "42": "Beaver - Brodhead Bistro",
    "47": "Behrend - Bruno's",
    "46": "Behrend - Dobbins",
    "56": "Berks - Tully's",
    "59": "Brandywine - Blue Apple Cafe",
    "44": "Greater Allegheny - Cafe Metro",
    "50": "Harrisburg - Stacks",
    "53": "Harrisburg - The Outpost",
    "52": "Hazleton - HighAcres Cafe",
    "54": "Mont Alto - The Mill Cafe",
}


class AuthRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)


class LogoutRequest(BaseModel):
    token: str


class RefreshRequest(BaseModel):
    limit: int = Field(default=40, ge=1, le=300)
    location_id: str = Field(default="0")


class PlanRequest(BaseModel):
    calories_target: int = Field(..., ge=200, le=10000)
    protein_target: int = Field(..., ge=0, le=1000)
    vegetarian: bool = False
    avoid_allergens: List[str] = []
    protein_priority: float = Field(default=0.7, ge=0.0, le=1.0)
    location_id: str = Field(default="0")
    plan_seed: Optional[int] = None
    goal_type: str = Field(default="physique")
    food_preferences: List[str] = []
    station_preference: Optional[str] = None


class TrackerAddRequest(BaseModel):
    plan_label: str
    calories: int
    protein_g: int
    goal_type: str = "physique"
    meals: Optional[dict] = None


def _do_scrape(location_id: str, limit: int = 80):
    date_str = _today_str()
    html = fetch_daily_menu_html(date_str=date_str, campus_id=location_id)
    save_raw_debug(f"last_menu_{location_id}.html", html)
    mids, mid_to_meta = get_menu_mids_and_names(html)
    if not mids:
        return None, f"No nutrition links found in menu HTML for location {location_id}."
    mids = mids[:limit]
    ncache = load_nutrition_cache()
    items = []
    for mid in mids:
        if mid in ncache:
            nutrition = ncache[mid]
        else:
            try:
                nhtml = fetch_nutrition_html(mid)
                nutrition = parse_nutrition(nhtml)
                ncache[mid] = nutrition
            except Exception:
                nutrition = {"calories": None, "protein_g": None, "allergens": []}
        meta = mid_to_meta.get(mid, {})
        name = meta.get("name") or f"Item {mid}"
        items.append(
            {
                "mid": mid,
                "name": name,
                "calories": nutrition.get("calories"),
                "protein_g": nutrition.get("protein_g"),
                "allergens": nutrition.get("allergens", []),
                "nutrition_url": nutrition_url_from_mid(mid),
                "is_vegetarian": None,
                "station": meta.get("station", ""),
                "meal_periods": meta.get("meal_periods", []),
            }
        )
    save_nutrition_cache(ncache)
    save_items(items, source=f"scrape:{location_id}", location_id=location_id)
    return items, None


@app.post("/auth/register")
def auth_register(req: AuthRequest):
    token, error = register(req.email, req.password)
    if error:
        return {"ok": False, "error": error}
    return {"ok": True, "token": token, "name": name_from_email(req.email)}


@app.post("/auth/login")
def auth_login(req: AuthRequest):
    token, error = login(req.email, req.password)
    if error:
        return {"ok": False, "error": error}
    return {"ok": True, "token": token, "name": name_from_email(req.email)}


@app.post("/auth/logout")
def auth_logout(req: LogoutRequest):
    revoke_token(req.token)
    return {"ok": True}


@app.get("/auth/me")
def auth_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": False}
    token = authorization[7:]
    email = get_email_by_token(token)
    if not email:
        return {"ok": False}
    return {"ok": True, "email": email, "name": name_from_email(email)}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/locations")
def get_locations():
    return {"locations": [{"id": k, "name": v} for k, v in LOCATIONS.items()]}


@app.get("/stations")
def get_stations(location_id: Optional[str] = None):
    _, items = load_items_with_meta(location_id)
    stations = sorted({i.get("station", "") for i in items if i.get("station")})
    return {"stations": stations}


@app.get("/items")
def get_items(location_id: Optional[str] = None):
    meta, items = load_items_with_meta(location_id)
    return {"meta": meta, "count": len(items), "items": items}


@app.post("/refresh")
def refresh(req: RefreshRequest):
    try:
        items, warning = _do_scrape(req.location_id, limit=req.limit)
        if items is None:
            return {"ok": False, "message": warning or "Scrape returned no items.", "count": 0}
        msg = f"Refreshed {len(items)} items for location {req.location_id}."
        if warning:
            msg += f" Warning: {warning}"
        return {"ok": True, "message": msg, "count": len(items)}
    except Exception as e:
        return {"ok": False, "message": str(e), "trace": traceback.format_exc()}


@app.post("/plan")
def plan(req: PlanRequest):
    meta, items = load_items_with_meta(req.location_id)
    auto_refreshed = False
    auto_refresh_warning: Optional[str] = None
    if is_cache_stale(meta):
        try:
            new_items, warning = _do_scrape(req.location_id)
            if new_items:
                meta, items = load_items_with_meta(req.location_id)
                auto_refreshed = True
            if warning:
                auto_refresh_warning = warning
        except Exception as e:
            auto_refresh_warning = f"Auto-refresh failed: {e}"
    result = build_plan(
        items=items,
        calories_target=req.calories_target,
        protein_target=req.protein_target,
        vegetarian=req.vegetarian,
        avoid_allergens=req.avoid_allergens,
        protein_priority=req.protein_priority,
        seed=req.plan_seed,
        goal_type=req.goal_type,
        food_preferences=req.food_preferences or [],
        station_preference=req.station_preference,
    )
    result["data_meta"] = meta
    result["data_count"] = len(items)
    result["auto_refreshed"] = auto_refreshed
    if auto_refresh_warning:
        notes = result.get("notes") or []
        notes.append(f"Auto-refresh warning: {auto_refresh_warning}")
        result["notes"] = notes
    return result


@app.post("/tracker/add")
def tracker_add(req: TrackerAddRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": False, "error": "Unauthorized"}
    token = authorization[7:]
    email = get_email_by_token(token)
    if not email:
        return {"ok": False, "error": "Unauthorized"}
    entry_id = add_entry(email, req.plan_label, req.calories, req.protein_g, req.goal_type, req.meals)
    return {"ok": True, "id": entry_id}


@app.get("/tracker/week")
def tracker_week(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": False, "error": "Unauthorized"}
    token = authorization[7:]
    email = get_email_by_token(token)
    if not email:
        return {"ok": False, "error": "Unauthorized"}
    entries = get_week_entries(email)
    total_cal = sum(e.get("calories", 0) for e in entries)
    total_prot = sum(e.get("protein_g", 0) for e in entries)
    return {
        "ok": True,
        "entries": entries,
        "totals": {"calories": total_cal, "protein_g": total_prot},
    }



@app.get("/exercises/image/{exercise_id}")
def exercises_image(exercise_id: str):
    data, content_type = get_exercise_image(exercise_id)
    return Response(content=data, media_type=content_type)


@app.get("/exercises/target/{target}")
def exercises_by_target(target: str, limit: int = 30, offset: int = 0):
    data = get_exercises_by_target(target, limit=limit, offset=offset)
    return data


@app.get("/exercises/targetList")
def exercises_target_list():
    return get_target_list()


@app.delete("/tracker/entry/{entry_id}")
def tracker_remove(entry_id: str, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": False, "error": "Unauthorized"}
    token = authorization[7:]
    email = get_email_by_token(token)
    if not email:
        return {"ok": False, "error": "Unauthorized"}
    found = remove_entry(email, entry_id)
    return {"ok": found, "error": None if found else "Entry not found"}
