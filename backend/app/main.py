"""
app/main.py — SeismoAI v3 with Real-Time USGS Integration
"""
from fastapi.responses import HTMLResponse
from fastapi import FastAPI
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uvicorn, logging, os

from app.predictor import EarthquakePredictor
from app.schemas import (
    PredictionRequest, PredictionResponse,
    BatchPredictionRequest, BatchPredictionResponse,
    RegionSummary, HealthResponse
)
from app.usgs_realtime import (
    fetch_live_feed, fetch_catalog_query,
    LiveFeedResponse, USGS_FEEDS
)
from app.realtime_poller import RealtimePoller
from app.yearly_forecast import generate_yearly_forecast
from app.algorithm_benchmark import run_benchmark

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SeismoAI API v3 — Real-Time Edition",
    description="CNN+LSTM+GNN+GAN ensemble with live USGS data integration",
    version="3.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ─────────────────────────────────────────────────────────────
predictor = None
poller = None
_benchmark_cache = None
_forecast_cache = {}

app = FastAPI()

@app.get("/earthquake-basics", response_class=HTMLResponse)
def earthquake_basics():
    with open("frontend/pages/earthquake-basics.html") as f:
        return f.read()

@app.on_event("startup")
async def startup_event():
    global predictor, poller

    logger.info("Loading ML models...")
    predictor = EarthquakePredictor()
    predictor.load_or_train()
    logger.info("Models ready!")

    # Start real-time poller
    poller = RealtimePoller(predictor=predictor)
    await poller.start()
    logger.info("Real-time USGS poller started!")


@app.on_event("shutdown")
async def shutdown_event():
    if poller:
        await poller.stop()


# ── Health & Status ───────────────────────────────────────────────────────────

@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="online",
        model_loaded=predictor is not None and predictor.is_trained,
        message="SeismoAI v3 Real-Time running"
    )


@app.get("/status")
def status():
    """Full system status including poller and last data sync."""
    return {
        "api": "SeismoAI v3",
        "model_loaded": predictor is not None and predictor.is_trained,
        "poller": poller.get_status() if poller else {"running": False},
        "available_feeds": list(USGS_FEEDS.keys()),
    }


# ── ML Prediction endpoints (unchanged) ───────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if not predictor or not predictor.is_trained:
        raise HTTPException(503, "Model not loaded")
    return predictor.predict_single(request)


@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(request: BatchPredictionRequest):
    if not predictor or not predictor.is_trained:
        raise HTTPException(503, "Model not loaded")
    results = predictor.predict_batch(request.events)
    return BatchPredictionResponse(predictions=results, count=len(results))


@app.get("/regions", response_model=List[RegionSummary])
def get_regions():
    if not predictor or not predictor.is_trained:
        raise HTTPException(503, "Model not loaded")
    return predictor.get_all_region_summaries()


@app.get("/model/stats")
def model_stats():
    return predictor.get_model_stats() if predictor else {}


# ── REAL-TIME USGS DATA ENDPOINTS ─────────────────────────────────────────────

@app.get("/live", response_model=LiveFeedResponse)
async def get_live_feed(
    feed: str = Query(
        default="past_day_m2.5",
        description="Feed key. Options: past_hour_all, past_hour_m2.5, past_day_all, past_day_m2.5, past_day_m4.5, past_week_m2.5, past_week_significant, past_month_m4.5, etc.",
    )
):
    """
    🌍 Fetch LIVE earthquake data directly from USGS.
    Data is updated every 1-5 minutes by USGS.
    No caching — always returns the freshest data.
    """
    if feed not in USGS_FEEDS:
        raise HTTPException(
            400,
            detail=f"Unknown feed '{feed}'. Valid feeds: {list(USGS_FEEDS.keys())}"
        )
    try:
        return await fetch_live_feed(feed)
    except Exception as e:
        raise HTTPException(502, f"USGS API error: {str(e)}")


@app.get("/live/significant")
async def get_significant():
    """Get significant earthquakes from the past 24 hours (USGS significant threshold)."""
    try:
        return await fetch_live_feed("past_day_significant")
    except Exception as e:
        raise HTTPException(502, f"USGS API error: {str(e)}")


@app.get("/live/major")
async def get_major():
    """Get M4.5+ earthquakes from the past 7 days."""
    try:
        return await fetch_live_feed("past_week_m4.5")
    except Exception as e:
        raise HTTPException(502, f"USGS API error: {str(e)}")


@app.get("/live/predict")
async def live_predict(
    feed: str = Query(default="past_day_m4.5"),
    limit: int = Query(default=20, le=100),
):
    """
    Fetch live USGS data AND run ML predictions on each earthquake.
    Returns earthquakes enriched with AI risk assessment.
    """
    if not predictor or not predictor.is_trained:
        raise HTTPException(503, "Model not loaded")

    live_data = await fetch_live_feed(feed)

    results = []
    for eq in live_data.earthquakes[:limit]:
        try:
            req = PredictionRequest(
                latitude=eq.latitude,
                longitude=eq.longitude,
                depth=eq.depth,
                region=eq.region,
                rms=eq.rms or 0.5,
                gap=eq.gap or 100.0,
                dmin=eq.dmin or 1.0,
                nst=eq.nst or 20,
            )
            pred = predictor.predict_single(req)
            results.append({
                # USGS live data
                "usgs_id": eq.usgs_id,
                "magnitude": eq.magnitude,
                "place": eq.place,
                "latitude": eq.latitude,
                "longitude": eq.longitude,
                "depth": eq.depth,
                "event_time": eq.event_time,
                "age_minutes": eq.age_minutes,
                "tsunami": eq.tsunami,
                "usgs_alert": eq.alert,
                "sig": eq.sig,
                "felt": eq.felt,
                "region": eq.region,
                "title": eq.title,
                "usgs_url": eq.url,
                # ML predictions
                "ai_risk_score": pred.risk_score,
                "ai_risk_level": pred.risk_level.value,
                "ai_predicted_magnitude": pred.predicted_magnitude,
                "ai_confidence": pred.confidence,
                "ai_alert": pred.alert,
                "ai_explanation": pred.explanation,
                "model_contributions": {
                    "cnn": pred.model_contributions.cnn_spatial,
                    "lstm": pred.model_contributions.lstm_temporal,
                    "gnn": pred.model_contributions.gnn_regional,
                },
            })
        except Exception as e:
            logger.warning(f"Prediction failed for {eq.usgs_id}: {e}")
            continue

    return {
        "count": len(results),
        "feed": feed,
        "earthquakes_with_predictions": results,
        "feed_metadata": live_data.metadata.model_dump(),
    }


@app.get("/live/search")
async def search_catalog(
    start_time: str = Query(..., description="ISO date e.g. '2026-01-01'"),
    end_time: str = Query(..., description="ISO date e.g. '2026-01-31'"),
    min_magnitude: float = Query(default=2.5, ge=0, le=10),
    max_results: int = Query(default=500, le=5000),
    latitude: Optional[float] = Query(default=None),
    longitude: Optional[float] = Query(default=None),
    radius_km: Optional[float] = Query(default=None),
):
    """
    Search USGS catalog for any date range.
    E.g. get all M4.5+ earthquakes in January 2026 near Japan.
    """
    try:
        return await fetch_catalog_query(
            start_time=start_time,
            end_time=end_time,
            min_magnitude=min_magnitude,
            max_results=max_results,
            latitude=latitude,
            longitude=longitude,
            max_radius_km=radius_km,
        )
    except Exception as e:
        raise HTTPException(502, f"USGS catalog error: {str(e)}")


@app.get("/poller/status")
def poller_status():
    """Get real-time poller status."""
    if not poller:
        return {"running": False}
    return poller.get_status()


@app.post("/poller/trigger")
async def trigger_poll():
    """Manually trigger a data sync from USGS."""
    if not poller:
        raise HTTPException(503, "Poller not initialized")
    await poller._do_poll()
    return {"triggered": True, "status": poller.get_status()}


# ── Yearly Forecast ───────────────────────────────────────────────────────────

@app.get("/forecast/{year}")
def get_forecast(year: int):
    if not 2020 <= year <= 2050:
        raise HTTPException(400, "Year must be 2020-2050")
    global _forecast_cache
    if year not in _forecast_cache:
        _forecast_cache[year] = generate_yearly_forecast(year, predictor)
    return _forecast_cache[year]


# ── Algorithm Benchmark ───────────────────────────────────────────────────────

@app.get("/benchmark")
def get_benchmark():
    global _benchmark_cache
    if _benchmark_cache is None:
        logger.info("Running benchmark (~60s)...")
        _benchmark_cache = run_benchmark()
    return _benchmark_cache


@app.delete("/benchmark/cache")
def clear_cache():
    global _benchmark_cache, _forecast_cache
    _benchmark_cache = None
    _forecast_cache = {}
    return {"cleared": True}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)