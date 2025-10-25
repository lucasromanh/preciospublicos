// src/components/ScannerView.tsx
import React, { useState } from "react";
import Scanner from "./Scanner";

interface Producto {
  id_producto: string;
  productos_ean?: string;
  productos_descripcion: string;
  productos_marca: string;
  productos_precio_referencia?: number;
  precio_lista?: number;
  sucursales_nombre?: string;
  sucursales_localidad?: string;
  sucursales_provincia?: string;
}

const ScannerView: React.FC = () => {
  const [detectedEAN, setDetectedEAN] = useState<string | null>(null);
  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(true);

  const handleDetected = async (ean: string) => {
    // evita lecturas duplicadas seguidas
    if (ean === detectedEAN) return;
    setDetectedEAN(ean);
    setLoading(true);
    setError(null);
    setProducto(null);

    // feedback háptico / sonido
    try {
      if (navigator.vibrate) navigator.vibrate(80);
      const beep = new Audio("/beep.mp3");
      beep.volume = 0.4;
      beep.play().catch(() => {});
    } catch {}

    try {
      const res = await fetch(
        `https://masbarato.saltacoders.com/api.php?action=getProductByEAN&ean=${ean}`
      );
      if (!res.ok) throw new Error("Error en la API");
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setProducto(null);
        setError("No se encontró el producto en la base de datos.");
      } else {
        setProducto(data[0]);
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la API");
    } finally {
      setLoading(false);
      // permite volver a leer nuevos códigos sin cerrar cámara
      setTimeout(() => setDetectedEAN(null), 2500);
    }
  };

  const handleClose = () => {
    setShowScanner(false);
    setProducto(null);
    setDetectedEAN(null);
    setError(null);
  };

  // ---------- Historial local de EANs escaneados
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Array<{ ean: string; ts: number }>>(() => {
    try {
      const raw = localStorage.getItem('scanned_eans');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMsg, setHistoryMsg] = useState<string | null>(null);

  const refreshHistory = () => {
    try {
      const raw = localStorage.getItem('scanned_eans');
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('scanned_eans');
    setHistory([]);
    setHistoryMsg('Historial limpiado');
    setTimeout(() => setHistoryMsg(null), 2000);
  };

  const removeHistoryAt = (index: number) => {
    const copy = [...history];
    copy.splice(index, 1);
    localStorage.setItem('scanned_eans', JSON.stringify(copy));
    setHistory(copy);
  };

  const buscarEnBackend = async (ean: string) => {
    setHistoryLoading(true);
    setHistoryMsg(null);
    try {
      const res = await fetch(`https://masbarato.saltacoders.com/api.php?action=getProductByEAN&ean=${encodeURIComponent(ean)}`);
      if (!res.ok) throw new Error('Error API');
      const data = await res.json();
      setHistoryMsg(`EAN ${ean}: ${Array.isArray(data) && data.length ? `Encontrado: ${data[0].productos_descripcion}` : 'No encontrado'}`);
    } catch (e: any) {
      setHistoryMsg(`Error buscando ${ean}`);
    } finally {
      setHistoryLoading(false);
      setTimeout(() => setHistoryMsg(null), 3500);
    }
  };

  const reenviarTodos = async () => {
    if (history.length === 0) return;
    setHistoryLoading(true);
    let found = 0;
    for (const item of history) {
      try {
        const res = await fetch(`https://masbarato.saltacoders.com/api.php?action=getProductByEAN&ean=${encodeURIComponent(item.ean)}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length) found++;
      } catch {}
    }
    setHistoryMsg(`Reenvío terminado. Productos encontrados: ${found}`);
    setHistoryLoading(false);
    setTimeout(() => setHistoryMsg(null), 4000);
  };

  if (!showScanner) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h2 className="text-xl font-bold mb-2 text-gray-800">
          Escáner cerrado
        </h2>
        <p className="text-gray-500 mb-4">
          Podés volver a abrir el escáner para seguir comparando precios.
        </p>
        <button
          onClick={() => setShowScanner(true)}
          className="bg-primary text-white px-4 py-2 rounded-full shadow-md hover:bg-primary/90 transition"
        >
          📷 Volver a escanear
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <Scanner
        onDetected={handleDetected}
        fullscreen
        onClose={handleClose}
      />

      <div className="absolute bottom-6 w-full text-center px-3">
        {loading && (
          <p className="text-white text-sm animate-pulse">Buscando producto...</p>
        )}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        {producto && (
          <div className="bg-white rounded-lg shadow-lg p-3 mx-auto max-w-sm mt-3 text-left text-sm animate-fadeIn">
            <p className="font-semibold text-gray-800">
              {producto.productos_descripcion}
            </p>
            <p className="text-gray-600">
              Marca: {producto.productos_marca || "—"}
            </p>
            <p className="text-gray-600">
              Precio ref: ${producto.productos_precio_referencia || "—"}
            </p>
            {producto.precio_lista && (
              <p className="text-green-600 font-bold">
                Precio actual: ${producto.precio_lista}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {producto.sucursales_nombre} – {producto.sucursales_localidad},{" "}
              {producto.sucursales_provincia}
            </p>
          </div>
        )}
      </div>

      {/* Historial local toggle */}
      <div className="w-full flex justify-center mt-4">
        <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={() => { setHistoryOpen(!historyOpen); refreshHistory(); }}>
          {historyOpen ? 'Cerrar historial' : `Historial (${history.length})`}
        </button>
      </div>

      {historyOpen && (
        <div className="w-full max-w-md bg-white rounded shadow p-3 mt-3">
          <div className="flex justify-between items-center mb-2">
            <strong>Historial local</strong>
            <div className="flex gap-2">
              <button className="text-xs px-2 py-1 bg-primary text-white rounded" onClick={reenviarTodos} disabled={historyLoading}>Reenviar todos</button>
              <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded" onClick={clearHistory}>Limpiar</button>
            </div>
          </div>
          {historyLoading && <div className="text-sm text-gray-500 mb-2">Procesando...</div>}
          {historyMsg && <div className="text-sm text-gray-600 mb-2">{historyMsg}</div>}
          {history.length === 0 ? (
            <div className="text-xs text-gray-400">No hay escaneos guardados.</div>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((item, idx) => (
                <li key={`${item.ean}-${item.ts}-${idx}`} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="text-xs">
                    <div className="font-mono text-sm">{item.ean}</div>
                    <div className="text-gray-400 text-[11px]">{new Date(item.ts).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 bg-white border rounded" onClick={() => buscarEnBackend(item.ean)}>Buscar</button>
                    <button className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded" onClick={() => removeHistoryAt(idx)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};

export default ScannerView;
