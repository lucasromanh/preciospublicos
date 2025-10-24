import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SearchBar from "../components/SearchBar";
import { getComparaciones } from "../services/apiService";
import ProductCard from "../components/ProductCard";
import Scanner from "../components/Scanner";
import LoadingSpinner from "../components/LoadingSpinner";
import InstallAppBanner from "../components/InstallAppBanner";
import MapView from "../components/MapView";
import PriceComparisonTable, { PriceRow } from "../components/PriceComparisonTable";
import PhotoCapture from "../components/PhotoCapture";
import { Producto } from "../types/Producto";
import { Sucursal } from "../types/Sucursal";
import ProductModal from "../components/ProductModal";
import {
  obtenerFotoProducto,
  guardarFotoProducto,
  guardarFotoProductoDataUrl,
  agregarAGaleria,
  obtenerGaleria,
} from "../services/fotosService";
import { calcularTotalesCarritoSEPA } from "../utils/sepaUtils";

// =====================================
// 🌍 Ejemplos locales (solo referencia)
// =====================================
const sucursalesEjemplo: Sucursal[] = [
  {
    id_sucursal: "s1",
    sucursales_nombre: "Supermercado Centro",
    sucursales_tipo: "Supermercado",
    sucursales_calle: "Av. Siempre Viva",
    sucursales_numero: "123",
    sucursales_latitud: -34.6037,
    sucursales_longitud: -58.3816,
    sucursales_localidad: "CABA",
    sucursales_provincia: "Buenos Aires",
  },
  {
    id_sucursal: "s2",
    sucursales_nombre: "Mercado Norte",
    sucursales_tipo: "Mercado",
    sucursales_calle: "Calle Falsa",
    sucursales_numero: "456",
    sucursales_latitud: -34.6045,
    sucursales_longitud: -58.3822,
    sucursales_localidad: "CABA",
    sucursales_provincia: "Buenos Aires",
  },
];

const comparacionEjemplo: PriceRow[] = [
  { supermercado: "Supermercado Centro", localidad: "CABA", precio: 212.5, distancia: 1.2, ultimaActualizacion: "2025-10-21" },
  { supermercado: "Mercado Norte", localidad: "CABA", precio: 215.0, distancia: 2.1, ultimaActualizacion: "2025-10-20" },
];

// =====================================
// 🏠 HomePage principal
// =====================================
const HomePage: React.FC = () => {
  // 🌎 Geolocalización del usuario
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }, []);

  // 🔍 Estados principales
  const [search, setSearch] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [tab, setTab] = useState<"inicio" | "baratos" | "favoritos" | "galeria">("inicio");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [carrito, setCarrito] = useState<string[]>([]);
  const [showCarrito, setShowCarrito] = useState(false);
  const [verMasProductos, setVerMasProductos] = useState(10);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [productoParaFoto, setProductoParaFoto] = useState<string | null>(null);

  // 🧠 Buscar productos reales
  useEffect(() => {
    if (search.length < 2) {
      setSugerencias([]);
      return;
    }
    let cancelado = false;
    setLoadingBusqueda(true);
    getComparaciones(search)
      .then((res) => {
        if (!cancelado) setSugerencias(res);
      })
      .catch(() => setSugerencias([]))
      .finally(() => setLoadingBusqueda(false));
    return () => {
      cancelado = true;
    };
  }, [search]);

  // 🛒 Calcular carrito por sucursal (solo ejemplo)
  const preciosPorSucursal: Record<string, Record<string, number>> = {
    s1: { p1: 212.5, p2: 1490, p3: 970 },
    s2: { p1: 215, p2: 1510, p3: 940 },
  };

  const calcularTotalesCarrito = (carrito: string[]) => {
    const totales: { sucursal: Sucursal; total: number }[] = [];
    for (const suc of sucursalesEjemplo) {
      let total = 0;
      for (const id of carrito) {
        const precio = preciosPorSucursal[suc.id_sucursal]?.[id];
        if (typeof precio === "number") total += precio;
      }
      totales.push({ sucursal: suc, total });
    }
    return totales;
  };

  // 🧩 Manejar sugerencia seleccionada
  const handleSugerenciaClick = (sug: any) => {
    setSearch(sug.productos_descripcion);
    setSugerencias([]);
    const nuevo: Producto = {
      id_producto: sug.id_producto,
      productos_ean: 0,
      productos_descripcion: sug.productos_descripcion,
      productos_marca: sug.productos_marca,
      productos_precio_lista: sug.precio_min,
      productos_precio_referencia: sug.precio_promedio,
      productos_cantidad_presentacion: "",
      productos_unidad_medida_presentacion: "",
      productos_unidad_medida_referencia: "",
      productos_categoria: "",
      productos_leyenda_promo1: "",
      productos_leyenda_promo2: "",
    };
    setProductos([nuevo]);
    setProductoSeleccionado(nuevo);
  };

  // =====================================
  // 🎨 Render principal
  // =====================================
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header onScanClick={() => setShowScanner(true)} />
      <InstallAppBanner />
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Tabs superiores */}
        <div className="flex gap-2 mb-4">
          {["inicio", "baratos", "favoritos", "galeria"].map((t) => (
            <button
              key={t}
              className={`px-3 py-1 rounded ${tab === t ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              onClick={() => setTab(t as any)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Carrito inteligente */}
        <div className="mb-4 bg-primary/10 border border-primary rounded-lg p-4 shadow-lg">
          <div className="font-bold text-lg text-primary mb-2 flex items-center gap-2">
            🛒 Carrito inteligente
          </div>
          {carrito.length === 0 ? (
            <div className="text-sm text-gray-600">No hay productos en el carrito.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {carrito.map((id) => {
                const p = productos.find((p) => p.id_producto === id);
                if (!p) return null;
                const foto = obtenerFotoProducto(p.id_producto);
                return (
                  <span key={id} className="bg-primary text-white rounded px-2 py-1 text-xs flex items-center gap-1">
                    <img
                      src={foto || "/placeholder.png"}
                      alt="foto"
                      className="w-7 h-7 rounded object-cover border border-white"
                    />
                    {p.productos_descripcion}
                    <button
                      className="ml-1 text-xs"
                      title="Quitar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarrito(carrito.filter((pid) => pid !== id));
                      }}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        {tab === "inicio" && (
          <>
            <SearchBar value={search} onChange={setSearch} />

            {/* Sugerencias */}
            {sugerencias.length > 0 && (
              <ul className="absolute bg-white dark:bg-gray-800 border rounded w-full mt-1 max-h-56 overflow-y-auto shadow-lg z-20">
                {sugerencias.map((sug, i) => (
                  <li
                    key={i}
                    onClick={() => handleSugerenciaClick(sug)}
                    className="px-3 py-2 cursor-pointer hover:bg-primary/10"
                  >
                    <div className="font-semibold text-sm text-primary">{sug.productos_descripcion}</div>
                    <div className="text-xs text-gray-500">{sug.productos_marca}</div>
                  </li>
                ))}
              </ul>
            )}

            {/* Listado de productos */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {loadingBusqueda ? (
                <LoadingSpinner />
              ) : productos.length === 0 ? (
                <div className="col-span-2 text-gray-400 text-center py-4">
                  Sin productos cargados.
                </div>
              ) : (
                productos.slice(0, verMasProductos).map((p) => {
                  const foto = obtenerFotoProducto(p.id_producto);
                  return (
                    <ProductCard
                      key={p.id_producto}
                      producto={p}
                      fotoUrl={foto || undefined}
                      onClick={() => {
                        setProductoSeleccionado(p);
                        setShowProductoModal(true);
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Modal de producto */}
            {showProductoModal && productoSeleccionado && (
              <ProductModal
                producto={productoSeleccionado}
                onClose={() => setShowProductoModal(false)}
                onFotoGuardada={(url) => {
                  guardarFotoProductoDataUrl(productoSeleccionado.id_producto, url);
                  setProductos((prev) =>
                    prev.map((p) =>
                      p.id_producto === productoSeleccionado.id_producto ? { ...p, imagen_local: url } : p
                    )
                  );
                  setProductoSeleccionado({ ...productoSeleccionado, imagen_local: url });
                }}
              />
            )}

            {/* Mapa + Comparador */}
            <section className="mt-6">
              <h2 className="font-bold text-lg mb-2">Cerca de mí</h2>
              <MapView sucursales={sucursalesEjemplo} userLocation={userLocation ?? undefined} />
              {productoSeleccionado && (
                <>
                  <div className="mt-2 font-semibold text-primary">
                    Precios de {productoSeleccionado.productos_descripcion}:
                  </div>
                  <PriceComparisonTable rows={comparacionEjemplo} />
                </>
              )}
            </section>
          </>
        )}

        {tab === "galeria" && <GaleriaView />}
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;

// =====================================
// 🖼️ Subcomponente de galería local
// =====================================
function GaleriaView() {
  const [items, setItems] = useState(obtenerGaleria());
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const refresh = () => setItems(obtenerGaleria());

  const handleDelete = (id: string) => {
    const newItems = items.filter((i) => i.id !== id);
    localStorage.setItem("galeria", JSON.stringify(newItems));
    refresh();
  };

  const saveEdit = () => {
    const all = obtenerGaleria();
    const idx = all.findIndex((i) => i.id === editId);
    if (idx >= 0) {
      all[idx].nombre = editValue;
      localStorage.setItem("galeria", JSON.stringify(all));
      setEditId(null);
      refresh();
    }
  };

  if (items.length === 0)
    return <div className="text-gray-400 text-center py-4">No hay fotos en la galería.</div>;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.id} className="bg-gray-100 rounded p-2 flex flex-col items-center">
          <img src={item.dataUrl} alt={item.nombre || item.tipo} className="w-full h-24 object-cover rounded mb-2" />
          <div className="text-xs text-gray-600 w-full truncate">
            {item.productoId ? `Producto ${item.productoId}` : item.tipo}
          </div>
          {editId === item.id ? (
            <div className="w-full flex gap-1 mt-1">
              <input
                className="flex-1 text-sm p-1"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <button className="px-2 bg-green-600 text-white rounded text-sm" onClick={saveEdit}>
                OK
              </button>
            </div>
          ) : (
            <div className="w-full flex gap-1 mt-1">
              <button
                className="flex-1 text-xs bg-primary text-white rounded py-1"
                onClick={() => {
                  setEditId(item.id);
                  setEditValue(item.nombre || "");
                }}
              >
                Renombrar
              </button>
              <button
                className="flex-1 text-xs bg-red-200 text-red-700 rounded py-1"
                onClick={() => handleDelete(item.id)}
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
