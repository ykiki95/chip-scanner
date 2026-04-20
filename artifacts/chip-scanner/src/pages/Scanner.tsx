import { useCallback, useState } from "react";
import CameraView, { type FrameDiagnostics } from "@/components/CameraView";
import ResultView, { type ResultMeasurement } from "@/components/ResultView";
import { analyzeBlobWithGate } from "@/utils/analyzer";
import type { PredictionResult } from "@/utils/constants";

type Phase = "camera" | "result" | "exited";

export default function Scanner() {
  const [phase, setPhase] = useState<Phase>("camera");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [measurement, setMeasurement] = useState<ResultMeasurement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleCapture = useCallback(
    async (blob: Blob, diag: FrameDiagnostics | null) => {
    setIsAnalyzing(true);
    setErrorBanner(null);
    try {
      // RGB 임계값 기반 분류 (브라우저에서 바로 분석)
      // 분석 자체는 매우 빠르지만, UX 상 잠시 로딩이 보이도록 최소 350ms 보장
      const [r] = await Promise.all([
        analyzeBlobWithGate(blob),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
      setResult(r);
      setMeasurement(
        diag
          ? {
              r: diag.r,
              g: diag.g,
              b: diag.b,
              saturation: diag.saturation,
              colorStd: diag.colorStd,
            }
          : { r: r.rgb.r, g: r.rgb.g, b: r.rgb.b, saturation: r.rgb.saturation, colorStd: (r.rgb.stdR + r.rgb.stdG + r.rgb.stdB) / 3 },
      );
      setPhase("result");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
      setErrorBanner(`분석 중 오류가 발생했습니다. ${msg}`);
      // 자동으로 카메라 모드로 복귀
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setResult(null);
    setMeasurement(null);
    setErrorBanner(null);
    setIsAnalyzing(false);
    setPhase("camera");
  }, []);

  const handleExit = useCallback(() => {
    // 모바일 보안 정책 graceful fallback
    try {
      window.close();
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      // window.close 가 무시된 경우 (대부분의 모바일 브라우저)
      if (!window.closed) {
        try {
          if (window.history.length > 1) {
            window.history.back();
          }
        } catch {
          /* ignore */
        }
        setPhase("exited");
      }
    }, 150);
  }, []);

  if (phase === "exited") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-8 h-8 text-muted-foreground"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          판별을 종료했습니다
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          브라우저를 닫아 주세요. 다시 시작하시려면 아래 버튼을 눌러 주세요.
        </p>
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover-elevate active-elevate-2"
        >
          다시 시작
        </button>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <ResultView
        result={result}
        measurement={measurement}
        onRetry={handleRetry}
        onExit={handleExit}
      />
    );
  }

  return (
    <CameraView
      onCapture={handleCapture}
      isAnalyzing={isAnalyzing}
      errorBanner={errorBanner}
    />
  );
}
