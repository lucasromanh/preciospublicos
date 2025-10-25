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
  const [scanning, setScanning] = React.useState(true);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const lastSavedRef = React.useRef<string | null>(null);
  // cooldown map para evitar procesar el mismo EAN varias veces en corto tiempo
  const seenMapRef = React.useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 5000; // 5 segundos
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [showTip, setShowTip] = React.useState(false);
  const tips = React.useMemo(() => [
    'Acercá/alejá 10–20 cm',
    'Girá el envase 90°',
    'Asegurate de tener buena luz',
    'Evita reflejos en el código'
  ], []);
  const lastTipAt = React.useRef<number>(0);
  const borderColor = savedSuccess ? '#22c55e' : '#ff3b3b';
  const scanlineColor = savedSuccess ? '#16a34a' : '#ff3b3b';

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
              // cooldown en memoria: ignorar si ya vimos ese EAN hace menos de COOLDOWN_MS
              try {
                const now = Date.now();
                const lastTs = seenMapRef.current.get(ean);
                if (lastTs && now - lastTs < COOLDOWN_MS) {
                  // Ignorar re-detección rápida
                  return;
                }
                // registrar timestamp
                seenMapRef.current.set(ean, now);
                // podar entradas viejas ocasionalmente
                if (seenMapRef.current.size > 1000) {
                  const cutoff = now - 60000; // 60s
                  for (const [k, v] of Array.from(seenMapRef.current.entries())) {
                    if (v < cutoff) seenMapRef.current.delete(k);
                  }
                }
              } catch (e) {
                // ignore
              }
              setLastDetected(ean);
              setFailedAttempts(0);
              setShowTip(false);
              // guardar localmente
              saveEanLocally(ean);
              // visual feedback local
              setTimeout(() => setLastDetected(null), 1800);
              onDetected(ean); // notify parent
            } else {
              // No result: increment failed attempts (NotFoundException is common)
              setFailedAttempts(prev => {
                const nv = prev + 1;
                const now = Date.now();
                // show tip only once per 30s when threshold reached
                if (nv >= 4 && (!showTip && now - (lastTipAt.current || 0) > 30000)) {
                  setShowTip(true);
                  lastTipAt.current = now;
                }
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

  // Guarda el EAN localmente en localStorage para comparar luego con backend
  const saveEanLocally = (ean: string) => {
    try {
      // evitar duplicados rápidos
      if (lastSavedRef.current === ean) return;
      const key = 'scanned_eans';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) as Array<{ ean: string; ts: number }> : [];
      arr.unshift({ ean, ts: Date.now() });
      // limitar a 200 elementos
      const sliced = arr.slice(0, 200);
      localStorage.setItem(key, JSON.stringify(sliced));
      lastSavedRef.current = ean;
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 1600);
    } catch (e) {
      // ignore storage errors
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

      {/* INTERPRETANDO / ANIMACION DE PROCESADO -> scanline más visible dentro del recuadro */}
  {scanning && !lastDetected && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-40" aria-hidden>
          <div style={{ width: '78%', maxWidth: 520, aspectRatio: '1.9 / 1', position: 'relative' }}>
            {/* Semi-opaque backdrop behind the hint only (no full blur) */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.08)', borderRadius: 8 }} />
              {/* scanline (thicker) */}
              <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${scanlineColor} 50%, rgba(0,0,0,0) 100%)`, boxShadow: `0 0 12px ${scanlineColor}`, animation: 'scan-move 1.6s linear infinite' }} />
              {/* colored border */}
              <div style={{ position: 'absolute', inset: 0, border: `3px solid ${borderColor}`, borderRadius: 8, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center' }}>
              <div className="text-white text-sm font-semibold bg-black/45 px-3 py-1 rounded">Interpretando código...</div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTURANDO / PROCESANDO IMAGEN */}
      

        {/* feedback simple: último código detectado */}
        {lastDetected && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 text-black px-3 py-1 rounded shadow z-50">
            <strong>Detectado:</strong> {lastDetected}
          </div>
        )}

        {/* Manual capture removed: scanning is automatic in fullscreen */}

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
