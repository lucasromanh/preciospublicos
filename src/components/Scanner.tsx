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
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const snapshotInProgressRef = React.useRef(false);
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
      console.log("🚀 Iniciando escáner ZXing...");
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        console.log("📸 Cámaras detectadas:", devices);

        if (devices.length === 0) {
          console.error("❌ No hay cámaras disponibles.");
          if (onError) onError(new Error("No se encontró ninguna cámara."));
          return;
        }

        const back = devices.find(
          (d) =>
            d.label &&
            (d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment"))
        );
        const deviceId = back?.deviceId || devices[0]?.deviceId;
        console.log("✅ Usando cámara:", back?.label || devices[0]?.label);

        // Abrir stream de mayor calidad y reproducir el video
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try { await videoRef.current.play(); } catch (_) { /* autoplay might be blocked */ }
          }
        } catch (e) {
          console.warn('No se pudo abrir getUserMedia con constraints elevados, ZXing intentará abrir por su cuenta', e);
        }

        const reader = codeReaderRef.current as any;
        if (!reader) return;

        console.log('▶️ Iniciando lectura continua...');
        try {
          // decodeFromVideoElementContinuously lee directamente del elemento <video>
          await (reader as any).decodeFromVideoElementContinuously(videoRef.current!, (result: any, err: any) => {
            if (result) {
              const ean = result.getText();
              console.log('📦 Código detectado:', ean);
              setLastDetected(ean);
              onDetected(ean);
              setFailedAttempts(0);
              setShowTip(false);
            } else if (err && !(err instanceof NotFoundException)) {
              console.warn('⚠️ Error ZXing:', err);
              if (onError) onError(err as Error);
            }
          });
        } catch (e) {
          // decodeFromVideoElementContinuously puede lanzar si el reader se reinicia; loguear para depuración
          console.warn('decodeFromVideoElementContinuously finalizó con error o fue detenido:', e);
        }

        // 🔍 Debug visual opcional
        const checkFrames = () => {
          const video = videoRef.current;
          if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            // muestra un rectángulo de previsualización
            const avg = ctx?.getImageData(0, 0, 1, 1).data;
            if (avg) console.log("🎥 Frame activo. Pixel[0,0]:", avg);
          } else {
            console.log("🕓 Esperando frames de cámara...");
          }
        };

        // monitoreo cada 3 segundos
        const debugInterval = setInterval(checkFrames, 3000);

        return () => clearInterval(debugInterval);
      } catch (e) {
        console.error("💥 Error inicializando cámara:", e);
        if (onError && e instanceof Error) onError(e);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
        tracks?.forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        try { (codeReaderRef.current as any)?.reset(); } catch (e) {}
      } catch (err) {
        console.warn("⚠️ Error al detener cámara:", err);
      }
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

  const handleDetectionFromSnapshot = (ean: string) => {
    try {
      const now = Date.now();
      const lastTs = seenMapRef.current.get(ean);
      if (lastTs && now - lastTs < COOLDOWN_MS) return false as any;
      seenMapRef.current.set(ean, now);
      setLastDetected(ean);
      setFailedAttempts(0);
      setShowTip(false);
      saveEanLocally(ean);
      setTimeout(() => setLastDetected(null), 1800);
      onDetected(ean);
      return true as any;
    } catch (e) {
      return false as any;
    }
  };

  const trySnapshotDecode = async (): Promise<boolean> => {
    if (snapshotInProgressRef.current) return false;
    snapshotInProgressRef.current = true;
    try {
      const video = videoRef.current;
      if (!video) return false;
      const w = video.videoWidth || video.clientWidth || 640;
      const h = video.videoHeight || video.clientHeight || 360;
      let canvas: HTMLCanvasElement;
        if (canvasRef.current) {
          canvas = canvasRef.current;
        } else {
          canvas = document.createElement('canvas');
        }
        canvas.width = w;
        canvas.height = h;
        // willReadFrequently para optimizar lecturas repetidas de getImageData
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, w, h);
      // preprocesado simple: grayscale + contraste por estiramiento lineal + umbral ligero
      const img = ctx.getImageData(0, 0, w, h);
      const data = img.data;
      let min = 255, max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        data[i] = data[i + 1] = data[i + 2] = lum;
        if (lum < min) min = lum;
        if (lum > max) max = lum;
      }
      const range = (max - min) || 1;
      for (let i = 0; i < data.length; i += 4) {
        let v = data[i];
        let nv = Math.round((v - min) * 255 / range);
        if (nv < 30) nv = 0;
        data[i] = data[i + 1] = data[i + 2] = nv;
      }
      ctx.putImageData(img, 0, 0);
      if (!canvasRef.current) canvasRef.current = canvas;

      const readerAny = codeReaderRef.current as any;
      // intentos varios de decodificación (depende de la API disponible en la versión de ZXing)
      try {
        if (readerAny && typeof readerAny.decodeFromImage === 'function') {
          // algunos readers aceptan HTMLCanvasElement
          const res = await readerAny.decodeFromImage(canvas);
          if (res && res.getText) {
            return !!handleDetectionFromSnapshot(res.getText());
          }
        }
      } catch (e) {}

      try {
        if (readerAny && typeof readerAny.decodeFromCanvas === 'function') {
          const res = await readerAny.decodeFromCanvas(canvas);
          if (res && res.getText) {
            return !!handleDetectionFromSnapshot(res.getText());
          }
        }
      } catch (e) {}

      // fallback: toDataURL + decodeFromImage callback style
      try {
        const dataUrl = canvas.toDataURL('image/png');
        if (readerAny && typeof readerAny.decodeFromImage === 'function') {
          const res = await new Promise((resolve, reject) => {
            try {
              readerAny.decodeFromImage(undefined, dataUrl, (r: any, err: any) => {
                if (r) resolve(r); else reject(err);
              });
            } catch (ee) {
              reject(ee);
            }
          });
          if (res && (res as any).getText) {
            return !!handleDetectionFromSnapshot((res as any).getText());
          }
        }
      } catch (e) {}

    } finally {
      snapshotInProgressRef.current = false;
    }
    return false;
  };

  // 🔹 Cerrar cámara manualmente
  const handleClose = () => {
    try {
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
      tracks?.forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      // reader reset/stop handled by cleanup in useEffect; solo detenemos tracks localmente
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
      {fullscreen && onClose && (
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
                <button className="text-xs px-3 py-1 bg-primary text-white rounded" onClick={() => { setShowTip(false); setFailedAttempts(0); lastTipAt.current = Date.now(); }}>Entendido</button>
                <button className="text-xs px-3 py-1 bg-white border rounded" onClick={() => { setFailedAttempts(0); setShowTip(false); lastTipAt.current = Date.now(); }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {/* botón para forzar uso de cámara trasera si el usuario lo solicita */}
        {fullscreen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <button
              className="text-xs px-3 py-1 bg-white border rounded"
              onClick={async () => {
                try {
                  // intentar solicitar media con facingMode environment
                  const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
                  // si obtuvimos stream, detener reader actual y reiniciar con el deviceId si está disponible
                  const track = s.getVideoTracks()[0];
                  const settings: any = track.getSettings ? track.getSettings() : {};
                  const deviceId = settings.deviceId;
                  // stop the temporary track we opened (we just wanted permissions/deviceId)
                  s.getTracks().forEach(t => t.stop());
                  // detener tracks actuales y reasignar stream con el deviceId seleccionado
                  try {
                    const curr = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
                    curr?.forEach(t => t.stop());
                    if (videoRef.current) videoRef.current.srcObject = null;
                  } catch (e) {
                    console.warn('Error deteniendo stream actual', e);
                  }
                  try {
                    const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
                    if (videoRef.current) videoRef.current.srcObject = newStream;
                  } catch (e) {
                    console.warn('No se pudo abrir stream para el deviceId solicitado', e);
                  }
                } catch (e) {
                  // permiso o error: mostrar consejo persistente
                  setShowTip(true);
                  lastTipAt.current = Date.now();
                }
              }}
            >
              Forzar cámara trasera
            </button>
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
