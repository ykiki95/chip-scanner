import { useEffect, useRef, useState, useCallback } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "denied" | "error";

export interface ExposureCapabilities {
  min: number;
  max: number;
  step: number;
  current: number;
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  // 토치(플래시)
  torchSupported: boolean;
  torchOn: boolean;
  toggleTorch: () => Promise<boolean>;
  // 노출 보정
  exposureSupported: boolean;
  exposure: ExposureCapabilities | null;
  setExposureCompensation: (value: number) => Promise<boolean>;
  boostExposure: () => Promise<boolean>;
  resetExposure: () => Promise<boolean>;
}

type ExtendedTrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  exposureMode?: string[];
  exposureCompensation?: { min: number; max: number; step: number };
};

type ExtendedTrackSettings = MediaTrackSettings & {
  torch?: boolean;
  exposureMode?: string;
  exposureCompensation?: number;
};

type ExtendedTrackConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean;
  exposureMode?: string;
  exposureCompensation?: number;
};

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [exposureSupported, setExposureSupported] = useState(false);
  const [exposure, setExposure] = useState<ExposureCapabilities | null>(null);

  const getVideoTrack = useCallback((): MediaStreamTrack | null => {
    const s = streamRef.current;
    if (!s) return null;
    return s.getVideoTracks()[0] ?? null;
  }, []);

  const refreshCapabilities = useCallback(() => {
    const track = getVideoTrack();
    if (!track) {
      setTorchSupported(false);
      setExposureSupported(false);
      setExposure(null);
      return;
    }
    const caps = (track.getCapabilities?.() ?? {}) as ExtendedTrackCapabilities;
    const settings = (track.getSettings?.() ??
      {}) as ExtendedTrackSettings;

    setTorchSupported(Boolean(caps.torch));
    setTorchOn(Boolean(settings.torch));

    if (caps.exposureCompensation) {
      const { min, max, step } = caps.exposureCompensation;
      setExposureSupported(true);
      setExposure({
        min,
        max,
        step: step || 1 / 6,
        current:
          typeof settings.exposureCompensation === "number"
            ? settings.exposureCompensation
            : 0,
      });
    } else {
      setExposureSupported(false);
      setExposure(null);
    }
  }, [getVideoTrack]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    setTorchSupported(false);
    setTorchOn(false);
    setExposureSupported(false);
    setExposure(null);
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("이 브라우저는 카메라를 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play().catch(() => {
          /* autoplay 정책: 첫 사용자 제스처 후 다시 시도되도록 */
        });
      }
      setStatus("ready");
      refreshCapabilities();
    } catch (err) {
      const e = err as DOMException;
      if (
        e.name === "NotAllowedError" ||
        e.name === "PermissionDeniedError" ||
        e.name === "SecurityError"
      ) {
        setStatus("denied");
        setErrorMessage(
          "카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해 주세요.",
        );
      } else if (
        e.name === "NotFoundError" ||
        e.name === "OverconstrainedError"
      ) {
        setStatus("error");
        setErrorMessage("사용 가능한 카메라 장치를 찾을 수 없습니다.");
      } else {
        setStatus("error");
        setErrorMessage(
          `카메라를 시작할 수 없습니다. (${e.name || "알 수 없는 오류"})`,
        );
      }
    }
  }, [refreshCapabilities]);

  const toggleTorch = useCallback(async (): Promise<boolean> => {
    const track = getVideoTrack();
    if (!track) return false;
    const caps = (track.getCapabilities?.() ?? {}) as ExtendedTrackCapabilities;
    if (!caps.torch) return false;
    const next = !torchOn;
    try {
      const advanced: ExtendedTrackConstraintSet[] = [{ torch: next }];
      await track.applyConstraints({
        advanced: advanced as MediaTrackConstraintSet[],
      });
      setTorchOn(next);
      return true;
    } catch {
      return false;
    }
  }, [getVideoTrack, torchOn]);

  const setExposureCompensation = useCallback(
    async (value: number): Promise<boolean> => {
      const track = getVideoTrack();
      if (!track) return false;
      const caps = (track.getCapabilities?.() ??
        {}) as ExtendedTrackCapabilities;
      const range = caps.exposureCompensation;
      if (!range) return false;
      const clamped = Math.max(range.min, Math.min(range.max, value));
      try {
        const advanced: ExtendedTrackConstraintSet[] = [];
        if (caps.exposureMode?.includes("continuous")) {
          advanced.push({ exposureMode: "continuous" });
        }
        advanced.push({ exposureCompensation: clamped });
        await track.applyConstraints({
          advanced: advanced as MediaTrackConstraintSet[],
        });
        setExposure((prev) =>
          prev ? { ...prev, current: clamped } : prev,
        );
        return true;
      } catch {
        return false;
      }
    },
    [getVideoTrack],
  );

  const boostExposure = useCallback(async (): Promise<boolean> => {
    const track = getVideoTrack();
    if (!track) return false;
    const caps = (track.getCapabilities?.() ??
      {}) as ExtendedTrackCapabilities;
    const range = caps.exposureCompensation;
    if (!range) return false;
    // 최댓값의 약 70% 지점으로 끌어올림 — 너무 과한 보정 회피
    const target = range.min + (range.max - range.min) * 0.85;
    return setExposureCompensation(target);
  }, [getVideoTrack, setExposureCompensation]);

  const resetExposure = useCallback(async (): Promise<boolean> => {
    return setExposureCompensation(0);
  }, [setExposureCompensation]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    videoRef,
    status,
    errorMessage,
    start,
    stop,
    torchSupported,
    torchOn,
    toggleTorch,
    exposureSupported,
    exposure,
    setExposureCompensation,
    boostExposure,
    resetExposure,
  };
}
