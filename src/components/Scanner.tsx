// src/components/Scanner.tsx
import React, { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import { DecodeHintType, NotFoundException } from "@zxing/library";

interface ScannerProps {
  onDetected: (ean: string) => void;
  onError?: (error: Error) => void;
  fullscreen?: boolean;
  onClose?: () => void; // 👈 nuevo callback para cerrar
}

const Scanner: React.FC<ScannerProps> = ({ onDetected, onError, fullscreen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [lastDetected, setLastDetected] = React.useState<string | null>(null);
  const [capturing, setCapturing] = React.useState(false);
  const [scanning, setScanning] = React.useState(true);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [showTip, setShowTip] = React.useState(false);
  const tips = React.useMemo(() => [
    'Acercá/alejá 10–20 cm',
    'Girá el envase 90°',
    'Asegurate de tener buena luz',
    'Evita reflejos en el código'
  ], []);

  useEffect(() => {
    let mounted = true;

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
        // list devices and try to pick back camera; if not possible pass undefined
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find(
          (d) =>
            d.label &&
            (d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"))
        );
        const deviceId = back?.deviceId;

        // Let the library open the camera and attach to the video element
        await codeReaderRef.current?.decodeFromVideoDevice(
          deviceId || undefined,
          videoRef.current || undefined,
          (result, err) => {
            if (!mounted) return;
            if (result) {
              const ean = result.getText();
              setLastDetected(ean);
              setFailedAttempts(0);
              setShowTip(false);
              // visual feedback local
              setTimeout(() => setLastDetected(null), 1800);
              onDetected(ean); // notify parent
            } else {
              // No result: increment failed attempts (NotFoundException is common)
              setFailedAttempts(prev => {
                const nv = prev + 1;
                if (nv >= 4) setShowTip(true);
                return nv;
              });
              if (err && !(err instanceof NotFoundException) && onError) {
                onError(err as Error);
              }
            }
          }
        );

        // Try to enable continuous autofocus if supported
        try {
          const stream = (videoRef.current?.srcObject as MediaStream | null) || null;
          const track = stream?.getVideoTracks()[0];
          if (track && typeof (track as any).applyConstraints === 'function') {
            // try continuous focus (best-effort) — cast to any to avoid TS type errors
            await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        // detener tracks de cámara
        const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
        tracks?.forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;

        // reset seguro
        const reader = codeReaderRef.current as any;
        if (reader && typeof reader.reset === "function") reader.reset();
        if (reader && typeof reader.stopContinuousDecode === "function") reader.stopContinuousDecode();
      } catch (err) {
        console.warn("Error al limpiar cámara:", err);
      }
      setScanning(false);
    };
  }, [onDetected, onError]);

  // capture still frame and attempt to decode from the captured image (helpful when autofocus fails)
  const handleCapture = async () => {
    if (!videoRef.current || !codeReaderRef.current) return;
    setCapturing(true);
    try {
      const vw = videoRef.current.videoWidth || 1280;
      const vh = videoRef.current.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no soportado');
      ctx.drawImage(videoRef.current, 0, 0, vw, vh);
      const data = canvas.toDataURL('image/png');
      const img = new Image();
      img.src = data;
      await new Promise<void>((res) => (img.onload = () => res()));
      // try decode from image element
      // try decode from data URL (decodeFromImageUrl exists in some builds)
      const res = await (codeReaderRef.current as any).decodeFromImageUrl?.(data).catch(() => null);
      if (res && typeof (res as any).getText === 'function') {
        const ean = (res as any).getText();
        setLastDetected(ean);
        setFailedAttempts(0);
        setShowTip(false);
        setTimeout(() => setLastDetected(null), 1800);
        onDetected(ean);
      } else {
        // failed decode from captured image
        setFailedAttempts(prev => {
          const nv = prev + 1;
          if (nv >= 4) setShowTip(true);
          return nv;
        });
        if (onError) onError(new Error('No se pudo leer el código desde la foto. Intentá mover un poco la cámara.'));
      }
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    } finally {
      setCapturing(false);
    }
  };

  // 🔹 Cerrar cámara manualmente
  const handleClose = () => {
    try {
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
      tracks?.forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;

      const reader = codeReaderRef.current as any;
      if (reader && typeof reader.reset === "function") reader.reset();
      if (reader && typeof reader.stopContinuousDecode === "function") reader.stopContinuousDecode();
    } catch {}
    if (onClose) onClose();
  };

  return (
    <div
      className={
        fullscreen
          ? "relative w-full h-full flex flex-col items-center justify-center bg-black"
          : "relative w-full max-w-md flex flex-col items-center"
      }
      style={fullscreen ? { width: "100vw", height: "100vh" } : undefined}
    >
      {/* 📸 Video */}
      <video
        ref={videoRef}
        className={
          fullscreen ? "w-full h-full object-contain bg-black" : "w-full aspect-video rounded shadow bg-black"
        }
        autoPlay
        muted
        playsInline
      />

      {/* 🔹 Botón Cerrar (solo en fullscreen) */}
      {fullscreen && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm font-semibold rounded-full px-3 py-1 shadow-md z-50 hover:bg-opacity-80 transition"
        >
          ✖ Cerrar
        </button>
      )}

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

      {/* INTERPRETANDO / ANIMACION DE PROCESADO */}
      {scanning && !lastDetected && !capturing && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[28%] z-40 pointer-events-none">
          {/* blur + overlay para mayor contraste en entornos claros */}
          <div className="absolute left-0 top-0 w-full h-full" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <div className="flex flex-col items-center gap-2 relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 animate-spin-slow flex items-center justify-center bg-black/25">
              <div className="w-6 h-6 rounded-full bg-primary/90" />
            </div>
            <div className="text-white text-sm font-semibold bg-black/40 px-3 py-1 rounded">Interpretando código...</div>
          </div>
        </div>
      )}

      {/* CAPTURANDO / PROCESANDO IMAGEN */}
      {capturing && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[28%] z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center animate-pulse bg-black/40">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7v6l4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded">Procesando imagen...</div>
          </div>
        </div>
      )}

        {/* feedback simple: último código detectado */}
        {lastDetected && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 text-black px-3 py-1 rounded shadow z-50">
            <strong>Detectado:</strong> {lastDetected}
          </div>
        )}

        {/* Capturar frame manualmente */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleCapture}
            className="bg-white/90 text-black px-4 py-2 rounded-full shadow-md font-semibold"
            disabled={capturing}
          >
            {capturing ? 'Procesando...' : 'Capturar'}
          </button>
        </div>

        {/* Tips después de fallos repetidos */}
        {showTip && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-yellow-50 text-yellow-900 border border-yellow-200 px-4 py-2 rounded shadow-md max-w-sm text-center">
              <div className="font-semibold">Consejo:</div>
              <div className="text-sm mt-1">{tips[(failedAttempts - 1) % tips.length]}</div>
              <div className="mt-2 flex justify-center gap-2">
                <button className="text-xs px-3 py-1 bg-primary text-white rounded" onClick={() => { setShowTip(false); setFailedAttempts(0); }}>Entendido</button>
                <button className="text-xs px-3 py-1 bg-white border rounded" onClick={() => { setFailedAttempts(0); setShowTip(false); }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

      <div className="mt-2 text-center">
        <p className="text-base text-primary font-semibold">
          Apunta la cámara al código de barras
        </p>
        <p className="text-xs text-gray-400">
          Buena luz, ~15–25 cm de distancia, incliná un poco el envase.
        </p>
      </div>

      <style>{`
        @keyframes scan-move {
          0%   { transform: translateY(-44%); opacity: .85; }
          50%  { opacity: 1; }
          100% { transform: translateY(44%); opacity: .85; }
        }
        @keyframes spin-slow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .animate-spin-slow { animation: spin-slow 2.2s linear infinite }
      `}</style>
    </div>
  );
};

export default Scanner;
