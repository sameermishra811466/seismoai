"""
realtime_poller.py
Background task that polls USGS every 5 minutes and:
1. Stores new events in Supabase (live_earthquakes table)
2. Runs ML predictions on significant new events (M4.5+)
3. Creates alerts for high-risk events
4. Updates region stats
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from app.usgs_realtime import fetch_live_feed, sync_to_supabase
import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Polling intervals
POLL_INTERVAL_SECONDS = 300        # 5 minutes (USGS updates every 1-5 min)
SIGNIFICANT_POLL_INTERVAL = 60    # 1 minute for significant earthquakes


class RealtimePoller:
    def __init__(self, predictor=None):
        self.predictor = predictor
        self.running = False
        self.last_poll = None
        self.events_synced = 0
        self.polls_completed = 0
        self.errors = 0
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the background polling loop."""
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("Realtime poller started — polling USGS every 5 minutes")

    async def stop(self):
        """Stop the background polling loop."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Realtime poller stopped")

    async def _poll_loop(self):
        """Main polling loop."""
        while self.running:
            try:
                await self._do_poll()
            except Exception as e:
                self.errors += 1
                logger.error(f"Poll error: {e}")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def _do_poll(self):
        """Execute one polling cycle."""
        logger.info("Polling USGS for new earthquake data...")
        self.last_poll = datetime.now(timezone.utc).isoformat()

        # Fetch latest earthquakes (M2.5+ past hour)
        feed = await fetch_live_feed("past_hour_m2.5")
        new_count = 0

        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            # Sync all events to Supabase
            new_count = await sync_to_supabase(
                SUPABASE_URL, SUPABASE_SERVICE_KEY, "past_hour_m2.5"
            )

            # For significant events (M4.5+), run ML prediction
            significant = [eq for eq in feed.earthquakes if eq.magnitude >= 4.5]
            for eq in significant[:5]:  # Process top 5
                await self._run_prediction_and_alert(eq)

        self.events_synced += new_count
        self.polls_completed += 1
        logger.info(f"Poll complete: {len(feed.earthquakes)} events, {new_count} new")

    async def _run_prediction_and_alert(self, eq):
        """Run ML prediction on a significant earthquake and store result."""
        if not self.predictor or not self.predictor.is_trained:
            return

        try:
            from app.schemas import PredictionRequest
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
            prediction = self.predictor.predict_single(req)

            if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
                return

            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            }

            async with httpx.AsyncClient() as client:
                # Store prediction
                await client.post(f"{SUPABASE_URL}/rest/v1/predictions", json={
                    "region": prediction.region,
                    "latitude": prediction.latitude,
                    "longitude": prediction.longitude,
                    "risk_score": prediction.risk_score,
                    "risk_level": prediction.risk_level.value,
                    "predicted_magnitude": prediction.predicted_magnitude,
                    "confidence": prediction.confidence,
                    "cnn_score": prediction.model_contributions.cnn_spatial,
                    "lstm_score": prediction.model_contributions.lstm_temporal,
                    "gnn_score": prediction.model_contributions.gnn_regional,
                    "alert_triggered": prediction.alert,
                    "explanation": prediction.explanation,
                    "input_depth": eq.depth,
                    "source": "usgs_realtime",
                    "usgs_event_id": eq.usgs_id,
                }, headers=headers)

                # Create alert if high risk
                if prediction.alert or eq.magnitude >= 6.0 or eq.tsunami:
                    msg = (
                        f"{'🌊 TSUNAMI RISK — ' if eq.tsunami else ''}"
                        f"M{eq.magnitude} detected: {eq.place}. "
                        f"AI risk score: {prediction.risk_score:.2f} ({prediction.risk_level.value}). "
                        f"Predicted peak: M{prediction.predicted_magnitude}."
                    )
                    await client.post(f"{SUPABASE_URL}/rest/v1/alerts", json={
                        "region": eq.region,
                        "risk_level": prediction.risk_level.value,
                        "risk_score": prediction.risk_score,
                        "magnitude_est": prediction.predicted_magnitude,
                        "latitude": eq.latitude,
                        "longitude": eq.longitude,
                        "message": msg,
                        "source": "usgs_realtime",
                        "usgs_event_id": eq.usgs_id,
                    }, headers=headers)

        except Exception as e:
            logger.error(f"Prediction/alert error for {eq.usgs_id}: {e}")

    def get_status(self) -> dict:
        return {
            "running": self.running,
            "last_poll": self.last_poll,
            "polls_completed": self.polls_completed,
            "events_synced": self.events_synced,
            "errors": self.errors,
            "poll_interval_seconds": POLL_INTERVAL_SECONDS,
        }