import {
  API_BASE_URL,
  PREDICT_TIMEOUT_MS,
  type PredictionResult,
} from "./constants";

export async function predictChip(blob: Blob): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append("file", blob, "chip.jpg");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);

  try {
    const url = `${API_BASE_URL}/predict`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`서버 오류: ${res.status}`);
    }

    const data = (await res.json()) as PredictionResult;
    if (!data || !data.label) {
      throw new Error("잘못된 응답 형식입니다.");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
