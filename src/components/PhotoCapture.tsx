import React, { useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  autoStart?: boolean;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture, autoStart }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = async () => {
    try {
      if (stream) return; // ya iniciado
      // Buscar la cámara trasera (como en el Scanner)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      let backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
      const deviceId = backCamera ? backCamera.deviceId : (videoDevices[videoDevices.length - 1]?.deviceId);
      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCapturing(true);
    } catch (e) {
      alert("No se pudo acceder a la cámara");
    }
  };

  // Auto-start si se solicita
  React.useEffect(() => {
    if (autoStart) {
      // pequeño timeout para dejar que el modal haga paint en iOS
      const t = setTimeout(() => {
        startCamera();
      }, 150);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCapturing(false);
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {!capturing ? (
        autoStart ? (
          <div className="text-sm text-gray-500">Pidiendo cámara...</div>
        ) : (
          <button onClick={startCamera} className="bg-primary text-white px-4 py-2 rounded shadow">Activar cámara</button>
        )
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="rounded shadow w-full h-[40vh] max-w-full aspect-video bg-black object-contain"
            style={{ minHeight: 220, background: 'black' }}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={takePhoto} className="bg-green-600 text-white px-4 py-2 rounded">Capturar</button>
            <button onClick={stopCamera} className="bg-gray-400 text-white px-4 py-2 rounded">Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoCapture;
