import {
  RESULT_DISPLAY,
  PREVIEW_MAX_COLOR_STD,
  PREVIEW_MIN_SATURATION,
  type PredictionResult,
  type PredictionLabel,
} from "./constants";
import { classifyChipGate, type ChipGateResult } from "./chipGate";

// 문서 기준 RGB 임계값
// - pH 지시계 (신선):     R[160,219]  G[34,136]   B[53,74]
// - 황 함유 화합물 (섭취가능): R[162,182]  G[106,136]  B[57,102]
export interface RgbRange {
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

export const PH_FRESH_RANGE: RgbRange = {
  r: [160, 219],
  g: [34, 136],
  b: [53, 74],
};

export const SULFUR_OK_RANGE: RgbRange = {
  r: [162, 182],
  g: [106, 136],
  b: [57, 102],
};

// 지시계 유효성 검증 임계값 — 미리보기와 동일 기준 사용
const MAX_COLOR_STD = PREVIEW_MAX_COLOR_STD;
const MIN_SATURATION = PREVIEW_MIN_SATURATION;

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

function inRange(v: number, range: [number, number]): boolean {
  return v >= range[0] && v <= range[1];
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

function inRgbRange(stats: RgbStats, range: RgbRange): boolean {
  return (
    inRange(stats.r, range.r) &&
    inRange(stats.g, range.g) &&
    inRange(stats.b, range.b)
  );
}

export interface AnalysisResult extends PredictionResult {
  rgb: RgbStats;
}

export function classifyByRgb(stats: RgbStats): AnalysisResult {
  const avgStd = (stats.stdR + stats.stdG + stats.stdB) / 3;
  const isUniform = avgStd <= MAX_COLOR_STD;
  const isSaturated = stats.saturation >= MIN_SATURATION;
  const looksLikeChip = isUniform && isSaturated;

  let label: PredictionLabel;
  let confidence: number;
  let reasonOverride: string | null = null;

  if (looksLikeChip && inRgbRange(stats, PH_FRESH_RANGE)) {
    label = "very_fresh";
    confidence = confidenceFromCenter(stats, PH_FRESH_RANGE);
  } else if (looksLikeChip && inRgbRange(stats, SULFUR_OK_RANGE)) {
    label = "consumable";
    confidence = confidenceFromCenter(stats, SULFUR_OK_RANGE);
  } else {
    label = "not_recommended";
    if (!isUniform) {
      reasonOverride =
        "지시계가 아닌 다른 사물이 감지되었습니다. 단일 색상의 지시계만 인식 가능합니다.";
      confidence = 0.95;
    } else if (!isSaturated) {
      reasonOverride =
        "지시계 색상이 인식되지 않았습니다 (무채색/회색 영역). 지시계를 가이드 박스 안에 정확히 맞춰 주세요.";
      confidence = 0.9;
    } else {
      // 색은 지시계 같은 균일색이지만 두 범위에 모두 안 들어감 → 변질 가능성
      const dFresh = rangeDistance(stats, PH_FRESH_RANGE);
      const dOk = rangeDistance(stats, SULFUR_OK_RANGE);
      const minD = Math.min(dFresh, dOk);
      // 가까울수록 신뢰도 약간 ↓ (경계 근처는 애매), 멀수록 명확히 변질
      confidence = Math.min(0.99, 0.7 + minD / 250);
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
        label: "not_recommended",
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
