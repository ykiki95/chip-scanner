import { RESULT_DISPLAY, type PredictionResult } from "@/utils/constants";

export interface ResultMeasurement {
  r: number;
  g: number;
  b: number;
  saturation: number;
  colorStd: number;
}

interface Props {
  result: PredictionResult;
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
} as const;

export default function ResultView({ result, measurement, onRetry, onExit }: Props) {
  const display = RESULT_DISPLAY[result.label] ?? RESULT_DISPLAY.consumable;
  const style = TONE_STYLES[display.tone];
  const confidencePct = Math.round((result.confidence ?? 0) * 100);

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
