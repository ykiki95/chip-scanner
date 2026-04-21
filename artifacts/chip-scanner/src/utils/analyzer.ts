import {
  RESULT_DISPLAY,
  PREVIEW_MAX_COLOR_STD,
  type PredictionResult,
  type PredictionLabel,
} from "./constants";
import { classifyChipGate, type ChipGateResult } from "./chipGate";

// Lotusbio TTI 색상 기준 (이미지에서 추출한 9개 색상의 그룹별 RGB 범위)
// 신선(0–3일):     [229,231,229] [162,197,208] [135,183,198]
// 섭취 가능(3–7일): [107,169,190] [94,156,176] [80,135,160]
// 섭취 비권장(7–10일): [71,131,155] [49,122,149] [42,105,128]
export interface RgbRange {
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

export const FRESH_RANGE: RgbRange = {
  r: [135, 229],
  g: [183, 231],
  b: [198, 229],
};

export const CONSUMABLE_RANGE: RgbRange = {
  r: [80, 107],
  g: [135, 169],
  b: [160, 190],
};

export const NOT_RECOMMENDED_RANGE: RgbRange = {
  r: [42, 71],
  g: [105, 131],
  b: [128, 155],
};

// 채널 허용 오차 — 인쇄/카메라 색상 편차 보정용
// (프린터 잉크 농도 + 종이 흰점 + LED/형광등 + 카메라 WB 누적 오차를 고려)
// 12 → 30 으로 확대: 인쇄본 테스트에서 신선/섭취가능/비권장이 정상 분류되도록.
const CHANNEL_TOLERANCE = 30;

// 지시계 유효성 검증: 가이드 박스 안 색상이 균일한지 확인 (변두리/배경 영향 최소화)
const MAX_COLOR_STD = PREVIEW_MAX_COLOR_STD;

export interface RgbStats {
  r: number;
  g: number;
  b: number;
  stdR: number;
  stdG: number;
  stdB: number;
  saturation: number;
}

export function meanRgb(imageData: ImageData): RgbStats {
  const { data, width: w, height: h } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let r2 = 0;
  let g2 = 0;
  let b2 = 0;
  let n = 0;
  // 가운데 원형 점선 영역(짧은 변의 약 40%) 안 픽셀만 표본 추출
  // 가이드 박스 가장자리/배경 영향을 최소화하고, 원형 인디케이터의 정중앙
  // 색만 정확히 평가한다.
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.2; // 지름 40% → 반지름 20%
  const r2max = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(w, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(h, Math.ceil(cy + radius));
  for (let y = y0; y < y1; y += 2) {
    const dy = y - cy;
    for (let x = x0; x < x1; x += 2) {
      const dx = x - cx;
      if (dx * dx + dy * dy > r2max) continue;
      const i = (y * w + x) * 4;
      const cr = data[i];
      const cg = data[i + 1];
      const cb = data[i + 2];
      r += cr;
      g += cg;
      b += cb;
      r2 += cr * cr;
      g2 += cg * cg;
      b2 += cb * cb;
      n++;
    }
  }
  const N = Math.max(1, n);
  const mr = r / N;
  const mg = g / N;
  const mb = b / N;
  const stdR = Math.sqrt(Math.max(0, r2 / N - mr * mr));
  const stdG = Math.sqrt(Math.max(0, g2 / N - mg * mg));
  const stdB = Math.sqrt(Math.max(0, b2 / N - mb * mb));
  // HSV 채도
  const max = Math.max(mr, mg, mb);
  const min = Math.min(mr, mg, mb);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return { r: mr, g: mg, b: mb, stdR, stdG, stdB, saturation };
}

function inRange(v: number, range: [number, number], tol = 0): boolean {
  return v >= range[0] - tol && v <= range[1] + tol;
}

function rangeDistance(stats: RgbStats, range: RgbRange): number {
  const dr = inRange(stats.r, range.r)
    ? 0
    : Math.min(Math.abs(stats.r - range.r[0]), Math.abs(stats.r - range.r[1]));
  const dg = inRange(stats.g, range.g)
    ? 0
    : Math.min(Math.abs(stats.g - range.g[0]), Math.abs(stats.g - range.g[1]));
  const db = inRange(stats.b, range.b)
    ? 0
    : Math.min(Math.abs(stats.b - range.b[0]), Math.abs(stats.b - range.b[1]));
  return dr + dg + db;
}

function inRgbRange(stats: RgbStats, range: RgbRange, tol = 0): boolean {
  return (
    inRange(stats.r, range.r, tol) &&
    inRange(stats.g, range.g, tol) &&
    inRange(stats.b, range.b, tol)
  );
}

export interface AnalysisResult extends PredictionResult {
  rgb: RgbStats;
}

export function classifyByRgb(stats: RgbStats): AnalysisResult {
  const avgStd = (stats.stdR + stats.stdG + stats.stdB) / 3;
  const isUniform = avgStd <= MAX_COLOR_STD;

  let label: PredictionLabel;
  let confidence: number;
  let reasonOverride: string | null = null;

  if (!isUniform) {
    label = "unsupported";
    reasonOverride =
      "균일한 단일 색상이 감지되지 않았습니다. 지시계를 가이드 박스 안에 정확히 맞춰 주세요.";
    confidence = 0.9;
  } else {
    // 1차: 정확한 범위 매칭 (오차 없음)
    if (inRgbRange(stats, FRESH_RANGE)) {
      label = "very_fresh";
      confidence = confidenceFromCenter(stats, FRESH_RANGE);
    } else if (inRgbRange(stats, CONSUMABLE_RANGE)) {
      label = "consumable";
      confidence = confidenceFromCenter(stats, CONSUMABLE_RANGE);
    } else if (inRgbRange(stats, NOT_RECOMMENDED_RANGE)) {
      label = "not_recommended";
      confidence = confidenceFromCenter(stats, NOT_RECOMMENDED_RANGE);
    } else {
      // 2차: 허용 오차 내 가장 가까운 범위로 보정 (인쇄/카메라 색차 흡수)
      const candidates: Array<{ label: PredictionLabel; range: RgbRange; d: number }> = [
        { label: "very_fresh", range: FRESH_RANGE, d: rangeDistance(stats, FRESH_RANGE) },
        { label: "consumable", range: CONSUMABLE_RANGE, d: rangeDistance(stats, CONSUMABLE_RANGE) },
        { label: "not_recommended", range: NOT_RECOMMENDED_RANGE, d: rangeDistance(stats, NOT_RECOMMENDED_RANGE) },
      ];
      candidates.sort((a, b) => a.d - b.d);
      const best = candidates[0];
      if (
        best.d <= CHANNEL_TOLERANCE * 4 &&
        inRgbRange(stats, best.range, CHANNEL_TOLERANCE)
      ) {
        label = best.label;
        // 경계 밖이라 신뢰도는 약간 낮춤
        confidence = Math.max(0.7, confidenceFromCenter(stats, best.range) - 0.1);
      } else {
        label = "unsupported";
        confidence = Math.min(0.99, 0.7 + best.d / 250);
      }
    }
  }

  const display = RESULT_DISPLAY[label];
  return {
    label,
    display_text: display.text,
    reason: reasonOverride ?? display.reason,
    confidence,
    rgb: stats,
  };
}

function confidenceFromCenter(stats: RgbStats, range: RgbRange): number {
  const cr = (range.r[0] + range.r[1]) / 2;
  const cg = (range.g[0] + range.g[1]) / 2;
  const cb = (range.b[0] + range.b[1]) / 2;
  const hr = (range.r[1] - range.r[0]) / 2 || 1;
  const hg = (range.g[1] - range.g[0]) / 2 || 1;
  const hb = (range.b[1] - range.b[0]) / 2 || 1;
  const nd =
    (Math.abs(stats.r - cr) / hr +
      Math.abs(stats.g - cg) / hg +
      Math.abs(stats.b - cb) / hb) /
    3;
  return Math.max(0.7, 0.99 - nd * 0.29);
}

/** Blob 을 ImageData 로 디코딩 후 RGB 분류 수행 */
export async function analyzeBlob(blob: Blob): Promise<AnalysisResult> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const stats = meanRgb(imageData);
    return classifyByRgb(stats);
  } finally {
    bitmap.close?.();
  }
}

export interface GatedAnalysisResult extends AnalysisResult {
  gate: ChipGateResult | null;
  gateError?: string;
}

/**
 * Blob 을 디코딩 → MobileNet 1차 게이트 → RGB 분류
 *
 * 게이트가 "지시계 아님" 으로 판단하면 RGB 분류를 건너뛰고
 * "지시계가 아님" 안내를 반환한다. 게이트 모델 로딩이 실패하면
 * 안전하게 RGB 분류로 fallback 한다.
 */
export async function analyzeBlobWithGate(
  blob: Blob,
): Promise<GatedAnalysisResult> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const stats = meanRgb(imageData);

    let gate: ChipGateResult | null = null;
    let gateError: string | undefined;
    try {
      gate = await classifyChipGate(canvas);
    } catch (err) {
      gateError = err instanceof Error ? err.message : String(err);
      console.warn("[analyzer] chip gate failed, falling back", err);
    }

    if (gate && !gate.isChip) {
      return {
        label: "unsupported",
        display_text: "지시계가 아님",
        reason: gate.reason,
        confidence: Math.max(0.85, gate.topProbability),
        rgb: stats,
        gate,
        gateError,
      };
    }

    const rgbResult = classifyByRgb(stats);
    return { ...rgbResult, gate, gateError };
  } finally {
    bitmap.close?.();
  }
}
