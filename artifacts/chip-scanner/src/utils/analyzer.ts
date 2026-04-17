import {
  RESULT_DISPLAY,
  PREVIEW_MAX_COLOR_STD,
  PREVIEW_MIN_SATURATION,
  type PredictionResult,
  type PredictionLabel,
} from "./constants";

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
  // 중앙 60% 영역만 사용해서 가이드 박스 가장자리/배경 영향 최소화
  const x0 = Math.floor(w * 0.2);
  const x1 = Math.floor(w * 0.8);
  const y0 = Math.floor(h * 0.2);
  const y1 = Math.floor(h * 0.8);
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
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
