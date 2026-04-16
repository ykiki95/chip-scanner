"""ResNet50 추론 파이프라인"""

from __future__ import annotations

from dataclasses import dataclass

import torch
from PIL import Image

from .model_loader import CLASS_NAMES, PREPROCESS, load_model

# 결과별 표시 문구 — 프론트엔드의 constants.ts 와 1:1 동일하게 유지
DISPLAY_TEXT = {
    "very_fresh": "매우 신선",
    "consumable": "섭취 가능",
    "not_recommended": "섭취 비권장",
}

REASONS = {
    "very_fresh": "칩의 색상 패턴이 신선 상태 기준과 매우 유사합니다.",
    "consumable": "칩의 색상 패턴이 섭취 가능한 범위에 해당합니다.",
    "not_recommended": "칩의 색상 패턴이 품질 저하 또는 변질 가능성을 나타냅니다.",
}


@dataclass
class Prediction:
    label: str
    display_text: str
    reason: str
    confidence: float


class ChipPredictor:
    """1회 로드, 다회 추론."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = load_model(self.device)

    @torch.inference_mode()
    def predict(self, image: Image.Image) -> Prediction:
        tensor = PREPROCESS(image).unsqueeze(0).to(self.device)
        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(torch.argmax(probs).item())
        label = CLASS_NAMES[idx]
        confidence = float(probs[idx].item())
        return Prediction(
            label=label,
            display_text=DISPLAY_TEXT[label],
            reason=REASONS[label],
            confidence=confidence,
        )
