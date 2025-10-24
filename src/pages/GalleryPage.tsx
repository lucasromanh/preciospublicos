import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { obtenerGaleria, agregarAGaleria } from "../services/fotosService";

interface ProductImage {
  id: string;
  id_producto: string;
  image_url: string;
  created_at: string;
}

interface GaleriaItem {
  id: string;
  tipo: "ticket" | "product";
  productoId?: string;
  nombre?: string;
  dataUrl: string;
  createdAt: string;
}

interface ImagenGeneral {
  id: string;
  tipo: "ticket" | "product";
  url: string;
  fuente: "local" | "servidor";
  fecha: string;
  nombre?: string;
}

const GalleryPage: React.FC = () => {
  const [imagenesServidor, setImagenesServidor] = useState<ProductImage[]>([]);
  const [galeriaLocal, setGaleriaLocal] = useState<GaleriaItem[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // ==================================================
  // 🔄 Función para sincronizar con el servidor
  // ==================================================
  const sincronizarConServidor = async () => {
    try {
      setSincronizando(true);
      setMensaje("🔄 Sincronizando imágenes con el servidor...");

      const res = await fetch(
        "https://masbarato.saltacoders.com/api.php?action=getProductImages&id_producto=all"
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        setImagenesServidor(data);

        // Sincronizar con localStorage (solo si no existen)
        const galeriaExistente = obtenerGaleria();
        let nuevas = 0;

        data.forEach((img: ProductImage) => {
          const existe = galeriaExistente.some(
            (i) => i.dataUrl === img.image_url
          );
          if (!existe) {
            agregarAGaleria({
              tipo: "product",
              productoId: img.id_producto,
              dataUrl: img.image_url,
            });
            nuevas++;
          }
        });

        if (nuevas > 0) {
          setMensaje(`✅ ${nuevas} imágenes nuevas sincronizadas.`);
          setGaleriaLocal(obtenerGaleria());
        } else {
          setMensaje("✅ Galería actualizada (sin nuevos cambios).");
        }
      } else {
        setMensaje("❌ Error al recibir datos del servidor.");
      }
    } catch (err) {
      console.error("Error al sincronizar imágenes:", err);
      setMensaje("⚠️ Error de conexión con el servidor.");
    } finally {
      setSincronizando(false);
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  // ==================================================
  // 🚀 Cargar inicial (auto sincroniza al montar)
  // ==================================================
  useEffect(() => {
    sincronizarConServidor();
    setGaleriaLocal(obtenerGaleria());
  }, []);

  // ==================================================
  // ✏️ Editar nombre de imagen local
  // ==================================================
  const guardarNombre = () => {
    if (!editId) return;
    const all = obtenerGaleria();
    const index = all.findIndex((i) => i.id === editId);
    if (index >= 0) {
      all[index].nombre = editValue;
      localStorage.setItem("galeria", JSON.stringify(all));
      setGaleriaLocal(all);
      setEditId(null);
    }
  };

  // ==================================================
  // 🧩 Preparar grupos: servidor vs local
  // ==================================================
  const imagenesServidorOrdenadas = [...imagenesServidor].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const imagenesLocalesOrdenadas = [...galeriaLocal].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // ==================================================
  // 🧭 Render principal
  // ==================================================
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="font-bold text-xl">📸 Galería de fotos</h1>
          <button
            className={`text-sm px-3 py-1 rounded ${
              sincronizando
                ? "bg-gray-400 text-white cursor-wait"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
            onClick={sincronizarConServidor}
            disabled={sincronizando}
          >
            {sincronizando ? "Sincronizando..." : "🔄 Sincronizar"}
          </button>
        </div>

        {mensaje && (
          <div className="text-sm text-center text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 py-2 rounded">
            {mensaje}
          </div>
        )}

        {/* =======================
            🖼️ FOTOS DEL SERVIDOR
        ======================== */}
        <section>
          <h2 className="font-semibold text-lg mb-2 text-primary">
            🌐 Fotos sincronizadas del servidor
          </h2>
          {imagenesServidorOrdenadas.length === 0 ? (
            <div className="text-gray-400 text-sm">No hay fotos del servidor.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imagenesServidorOrdenadas.map((img) => (
                <div
                  key={img.id}
                  className="bg-gray-100 dark:bg-gray-800 rounded p-2 flex flex-col items-center shadow-md"
                >
                  <img
                    src={img.image_url}
                    alt="Foto producto"
                    className="h-24 w-24 object-cover rounded border border-gray-300 mb-1"
                    loading="lazy"
                  />
                  <div className="text-xs text-gray-700 dark:text-gray-300 text-center">
                    Producto #{img.id_producto}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(img.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =======================
            🧾 FOTOS LOCALES / TICKETS
        ======================== */}
        <section>
          <h2 className="font-semibold text-lg mb-2 text-green-600">
            💾 Mis tickets y fotos locales
          </h2>
          {imagenesLocalesOrdenadas.length === 0 ? (
            <div className="text-gray-400 text-sm">Aún no guardaste fotos locales.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imagenesLocalesOrdenadas.map((img) => (
                <div
                  key={img.id}
                  className="bg-gray-100 dark:bg-gray-800 rounded p-2 flex flex-col items-center shadow-md"
                >
                  <img
                    src={img.dataUrl}
                    alt="Foto producto"
                    className="h-24 w-24 object-cover rounded border border-gray-300 mb-1"
                    loading="lazy"
                  />

                  {editId === img.id ? (
                    <div className="w-full flex gap-1 mt-1">
                      <input
                        className="flex-1 text-sm p-1 rounded border"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <button
                        className="px-2 bg-green-600 text-white rounded text-sm"
                        onClick={guardarNombre}
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 text-center">
                      {img.nombre ||
                        (img.tipo === "ticket" ? "Ticket" : "Producto")}
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </div>

                  <button
                    className="text-xs mt-1 text-blue-600 hover:underline"
                    onClick={() => {
                      setEditId(img.id);
                      setEditValue(img.nombre || "");
                    }}
                  >
                    Renombrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;
