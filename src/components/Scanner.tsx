import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface ScannerProps {
  onDetected: (result: string) => void;
  onError?: (error: Error) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onDetected, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
  // No usamos controls.stream, obtendremos el stream desde el videoRef
    const startScanner = async () => {
      try {
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (videoInputDevices.length === 0) throw new Error("No se detectó cámara");
        // Buscar cámara trasera (environment)
        let backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
        const deviceId = backCamera ? backCamera.deviceId : videoInputDevices[videoInputDevices.length - 1].deviceId;
        // Guardar el stream para poder pararlo manualmente
        await codeReader.current!.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onDetected(result.getText());
            } else if (err && onError) {
              onError(err);
            }
          }
        );
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    };
    startScanner();
    return () => {
      // Detener el stream de la cámara si existe
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
      // reset() existe en la mayoría de versiones, close() en otras
      if (codeReader.current) {
        if (typeof (codeReader.current as any).close === 'function') {
          (codeReader.current as any).close();
        } else if (typeof (codeReader.current as any).reset === 'function') {
          (codeReader.current as any).reset();
        }
      }
    };
  }, [onDetected, onError]);

  return (
    <div className="w-full flex flex-col items-center">
      <video
        ref={videoRef}
        className="rounded shadow w-full max-w-md aspect-video bg-black min-h-[260px] min-w-[220px] sm:min-h-[320px] sm:min-w-[260px]"
        style={{ minHeight: 260, minWidth: 220 }}
        autoPlay
        muted
        playsInline
      />
      <p className="text-base text-primary font-semibold mt-2">Apunta la cámara al código de barras</p>
      <p className="text-xs text-gray-500">Asegúrate de que el código esté bien iluminado y visible</p>
    </div>
  );
};

export default Scanner;
