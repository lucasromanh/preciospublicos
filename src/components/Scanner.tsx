// src/components/Scanner.tsx
import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";

/**
 * Tipado opcional para BarcodeDetector (para TS).
 */
declare global {
  interface Window {
    BarcodeDetector?: typeof BarcodeDetector;
  }
}
declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>;
  constructor(options?: { formats?: string[] });
  detect(image: ImageBitmapSource): Promise<Array<{ format: string; rawValue: string }>>;
}

/** Props públicas */
interface ScannerProps {
  onDetected: (code: string) => void;   // Se llama SOLO al presionar "Continuar"
  onError?: (error: Error) => void;
  fullscreen?: boolean;
  onClose?: () => void;
}

/** Toast UI */
type ToastState =
  | { visible: false }
  | {
      visible: true;
      kind: "success" | "error";
      title: string;
      message: string;
      code?: string;
    };

const Scanner: React.FC<ScannerProps> = ({
  onDetected,
  onError,
  fullscreen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [usingZXing, setUsingZXing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // UI feedback
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [paused, setPaused] = useState(false); // pausamos al mostrar toast

  const [toast, setToast] = useState<ToastState>({ visible: false });

  // Control de cool-down
  const COOLDOWN_MS = 4000;
  const lastDetectedAt = useRef<number>(0);
  const lastSavedRef = useRef<string | null>(null);

  // Animación/estética
  const borderColor = savedSuccess ? "#22c55e" : "#ff3b3b";
  const scanlineColor = savedSuccess ? "#16a34a" : "#3ac7ff";

  // Loop handlers
  const rafIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  // ================================
  //     HELPER: GUARDAR LOCAL
  // ================================
  const saveEanLocally = (code: string) => {
    try {
      if (lastSavedRef.current === code) return;
      const key = "scanned_eans";
      const raw = localStorage.getItem(key);
      const arr = raw ? (JSON.parse(raw) as Array<{ code: string; ts: number }>) : [];
      arr.unshift({ code, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
      lastSavedRef.current = code;
      console.log("💾 Código guardado localmente:", code);
    } catch (e) {
      console.warn("⚠️ Error al guardar local:", e);
    }
  };

  // ================================
  //   HELPER: MANEJO DE DETECCIÓN
  // ================================
  const handleDetection = (code: string) => {
    const now = Date.now();
    if (now - lastDetectedAt.current < COOLDOWN_MS) return;

    lastDetectedAt.current = now;
    setLastDetected(code);
    console.log("📦 Código detectado:", code);

    if (navigator.vibrate) {
      try { navigator.vibrate(100); } catch {}
    }

    saveEanLocally(code);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1000);

    // ✅ Mostrar inmediatamente el toast
    setToast({
      visible: true,
      kind: "success",
      title: "Código detectado",
      message: "Se leyó correctamente el código de barras.",
      code,
    });

    // 🔹 Pequeña pausa visual (pero sin bloquear render)
    setPaused(true);
    setTimeout(() => setPaused(false), 500);
  };

  const raiseErrorToast = (msg: string) => {
    console.warn("⚠️ Error de lectura:", msg);
    setToast({
      visible: true,
      kind: "error",
      title: "No se pudo leer el código",
      message: msg || "Intentá enfocar mejor el código o acercar la cámara.",
    });

    // 🔹 Reinicia la lectura después de un breve lapso
    setPaused(true);
    setTimeout(() => setPaused(false), 2000);
  };

  const handleFrameNoCode = (info?: unknown) => {
    // Este helper es por si querés debugear frames sin código
    if (info && typeof info === "string" && info.includes("NotFound")) return;
    // Silencioso, pero podés loguear si te sirve:
    // console.debug("Frame sin código");
  };

  // ================================
  //       INICIALIZACIÓN
  // ================================
  useEffect(() => {
    unmountedRef.current = false;
    console.log("🚀 Iniciando escáner híbrido (BarcodeDetector + ZXing fallback)");

    const start = async () => {
      try {
        // 1) Elegir cámara (trasera si hay)
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");

        console.log("📸 Cámaras detectadas:", videoDevices);
        if (videoDevices.length === 0) {
          throw new Error("No se encontraron cámaras.");
        }

        const backCam =
          videoDevices.find((d) =>
            /(back|rear|environment|trase|atrás|posterior|main)/i.test(d.label)
          ) || videoDevices[videoDevices.length - 1];

        console.log("🎥 Cámara seleccionada:", backCam.label || backCam.deviceId);

        // 2) Abrir stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: backCam.deviceId },
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (unmountedRef.current) return;

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch {}
        }

        // 3) ¿Hay BarcodeDetector con formatos útiles?
        let canUseBarcodeDetector = false;
        try {
          if ("BarcodeDetector" in window) {
            const supported = await BarcodeDetector.getSupportedFormats();
            canUseBarcodeDetector = supported.some((f) =>
              ["ean_13", "upc_a", "code_128", "code_39", "qr_code"].includes(f)
            );
          }
        } catch {
          canUseBarcodeDetector = false;
        }

        if (canUseBarcodeDetector) {
          console.log("✅ Usando BarcodeDetector nativo.");
          setUsingZXing(false);

          const detector = new BarcodeDetector({
            formats: ["ean_13", "upc_a", "code_128", "code_39", "qr_code"],
          });

          // Loop cada 180–220ms aprox
          const id = window.setInterval(async () => {
            if (unmountedRef.current || !scanning || paused) return;
            if (!videoRef.current) return;

            try {
              const bitmap = await createImageBitmap(videoRef.current);
              const barcodes = await detector.detect(bitmap);
              try { (bitmap as any).close?.(); } catch {}

              if (barcodes && barcodes.length > 0) {
                handleDetection(barcodes[0].rawValue);
              }
            } catch (err: any) {
              // Si es “No barcode detected”, ignoramos. Otros errores los podés mostrar.
              const msg = String(err?.message || err || "");
              if (!/not\s*found|no barcode/i.test(msg)) {
                console.debug("BD frame error:", msg);
              }
            }
          }, 200);
          intervalIdRef.current = id as unknown as number;
        } else {
          console.warn("⚠️ BarcodeDetector no soporta EAN/UPC aquí. Usando ZXing fallback.");
          setUsingZXing(true);

          // Config y reader ZXing
          const hints = new Map();
          hints.set(0, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.UPC_A,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE,
          ]);
          const reader = new BrowserMultiFormatReader(hints);
          readerRef.current = reader;

          // ZXing continuo sobre el <video>. No todas las versiones traen reset(),
          // así que el “stop” real lo hacemos deteniendo el stream y un flag.
          const loop = async () => {
            if (unmountedRef.current) return;
            if (!scanning || paused) {
              rafIdRef.current = requestAnimationFrame(loop);
              return;
            }
            if (videoRef.current && readerRef.current) {
              try {
                // Algunas versiones: decodeFromVideoElementContinuously(video, callback)
                if (typeof (readerRef.current as any).decodeFromVideoElementContinuously === "function") {
                  (readerRef.current as any).decodeFromVideoElementContinuously(
                    videoRef.current,
                    (result: any, err: any) => {
                      if (result && typeof result.getText === "function") {
                        handleDetection(result.getText());
                      } else if (err) {
                        // NotFound u otros: sólo informar debug
                        handleFrameNoCode(String(err));
                      }
                    }
                  );
                  // Si existe el modo “continuously”, no necesitamos seguir con nuestro loop
                  return;
                }

                // Fallback: intentos discretos
                const result = await (readerRef.current as any).decodeFromVideoElement(videoRef.current);
                if (result?.getText) {
                  handleDetection(result.getText());
                } else {
                  handleFrameNoCode();
                }
              } catch (err: any) {
                handleFrameNoCode(String(err));
              }
            }
            rafIdRef.current = requestAnimationFrame(loop);
          };
          rafIdRef.current = requestAnimationFrame(loop);
        }

        console.log("✅ Escáner iniciado correctamente.");
      } catch (err: any) {
        console.error("💥 Error al iniciar cámara:", err);
        setCameraError(err?.message || "Error desconocido inicializando cámara");
        setPaused(true);
        setToast({
          visible: true,
          kind: "error",
          title: "Error de cámara",
          message: err?.message || "No se pudo acceder a la cámara.",
        });
        if (onError) onError(err);
      }
    };

    start();

    // Limpieza
    return () => {
      unmountedRef.current = true;
      console.log("🧹 Deteniendo escáner (cleanup)...");
      setScanning(false);

      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      try {
        const r: any = readerRef.current;
        if (r) {
          if (typeof r.stopContinuousDecode === "function") r.stopContinuousDecode();
          else if (typeof r.stopAsyncDecode === "function") r.stopAsyncDecode();
          else if (typeof r.reset === "function") r.reset();
        }
      } catch (err) {
        console.warn("⚠️ Error deteniendo ZXing:", err);
      } finally {
        readerRef.current = null;
      }

      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch (err) {
        console.warn("⚠️ Error deteniendo cámara:", err);
      }
    };
  }, [onDetected, onError, scanning, paused]);

  // ================================
  //           HANDLERS UI
  // ================================
  const handleClose = () => {
    console.log("🛑 Cierre manual solicitado.");
    setScanning(false);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    if (onClose) onClose();
  };

  const handleToastContinue = () => {
    if (toast.visible && toast.kind === "success" && toast.code) {
      // Ahora sí informamos al padre
      onDetected(toast.code);
    }
    setToast({ visible: false });
    setPaused(false);
  };

  const handleToastClose = () => {
    setToast({ visible: false });
    setPaused(false);
  };

  // ================================
  //                 UI
  // ================================
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
        className={fullscreen ? "w-full h-full object-cover bg-black" : "w-full aspect-video rounded shadow bg-black object-cover"}
        muted
        playsInline
        autoPlay
      />

      {/* 🔹 Botón Cerrar */}
      {fullscreen && onClose && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 bg-black bg-opacity-60 text-white text-sm font-semibold rounded-full px-3 py-1 shadow-md z-50 hover:bg-opacity-80 transition"
        >
          ✖ Cerrar
        </button>
      )}

      {/* Overlay guía */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(0,0,0,0) 32%, rgba(0,0,0,0.45) 33%)",
            }}
          />
          <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md"
          style={{
            width: "58%",           // 🔹 más angosto
            maxWidth: 360,          // 🔹 tamaño ideal para móviles
            aspectRatio: "2.5 / 1", // 🔹 mucho más rectangular y bajo
            border: `2px solid ${borderColor}`,
            boxShadow: `0 0 5px ${borderColor}99`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            width: "70%",
            maxWidth: 360,
            aspectRatio: "4.5 / 1",
            borderRadius: "6px",
          }}
        >
          <div
            className="scanline"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${scanlineColor} 50%, rgba(0,0,0,0) 100%)`,
              boxShadow: `0 0 5px ${scanlineColor}`,
              animation: "scan-move 1.6s linear infinite",
            }}
          />
        </div>

        </div>
      </div>

      {/* Código detectado (badge chico, opcional) */}
      {lastDetected && !toast.visible && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 text-black px-3 py-1 rounded shadow z-40">
          <strong>Detectado:</strong> {lastDetected}
        </div>
      )}

      {/* Estado / errores puntuales */}
      {cameraError && !toast.visible && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-40">
          {cameraError}
        </div>
      )}

      {/* Instrucciones y modo */}
      <div className="mt-2 text-center text-xs text-gray-300 absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <p className="text-white font-semibold">
          Apuntá la cámara al código de barras o QR
        </p>
        <p className="opacity-80">{usingZXing ? "Modo ZXing" : "Modo BarcodeDetector"}</p>
      </div>

      {/* ===== Toast flotante (tarjeta blanca centrada) ===== */}
      {toast.visible && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ pointerEvents: "auto" }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-4 max-w-sm w-[90%]"
            style={{ border: toast.kind === "success" ? "2px solid #16a34a33" : "2px solid #ef444433" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 rounded-full w-2.5 h-2.5"
                style={{ background: toast.kind === "success" ? "#16a34a" : "#ef4444" }}
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{toast.title}</div>
                <div className="text-sm text-gray-600 mt-1">{toast.message}</div>
                {toast.code && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Código:</span>{" "}
                    <span className="font-mono font-semibold text-gray-800">{toast.code}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  {toast.kind === "success" ? (
                    <>
                      <button
                        onClick={handleToastClose}
                        className="text-xs px-3 py-1 rounded border bg-white"
                      >
                        Seguir escaneando
                      </button>
                      <button
                        onClick={handleToastContinue}
                        className="text-xs px-3 py-1 rounded bg-black text-white"
                      >
                        Continuar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleToastClose}
                      className="text-xs px-3 py-1 rounded bg-black text-white"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS animación */}
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
