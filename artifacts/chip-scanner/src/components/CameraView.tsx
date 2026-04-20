import { useEffect, useRef, useState, useCallback } from "react";
import { useCamera } from "@/hooks/useCamera";
import {
  ROI_WIDTH_RATIO,
  ROI_HEIGHT_RATIO,
  MIN_BRIGHTNESS,
  MAX_BRIGHTNESS,
  MIN_SHARPNESS,
  MAX_MOTION,
  STABLE_FRAMES_REQUIRED,
  FRAME_INTERVAL_MS,
  PREVIEW_MAX_COLOR_STD,
  PREVIEW_MIN_SATURATION,
} from "@/utils/constants";
import { computeQuality, computeMotion } from "@/utils/imageQuality";
import { meanRgb } from "@/utils/analyzer";

type RoiState = "idle" | "scanning" | "detected" | "stable" | "analyzing";

export interface FrameDiagnostics {
  r: number;
  g: number;
  b: number;
  saturation: number;
  colorStd: number;
  brightness: number;
  sharpness: number;
  motion: number;
  checks: {
    brightness: boolean;
    sharpness: boolean;
    stability: boolean;
    uniformity: boolean;
    saturation: boolean;
  };
}

interface Props {
  onCapture: (blob: Blob, diagnostics: FrameDiagnostics | null) => void;
  isAnalyzing: boolean;
  errorBanner?: string | null;
}

export default function CameraView({
  onCapture,
  isAnalyzing,
  errorBanner,
}: Props) {
  const { videoRef, status, errorMessage, start, stop } = useCamera();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);
  const stableCountRef = useRef(0);
  const lockedRef = useRef(false);
  const [roiState, setRoiState] = useState<RoiState>("idle");
  const [statusText, setStatusText] = useState<string>(
    "칩을 가이드 영역 안에 맞춰 주세요",
  );
  const [lowLight, setLowLight] = useState(false);
  const [stableProgress, setStableProgress] = useState(0); // 0 ~ 1
  const [diagnostics, setDiagnostics] = useState<FrameDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const lastDiagnosticsRef = useRef<FrameDiagnostics | null>(null);

  // mount: 카메라 시작
  useEffect(() => {
    void start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 분석 중일 때 잠금
  useEffect(() => {
    lockedRef.current = isAnalyzing;
    if (isAnalyzing) {
      setRoiState("analyzing");
      setStatusText("분석 중입니다...");
      setStableProgress(1);
    } else {
      stableCountRef.current = 0;
      setStableProgress(0);
      setRoiState(status === "ready" ? "scanning" : "idle");
      if (status === "ready") {
        setStatusText("칩을 가이드 영역 안에 맞춰 주세요");
      }
    }
  }, [isAnalyzing, status]);

  // ROI 좌표 계산: video natural size 기준
  const getRoiRect = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const minSide = Math.min(vw, vh);
    const w = Math.round(minSide * ROI_WIDTH_RATIO);
    const h = Math.round(minSide * (ROI_HEIGHT_RATIO * 2)); // 세로형
    const x = Math.round((vw - w) / 2);
    const y = Math.round((vh - h) / 2);
    return { x, y, w, h };
  }, [videoRef]);

  // 프레임 루프
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (lockedRef.current) {
        setTimeout(tick, FRAME_INTERVAL_MS);
        return;
      }
      const video = videoRef.current;
      const sample = sampleCanvasRef.current;
      if (!video || !sample || video.readyState < 2) {
        setTimeout(tick, FRAME_INTERVAL_MS);
        return;
      }
      const rect = getRoiRect();
      if (!rect) {
        setTimeout(tick, FRAME_INTERVAL_MS);
        return;
      }

      // 다운샘플링된 ROI 분석용 캔버스
      const targetW = 96;
      const targetH = Math.round((rect.h / rect.w) * targetW);
      sample.width = targetW;
      sample.height = targetH;
      const ctx = sample.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setTimeout(tick, FRAME_INTERVAL_MS);
        return;
      }
      ctx.drawImage(
        video,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        0,
        0,
        targetW,
        targetH,
      );
      const imageData = ctx.getImageData(0, 0, targetW, targetH);
      const { brightness, sharpness } = computeQuality(imageData);
      const motion = lastFrameRef.current
        ? computeMotion(lastFrameRef.current, imageData)
        : 999;
      lastFrameRef.current = imageData;

      const tooDark = brightness < MIN_BRIGHTNESS;
      const tooBright = brightness > MAX_BRIGHTNESS;
      const tooBlurry = sharpness < MIN_SHARPNESS;
      const tooMoving = motion > MAX_MOTION;
      setLowLight(tooDark);

      // 칩 색상 유효성 (균일색 + 채도)
      const rgb = meanRgb(imageData);
      const avgStd = (rgb.stdR + rgb.stdG + rgb.stdB) / 3;
      const uniformOk = avgStd <= PREVIEW_MAX_COLOR_STD;
      const saturationOk = rgb.saturation >= PREVIEW_MIN_SATURATION;
      const looksLikeChip = uniformOk && saturationOk;

      const diag: FrameDiagnostics = {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        saturation: rgb.saturation,
        colorStd: avgStd,
        brightness,
        sharpness,
        motion,
        checks: {
          brightness: !tooDark && !tooBright,
          sharpness: !tooBlurry,
          stability: !tooMoving,
          uniformity: uniformOk,
          saturation: saturationOk,
        },
      };
      lastDiagnosticsRef.current = diag;
      setDiagnostics(diag);

      const resetStable = () => {
        stableCountRef.current = 0;
        setStableProgress(0);
      };

      if (tooDark) {
        setRoiState("scanning");
        setStatusText("조명이 어두워 판별이 어려울 수 있습니다.");
        resetStable();
      } else if (tooBright) {
        setRoiState("scanning");
        setStatusText("화면이 너무 밝습니다. 각도를 조절해 주세요.");
        resetStable();
      } else if (tooBlurry || tooMoving) {
        setRoiState("scanning");
        setStatusText("칩을 확인하는 중입니다");
        resetStable();
      } else if (!looksLikeChip) {
        // 칩이 아닌 일반 사물로 판단 → 카운트 시작 안 함
        setRoiState("scanning");
        setStatusText("칩이 인식되지 않습니다");
        resetStable();
      } else {
        stableCountRef.current += 1;
        const progress = Math.min(
          1,
          stableCountRef.current / STABLE_FRAMES_REQUIRED,
        );
        setStableProgress(progress);
        if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
          // 안정화 완료 → 캡처
          lockedRef.current = true;
          setRoiState("stable");
          setStatusText("분석 중입니다...");
          await captureAndSend(rect);
        } else {
          setRoiState("detected");
          setStatusText("칩 인식됨 — 잠시만 유지해 주세요");
        }
      }

      setTimeout(tick, FRAME_INTERVAL_MS);
    };

    const captureAndSend = async (rect: {
      x: number;
      y: number;
      w: number;
      h: number;
    }) => {
      const video = videoRef.current;
      const cap = captureCanvasRef.current;
      if (!video || !cap) return;
      cap.width = rect.w;
      cap.height = rect.h;
      const cctx = cap.getContext("2d");
      if (!cctx) return;
      cctx.drawImage(
        video,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        0,
        0,
        rect.w,
        rect.h,
      );
      cap.toBlob(
        (blob) => {
          if (blob) onCapture(blob, lastDiagnosticsRef.current);
          else lockedRef.current = false;
        },
        "image/jpeg",
        0.9,
      );
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [status, getRoiRect, onCapture, videoRef]);

  // ROI 박스 색상
  const borderColor =
    roiState === "stable"
      ? "border-emerald-400"
      : roiState === "analyzing"
        ? "border-amber-400"
        : roiState === "detected"
          ? "border-emerald-300"
          : roiState === "scanning"
            ? "border-sky-400"
            : "border-white/50";

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* 비디오 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 분석용 hidden 캔버스 */}
      <canvas ref={sampleCanvasRef} className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* 상단 그라디언트 + 타이틀 */}
      <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="px-5 py-4">
          <h1 className="text-white text-base font-semibold tracking-tight">
            로터스바이오 TTI AI 품질 스캐너
          </h1>
          <p className="text-white/70 text-xs mt-0.5">
            원형 인디케이터를 가운데 점선 원 안에 맞춰 주세요
          </p>
        </div>
      </div>

      {/* ROI 가이드 박스 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          ref={overlayRef}
          className={`relative border-2 ${borderColor} rounded-2xl transition-colors duration-300`}
          style={{
            width: `${ROI_WIDTH_RATIO * 100}vmin`,
            height: `${ROI_HEIGHT_RATIO * 2 * 100}vmin`,
            maxWidth: "78vw",
            maxHeight: "55vh",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
          }}
        >
          {/* 모서리 가이드 */}
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-7 h-7 ${cls} ${borderColor.replace(
                "border-",
                "border-",
              )}`}
            />
          ))}

          {/* 인디케이터 인식 영역 — 가운데 점선 원 (네모 짧은 변의 약 40%) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full border-2 border-dashed border-white/85"
              style={{
                width: "40%",
                aspectRatio: "1 / 1",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.25) inset",
              }}
              aria-label="인디케이터 색 판독 영역"
            />
          </div>

          {/* 칩 인식 진행 — 작은 시계모양 카운트다운 링 */}
          {(roiState === "detected" ||
            roiState === "stable" ||
            roiState === "analyzing") && (
            <div className="absolute top-2 right-2">
              <ClockProgressRing
                progress={stableProgress}
                state={roiState}
              />
            </div>
          )}

          {/* 분석중 라벨 */}
          {roiState === "analyzing" && (
            <div className="absolute -bottom-3 left-0 right-0 flex justify-center">
              <div className="px-3 py-1 rounded-full bg-amber-400/90 text-amber-950 text-xs font-medium shadow">
                분석 중
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 상태바 */}
      <div className="absolute bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="px-5 pt-10 pb-6 flex flex-col items-center gap-2">
          {lowLight && (
            <div className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium">
              어두운 환경 감지
            </div>
          )}
          <p className="text-white text-base font-medium text-center drop-shadow">
            {statusText}
          </p>
          {roiState === "scanning" && (
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 진단 패널 토글 버튼 */}
      {status === "ready" && (
        <button
          onClick={() => setShowDiagnostics((v) => !v)}
          className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white/90 text-[11px] font-medium border border-white/15 hover-elevate active-elevate-2"
          aria-label="기준 보기 토글"
        >
          기준 {showDiagnostics ? "끄기" : "보기"}
        </button>
      )}

      {/* 진단 패널 */}
      {showDiagnostics && diagnostics && status === "ready" && (
        <DiagnosticsPanel d={diagnostics} />
      )}

      {/* 권한 거부 / 오류 오버레이 */}
      {(status === "denied" || status === "error") && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-8 h-8 text-destructive"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-white text-lg font-semibold mb-2">
            카메라를 사용할 수 없습니다
          </h2>
          <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-xs">
            {errorMessage ?? "알 수 없는 오류가 발생했습니다."}
          </p>
          <button
            onClick={() => start()}
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover-elevate active-elevate-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* API 오류 배너 */}
      {errorBanner && (
        <div className="absolute top-[env(safe-area-inset-top)] left-0 right-0 mt-16 px-4 pointer-events-none">
          <div className="mx-auto max-w-md rounded-xl bg-destructive/95 text-destructive-foreground px-4 py-3 text-sm shadow-lg">
            {errorBanner}
          </div>
        </div>
      )}
    </div>
  );
}

function DiagnosticsPanel({ d }: { d: FrameDiagnostics }) {
  const fmt = (n: number, p = 0) => n.toFixed(p);
  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
        ok
          ? "bg-emerald-500/25 text-emerald-200"
          : "bg-rose-500/25 text-rose-200"
      }`}
    >
      <span>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </span>
  );
  const swatch = `rgb(${Math.round(d.r)}, ${Math.round(d.g)}, ${Math.round(d.b)})`;
  return (
    <div
      className="absolute left-3 right-3 z-10 pointer-events-none"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)",
      }}
    >
      <div className="mx-auto max-w-md rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-2 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-block w-5 h-5 rounded border border-white/30"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <span className="text-[11px] font-mono">
            R {fmt(d.r)} · G {fmt(d.g)} · B {fmt(d.b)}
          </span>
          <span className="ml-auto text-[10px] text-white/70 font-mono">
            채도 {d.saturation.toFixed(2)} · σ {fmt(d.colorStd, 1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Check ok={d.checks.brightness} label="밝기" />
          <Check ok={d.checks.sharpness} label="선명도" />
          <Check ok={d.checks.stability} label="안정성" />
          <Check
            ok={d.checks.uniformity}
            label={`단일색${d.checks.uniformity ? "" : `(σ=${fmt(d.colorStd, 0)})`}`}
          />
          <Check
            ok={d.checks.saturation}
            label={`채도${d.checks.saturation ? "" : `(${d.saturation.toFixed(2)})`}`}
          />
        </div>
      </div>
    </div>
  );
}

interface ClockProgressRingProps {
  progress: number; // 0..1
  state: RoiState;
}

function ClockProgressRing({ progress, state }: ClockProgressRingProps) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = c * (1 - clamped);

  const color =
    state === "analyzing"
      ? "#fbbf24" // amber-400
      : state === "stable"
        ? "#34d399" // emerald-400
        : "#6ee7b7"; // emerald-300 (detected)

  const pct = Math.round(clamped * 100);

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-black/55 backdrop-blur-sm shadow-md"
      style={{ width: size + 6, height: size + 6 }}
      aria-label={`칩 인식 ${pct}%`}
    >
      <svg
        width={size}
        height={size}
        className={state === "analyzing" ? "animate-spin-slow" : ""}
      >
        {/* 배경 트랙 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        {/* 진행 — 12시 방향에서 시계방향으로 채워짐 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 120ms linear" }}
        />
        {/* 시계 바늘 */}
        <g
          transform={`rotate(${clamped * 360} ${size / 2} ${size / 2})`}
          style={{ transition: "transform 120ms linear" }}
        >
          {/* 시침 */}
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2}
            y2={size / 2 - r * 0.55}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={size / 2} cy={size / 2} r={2} fill={color} />
        </g>
      </svg>
    </div>
  );
}
