import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface ScannerProps {
  onDetected: (result: string) => void;
  onError?: (error: Error) => void;
  fullscreen?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onDetected, onError, fullscreen }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    // Inicializar el lector solo una vez
    if (!codeReader.current) {
      codeReader.current = new BrowserMultiFormatReader();
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!videoDevices.length) throw new Error("No se detectó cámara");

        // Buscar cámara trasera o usar la última disponible
        const backCamera = videoDevices.find(
          d =>
            d.label &&
            (d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment"))
        );
        const deviceId = backCamera
          ? backCamera.deviceId
          : videoDevices[videoDevices.length - 1].deviceId;

        // Iniciar decodificación desde la cámara
        codeReader.current?.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (!isMounted) return;

          if (result) {
            // Detener la cámara
            const v = videoRef.current;
            if (v && v.srcObject) {
              (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
              v.srcObject = null;
            }

            // Cerrar el lector
            try {
              if (codeReader.current) {
                if (typeof (codeReader.current as any).reset === "function")
                  (codeReader.current as any).reset();
                if (typeof (codeReader.current as any).close === "function")
                  (codeReader.current as any).close();
              }
            } catch {
              /* noop */
            }

            onDetected(result.getText());
          } else if (err && onError) {
            onError(err as Error);
          }
        });
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    };

    startScanner();

    return () => {
      // Cleanup al desmontar
      isMounted = false;
      const v = videoRef.current;
      if (v && v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }

      if (codeReader.current) {
        try {
          if (typeof (codeReader.current as any).close === "function")
            (codeReader.current as any).close();
          else if (typeof (codeReader.current as any).reset === "function")
            (codeReader.current as any).reset();
        } catch {
          /* noop */
        }
      }
    };
  }, [onDetected, onError]);

  return (
    <div
      className={
        fullscreen
          ? "w-full h-full flex flex-col items-center justify-center"
          : "w-full flex flex-col items-center"
      }
    >
      <video
        ref={videoRef}
        className={
          fullscreen
            ? "w-full h-full object-contain bg-black"
            : "rounded shadow w-full max-w-md aspect-video bg-black min-h-[260px] min-w-[220px] sm:min-h-[320px] sm:min-w-[260px]"
        }
        style={
          fullscreen
            ? { width: "100vw", height: "100vh", objectFit: "contain", background: "black" }
            : { minHeight: 260, minWidth: 220 }
        }
        autoPlay
        muted
        playsInline
      />
      <p className="text-base text-primary font-semibold mt-2">
        Apunta la cámara al código de barras
      </p>
      <p className="text-xs text-gray-500">
        Asegúrate de que el código esté bien iluminado y visible
      </p>
    </div>
  );
};

export default Scanner;
