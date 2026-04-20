# Workspace

## Overview

스마트 포장 칩 색상 판별 시스템.
- 모바일 웹 카메라로 포장 지시계(칩)를 자동 인식하여 ResNet50 으로 신선도 분류
- 결과: 매우 신선 / 섭취 가능 / 섭취 비권장
- 프론트엔드는 React + Vite + TS, 백엔드는 Python FastAPI (별도 실행)

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind (artifact: `chip-scanner`)
- **Backend**: Python 3.10+ / FastAPI / PyTorch / torchvision (`backend/`)
- **Model**: ResNet50 transfer learning (3 classes)
- **Training**: Google Colab — `training/train_resnet50_colab.py`
- **Chip-vs-object gate**: TensorFlow.js MobileNet v1 (alpha 0.25, 224) — `artifacts/chip-scanner/public/models/mobilenet/`. 일반 사물(병/캔/박스/과일 등)을 1차로 걸러낸다.
- **Monorepo**: pnpm workspaces

## Key Commands

- `pnpm --filter @workspace/chip-scanner run dev` — 프론트엔드 개발 서버
- `cd backend && uvicorn app.main:app --port 8000 --reload` — FastAPI 백엔드
- `python training/train_resnet50_colab.py --dataset dataset --output model` — 학습

## Environment Variables

- `VITE_API_URL` — FastAPI 서버 베이스 URL (프론트엔드)
- `MODEL_PATH` — `best_model.pth` 경로 (기본 `model/best_model.pth`)
- `ALLOW_RANDOM_MODEL=1` — 가중치 없이 데모 실행
- `CORS_ORIGINS` — 허용 오리진 (콤마구분)

자세한 내용은 README.md 참고.
