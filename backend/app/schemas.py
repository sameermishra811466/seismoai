"""
Pydantic schemas for SeismoAI API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    depth: float = Field(..., ge=0, le=700, description="Depth in km")
    magnitude: Optional[float] = Field(None, ge=0, le=10, description="Known magnitude (optional)")
    region: Optional[str] = Field(None, description="Region name")
    rms: Optional[float] = Field(0.5, description="Root mean square residual")
    gap: Optional[float] = Field(100.0, description="Azimuthal gap in degrees")
    dmin: Optional[float] = Field(1.0, description="Horizontal distance to nearest station")
    nst: Optional[int] = Field(20, description="Number of seismic stations")
    hour_of_day: Optional[int] = Field(12, ge=0, le=23)
    day_of_year: Optional[int] = Field(180, ge=1, le=366)

    class Config:
        json_schema_extra = {
            "example": {
                "latitude": 35.6,
                "longitude": 139.7,
                "depth": 32.5,
                "region": "Pacific Ring",
                "rms": 0.4,
                "gap": 85.0,
                "dmin": 0.8,
                "nst": 45
            }
        }


class ModelContributions(BaseModel):
    cnn_spatial: float = Field(..., description="CNN spatial pattern score")
    lstm_temporal: float = Field(..., description="LSTM temporal trend score")
    gnn_regional: float = Field(..., description="GNN regional dependency score")
    ensemble: float = Field(..., description="Final ensemble score")


class PredictionResponse(BaseModel):
    region: str
    latitude: float
    longitude: float
    risk_score: float = Field(..., ge=0, le=1, description="Overall risk score 0-1")
    risk_level: RiskLevel
    predicted_magnitude: float
    confidence: float = Field(..., ge=0, le=1)
    model_contributions: ModelContributions
    alert: bool = Field(..., description="True if alert should be triggered")
    explanation: str = Field(..., description="Human-readable explanation")


class BatchPredictionRequest(BaseModel):
    events: List[PredictionRequest]


class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    count: int


class RegionSummary(BaseModel):
    region: str
    current_risk_level: RiskLevel
    avg_risk_score: float
    max_risk_score: float
    recent_event_count: int
    predicted_magnitude: float
    latitude: float
    longitude: float
    trend: str  # "increasing", "stable", "decreasing"
    last_updated: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    message: str