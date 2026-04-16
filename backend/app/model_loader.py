"""ResNet50 모델 로더.

학습된 가중치(`model/best_model.pth`)를 로드하여 eval() 상태의 모델을 반환합니다.
가중치 파일이 없으면 명확한 에러를 발생시킵니다 (요구사항 6번).
환경변수 `ALLOW_RANDOM_MODEL=1` 로 설정한 경우, 가중치가 없어도 무작위 초기화
ResNet50 으로 시작합니다 (개발/데모용도).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Tuple

import torch
import torch.nn as nn
from torchvision import models, transforms

logger = logging.getLogger(__name__)

# 클래스 인덱스는 ImageFolder 의 알파벳 정렬 결과와 동일해야 합니다.
# (consumable, not_recommended, very_fresh)
CLASS_NAMES: Tuple[str, str, str] = (
    "consumable",
    "not_recommended",
    "very_fresh",
)
NUM_CLASSES = len(CLASS_NAMES)

# FastAPI 와 Colab 학습 스크립트가 동일한 전처리를 사용해야 한다.
INPUT_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

PREPROCESS = transforms.Compose(
    [
        transforms.Resize(256),
        transforms.CenterCrop(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ]
)


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def get_model_path() -> Path:
    env_path = os.environ.get("MODEL_PATH")
    if env_path:
        return Path(env_path)
    return _project_root() / "model" / "best_model.pth"


def load_model(device: str | torch.device | None = None) -> nn.Module:
    """ResNet50 분류 모델을 로드한다."""
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = models.resnet50(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, NUM_CLASSES)

    weight_path = get_model_path()
    if weight_path.exists():
        state = torch.load(weight_path, map_location=device)
        # 일부 학습 스크립트는 {"state_dict": ...} 형태로 저장하기도 한다
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        model.load_state_dict(state)
        logger.info("Loaded weights from %s", weight_path)
    else:
        if os.environ.get("ALLOW_RANDOM_MODEL") == "1":
            logger.warning(
                "Model weights not found at %s. ALLOW_RANDOM_MODEL=1, "
                "starting with random init for demo purposes.",
                weight_path,
            )
        else:
            raise FileNotFoundError(
                f"학습된 모델 파일이 존재하지 않습니다: {weight_path}\n"
                "training/train_resnet50_colab.py 로 학습한 후 best_model.pth 를 "
                f"위 경로에 두거나, MODEL_PATH 환경변수로 경로를 지정하거나, "
                "데모 실행을 원하시면 ALLOW_RANDOM_MODEL=1 로 실행하세요."
            )

    model.to(device)
    model.eval()
    return model
