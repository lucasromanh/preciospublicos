import React, { useState } from "react";
import { Producto } from "../types/Producto";
import PhotoCapture from "./PhotoCapture";
import { subirFotoAlServidor } from "../services/fotosService";

interface ProductModalProps {
  producto: Producto;
  onClose: () => void;
  onFotoGuardada?: (url: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  producto,
  onClose,
  onFotoGuardada,
}) => {
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    producto.imagen_local || null
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  // 📸 Captura de foto y subida centralizada
  const handleCapture = async (dataUrl: string) => {
    try {
      setSubiendo(true);
      setMensaje("Subiendo foto...");

      const url = await subirFotoAlServidor(producto.id_producto, dataUrl);

      if (url) {
        setFotoUrl(url);
        setMensaje("✅ Foto guardada correctamente.");
        if (onFotoGuardada) onFotoGuardada(url);
      } else {
        setMensaje("❌ Error al guardar la foto en el servidor.");
      }
    } catch (error) {
      console.error("Error al subir foto:", error);
      setMensaje("❌ Error de conexión o formato de imagen inválido.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center"
      style={{ backdropFilter: "blur(3px)" }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-5 w-[90%] max-w-md relative max-h-[85vh] overflow-y-auto">
        {/* ❌ Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black dark:hover:text-white text-lg"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* 🏷️ Info básica */}
        <h2 className="text-lg font-bold text-primary mb-1">
          {producto.productos_descripcion}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
          Código: <span className="font-mono">{producto.productos_ean}</span>
        </p>
        <p className="text-xl font-semibold text-green-600 mb-3">
          ${Number(producto.productos_precio_lista || 0).toFixed(2)}
        </p>

        {/* 🖼️ Foto actual o placeholder */}
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt="Foto del producto"
            className="w-full rounded-lg shadow mb-3 object-contain max-h-[40vh]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center mb-3 border border-dashed border-gray-400 rounded-lg py-6 bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500 mb-2">
              No hay foto asociada al producto.
            </p>
          </div>
        )}

        {/* 📷 Captura / subida */}
        <PhotoCapture onCapture={handleCapture} />

        {/* 💬 Mensajes */}
        {subiendo && (
          <p className="text-sm text-blue-600 mt-3 text-center">
            Subiendo imagen, por favor espera...
          </p>
        )}
        {mensaje && (
          <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 text-center">
            {mensaje}
          </p>
        )}

        {/* 🔘 Cerrar */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded shadow"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
