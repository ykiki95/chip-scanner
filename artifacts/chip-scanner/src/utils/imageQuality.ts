// 간단한 이미지 품질 / 모션 평가 유틸

export interface QualityMetrics {
  brightness: number; // 0 ~ 255
  sharpness: number; // Laplacian-style variance proxy
}

/**
 * ROI 영역의 평균 밝기 + 간이 sharpness 계산.
 * 성능을 위해 8픽셀 간격 샘플링.
 */
export function computeQuality(imageData: ImageData): QualityMetrics {
  const { data, width, height } = imageData;
  let sum = 0;
  let count = 0;

  // grayscale 평균 (밝기)
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += g;
      count++;
    }
  }
  const brightness = sum / Math.max(1, count);

  // 간이 sharpness: 인접 픽셀 차이의 분산
  let diffSum = 0;
  let diffSqSum = 0;
  let dCount = 0;
  for (let y = 4; y < height - 4; y += 8) {
    for (let x = 4; x < width - 4; x += 8) {
      const i = (y * width + x) * 4;
      const iR = (y * width + (x + 4)) * 4;
      const iD = ((y + 4) * width + x) * 4;
      const c = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const r = 0.299 * data[iR] + 0.587 * data[iR + 1] + 0.114 * data[iR + 2];
      const d = 0.299 * data[iD] + 0.587 * data[iD + 1] + 0.114 * data[iD + 2];
      const dx = c - r;
      const dy = c - d;
      const v = Math.abs(dx) + Math.abs(dy);
      diffSum += v;
      diffSqSum += v * v;
      dCount++;
    }
  }
  const mean = diffSum / Math.max(1, dCount);
  const variance = diffSqSum / Math.max(1, dCount) - mean * mean;
  const sharpness = Math.max(0, variance);

  return { brightness, sharpness };
}

/**
 * 두 ImageData의 픽셀 평균 차이값. 모션 정도를 가늠.
 */
export function computeMotion(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return 999;
  const da = a.data;
  const db = b.data;
  let sum = 0;
  let count = 0;
  const step = 16; // 빠른 샘플링
  for (let i = 0; i < da.length; i += step) {
    const ga = 0.299 * da[i] + 0.587 * da[i + 1] + 0.114 * da[i + 2];
    const gb = 0.299 * db[i] + 0.587 * db[i + 1] + 0.114 * db[i + 2];
    sum += Math.abs(ga - gb);
    count++;
  }
  return sum / Math.max(1, count);
}
