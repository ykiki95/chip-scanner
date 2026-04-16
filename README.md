# 포장 칩 색상 판별 시스템

스마트 포장 지시계(칩) 색상을 모바일 웹 카메라로 자동 인식하여
**매우 신선 / 섭취 가능 / 섭취 비권장** 중 하나로 판별하는 시스템입니다.

- **프론트엔드**: React + Vite + TypeScript + Tailwind (모바일 웹 최적화, 카메라 자동 시작)
- **백엔드**: Python + FastAPI
- **모델**: ResNet50 전이학습 (3 클래스)
- **학습 환경**: Google Colab / 로컬 GPU

---

## 프로젝트 구조

```
project-root/
├── artifacts/chip-scanner/      # 모바일 웹 프론트엔드 (React + Vite)
│   └── src/
│       ├── components/CameraView.tsx
│       ├── components/ResultView.tsx
│       ├── pages/Scanner.tsx
│       ├── hooks/useCamera.ts
│       └── utils/{api,constants,imageQuality}.ts
├── backend/                     # FastAPI 추론 서버
│   ├── app/
│   │   ├── main.py
│   │   ├── model_loader.py
│   │   ├── predictor.py
│   │   ├── schemas.py
│   │   └── utils/image.py
│   └── requirements.txt
├── training/
│   └── train_resnet50_colab.py  # Colab 학습 스크립트
├── model/
│   └── best_model.pth           # 학습된 가중치 (직접 추가)
└── README.md
```

---

## 1. 설치

### 1-1. 프론트엔드

루트에서 (pnpm 워크스페이스):

```bash
pnpm install
```

### 1-2. 백엔드 (FastAPI)

별도의 Python 가상환경 권장 (Python 3.10+):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## 2. 실행

### 2-1. 백엔드 실행

```bash
# 프로젝트 루트에서
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- 모델 가중치는 기본 경로 `model/best_model.pth` 에서 로드됩니다.
- 다른 경로를 사용하려면 환경변수 `MODEL_PATH=/path/to/best_model.pth`.
- **가중치가 없는 상태로 데모 실행**을 원하면:
  ```bash
  ALLOW_RANDOM_MODEL=1 uvicorn app.main:app --port 8000
  ```
  (랜덤 초기화 ResNet50 사용 — 결과는 의미 없음, UI 동작 확인용)

CORS는 기본 `*` 허용. 운영 환경에서는 `CORS_ORIGINS=https://example.com,...`.

### 2-2. 프론트엔드 실행

```bash
# 루트에서
pnpm --filter @workspace/chip-scanner run dev
```

기본 미리보기는 `http://localhost:80/`. (Replit 환경에서는 자동 라우팅됨)

프론트엔드가 호출하는 API URL은 환경변수로 지정하세요:

```bash
# artifacts/chip-scanner/.env (또는 빌드 시 환경변수)
VITE_API_URL=https://your-fastapi-server.example.com
```

지정하지 않으면 동일 오리진(`/predict`)으로 호출합니다 — 리버스 프록시를 사용하는 경우 유용합니다.

### 2-3. 동시 실행 (개발)

두 개의 터미널을 사용:

```bash
# 터미널 A — 프론트엔드
pnpm --filter @workspace/chip-scanner run dev

# 터미널 B — 백엔드
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. 모바일 테스트

1. 백엔드를 외부에서 접근 가능한 URL로 노출 (예: ngrok, Cloudflare Tunnel, 사내 서버).
2. `VITE_API_URL` 을 그 URL 로 설정하고 프론트엔드 빌드/배포.
3. **HTTPS 필수** — `getUserMedia` 는 안전한 컨텍스트(HTTPS or localhost)에서만 동작합니다.
4. 모바일 브라우저(Chrome/Safari)에서 URL 접속 → 카메라 권한 허용.
5. 후면 카메라가 자동 활성화되며 가이드 박스에 칩을 맞추면 자동 분석됩니다.

---

## 4. Colab 학습 방법

1. 데이터셋을 다음 구조로 준비:

   ```
   dataset/
     train/
       very_fresh/
       consumable/
       not_recommended/
     val/
       very_fresh/
       consumable/
       not_recommended/
   ```

2. Google Drive 에 업로드하고 Colab 노트북에서:

   ```python
   from google.colab import drive
   drive.mount('/content/drive')

   !cp /content/drive/MyDrive/your-repo/training/train_resnet50_colab.py .
   !python train_resnet50_colab.py \
       --dataset /content/drive/MyDrive/chip-dataset \
       --output /content/drive/MyDrive/chip-models \
       --epochs 25 --batch_size 32
   ```

3. 학습 완료 후 `best_model.pth` 를 다운로드 → 본 프로젝트의 `model/best_model.pth` 로 복사.

학습 / 추론 전처리는 모두 다음으로 동일합니다 (`backend/app/model_loader.py` 와 일치):

```
Resize(256) → CenterCrop(224) → ToTensor → Normalize(ImageNet mean/std)
```

---

## 5. API 규격

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /predict`

`multipart/form-data` — 필드명 `file` (이미지 파일).

응답:

```json
{
  "label": "consumable",
  "display_text": "섭취 가능",
  "reason": "칩의 색상 패턴이 섭취 가능한 범위에 해당합니다.",
  "confidence": 0.91
}
```

### `POST /predict-debug` (선택)

같은 입력에 대해 raw confidence + 입력 이미지 메타 반환.

---

## 6. 동작 흐름

1. 모바일 브라우저에서 URL 진입 → 카메라 권한 요청 → 후면 카메라 자동 시작
2. 화면 중앙 ROI 가이드 박스 표시 (대기: 흰색, 인식 중: 파랑, 안정화: 녹색, 분석: 주황)
3. 매 프레임마다 ROI 영역 밝기 / 흐림 / 모션을 평가
4. ~1초간 안정화 조건 충족 시 ROI 이미지를 JPEG 으로 서버 업로드
5. 서버는 ResNet50 추론 후 결과 + 이유 + 신뢰도 반환
6. 결과 화면 표시 (색상 강조 + 이유 + 종료/재판별 버튼)
7. **재판별** → 카메라 화면으로 완전 초기화
8. **종료** → `window.close()` → `history.back()` → 안내 화면 (graceful fallback)

---

## 7. 종료 버튼 제한 사항

- 모바일 브라우저는 보안 정책상 사용자가 직접 연 탭을 스크립트로 닫을 수 없습니다.
- 본 앱은 다음 순서로 graceful fallback 합니다:
  1. `window.close()` 시도
  2. `history.back()` 시도
  3. "브라우저를 닫아 주세요" 안내 화면 표시 + "다시 시작" 버튼 제공

---

## 8. 환경변수 요약

| 키 | 위치 | 설명 |
|---|---|---|
| `VITE_API_URL` | 프론트엔드 빌드 시 | FastAPI 서버 베이스 URL |
| `MODEL_PATH` | 백엔드 | 학습된 가중치 경로 (기본: `model/best_model.pth`) |
| `ALLOW_RANDOM_MODEL` | 백엔드 | `1` 이면 가중치 없어도 데모 실행 |
| `CORS_ORIGINS` | 백엔드 | 콤마구분 허용 오리진 (기본 `*`) |

---

## 9. 향후 개선 포인트

- **온디바이스 추론** — ONNX/TF.js 변환으로 네트워크 의존성 제거 (오프라인 동작)
- **데이터 수집 파이프라인** — `/predict-debug` 응답을 사용자 피드백과 함께 저장하여 재학습
- **다양한 조명/배경에 대한 강건성** — ColorChecker 보정, 화이트밸런스 정규화
- **클래스 확장** — 시간경과 단계, 포장 손상 등 멀티 라벨
- **모니터링** — 추론 latency / 분포 시프트 메트릭 (Prometheus)
- **신뢰도 임계값** — `confidence < 0.6` 은 "재촬영 권장" 으로 처리
- **PWA 화** — 홈 화면 추가, 오프라인 셸
