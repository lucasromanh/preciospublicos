import React, { useRef, useState } from "react";

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCapturing(true);
    } catch (e) {
      alert("No se pudo acceder a la cámara");
    }
  };

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
    <div className="flex flex-col items-center gap-2">
      {!capturing ? (
        <button onClick={startCamera} className="bg-primary text-white px-4 py-2 rounded shadow">Activar cámara</button>
      ) : (
        <>
          <video ref={videoRef} autoPlay className="rounded shadow w-full max-w-xs aspect-video bg-black" />
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
