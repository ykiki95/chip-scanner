export type PredictionLabel =
  | "very_fresh"
  | "consumable"
  | "not_recommended"
  | "unsupported";

export interface PredictionResult {
  label: PredictionLabel;
  display_text: string;
  reason: string;
  confidence: number;
}

export const RESULT_DISPLAY: Record<
  PredictionLabel,
  { text: string; reason: string; tone: "fresh" | "ok" | "danger" | "neutral" }
> = {
  very_fresh: {
    text: "신선함",
    reason: "칩의 색상이 신선(0–3일) 기준 색상 범위에 해당합니다.",
    tone: "fresh",
  },
  consumable: {
    text: "섭취 가능",
    reason: "칩의 색상이 섭취 가능(3–7일) 색상 범위에 해당합니다.",
    tone: "ok",
  },
  not_recommended: {
    text: "섭취 비권장",
    reason: "칩의 색상이 섭취 비권장(7–10일) 색상 범위에 해당합니다.",
    tone: "danger",
  },
  unsupported: {
    text: "지원하지 않는 색상",
    reason: "칩이 지원하는 색상이 아닙니다.",
    tone: "neutral",
  },
};

// ROI 가이드 박스 비율 (화면 짧은 변 기준)
export const ROI_WIDTH_RATIO = 0.55;
export const ROI_HEIGHT_RATIO = 0.32;

// 자동 분석 조건
export const MIN_BRIGHTNESS = 50; // 0~255
export const MAX_BRIGHTNESS = 230;
export const MIN_SHARPNESS = 12; // Laplacian variance proxy
export const MAX_MOTION = 14; // 평균 픽셀 차이
export const STABLE_FRAMES_REQUIRED = 12; // 약 2초 (간격 약 160ms) — 사용자가 침착히 정렬할 시간 확보
export const FRAME_INTERVAL_MS = 160;
// 색상 안정성: 최근 N프레임 평균 RGB의 채널별 변동 폭이 이 값 이하여야
// "칩이 원 안에 안정적으로 들어왔다" 로 간주. 손떨림·움직임 추적과 별개로
// 색상 자체가 흔들리지 않는지 확인.
export const COLOR_STABILITY_FRAMES = 4;
export const COLOR_STABILITY_MAX_DELTA = 14;

// 칩(지시계) 인식 조건 — 실시간 미리보기와 분석에서 공유
// 단일색 표준편차: 값이 낮을수록 균일한 색. 일반 사물(병, 종이 등)이
// 통과할 수 있도록 약간 완화. 너무 큰 값은 잡색 사물도 통과시키므로 주의.
export const PREVIEW_MAX_COLOR_STD = 55;
// HSV 채도: 너무 낮으면 무채색(검정/회색/흰색) → 지시계 아님
export const PREVIEW_MIN_SATURATION = 0.15;

// API
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const PREDICT_TIMEOUT_MS = 15000;
