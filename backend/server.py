"""Torn Faction Activity Tracker - FastAPI backend.

Exposes endpoints that pull faction activity from the Torn API (or produce
deterministic mock data when no API key is configured) and record periodic
snapshots so we can graph activity patterns over time.
"""

from __future__ import annotations

import hashlib
import logging
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Torn Faction Tracker")
api_router = APIRouter(prefix="/api")

TORN_API_BASE = "https://api.torn.com"
SETTINGS_DOC_ID = "singleton"

Side = Literal["mine", "enemy"]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    api_key: str = ""
    my_faction_id: str = "mock-1"
    enemy_faction_id: str = "mock-2"
    my_faction_name: str = "My Faction"
    enemy_faction_name: str = "Enemy Faction"
    use_mock: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    my_faction_id: Optional[str] = None
    enemy_faction_id: Optional[str] = None
    my_faction_name: Optional[str] = None
    enemy_faction_name: Optional[str] = None
    use_mock: Optional[bool] = None


class Member(BaseModel):
    id: str
    name: str
    level: int
    position: str
    last_action_relative: str
    last_action_timestamp: int
    status_state: str  # Okay | Hospital | Jail | Traveling | Abroad | Federal
    status_description: str
    online_status: str  # Online | Idle | Offline


class FactionData(BaseModel):
    faction_id: str
    faction_name: str
    tag: str
    respect: int
    members: List[Member]
    active_count: int
    online_count: int
    idle_count: int
    offline_count: int
    hospital_count: int
    okay_count: int
    chain_current: int
    chain_max: int


class LiveResponse(BaseModel):
    mine: FactionData
    enemy: FactionData
    fetched_at: datetime
    source: str  # "torn" or "mock"


class HistoryPoint(BaseModel):
    timestamp: datetime
    mine_active: int
    mine_online: int
    mine_hospital: int
    enemy_active: int
    enemy_online: int
    enemy_hospital: int


# ---------------------------------------------------------------------------
# Mock data generation (deterministic per-faction, drifts with time of day)
# ---------------------------------------------------------------------------
MOCK_NAME_POOL_MINE = [
    "VladTheImpaler", "NeonFox", "GhostRider", "PyroQueen", "ShadowByte",
    "IronMaiden", "Zenith", "Krieger", "Cobra", "Mirage", "DrakenHaze",
    "Vortex", "CyberWolf", "RedViper", "BlackMamba", "Scythe", "Reaper",
    "Nova", "Specter", "Juno",
]
MOCK_NAME_POOL_ENEMY = [
    "WarHawk", "SteelFang", "BloodMoon", "VenomStrike", "Havoc",
    "Nitro", "SilverStorm", "CrimsonTide", "BoneCrusher", "Zephyr",
    "DeathDealer", "AcidRain", "Thorn", "Rogue", "Axel", "Marauder",
    "Granite", "Falconry", "Hex", "Ironclad",
]
MOCK_POSITIONS = ["Leader", "Co-leader", "Commander", "Soldier", "Soldier", "Recruit"]
MOCK_STATUSES = [
    ("Okay", "Okay"),
    ("Okay", "Okay"),
    ("Okay", "Okay"),
    ("Hospital", "In hospital for 1h 23m"),
    ("Jail", "In jail for 2h 10m"),
    ("Traveling", "Traveling to Mexico"),
    ("Abroad", "In United Kingdom"),
]


def _stable_rng(seed_str: str) -> random.Random:
    seed_int = int(hashlib.md5(seed_str.encode()).hexdigest()[:12], 16)
    return random.Random(seed_int)


def _relative_time(seconds_ago: int) -> str:
    if seconds_ago < 60:
        return f"{seconds_ago}s ago"
    if seconds_ago < 3600:
        return f"{seconds_ago // 60}m ago"
    if seconds_ago < 86400:
        return f"{seconds_ago // 3600}h ago"
    return f"{seconds_ago // 86400}d ago"


def _online_from_last(seconds_ago: int) -> str:
    if seconds_ago < 180:
        return "Online"
    if seconds_ago < 900:
        return "Idle"
    return "Offline"


def _build_mock_faction(faction_id: str, faction_name: str, name_pool: List[str]) -> FactionData:
    """Build a mock faction snapshot that varies slightly each minute."""
    minute_bucket = int(datetime.now(timezone.utc).timestamp() // 60)
    rng = _stable_rng(f"{faction_id}:{minute_bucket}")
    members: List[Member] = []
    now_ts = int(datetime.now(timezone.utc).timestamp())
    for idx, nm in enumerate(name_pool):
        # Lower seconds_ago means more "active"
        seconds_ago = rng.choices(
            [rng.randint(5, 170), rng.randint(200, 850), rng.randint(1000, 7200), rng.randint(8000, 86400)],
            weights=[4, 3, 2, 1],
        )[0]
        status_state, status_desc = rng.choice(MOCK_STATUSES)
        if status_state in {"Hospital", "Jail"} and rng.random() < 0.5:
            seconds_ago = rng.randint(10, 300)
        members.append(
            Member(
                id=f"{faction_id}-{idx}",
                name=nm,
                level=rng.randint(25, 100),
                position=rng.choice(MOCK_POSITIONS),
                last_action_relative=_relative_time(seconds_ago),
                last_action_timestamp=now_ts - seconds_ago,
                status_state=status_state,
                status_description=status_desc,
                online_status=_online_from_last(seconds_ago),
            )
        )
    return _summarize(faction_id, faction_name, f"[{faction_name[:3].upper()}]",
                      rng.randint(500_000, 9_000_000), members,
                      chain_current=rng.randint(0, 150),
                      chain_max=rng.randint(150, 1000))


def _summarize(faction_id: str, faction_name: str, tag: str, respect: int,
               members: List[Member], chain_current: int, chain_max: int) -> FactionData:
    online = sum(1 for m in members if m.online_status == "Online")
    idle = sum(1 for m in members if m.online_status == "Idle")
    offline = sum(1 for m in members if m.online_status == "Offline")
    hospital = sum(1 for m in members if m.status_state == "Hospital")
    okay = sum(1 for m in members if m.status_state == "Okay")
    return FactionData(
        faction_id=faction_id,
        faction_name=faction_name,
        tag=tag,
        respect=respect,
        members=members,
        active_count=online + idle,
        online_count=online,
        idle_count=idle,
        offline_count=offline,
        hospital_count=hospital,
        okay_count=okay,
        chain_current=chain_current,
        chain_max=chain_max,
    )


# ---------------------------------------------------------------------------
# Torn API
# ---------------------------------------------------------------------------
async def _fetch_torn_faction(faction_id: str, api_key: str) -> FactionData:
    url = f"{TORN_API_BASE}/faction/{faction_id}"
    params = {"selections": "basic,chain", "key": api_key}
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(url, params=params)
    data = resp.json()
    if "error" in data:
        raise HTTPException(status_code=400, detail=f"Torn API error: {data['error'].get('error', 'unknown')}")
    now_ts = int(datetime.now(timezone.utc).timestamp())
    members: List[Member] = []
    for mid, m in (data.get("members") or {}).items():
        last_action = m.get("last_action") or {}
        last_ts = int(last_action.get("timestamp") or 0)
        seconds_ago = max(0, now_ts - last_ts) if last_ts else 999999
        status = m.get("status") or {}
        online_status = (last_action.get("status") or _online_from_last(seconds_ago)).capitalize()
        members.append(
            Member(
                id=str(mid),
                name=m.get("name", "Unknown"),
                level=int(m.get("level", 0)),
                position=m.get("position", "Member"),
                last_action_relative=_relative_time(seconds_ago) if last_ts else "unknown",
                last_action_timestamp=last_ts,
                status_state=(status.get("state") or "Okay"),
                status_description=(status.get("description") or ""),
                online_status=online_status,
            )
        )
    chain = data.get("chain") or {}
    return _summarize(
        faction_id=str(data.get("ID", faction_id)),
        faction_name=data.get("name", "Faction"),
        tag=data.get("tag", ""),
        respect=int(data.get("respect", 0)),
        members=members,
        chain_current=int(chain.get("current", 0)),
        chain_max=int(chain.get("max", 0)),
    )


# ---------------------------------------------------------------------------
# Settings persistence
# ---------------------------------------------------------------------------
async def _load_settings() -> Settings:
    doc = await db.settings.find_one({"_id": SETTINGS_DOC_ID}, {"_id": 0})
    if not doc:
        s = Settings()
        await db.settings.insert_one({"_id": SETTINGS_DOC_ID, **_serialize_settings(s)})
        return s
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return Settings(**doc)


def _serialize_settings(s: Settings) -> dict:
    d = s.model_dump()
    d["updated_at"] = d["updated_at"].isoformat()
    return d


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "torn-faction-tracker", "status": "ok"}


@api_router.get("/settings", response_model=Settings)
async def get_settings():
    s = await _load_settings()
    # Mask api key for response
    if s.api_key:
        masked = s.api_key[:3] + "***" + s.api_key[-2:] if len(s.api_key) > 5 else "***"
        s = s.model_copy(update={"api_key": masked})
    return s


@api_router.post("/settings", response_model=Settings)
async def update_settings(upd: SettingsUpdate):
    current = await _load_settings()
    data = current.model_dump()
    for k, v in upd.model_dump(exclude_none=True).items():
        if k == "api_key" and v and "***" in v:
            # Don't overwrite with the masked version
            continue
        data[k] = v
    data["updated_at"] = datetime.now(timezone.utc)
    new_settings = Settings(**data)
    await db.settings.update_one(
        {"_id": SETTINGS_DOC_ID},
        {"$set": _serialize_settings(new_settings)},
        upsert=True,
    )
    # Mask on return
    if new_settings.api_key:
        masked = new_settings.api_key[:3] + "***" + new_settings.api_key[-2:] if len(new_settings.api_key) > 5 else "***"
        return new_settings.model_copy(update={"api_key": masked})
    return new_settings


@api_router.get("/live", response_model=LiveResponse)
async def get_live():
    s = await _load_settings()
    source = "mock"
    if s.use_mock or not s.api_key:
        mine = _build_mock_faction(s.my_faction_id or "mock-1", s.my_faction_name, MOCK_NAME_POOL_MINE)
        enemy = _build_mock_faction(s.enemy_faction_id or "mock-2", s.enemy_faction_name, MOCK_NAME_POOL_ENEMY)
    else:
        try:
            mine = await _fetch_torn_faction(s.my_faction_id, s.api_key)
            enemy = await _fetch_torn_faction(s.enemy_faction_id, s.api_key)
            source = "torn"
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Torn fetch failed")
            raise HTTPException(status_code=502, detail=f"Torn API fetch failed: {e}")

    # Persist a snapshot (used for timeline chart)
    now = datetime.now(timezone.utc)
    await db.snapshots.insert_one({
        "timestamp": now.isoformat(),
        "mine_faction_id": mine.faction_id,
        "mine_active": mine.active_count,
        "mine_online": mine.online_count,
        "mine_hospital": mine.hospital_count,
        "enemy_faction_id": enemy.faction_id,
        "enemy_active": enemy.active_count,
        "enemy_online": enemy.online_count,
        "enemy_hospital": enemy.hospital_count,
    })

    return LiveResponse(mine=mine, enemy=enemy, fetched_at=now, source=source)


@api_router.get("/history", response_model=List[HistoryPoint])
async def get_history(hours: int = Query(6, ge=1, le=168)):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    cursor = db.snapshots.find(
        {"timestamp": {"$gte": since.isoformat()}},
        {"_id": 0},
    ).sort("timestamp", 1)
    docs = await cursor.to_list(5000)
    points: List[HistoryPoint] = []
    for d in docs:
        ts = d["timestamp"]
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        points.append(HistoryPoint(
            timestamp=ts,
            mine_active=d.get("mine_active", 0),
            mine_online=d.get("mine_online", 0),
            mine_hospital=d.get("mine_hospital", 0),
            enemy_active=d.get("enemy_active", 0),
            enemy_online=d.get("enemy_online", 0),
            enemy_hospital=d.get("enemy_hospital", 0),
        ))
    return points


@api_router.post("/history/seed")
async def seed_history(hours: int = Query(24, ge=1, le=168)):
    """Seed synthetic history points so charts aren't empty on fresh installs."""
    s = await _load_settings()
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(hours * 12):  # every 5 minutes
        ts = now - timedelta(minutes=5 * (hours * 12 - i))
        hour_of_day = ts.hour
        # Diurnal pattern - more active in evenings
        base = 6 + 8 * max(0, min(1, (hour_of_day - 10) / 12))
        rng = _stable_rng(f"{s.my_faction_id}:{int(ts.timestamp() // 300)}")
        mine_active = max(0, int(base + rng.randint(-3, 4)))
        mine_online = max(0, mine_active - rng.randint(0, 3))
        enemy_active = max(0, int(base * 0.9 + rng.randint(-3, 5)))
        enemy_online = max(0, enemy_active - rng.randint(0, 3))
        docs.append({
            "timestamp": ts.isoformat(),
            "mine_faction_id": s.my_faction_id,
            "mine_active": mine_active,
            "mine_online": mine_online,
            "mine_hospital": rng.randint(0, 4),
            "enemy_faction_id": s.enemy_faction_id,
            "enemy_active": enemy_active,
            "enemy_online": enemy_online,
            "enemy_hospital": rng.randint(0, 4),
        })
    if docs:
        await db.snapshots.insert_many(docs)
    return {"seeded": len(docs)}


@api_router.delete("/history")
async def clear_history():
    r = await db.snapshots.delete_many({})
    return {"deleted": r.deleted_count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
