"""Pydantic 스키마 정의"""
from pydantic import BaseModel, Field
from typing import Literal

PredictionLabel = Literal["very_fresh", "consumable", "not_recommended"]


class HealthResponse(BaseModel):
    status: str = "ok"


class PredictResponse(BaseModel):
    label: PredictionLabel
    display_text: str
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
