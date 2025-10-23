import React, { useState } from "react";

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  autoStart?: boolean; // se mantiene por compatibilidad
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture }) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === "string") {
        setPhotoPreview(reader.result);
        onCapture(reader.result);
        setCapturing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const retryCapture = () => {
    setPhotoPreview(null);
    setCapturing(false);
  };

  const openCamera = () => {
    setCapturing(true);
    // Dispara el input de cámara al hacer click
    const input = document.getElementById("cameraInput") as HTMLInputElement;
    if (input) input.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {!photoPreview ? (
        <>
          {!capturing ? (
            <button
              onClick={openCamera}
              className="bg-primary text-white px-4 py-2 rounded shadow"
            >
              Tomar foto
            </button>
          ) : (
            <div className="text-sm text-gray-500">Abriendo cámara...</div>
          )}

          <input
            id="cameraInput"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
        </>
      ) : (
        <>
          <img
            src={photoPreview}
            alt="Previsualización"
            className="rounded shadow max-w-full h-auto object-contain"
            style={{ maxHeight: "40vh", background: "black" }}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={retryCapture}
              className="bg-gray-500 text-white px-4 py-2 rounded shadow"
            >
              Reintentar
            </button>
            <button
              onClick={() => onCapture(photoPreview)}
              className="bg-green-600 text-white px-4 py-2 rounded shadow"
            >
              Confirmar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoCapture;
