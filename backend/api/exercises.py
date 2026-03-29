from __future__ import annotations
import http.client
import json
import ssl
from datetime import date, datetime
from pathlib import Path

RAPIDAPI_KEY = "4c98899a15msh104a2dc6535d988p1eea17jsn6d721fb621cb"
RAPIDAPI_HOST = "exercisedb.p.rapidapi.com"

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
    "Content-Type": "application/json",
}

DATA_DIR = Path(__file__).parent / "data"


def _get(path: str) -> list | dict:
    ctx = ssl._create_unverified_context()
    conn = http.client.HTTPSConnection(RAPIDAPI_HOST, context=ctx)
    conn.request("GET", path, headers=HEADERS)
    res = conn.getresponse()
    data = res.read()
    conn.close()
    return json.loads(data.decode("utf-8"))


def _cache_path(target: str) -> Path:
    safe = target.replace(" ", "_")
    return DATA_DIR / f"exercises_{safe}.json"


def _is_stale(path: Path) -> bool:
    if not path.exists():
        return True
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        cached_date = datetime.fromisoformat(data["cached_at"]).date()
        return cached_date < date.today()
    except Exception:
        return True


def get_exercise_image(exercise_id: str) -> tuple[bytes, str]:
    ctx = ssl._create_unverified_context()
    conn = http.client.HTTPSConnection(RAPIDAPI_HOST, context=ctx)
    conn.request("GET", f"/image?exerciseId={exercise_id}&resolution=720", headers=HEADERS)
    res = conn.getresponse()
    content_type = res.getheader("Content-Type", "image/gif")
    data = res.read()
    conn.close()
    return data, content_type


def get_exercises_by_target(target: str, limit: int = 30, offset: int = 0) -> list:
    cache = _cache_path(target)
    if not _is_stale(cache):
        data = json.loads(cache.read_text(encoding="utf-8"))
        print(f"[exercises] serving {target} from cache")
        return data["items"]

    print(f"[exercises] fetching {target} from API")
    path = f"/exercises/target/{target}?limit={limit}&offset={offset}"
    result = _get(path)
    if isinstance(result, dict) and "message" in result:
        raise RuntimeError(f"ExerciseDB error: {result['message']}")
    items = result if isinstance(result, list) else []

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(
        json.dumps({"cached_at": datetime.now().isoformat(), "items": items}, indent=2),
        encoding="utf-8",
    )
    return items


def get_target_list() -> list:
    result = _get("/exercises/targetList")
    if isinstance(result, dict) and "message" in result:
        raise RuntimeError(f"ExerciseDB error: {result['message']}")
    return result if isinstance(result, list) else []
