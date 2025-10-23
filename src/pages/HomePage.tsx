// --- ASOCIAR FOTOS A CÓDIGOS DE BARRAS ---
// Cuando el usuario sube una foto, se debe asociar a un id_producto (código de barras)
// Puedes guardar la relación { id_producto: string, fotoUrl: string } en IndexedDB o localStorage
// Ejemplo de funciones básicas:
export async function guardarFotoProducto(id_producto: string, file: File) {
  // Guardar la foto en IndexedDB o localStorage (aquí ejemplo con localStorage, para producción usar idb)
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem('foto_' + id_producto, dataUrl);
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function obtenerFotoProducto(id_producto: string): string | null {
  // Recupera la foto asociada a un producto (si existe)
  return localStorage.getItem('foto_' + id_producto);
}

// Cuando el usuario escanea un código de barras, puedes mostrar la foto así:
// const foto = obtenerFotoProducto(id_producto);
// if (foto) mostrar la imagen, si no, mostrar placeholder
// --- FIN ASOCIAR FOTOS ---
// --- INTEGRACIÓN SEPA CON FETCH ---
// Hook real para cargar productos, sucursales y precios desde CSV (ajusta rutas y headers según tu backend)


// Descomenta y adapta si quieres usar datos reales:
// const [productos, setProductos] = useState<SepaProducto[]>([]);
// const [sucursales, setSucursales] = useState<SepaSucursal[]>([]);
// const [preciosPorSucursal, setPreciosPorSucursal] = useState<Record<string, Record<string, number>>>({});

// useEffect(() => {
//   async function cargarDatos() {
//     // 1. Cargar y parsear productos.csv
//     const csvProd = await fetch("/ruta/productos.csv").then(r => r.text());
//     const productos = parseSepaCSV<SepaProducto>(csvProd, [
//       "id_producto", "productos_ean", "productos_descripcion", "productos_marca", "productos_precio_lista", "productos_precio_referencia", "productos_unidad_medida_referencia"
//     ]);
//     setProductos(productos);

//     // 2. Cargar y parsear sucursales.csv
//     const csvSuc = await fetch("/ruta/sucursales.csv").then(r => r.text());
//     const sucursales = parseSepaCSV<SepaSucursal>(csvSuc, [
//       "id_sucursal", "sucursales_nombre", "sucursales_tipo", "sucursales_latitud", "sucursales_longitud", "sucursales_provincia", "sucursales_localidad"
//     ]);
//     setSucursales(sucursales);

//     // 3. Armar preciosPorSucursal: { [id_sucursal]: { [id_producto]: precio } }
//     const precios: Record<string, Record<string, number>> = {};
//     for (const prod of productos) {
//       // Suponiendo que productos.csv tiene un campo id_sucursal (si no, deberás cruzar con otra tabla)
//       // Aquí deberías adaptar según la estructura real de los CSV
//       // Ejemplo: precios[prod.id_sucursal] = { ... }
//     }
//     setPreciosPorSucursal(precios);
//   }
//   cargarDatos();
// }, []);

// Luego puedes usar:
// const totales = calcularTotalesCarritoSEPA(carrito, productos, sucursales, preciosPorSucursal);
// --- FIN EJEMPLO INTEGRACIÓN ---
// --- PARSER CSV SIMPLE PARA SEPA ---
// Esta función convierte un string CSV a un array de objetos tipados
// Uso: const productos = parseSepaCSV<SepaProducto>(csvString, ["id_producto", ...]);
export function parseSepaCSV<T>(csv: string, headers: string[]): T[] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj: any = {};
    headers.forEach((h, i) => {
      let v: any = values[i];
      // Intenta convertir a número si corresponde
      if (v !== undefined && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      obj[h] = v;
    });
    return obj as T;
  });
}

// Ejemplo de uso:
// const csv = await fetch("/ruta/productos.csv").then(r => r.text());
// const productos = parseSepaCSV<SepaProducto>(csv, ["id_producto", "productos_ean", "productos_descripcion", "productos_marca", "productos_precio_lista", "productos_precio_referencia", "productos_unidad_medida_referencia"]);
// --- FIN PARSER CSV ---
// --- UTILIDADES PARA INTEGRACIÓN SEPA ---
// Tipos para los datos SEPA (puedes moverlos a /types si lo prefieres)
type SepaProducto = {
  id_producto: string;
  productos_ean: number;
  productos_descripcion: string;
  productos_marca: string;
  productos_precio_lista: number;
  productos_precio_referencia: number;
  productos_unidad_medida_referencia: string;
};
type SepaSucursal = {
  id_sucursal: string;
  sucursales_nombre: string;
  sucursales_tipo: string;
  sucursales_latitud: number;
  sucursales_longitud: number;
  sucursales_provincia: string;
  sucursales_localidad: string;
};
type SepaComercio = {
  id_comercio: string;
  id_bandera: string;
  comercio_razon_social: string;
  comercio_bandera_nombre: string;
};

// Función utilitaria: calcula el total del carrito por sucursal usando los datos SEPA
// productos: array de productos SEPA
// sucursales: array de sucursales SEPA
// precios: objeto { [id_sucursal]: { [id_producto]: precio } }
// carrito: array de id_producto
export function calcularTotalesCarritoSEPA(
  carrito: string[],
  productos: SepaProducto[],
  sucursales: SepaSucursal[],
  preciosPorSucursal: Record<string, Record<string, number>>
) {
  const totales: { sucursal: SepaSucursal; total: number; faltantes: number }[] = [];
  for (const suc of sucursales) {
    let total = 0;
    let faltantes = 0;
    for (const id of carrito) {
      const precio = preciosPorSucursal[suc.id_sucursal]?.[id];
      if (typeof precio === 'number') {
        total += precio;
      } else {
        faltantes++;
      }
    }
    totales.push({ sucursal: suc, total, faltantes });
  }
  return totales;
}

// Ejemplo de uso (cuando cargues los CSV):
// const productos: SepaProducto[] = ... // desde productos.csv
// const sucursales: SepaSucursal[] = ... // desde sucursales.csv
// const preciosPorSucursal: Record<string, Record<string, number>> = ... // armar desde productos.csv agrupando por sucursal
// const totales = calcularTotalesCarritoSEPA(carrito, productos, sucursales, preciosPorSucursal);
// const mejor = totales.filter(t => t.faltantes === 0).sort((a, b) => a.total - b.total)[0];
// --- FIN UTILIDADES SEPA ---
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
  {
    supermercado: "Supermercado Centro",
    localidad: "CABA",
    precio: 212.5,
    distancia: 1.2,
    ultimaActualizacion: "2025-10-21",
  },
  {
    supermercado: "Mercado Norte",
    localidad: "CABA",
    precio: 215.0,
    distancia: 2.1,
    ultimaActualizacion: "2025-10-20",
  },
];
const fotosEjemplo = [
  // URLs de ejemplo, puedes reemplazar por fotos reales
  "/assets/placeholders/product.png",
  "/assets/placeholders/product.png",
  "/assets/placeholders/product.png"
];

const HomePage: React.FC = () => {
  // Estado para ubicación del usuario
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Forzar obtención de ubicación real al cargar la HomePage
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }, []);

  const [search, setSearch] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [tab, setTab] = useState<'inicio'|'baratos'|'favoritos'|'galeria'>("inicio");
  const [showCarrito, setShowCarrito] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]); // ids de producto
  const [carrito, setCarrito] = useState<string[]>([]); // ids de producto
  // Estado para paginación de productos
  const [verMasProductos, setVerMasProductos] = useState(10);
  // Datos de ejemplo para desarrollo
  // Simulamos 3 productos y 2 sucursales con precios distintos

  // Referencia para input de archivo (carga de foto)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [productoParaFoto, setProductoParaFoto] = useState<string | null>(null);

  // Buscar productos reales al escribir
  useEffect(() => {
    if (search.length < 2) {
      setSugerencias([]);
      return;
    }
    let cancelado = false;
    setLoadingBusqueda(true);
    getComparaciones(search)
      .then(res => {
        if (!cancelado) setSugerencias(res);
      })
      .catch(() => setSugerencias([]))
      .finally(() => setLoadingBusqueda(false));
    return () => { cancelado = true; };
  }, [search]);

  // Al seleccionar una sugerencia, mostrarla como producto principal
  const handleSugerenciaClick = (sug: any) => {
    setSearch(sug.productos_descripcion);
    setSugerencias([]);
    setProductos([{
      id_producto: sug.id_producto,
      productos_ean: 0,
      productos_descripcion: sug.productos_descripcion,
      productos_marca: sug.productos_marca,
      productos_cantidad_presentacion: '',
      productos_unidad_medida_presentacion: '',
      productos_precio_lista: sug.precio_min,
      productos_precio_referencia: sug.precio_promedio,
      productos_unidad_medida_referencia: '',
      productos_categoria: '',
      productos_leyenda_promo1: '',
      productos_leyenda_promo2: '',
    }]);
    setProductoSeleccionado({
      id_producto: sug.id_producto,
      productos_ean: 0,
      productos_descripcion: sug.productos_descripcion,
      productos_marca: sug.productos_marca,
      productos_cantidad_presentacion: '',
      productos_unidad_medida_presentacion: '',
      productos_precio_lista: sug.precio_min,
      productos_precio_referencia: sug.precio_promedio,
      productos_unidad_medida_referencia: '',
      productos_categoria: '',
      productos_leyenda_promo1: '',
      productos_leyenda_promo2: '',
    });
  };

  // Precios por sucursal (simulado)
  // Estructura: { [id_sucursal]: { [id_producto]: precio } }
  const preciosPorSucursal: Record<string, Record<string, number>> = {
    s1: { // Supermercado Centro
      p1: 212.5,
      p2: 1490,
      p3: 970,
    },
    s2: { // Mercado Norte
      p1: 215,
      p2: 1510,
      p3: 940,
    },
  };

  // Función para calcular el total del carrito por sucursal
  function calcularTotalesCarrito(carrito: string[]) {
    const totales: { sucursal: Sucursal; total: number }[] = [];
    for (const suc of sucursalesEjemplo) {
      let total = 0;
      for (const id of carrito) {
        const precio = preciosPorSucursal[suc.id_sucursal]?.[id];
        if (typeof precio === 'number') {
          total += precio;
        } else {
          // Si falta el precio, sumamos 0 (o podrías poner Infinity para excluir la sucursal)
        }
      }
      totales.push({ sucursal: suc, total });
    }
    return totales;
  }
  // Productos más baratos (simulado)
  const productosBaratos = productos.slice().sort((a, b) => a.productos_precio_lista - b.productos_precio_lista);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header onScanClick={() => setShowScanner(true)} />
      <InstallAppBanner />
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button className={`px-3 py-1 rounded ${tab==='inicio'?'bg-primary text-white':'bg-gray-200 dark:bg-gray-700'}`} onClick={()=>setTab('inicio')}>Inicio</button>
          <button className={`px-3 py-1 rounded ${tab==='baratos'?'bg-primary text-white':'bg-gray-200 dark:bg-gray-700'}`} onClick={()=>setTab('baratos')}>Más baratos</button>
          <button className={`px-3 py-1 rounded ${tab==='favoritos'?'bg-primary text-white':'bg-gray-200 dark:bg-gray-700'}`} onClick={()=>setTab('favoritos')}>Favoritos</button>
          <button className={`px-3 py-1 rounded ${tab==='galeria'?'bg-primary text-white':'bg-gray-200 dark:bg-gray-700'}`} onClick={()=>setTab('galeria')}>Galería</button>
        </div>

        {/* Carrito inteligente: barra grande debajo de tabs, arriba del buscador */}
        <div className="mb-4">
          <div className="bg-primary/10 dark:bg-gray-800 border border-primary rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex-1">
              <div className="font-bold text-lg text-primary mb-1 flex items-center gap-2">
                🛒 Carrito inteligente
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                {carrito.length === 0 ? (
                  <span>No hay productos en el carrito.</span>
                ) : (
                  <span>{carrito.length} producto{carrito.length>1?'s':''} en el carrito.</span>
                )}
              </div>
              {carrito.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {carrito.map(id => {
                    const p = productos.find(p => p.id_producto === id);
                    if (!p) return null;
                    const foto = obtenerFotoProducto(p.id_producto);
                    return (
                      <span key={id} className="bg-primary text-white rounded px-2 py-1 text-xs flex items-center gap-1">
                        <button
                          className="focus:outline-none"
                          title={foto ? 'Ver foto' : 'Agregar foto'}
                          onClick={e => {
                            e.stopPropagation();
                            setProductoParaFoto(p.id_producto);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            fileInputRef.current?.click();
                          }}
                        >
                          {foto ? (
                            <img src={foto} alt="foto" className="w-7 h-7 rounded object-cover border border-white mr-1" />
                          ) : (
                            <span className="inline-block w-7 h-7 bg-gray-200 text-gray-500 rounded mr-1 flex items-center justify-center">+</span>
                          )}
                        </button>
                        {p.productos_descripcion}
                        <button className="ml-1 text-xs" title="Quitar" onClick={e => {e.stopPropagation(); setCarrito(carrito.filter(pid => pid !== id));}}>✕</button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* input invisible para carga de foto */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file && productoParaFoto) {
                    await guardarFotoProducto(productoParaFoto, file);
                    setProductoParaFoto(null);
                    // Forzar re-render
                    setCarrito(c => [...c]);
                  }
                }}
              />
            </div>
            <button
              className="bg-primary text-white px-6 py-2 rounded font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={carrito.length === 0}
              onClick={() => setShowCarrito(true)}
            >
              Calcular el lugar más barato
            </button>
          </div>
        </div>


        {/* Modal de resultado del carrito inteligente */}
        {showCarrito && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-4 max-w-md w-full flex flex-col items-center">
              <h2 className="font-bold text-lg mb-2 text-primary">Carrito inteligente</h2>
              {(() => {
                // Simulación: calcular totales y mejor sucursal
                // (En producción, usar datos reales)
                const totales = [
                  { sucursal: sucursalesEjemplo[0], total: 1234.56 },
                  { sucursal: sucursalesEjemplo[1], total: 1350.20 },
                ];
                const mejor = totales.reduce((a, b) => a.total < b.total ? a : b);
                return (
                  <div className="w-full">
                    <div className="mb-2 text-primary font-semibold">Supermercado más barato:</div>
                    <div className="mb-2 text-2xl font-bold text-green-600">{mejor.sucursal.sucursales_nombre} - ${mejor.total.toFixed(2)}</div>
                    <div className="mb-2 text-sm text-gray-500">Comparativa de sucursales:</div>
                    <ul className="mb-2">
                      {totales.map(t => (
                        <li key={t.sucursal.id_sucursal} className={t.sucursal.id_sucursal===mejor.sucursal.id_sucursal ? 'font-bold text-primary' : ''}>
                          {t.sucursal.sucursales_nombre}: ${t.total.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              <button
                className="mt-4 w-full rounded py-2 font-semibold bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setShowCarrito(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Contenido de cada tab */}
        {tab === 'inicio' && (
          <>
            <div className="relative">
              <SearchBar value={search} onChange={setSearch} />
              {sugerencias.length > 0 && (
                <ul className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded w-full mt-1 max-h-56 overflow-y-auto shadow-lg">
                  {sugerencias.map((sug, i) => (
                    <li
                      key={sug.id_producto + i}
                      className="px-3 py-2 cursor-pointer hover:bg-primary/10"
                      onClick={() => handleSugerenciaClick(sug)}
                    >
                      <div className="font-semibold text-sm text-primary">{sug.productos_descripcion}</div>
                      <div className="text-xs text-gray-500">{sug.productos_marca}</div>
                      <div className="text-xs text-gray-400">
                        ${Number(sug.precio_min || 0).toFixed(2)} - ${Number(sug.precio_max || 0).toFixed(2)}
                      </div>
                    </li>
                  ))}
                  {loadingBusqueda && <li className="px-3 py-2 text-xs text-gray-400">Buscando...</li>}
                </ul>
              )}
            </div>
            {showScanner && (
              <div className="fixed inset-0 bg-black bg-opacity-90 z-[1000] flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 rounded-none shadow-none p-0 w-full h-full flex flex-col items-center justify-center relative">
                  <button
                    className="absolute top-4 right-4 z-[1100] bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{opacity:0.95}}
                    onClick={() => {
                      // Forzar cierre de cámara
                      const videos = document.querySelectorAll('video');
                      videos.forEach(video => {
                        if (video.srcObject) {
                          const stream = video.srcObject as MediaStream;
                          stream.getTracks().forEach(track => track.stop());
                          video.srcObject = null;
                        }
                      });
                      setShowScanner(false);
                    }}
                    aria-label="Cerrar escáner"
                  >
                    ×
                  </button>
                  <Scanner onDetected={(code) => {
                    // Buscar producto por código (id_producto)
                    const prod = productos.find(p => String(p.id_producto) === String(code));
                    // Forzar cierre de cámara
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                      if (video.srcObject) {
                        const stream = video.srcObject as MediaStream;
                        stream.getTracks().forEach(track => track.stop());
                        video.srcObject = null;
                      }
                    });
                    setShowScanner(false);
                    if (prod) {
                      setProductoSeleccionado(prod);
                    } else {
                      setProductoSeleccionado(null);
                    }
                  }} fullscreen />
                  {/* Mostrar info del producto escaneado */}
                  {productoSeleccionado && (
                    <div className="w-full mt-4 flex flex-col items-center">
                      <div className="font-bold text-primary mb-1">{productoSeleccionado.productos_descripcion}</div>
                      <div className="text-xs text-gray-500 mb-2">Código: {productoSeleccionado.id_producto}</div>
                      {/* Mostrar foto si existe */}
                      {(() => {
                        const foto = obtenerFotoProducto(productoSeleccionado.id_producto);
                        if (foto) {
                          return <img src={foto} alt="foto producto" className="w-24 h-24 object-cover rounded border mb-2" />;
                        } else {
                          return (
                            <div className="flex flex-col items-center mb-2">
                              <span className="text-xs text-gray-400 mb-1">No hay foto asociada.</span>
                              <button
                                className="bg-primary text-white px-3 py-1 rounded text-xs font-semibold hover:bg-primary-dark"
                                onClick={() => {
                                  setProductoParaFoto(productoSeleccionado.id_producto);
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                  fileInputRef.current?.click();
                                }}
                              >
                                Tomar o subir foto
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                  <button
                    className="mt-4 w-full rounded py-2 font-semibold bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => {
                      // Forzar cierre de cámara
                      const videos = document.querySelectorAll('video');
                      videos.forEach(video => {
                        if (video.srcObject) {
                          const stream = video.srcObject as MediaStream;
                          stream.getTracks().forEach(track => track.stop());
                          video.srcObject = null;
                        }
                      });
                      setShowScanner(false);
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
            {showPhoto && (
              <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-4 max-w-xs w-full flex flex-col items-center">
                  <PhotoCapture autoStart onCapture={() => setShowPhoto(false)} />
                  <button
                    className="mt-4 w-full rounded py-2 font-semibold bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => setShowPhoto(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg">Productos más consultados</h2>
                <button
                  className="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary-dark"
                  onClick={async () => {
                    setLoadingBusqueda(true);
                    try {
                      const res = await getComparaciones();
                      setProductos(res.map((sug: any) => ({
                        id_producto: sug.id_producto,
                        productos_ean: 0,
                        productos_descripcion: sug.productos_descripcion,
                        productos_marca: sug.productos_marca,
                        productos_cantidad_presentacion: '',
                        productos_unidad_medida_presentacion: '',
                        productos_precio_lista: sug.precio_min,
                        productos_precio_referencia: sug.precio_promedio,
                        productos_unidad_medida_referencia: '',
                        productos_categoria: '',
                        productos_leyenda_promo1: '',
                        productos_leyenda_promo2: '',
                      })));
                    } catch {}
                    setLoadingBusqueda(false);
                  }}
                >
                  Ver productos del backend
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 min-h-[220px]">
                {loadingBusqueda ? (
                  <LoadingSpinner />
    ) : productos.length === 0 ? (
      <div className="text-gray-400 text-center py-4 col-span-2">Aún no se agregaron productos consultados.</div>
    ) : (
      <>
        {productos.slice(0, verMasProductos).map((p) => {
          const foto = obtenerFotoProducto(p.id_producto);
          return (
            <div key={p.id_producto} className="relative group flex flex-col h-full min-h-[210px]">
              <ProductCard
                producto={p}
                onClick={() => setProductoSeleccionado(p)}
                className={productoSeleccionado?.id_producto === p.id_producto ? "ring-2 ring-primary" : ""}
                fotoUrl={foto || undefined}
              />
              <div className="flex justify-between items-center mt-2 gap-2">
                <button
                  className={`text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}
                  title={favoritos.includes(p.id_producto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={e => {
                    e.stopPropagation();
                    setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]);
                  }}
                >
                  {favoritos.includes(p.id_producto) ? '★' : '☆'}
                </button>
                <button
                  className={`text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  title={carrito.includes(p.id_producto) ? 'Quitar del carrito' : 'Agregar al carrito'}
                  onClick={e => {
                    e.stopPropagation();
                    setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]);
                  }}
                >
                  {carrito.includes(p.id_producto) ? 'Quitar' : 'Agregar'}
                </button>
              </div>
            </div>
          );
        })}
        {productos.length > verMasProductos && (
          <button
            className="col-span-2 mt-2 bg-primary text-white rounded px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => setVerMasProductos(verMasProductos + 10)}
          >
            Ver más productos
          </button>
        )}
      </>
    )}
  </div>
              {/* Detalle de producto seleccionado */}
              {productoSeleccionado && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded shadow flex flex-col items-center">
                  <div className="font-bold text-primary mb-1">{productoSeleccionado.productos_descripcion}</div>
                  <div className="text-xs text-gray-500 mb-2">Código: {productoSeleccionado.id_producto}</div>
                  {(() => {
                    const foto = obtenerFotoProducto(productoSeleccionado.id_producto);
                    if (foto) {
                      return <img src={foto} alt="foto producto" className="w-24 h-24 object-cover rounded border mb-2" />;
                    } else {
                      return (
                        <div className="flex flex-col items-center mb-2">
                          <span className="text-xs text-gray-400 mb-1">No hay foto asociada.</span>
                          <button
                            className="bg-primary text-white px-3 py-1 rounded text-xs font-semibold hover:bg-primary-dark"
                            onClick={() => {
                              setProductoParaFoto(productoSeleccionado.id_producto);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                              fileInputRef.current?.click();
                            }}
                          >
                            Tomar o subir foto
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </section>
            <section>
              <h2 className="font-bold text-lg mb-2">Cerca de mí</h2>
              <div className="mb-2 text-xs text-gray-400 dark:text-gray-300">
                Selecciona un producto para ver los precios en sucursales cercanas.
              </div>
  <div className="mb-4">
    <MapView sucursales={sucursalesEjemplo} userLocation={userLocation ?? undefined} />
  </div>
  <div className="mb-4">
    {productoSeleccionado ? (
      <>
        <div className="mb-2 font-semibold text-primary">
          Precios de <span className="underline">{productoSeleccionado.productos_descripcion}</span> en sucursales:
        </div>
        <PriceComparisonTable rows={comparacionEjemplo} />
      </>
    ) : (
      <div className="text-gray-400">Selecciona un producto para comparar precios.</div>
    )}
  </div>
              <div className="mb-4 flex flex-col gap-2">
                <button
                  className="bg-primary text-white rounded px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary w-fit"
                  onClick={e => { e.stopPropagation(); setShowPhoto(true); }}
                >
                  Tomar foto de ticket o producto
                </button>
                <span className="text-xs text-gray-400">Puedes tomar una foto de un ticket o producto para guardarla localmente.</span>
              </div>
              <div className="mb-4">
                {loadingBusqueda ? (
                  <LoadingSpinner />
                ) : (
                  <div className="text-gray-400 text-center py-4">Aún no se han consultado productos ni tickets.</div>
                )}
              </div>
            </section>
          </>
        )}
        {tab === 'baratos' && (
          <section>
            <h2 className="font-bold text-lg mb-2">Productos más baratos</h2>
            <div className="grid grid-cols-2 gap-2">
              {productosBaratos.map((p) => {
                const foto = obtenerFotoProducto(p.id_producto);
                return (
                  <div key={p.id_producto} className="relative group flex flex-col h-full">
                    <ProductCard
                      producto={p}
                      onClick={() => setProductoSeleccionado(p)}
                      className={productoSeleccionado?.id_producto === p.id_producto ? "ring-2 ring-primary" : ""}
                      fotoUrl={foto || undefined}
                    />
                    <div className="flex justify-between items-center mt-2 gap-2">
                      <button
                        className={`text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}
                        title={favoritos.includes(p.id_producto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        onClick={e => {
                          e.stopPropagation();
                          setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]);
                        }}
                      >
                        {favoritos.includes(p.id_producto) ? '★' : '☆'}
                      </button>
                      <button
                        className={`text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        title={carrito.includes(p.id_producto) ? 'Quitar del carrito' : 'Agregar al carrito'}
                        onClick={e => {
                          e.stopPropagation();
                          setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]);
                        }}
                      >
                        {carrito.includes(p.id_producto) ? 'En carrito' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {tab === 'favoritos' && (
          <section>
            <h2 className="font-bold text-lg mb-2">Favoritos</h2>
            <div className="grid grid-cols-2 gap-2">
              {favoritos.length === 0 ? <div className="text-gray-400">No tienes favoritos aún.</div> : productos.filter(p => favoritos.includes(p.id_producto)).map((p) => {
                const foto = obtenerFotoProducto(p.id_producto);
                return (
                  <div key={p.id_producto} className="relative group">
                    <ProductCard
                      producto={p}
                      onClick={() => setProductoSeleccionado(p)}
                      className={productoSeleccionado?.id_producto === p.id_producto ? "ring-2 ring-primary" : ""}
                      fotoUrl={foto || undefined}
                    />
                    <button
                      className={`absolute top-2 right-2 text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}
                      title={favoritos.includes(p.id_producto) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      onClick={e => {
                        e.stopPropagation();
                        setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]);
                      }}
                    >
                      {favoritos.includes(p.id_producto) ? '★' : '☆'}
                    </button>
                    <button
                      className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                      title={carrito.includes(p.id_producto) ? 'Quitar del carrito' : 'Agregar al carrito'}
                      onClick={e => {
                        e.stopPropagation();
                        setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]);
                      }}
                    >
                      {carrito.includes(p.id_producto) ? 'En carrito' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {tab === 'galeria' && (
          <section>
            <h2 className="font-bold text-lg mb-2">Galería de fotos</h2>
            <div className="grid grid-cols-3 gap-2">
              {fotosEjemplo.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i+1}`} className="rounded shadow object-cover w-full h-24" />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
