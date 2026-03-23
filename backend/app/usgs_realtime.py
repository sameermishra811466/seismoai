"""
usgs_realtime.py
Fetches live earthquake data from USGS GeoJSON feeds.
No API key required — USGS is completely free and public.

USGS Feed URLs (updated every 1-5 minutes by USGS):
- Past Hour:  All earthquakes in the last hour
- Past Day:   All earthquakes in the last 24 hours
- Past Week:  All earthquakes in the last 7 days
- Past Month: All M2.5+ earthquakes in the last 30 days

Each feed has magnitude filters: all / 1.0 / 2.5 / 4.5 / significant
"""

import httpx
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── USGS GeoJSON Feed URLs (no auth needed) ──────────────────────────────────

USGS_FEEDS = {
    "past_hour_all":         "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    "past_hour_m1":          "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_hour.geojson",
    "past_hour_m2.5":        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson",
    "past_hour_m4.5":        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_hour.geojson",
    "past_hour_significant": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson",

    "past_day_all":          "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    "past_day_m1":           "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson",
    "past_day_m2.5":         "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    "past_day_m4.5":         "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
    "past_day_significant":  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",

    "past_week_all":         "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    "past_week_m2.5":        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
    "past_week_m4.5":        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
    "past_week_significant": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",

    "past_month_m2.5":       "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
    "past_month_m4.5":       "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson",
    "past_month_significant":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson",
}

# USGS catalog for historical queries (custom date range)
USGS_CATALOG_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


# ── Data models ────────────────────────────────────────────────────────────

class LiveEarthquake(BaseModel):
    usgs_id: str
    magnitude: float
    place: str
    latitude: float
    longitude: float
    depth: float
    event_time: str          # ISO string
    updated: str
    status: str              # "automatic" or "reviewed"
    tsunami: bool
    alert: Optional[str]     # "green" | "yellow" | "orange" | "red" | None
    sig: int                 # significance score 0-1000
    felt: Optional[int]      # number of "did you feel it?" reports
    cdi: Optional[float]     # community internet intensity (0-12)
    mmi: Optional[float]     # max modified mercalli intensity
    rms: Optional[float]
    gap: Optional[float]
    dmin: Optional[float]
    nst: Optional[int]
    net: str                 # network code
    mag_type: str            # "ml", "mw", "mb" etc
    title: str
    url: str
    detail_url: str
    # Derived fields
    region: str
    risk_level: str
    age_minutes: float       # how old this event is


class FeedMetadata(BaseModel):
    generated_at: str
    feed_url: str
    title: str
    count: int
    api_version: str


class LiveFeedResponse(BaseModel):
    metadata: FeedMetadata
    earthquakes: List[LiveEarthquake]
    fetched_at: str


# ── Region assignment ────────────────────────────────────────────────────

REGION_COORDS = {
    "Pacific Ring":     (30.0, 150.0),
    "Himalayan Belt":   (27.0, 82.0),
    "Cascadia Zone":    (46.0,-122.0),
    "Anatolian Fault":  (39.0, 33.0),
    "Sumatra Fault":    (-3.0, 102.0),
    "New Madrid Zone":  (36.0,-89.0),
    "Aleutian Arc":     (53.0,-170.0),
    "Caribbean Arc":    (15.0,-61.0),
    "Andean Zone":      (-20.0,-70.0),
    "Mid-Atlantic":     (35.0,-40.0),
    "East Africa":      (-5.0, 38.0),
    "Mediterranean":    (37.0, 20.0),
}

import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def assign_region(lat: float, lng: float) -> str:
    best, min_d = "Global", float("inf")
    for name, (rlat, rlng) in REGION_COORDS.items():
        d = haversine(lat, lng, rlat, rlng)
        if d < min_d:
            min_d = d
            best = name
    return best

def mag_to_risk(mag: float) -> str:
    if mag < 4.0:   return "Low"
    if mag < 5.5:   return "Medium"
    if mag < 7.0:   return "High"
    return "Critical"


# ── Core fetch function ──────────────────────────────────────────────────────

def parse_feature(f: dict, now_ts: float) -> Optional[LiveEarthquake]:
    """Parse a single GeoJSON feature into a LiveEarthquake."""
    try:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [0, 0, 0])

        mag = props.get("mag") or 0.0
        lng, lat, depth = coords[0], coords[1], coords[2] or 0.0

        event_ts_ms = props.get("time", 0)
        updated_ts_ms = props.get("updated", event_ts_ms)
        event_dt = datetime.fromtimestamp(event_ts_ms / 1000, tz=timezone.utc)
        updated_dt = datetime.fromtimestamp(updated_ts_ms / 1000, tz=timezone.utc)
        age_minutes = (now_ts * 1000 - event_ts_ms) / 60000

        return LiveEarthquake(
            usgs_id=f.get("id", "unknown"),
            magnitude=round(float(mag), 2),
            place=props.get("place", "Unknown location"),
            latitude=round(float(lat), 4),
            longitude=round(float(lng), 4),
            depth=round(float(depth), 2),
            event_time=event_dt.isoformat(),
            updated=updated_dt.isoformat(),
            status=props.get("status", "automatic"),
            tsunami=bool(props.get("tsunami", 0)),
            alert=props.get("alert"),
            sig=int(props.get("sig", 0)),
            felt=props.get("felt"),
            cdi=props.get("cdi"),
            mmi=props.get("mmi"),
            rms=props.get("rms"),
            gap=props.get("gap"),
            dmin=props.get("dmin"),
            nst=props.get("nst"),
            net=props.get("net", "us"),
            mag_type=props.get("magType", "ml"),
            title=props.get("title", f"M{mag} - {props.get('place','?')}"),
            url=props.get("url", ""),
            detail_url=props.get("detail", ""),
            region=assign_region(lat, lng),
            risk_level=mag_to_risk(float(mag)),
            age_minutes=round(age_minutes, 1),
        )
    except Exception as e:
        logger.warning(f"Failed to parse feature: {e}")
        return None


async def fetch_live_feed(feed_key: str = "past_day_m2.5") -> LiveFeedResponse:
    """
    Fetch a USGS real-time GeoJSON feed.

    Args:
        feed_key: One of the USGS_FEEDS keys (default: past_day_m2.5)

    Returns:
        LiveFeedResponse with list of LiveEarthquake objects
    """
    url = USGS_FEEDS.get(feed_key, USGS_FEEDS["past_day_m2.5"])

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers={
            "User-Agent": "SeismoAI/2.0 (earthquake prediction research)",
            "Accept": "application/json",
        })
        resp.raise_for_status()
        data = resp.json()

    now_ts = datetime.now(timezone.utc).timestamp()
    features = data.get("features", [])
    metadata_raw = data.get("metadata", {})

    earthquakes = []
    for f in features:
        eq = parse_feature(f, now_ts)
        if eq is not None:
            earthquakes.append(eq)

    # Sort: newest first
    earthquakes.sort(key=lambda e: e.event_time, reverse=True)

    return LiveFeedResponse(
        metadata=FeedMetadata(
            generated_at=datetime.fromtimestamp(
                metadata_raw.get("generated", now_ts * 1000) / 1000,
                tz=timezone.utc
            ).isoformat(),
            feed_url=url,
            title=metadata_raw.get("title", "USGS Earthquakes"),
            count=len(earthquakes),
            api_version=metadata_raw.get("api", "1.0"),
        ),
        earthquakes=earthquakes,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


async def fetch_catalog_query(
    start_time: str,
    end_time: str,
    min_magnitude: float = 2.5,
    max_results: int = 1000,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_radius_km: Optional[float] = None,
) -> LiveFeedResponse:
    """
    Query USGS catalog for custom date ranges.

    Args:
        start_time: ISO date string e.g. "2026-01-01"
        end_time:   ISO date string e.g. "2026-01-31"
        min_magnitude: Minimum magnitude filter
        max_results: Maximum number of results (USGS cap: 20000)
    """
    params = {
        "format": "geojson",
        "starttime": start_time,
        "endtime": end_time,
        "minmagnitude": min_magnitude,
        "limit": min(max_results, 20000),
        "orderby": "time",
    }
    if latitude and longitude:
        params["latitude"] = latitude
        params["longitude"] = longitude
        if max_radius_km:
            params["maxradiuskm"] = max_radius_km

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(USGS_CATALOG_URL, params=params, headers={
            "User-Agent": "SeismoAI/2.0 (earthquake prediction research)",
        })
        resp.raise_for_status()
        data = resp.json()

    now_ts = datetime.now(timezone.utc).timestamp()
    features = data.get("features", [])
    metadata_raw = data.get("metadata", {})

    earthquakes = []
    for f in features:
        eq = parse_feature(f, now_ts)
        if eq is not None:
            earthquakes.append(eq)

    earthquakes.sort(key=lambda e: e.event_time, reverse=True)

    return LiveFeedResponse(
        metadata=FeedMetadata(
            generated_at=datetime.now(timezone.utc).isoformat(),
            feed_url=USGS_CATALOG_URL,
            title=metadata_raw.get("title", f"USGS Query {start_time} to {end_time}"),
            count=len(earthquakes),
            api_version=metadata_raw.get("api", "1.0"),
        ),
        earthquakes=earthquakes,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


# ── Supabase sync (call this from background task) ─────────────────────────

async def sync_to_supabase(supabase_url: str, supabase_key: str, feed_key: str = "past_hour_m2.5"):
    """
    Fetch live data from USGS and insert new events into Supabase.
    Only inserts events not already in the database (deduplicates by usgs_id).
    """
    feed = await fetch_live_feed(feed_key)
    if not feed.earthquakes:
        return 0

    rows = []
    for eq in feed.earthquakes:
        rows.append({
            "usgs_id": eq.usgs_id,
            "event_time": eq.event_time,
            "latitude": eq.latitude,
            "longitude": eq.longitude,
            "depth": eq.depth,
            "magnitude": eq.magnitude,
            "place": eq.place,
            "region": eq.region,
            "rms": eq.rms,
            "gap": eq.gap,
            "dmin": eq.dmin,
            "nst": eq.nst,
            "status": eq.status,
            "tsunami": eq.tsunami,
            "alert": eq.alert,
            "sig": eq.sig,
            "felt": eq.felt,
            "net": eq.net,
            "mag_type": eq.mag_type,
            "title": eq.title,
            "usgs_url": eq.url,
        })

    # Upsert (insert or ignore duplicates) via USGS ID
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{supabase_url}/rest/v1/live_earthquakes",
            json=rows,
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates,return=minimal",
            }
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Supabase sync error: {resp.status_code} {resp.text}")
            return 0

    logger.info(f"Synced {len(rows)} events from USGS to Supabase")
    return len(rows)