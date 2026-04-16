import { useEffect, useRef, useState, useCallback } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "denied" | "error";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
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
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, status, errorMessage, start, stop };
}
