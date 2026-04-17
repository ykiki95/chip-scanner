import { RESULT_DISPLAY, type PredictionResult, type PredictionLabel } from "./constants";

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

export interface RgbStats {
  r: number;
  g: number;
  b: number;
}

export function meanRgb(imageData: ImageData): RgbStats {
  const { data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  // 중앙 60% 영역만 사용해서 가이드 박스 가장자리/배경 영향 최소화
  const w = imageData.width;
  const h = imageData.height;
  const x0 = Math.floor(w * 0.2);
  const x1 = Math.floor(w * 0.8);
  const y0 = Math.floor(h * 0.2);
  const y1 = Math.floor(h * 0.8);
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return {
    r: r / Math.max(1, n),
    g: g / Math.max(1, n),
    b: b / Math.max(1, n),
  };
}

function inRange(v: number, range: [number, number]): boolean {
  return v >= range[0] && v <= range[1];
}

function rangeDistance(stats: RgbStats, range: RgbRange): number {
  // 범위 안이면 0, 밖이면 가장 가까운 경계까지의 거리(L1)
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
  const isFresh = inRgbRange(stats, PH_FRESH_RANGE);
  const isOk = inRgbRange(stats, SULFUR_OK_RANGE);

  let label: PredictionLabel;
  let confidence: number;

  if (isFresh) {
    label = "very_fresh";
    // 범위 중심에 가까울수록 신뢰도 ↑
    confidence = confidenceFromCenter(stats, PH_FRESH_RANGE);
  } else if (isOk) {
    label = "consumable";
    confidence = confidenceFromCenter(stats, SULFUR_OK_RANGE);
  } else {
    label = "not_recommended";
    // 두 범위로부터의 거리 중 가까운 쪽을 기준으로 신뢰도 산정
    const dFresh = rangeDistance(stats, PH_FRESH_RANGE);
    const dOk = rangeDistance(stats, SULFUR_OK_RANGE);
    const minD = Math.min(dFresh, dOk);
    // 거리 0 → 0.5, 거리 200+ → 0.99 로 부드럽게 매핑
    confidence = Math.min(0.99, 0.5 + minD / 400);
  }

  const display = RESULT_DISPLAY[label];
  return {
    label,
    display_text: display.text,
    reason: display.reason,
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
  // 정규화된 거리 (0 = 정중앙, 1 = 경계)
  const nd =
    (Math.abs(stats.r - cr) / hr +
      Math.abs(stats.g - cg) / hg +
      Math.abs(stats.b - cb) / hb) /
    3;
  // 정중앙 0.99, 경계 0.7
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
