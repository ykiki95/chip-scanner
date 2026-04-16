"""포장 칩 색상 판별 FastAPI 서버."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .predictor import ChipPredictor
from .schemas import HealthResponse, PredictResponse
from .utils.image import InvalidImageError, load_image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("chip-scanner.api")


def create_app() -> FastAPI:
    app = FastAPI(
        title="포장 칩 색상 판별 API",
        version="1.0.0",
        description="ResNet50 기반 스마트 포장 칩 신선도 판별",
    )

    # CORS — 모바일 웹에서 접근 가능하도록 허용
    cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 모델은 1회만 로드한다.
    predictor: ChipPredictor | None = None
    load_error: Exception | None = None
    try:
        predictor = ChipPredictor()
        logger.info("Model loaded successfully on device: %s", predictor.device)
    except FileNotFoundError as exc:
        load_error = exc
        logger.error("Model load failed: %s", exc)
    except Exception as exc:  # pragma: no cover - defensive
        load_error = exc
        logger.exception("Unexpected model load failure")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok" if predictor else "degraded")

    @app.post("/predict", response_model=PredictResponse)
    async def predict(file: UploadFile = File(...)) -> PredictResponse:
        if predictor is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "모델이 로드되지 않았습니다. "
                    f"({type(load_error).__name__ if load_error else 'unknown'})"
                ),
            )
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="이미지 파일만 업로드 가능합니다.")

        raw = await file.read()
        try:
            image = load_image(raw)
        except InvalidImageError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            result = predictor.predict(image)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Prediction failed")
            raise HTTPException(status_code=500, detail="추론 중 오류가 발생했습니다.") from exc

        return PredictResponse(
            label=result.label,  # type: ignore[arg-type]
            display_text=result.display_text,
            reason=result.reason,
            confidence=round(result.confidence, 4),
        )

    @app.post("/predict-debug")
    async def predict_debug(file: UploadFile = File(...)) -> JSONResponse:
        """디버깅용 — 입력 이미지 정보와 raw confidence 반환."""
        if predictor is None:
            raise HTTPException(status_code=503, detail="모델이 로드되지 않았습니다.")
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="이미지 파일만 업로드 가능합니다.")
        raw = await file.read()
        try:
            image = load_image(raw)
        except InvalidImageError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        result = predictor.predict(image)
        return JSONResponse(
            {
                "input": {
                    "size": list(image.size),
                    "mode": image.mode,
                    "bytes": len(raw),
                },
                "label": result.label,
                "display_text": result.display_text,
                "reason": result.reason,
                "confidence": result.confidence,
            }
        )

    return app


app = create_app()
