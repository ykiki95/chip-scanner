import { useState } from "react";
import { RESULT_DISPLAY, type PredictionResult } from "@/utils/constants";
import type { ChipGateResult } from "@/utils/chipGate";
import { toKoreanImagenetLabel } from "@/utils/imagenetKoLabels";

export interface ResultMeasurement {
  r: number;
  g: number;
  b: number;
  saturation: number;
  colorStd: number;
}

export interface ResultViewResult extends PredictionResult {
  gate?: ChipGateResult | null;
}

interface Props {
  result: ResultViewResult;
  measurement?: ResultMeasurement | null;
  onRetry: () => void;
  onExit: () => void;
}

const TONE_STYLES = {
  fresh: {
    bg: "bg-gradient-to-b from-emerald-50 to-emerald-100",
    accent: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  ok: {
    bg: "bg-gradient-to-b from-amber-50 to-amber-100",
    accent: "bg-amber-500",
    text: "text-amber-700",
    ring: "ring-amber-200",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
  danger: {
    bg: "bg-gradient-to-b from-rose-50 to-rose-100",
    accent: "bg-rose-500",
    text: "text-rose-700",
    ring: "ring-rose-200",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  neutral: {
    bg: "bg-gradient-to-b from-slate-50 to-slate-100",
    accent: "bg-slate-500",
    text: "text-slate-700",
    ring: "ring-slate-200",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="w-12 h-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
} as const;

export default function ResultView({ result, measurement, onRetry, onExit }: Props) {
  const display = RESULT_DISPLAY[result.label] ?? RESULT_DISPLAY.consumable;
  const style = TONE_STYLES[display.tone];
  const confidencePct = Math.round((result.confidence ?? 0) * 100);
  const [showGate, setShowGate] = useState(false);
  const gateTop3 = (result.gate?.predictions ?? []).slice(0, 3);

  return (
    <div
      className={`relative w-full h-full ${style.bg} flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)]`}
    >
      {/* 상단 헤더 */}
      <div className="text-center">
        <p className="text-xs font-medium tracking-wider text-foreground/50 uppercase">
          판별 결과
        </p>
      </div>

      {/* 메인 결과 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div
          className={`w-24 h-24 rounded-full bg-white shadow-lg ring-4 ${style.ring} flex items-center justify-center mb-6 ${style.text}`}
        >
          {style.icon}
        </div>

        <h1 className={`text-4xl font-bold tracking-tight ${style.text} mb-3`}>
          {result.display_text || display.text}
        </h1>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 ${style.text} text-xs font-medium mb-6`}
        >
          <span className={`w-2 h-2 rounded-full ${style.accent}`} />
          신뢰도 {confidencePct}%
        </div>

        <p className="max-w-sm text-foreground/70 text-sm leading-relaxed">
          {result.reason || display.reason}
        </p>

        {measurement && (
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-border/60">
            <span
              className="inline-block w-4 h-4 rounded border border-border/60"
              style={{
                backgroundColor: `rgb(${Math.round(measurement.r)}, ${Math.round(
                  measurement.g,
                )}, ${Math.round(measurement.b)})`,
              }}
              aria-hidden
            />
            <span className="text-[11px] font-mono text-foreground/70">
              R {measurement.r.toFixed(0)} · G {measurement.g.toFixed(0)} · B{" "}
              {measurement.b.toFixed(0)} · 채도 {measurement.saturation.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* 1차 게이트 판단 근거 토글 */}
      {gateTop3.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowGate((v) => !v)}
            aria-expanded={showGate}
            aria-controls="gate-evidence-panel"
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/70 border border-border/60 text-xs font-medium text-foreground/70 hover-elevate active-elevate-2"
          >
            <span className="inline-flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${style.accent}`} />
              인식된 사물 근거 보기
              {result.gate && (
                <span className="text-foreground/40">
                  · {result.gate.isChip ? "지시계 후보" : "지시계 아님"}
                </span>
              )}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`w-4 h-4 transition-transform ${showGate ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGate && (
            <div
              id="gate-evidence-panel"
              className="mt-2 px-4 py-3 rounded-xl bg-white/80 border border-border/60 text-left"
            >
              <p className="text-[11px] text-foreground/50 mb-2">
                MobileNet(ImageNet) 상위 3개 후보
              </p>
              <ul className="space-y-2">
                {gateTop3.map((p, idx) => {
                  const pct = Math.round(p.probability * 100);
                  const ko = toKoreanImagenetLabel(p.className);
                  return (
                    <li key={`${p.className}-${idx}`} className="text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground/80 truncate">
                          {idx + 1}. {ko}
                        </span>
                        <span className="font-mono text-foreground/60 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className={`h-full ${style.accent}`}
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] font-mono text-foreground/40 truncate">
                        {p.className}
                      </p>
                    </li>
                  );
                })}
              </ul>
              {result.gate?.reason && (
                <p className="mt-3 text-[11px] text-foreground/60 leading-relaxed">
                  판단 근거: {result.gate.reason}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={onExit}
          className="h-14 rounded-2xl bg-white border border-border text-foreground font-medium text-base hover-elevate active-elevate-2"
        >
          종료
        </button>
        <button
          onClick={onRetry}
          className={`h-14 rounded-2xl text-white font-medium text-base hover-elevate active-elevate-2 ${style.accent}`}
        >
          재판별
        </button>
      </div>
    </div>
  );
}
