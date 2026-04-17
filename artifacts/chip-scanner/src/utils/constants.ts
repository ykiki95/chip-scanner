export type PredictionLabel = "very_fresh" | "consumable" | "not_recommended";

export interface PredictionResult {
  label: PredictionLabel;
  display_text: string;
  reason: string;
  confidence: number;
}

export const RESULT_DISPLAY: Record<
  PredictionLabel,
  { text: string; reason: string; tone: "fresh" | "ok" | "danger" }
> = {
  very_fresh: {
    text: "매우 신선",
    reason: "칩의 색상 패턴이 신선 상태 기준과 매우 유사합니다.",
    tone: "fresh",
  },
  consumable: {
    text: "섭취 가능",
    reason: "칩의 색상 패턴이 섭취 가능한 범위에 해당합니다.",
    tone: "ok",
  },
  not_recommended: {
    text: "섭취 비권장",
    reason: "칩의 색상 패턴이 품질 저하 또는 변질 가능성을 나타냅니다.",
    tone: "danger",
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
export const STABLE_FRAMES_REQUIRED = 6; // 약 1초 (간격 약 160ms)
export const FRAME_INTERVAL_MS = 160;

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
