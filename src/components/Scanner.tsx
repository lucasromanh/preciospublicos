import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import { DecodeHintType, NotFoundException } from "@zxing/library";

interface ScannerProps {
  onDetected: (result: string) => void;
  onError?: (error: Error) => void;
  fullscreen?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onDetected, onError, fullscreen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopTracks = () => {
    const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
    tracks?.forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    let mounted = true;

    // Hints: priorizamos EAN/UPC/Code128 y TRY_HARDER
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    codeReaderRef.current = new BrowserMultiFormatReader(hints);

    const start = async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find(
          d => d.label && (d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"))
        );

        const constraints: MediaStreamConstraints =
          back?.deviceId
            ? { video: { deviceId: { exact: back.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
            : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted || !videoRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});

        // Enfoque continuo y zoom si el hardware lo soporta (no rompe si no)
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[]; zoom?: any };
          const advanced: any[] = [];
          if (caps?.focusMode?.includes?.("continuous")) advanced.push({ focusMode: "continuous" });
          if (caps?.zoom) {
            const target =
              typeof caps.zoom === "object" && "min" in caps.zoom && "max" in caps.zoom
                ? Math.min((caps.zoom.min as number) + 1, (caps.zoom.max as number) / 2)
                : 1;
            advanced.push({ zoom: target });
          }
          if (advanced.length) await track.applyConstraints({ advanced }).catch(() => {});
        } catch {}

        // Loop de decodificación
        codeReaderRef.current?.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (!mounted) return;

          if (result) {
            stopTracks();
            try {
              // Algunos tipos de TS no traen estos métodos: llamar defensivamente
              (codeReaderRef.current as any)?.reset?.();
            } catch {}
            onDetected(result.getText());
          } else if (err && !(err instanceof NotFoundException) && onError) {
            onError(err as Error);
          }
        });
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    };

    start();

    return () => {
      mounted = false;
      stopTracks();
      try {
        (codeReaderRef.current as any)?.stopContinuousDecode?.();
        (codeReaderRef.current as any)?.reset?.();
      } catch {}
    };
  }, [onDetected, onError]);

  return (
    <div
      className={
        fullscreen
          ? "relative w-full h-full flex flex-col items-center justify-center bg-black"
          : "relative w-full max-w-md flex flex-col items-center"
      }
      style={fullscreen ? { width: "100vw", height: "100vh" } : undefined}
    >
      <video
        ref={videoRef}
        className={
          fullscreen ? "w-full h-full object-contain bg-black" : "w-full aspect-video rounded shadow bg-black"
        }
        autoPlay
        muted
        playsInline
      />

      {/* Overlay visual */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at center, rgba(0,0,0,0) 32%, rgba(0,0,0,0.45) 33%)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md"
            style={{
              width: "78%",
              maxWidth: 520,
              aspectRatio: "1.9 / 1",
              border: "2px solid rgba(58,199,255,0.9)",
              boxShadow: "0 0 10px rgba(58,199,255,0.35)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            style={{ width: "78%", maxWidth: 520, aspectRatio: "1.9 / 1" }}
          >
            <div
              className="scanline"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, #3ac7ff 50%, rgba(0,0,0,0) 100%)",
                boxShadow: "0 0 8px #3ac7ff",
                animation: "scan-move 2.4s linear infinite",
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-base text-primary font-semibold">Apunta la cámara al código de barras</p>
        <p className="text-xs text-gray-500">Buena luz, ~15–25 cm de distancia, incliná un poco el envase.</p>
      </div>

      <style>{`
        @keyframes scan-move {
          0%   { transform: translateY(-44%); opacity: .85; }
          50%  { opacity: 1; }
          100% { transform: translateY(44%); opacity: .85; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
