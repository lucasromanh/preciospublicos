// --- COMPONENTE HOMEPAGE ---
import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SearchBar from '../components/SearchBar';
import { getComparaciones } from '../services/apiService';
import ProductCard from '../components/ProductCard';
import PriceComparisonTable, { PriceRow } from '../components/PriceComparisonTable';
import MapView from '../components/MapView';
import Scanner from '../components/Scanner';
import PhotoCapture from '../components/PhotoCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import InstallAppBanner from '../components/InstallAppBanner';
import ProductModal from '../components/ProductModal';
import {
  guardarFotoProducto,
  obtenerFotoProducto,
  guardarFotoProductoDataUrl,
  agregarAGaleria,
  obtenerGaleria,
  GaleriaItem
} from '../services/fotosService';
import {
  parseSepaCSV,
  calcularTotalesCarritoSEPA,
  SepaProducto,
  SepaSucursal
} from '../utils/sepaUtils';
import { Producto } from '../types/Producto';
import { Sucursal } from '../types/Sucursal';

const sucursalesEjemplo: Sucursal[] = [
  {
    id_sucursal: 's1',
    sucursales_nombre: 'Supermercado Centro',
    sucursales_tipo: 'Supermercado',
    sucursales_calle: 'Av. Siempre Viva',
    sucursales_numero: '123',
    sucursales_latitud: -34.6037,
    sucursales_longitud: -58.3816,
    sucursales_localidad: 'CABA',
    sucursales_provincia: 'Buenos Aires',
  },
  {
    id_sucursal: 's2',
    sucursales_nombre: 'Mercado Norte',
    sucursales_tipo: 'Mercado',
    sucursales_calle: 'Calle Falsa',
    sucursales_numero: '456',
    sucursales_latitud: -34.6045,
    sucursales_longitud: -58.3822,
    sucursales_localidad: 'CABA',
    sucursales_provincia: 'Buenos Aires',
  },
];

const comparacionEjemplo: PriceRow[] = [
  {
    supermercado: 'Supermercado Centro',
    localidad: 'CABA',
    precio: 212.5,
    distancia: 1.2,
    ultimaActualizacion: '2025-10-21',
  },
  {
    supermercado: 'Mercado Norte',
    localidad: 'CABA',
    precio: 215.0,
    distancia: 2.1,
    ultimaActualizacion: '2025-10-20',
  },
];

const HomePage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }, []);

  const [search, setSearch] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [tab, setTab] = useState<'inicio' | 'baratos' | 'favoritos' | 'galeria'>('inicio');
  const [showCarrito, setShowCarrito] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [carrito, setCarrito] = useState<string[]>([]);
  const [verMasProductos, setVerMasProductos] = useState(10);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [productoParaFoto, setProductoParaFoto] = useState<string | null>(null);

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
    return () => {
      cancelado = true;
    };
  }, [search]);

  const handleSugerenciaClick = (sug: any) => {
    setSearch(sug.productos_descripcion);
    setSugerencias([]);
    const prod: Producto = {
      id_producto: sug.id_producto,
      productos_ean: 0,
      productos_descripcion: sug.productos_descripcion,
      productos_marca: sug.productos_marca,
      productos_precio_lista: sug.precio_min,
      productos_precio_referencia: sug.precio_promedio,
      productos_cantidad_presentacion: '',
      productos_unidad_medida_presentacion: '',
      productos_unidad_medida_referencia: '',
      productos_categoria: '',
      productos_leyenda_promo1: '',
      productos_leyenda_promo2: '',
    };
    setProductos([prod]);
    setProductoSeleccionado(prod);
  };

  const preciosPorSucursal: Record<string, Record<string, number>> = {
    s1: { p1: 212.5, p2: 1490, p3: 970 },
    s2: { p1: 215, p2: 1510, p3: 940 },
  };

  function calcularTotalesCarrito(carrito: string[]) {
    const totales: { sucursal: Sucursal; total: number }[] = [];
    for (const suc of sucursalesEjemplo) {
      let total = 0;
      for (const id of carrito) {
        const precio = preciosPorSucursal[suc.id_sucursal]?.[id];
        if (typeof precio === 'number') total += precio;
      }
      totales.push({ sucursal: suc, total });
    }
    return totales;
  }

  const productosBaratos = productos.slice().sort((a, b) => a.productos_precio_lista - b.productos_precio_lista);

  // Renderizado modular de la sección de productos según la pestaña activa
  const renderProductsSection = () => {
    if (tab === 'galeria') return null;

    if (tab === 'inicio') {
      return (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Productos más consultados</h2>
            <button
              className="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary-dark"
              onClick={async () => {
                setLoadingBusqueda(true);
                try {
                  const res = await getComparaciones();
                  setProductos(
                    res.map((sug: any) => ({
                      id_producto: sug.id_producto,
                      productos_ean: 0,
                      productos_descripcion: sug.productos_descripcion,
                      productos_marca: sug.productos_marca,
                      productos_precio_lista: sug.precio_min,
                      productos_precio_referencia: sug.precio_promedio,
                      productos_cantidad_presentacion: '',
                      productos_unidad_medida_presentacion: '',
                      productos_unidad_medida_referencia: '',
                      productos_categoria: '',
                      productos_leyenda_promo1: '',
                      productos_leyenda_promo2: '',
                    }))
                  );
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
                {productos.slice(0, verMasProductos).map(p => {
                  const foto = obtenerFotoProducto(p.id_producto);
                  return (
                    <div key={p.id_producto} className="relative group flex flex-col h-full min-h-[210px]">
                      <div
                        onClick={() => { setProductoSeleccionado(p); setShowProductoModal(true); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <ProductCard producto={p} className={productoSeleccionado?.id_producto === p.id_producto ? 'ring-2 ring-primary' : ''} fotoUrl={foto || undefined} />
                      </div>
                      <div className="flex justify-between items-center mt-2 gap-2">
                        <button className={`text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`} title={favoritos.includes(p.id_producto) ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={e => { e.stopPropagation(); setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]); }}>
                          {favoritos.includes(p.id_producto) ? '★' : '☆'}
                        </button>
                        <button className={`text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`} title={carrito.includes(p.id_producto) ? 'Quitar del carrito' : 'Agregar al carrito'} onClick={e => { e.stopPropagation(); setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]); }}>
                          {carrito.includes(p.id_producto) ? 'Quitar' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {productos.length > verMasProductos && (
                  <button className="col-span-2 mt-2 bg-primary text-white rounded px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary" onClick={() => setVerMasProductos(verMasProductos + 10)}>Ver más productos</button>
                )}
              </>
            )}
          </div>

          {showProductoModal && productoSeleccionado && (
            <ProductModal producto={productoSeleccionado} onClose={() => setShowProductoModal(false)} onFotoGuardada={url => { guardarFotoProductoDataUrl(productoSeleccionado.id_producto, url); setProductos(prev => prev.map(p => p.id_producto === productoSeleccionado.id_producto ? { ...p, imagen_local: url } : p)); setProductoSeleccionado({ ...productoSeleccionado, imagen_local: url }); }} />
          )}
        </section>
      );
    }

    if (tab === 'baratos') {
      return (
        <section>
          <div className="flex items-center justify-between mb-2"><h2 className="font-bold text-lg">Productos más baratos</h2></div>
          <div className="grid grid-cols-2 gap-2 min-h-[220px]">
            {loadingBusqueda ? (
              <LoadingSpinner />
            ) : productosBaratos.length === 0 ? (
              <div className="text-gray-400 text-center py-4 col-span-2">No hay productos para mostrar.</div>
            ) : (
              <>
                {productosBaratos.slice(0, verMasProductos).map(p => {
                  const foto = obtenerFotoProducto(p.id_producto);
                  return (
                    <div key={p.id_producto} className="relative group flex flex-col h-full min-h-[210px]">
                      <div onClick={() => { setProductoSeleccionado(p); setShowProductoModal(true); }} style={{ cursor: 'pointer' }}>
                        <ProductCard producto={p} className={productoSeleccionado?.id_producto === p.id_producto ? 'ring-2 ring-primary' : ''} fotoUrl={foto || undefined} />
                      </div>
                      <div className="flex justify-between items-center mt-2 gap-2">
                        <button className={`text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`} onClick={e => { e.stopPropagation(); setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]); }}>{favoritos.includes(p.id_producto) ? '★' : '☆'}</button>
                        <button className={`text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={e => { e.stopPropagation(); setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]); }}>{carrito.includes(p.id_producto) ? 'Quitar' : 'Agregar'}</button>
                      </div>
                    </div>
                  );
                })}
                {productosBaratos.length > verMasProductos && (<button className="col-span-2 mt-2 bg-primary text-white rounded px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary" onClick={() => setVerMasProductos(verMasProductos + 10)}>Ver más productos</button>)}
              </>
            )}
          </div>
        </section>
      );
    }

    // favoritos
    return (
      <section>
        <div className="flex items-center justify-between mb-2"><h2 className="font-bold text-lg">Productos favoritos</h2></div>
        <div className="grid grid-cols-2 gap-2 min-h-[220px]">
          {loadingBusqueda ? (
            <LoadingSpinner />
          ) : productos.filter(p => favoritos.includes(p.id_producto)).length === 0 ? (
            <div className="text-gray-400 text-center py-4 col-span-2">No tienes productos favoritos aún.</div>
          ) : (
            <>
              {productos.filter(p => favoritos.includes(p.id_producto)).slice(0, verMasProductos).map(p => {
                const foto = obtenerFotoProducto(p.id_producto);
                return (
                  <div key={p.id_producto} className="relative group flex flex-col h-full min-h-[210px]">
                    <div onClick={() => { setProductoSeleccionado(p); setShowProductoModal(true); }} style={{ cursor: 'pointer' }}>
                      <ProductCard producto={p} className={productoSeleccionado?.id_producto === p.id_producto ? 'ring-2 ring-primary' : ''} fotoUrl={foto || undefined} />
                    </div>
                    <div className="flex justify-between items-center mt-2 gap-2">
                      <button className={`text-lg ${favoritos.includes(p.id_producto) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`} onClick={e => { e.stopPropagation(); setFavoritos(favoritos.includes(p.id_producto) ? favoritos.filter(id => id !== p.id_producto) : [...favoritos, p.id_producto]); }}>{favoritos.includes(p.id_producto) ? '★' : '☆'}</button>
                      <button className={`text-xs px-2 py-1 rounded ${carrito.includes(p.id_producto) ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`} onClick={e => { e.stopPropagation(); setCarrito(carrito.includes(p.id_producto) ? carrito.filter(id => id !== p.id_producto) : [...carrito, p.id_producto]); }}>{carrito.includes(p.id_producto) ? 'Quitar' : 'Agregar'}</button>
                    </div>
                  </div>
                );
              })}
              {productos.filter(p => favoritos.includes(p.id_producto)).length > verMasProductos && (<button className="col-span-2 mt-2 bg-primary text-white rounded px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary" onClick={() => setVerMasProductos(verMasProductos + 10)}>Ver más productos</button>)}
            </>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header onScanClick={() => setShowScanner(true)} />
      <InstallAppBanner />
      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded ${tab === 'inicio' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setTab('inicio')}
          >
            Inicio
          </button>
          <button
            className={`px-3 py-1 rounded ${tab === 'baratos' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setTab('baratos')}
          >
            Más baratos
          </button>
          <button
            className={`px-3 py-1 rounded ${tab === 'favoritos' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setTab('favoritos')}
          >
            Favoritos
          </button>
          <button
            className={`px-3 py-1 rounded ${tab === 'galeria' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setTab('galeria')}
          >
            Galería
          </button>
        </div>

        {/* Carrito inteligente */}
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
                  <span>{carrito.length} producto{carrito.length > 1 ? 's' : ''} en el carrito.</span>
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
                          } }
                        >
                          {foto ? (
                            <img
                              src={foto}
                              alt="foto"
                              className="w-7 h-7 rounded object-cover border border-white mr-1" />
                          ) : (
                            <span className="inline-block w-7 h-7 bg-gray-200 text-gray-500 rounded mr-1 flex items-center justify-center">
                              +
                            </span>
                          )}
                        </button>
                        {p.productos_descripcion}
                        <button
                          className="ml-1 text-xs"
                          title="Quitar"
                          onClick={e => {
                            e.stopPropagation();
                            setCarrito(carrito.filter(pid => pid !== id));
                          } }
                        >
                          ✕
                        </button>
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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && productoParaFoto) {
                    await guardarFotoProducto(productoParaFoto, file);
                    setProductoParaFoto(null);
                    setCarrito(c => [...c]);
                  }
                } } />
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
                const totales = [
                  { sucursal: sucursalesEjemplo[0], total: 1234.56 },
                  { sucursal: sucursalesEjemplo[1], total: 1350.2 },
                ];
                const mejor = totales.reduce((a, b) => (a.total < b.total ? a : b));
                return (
                  <div className="w-full">
                    <div className="mb-2 text-primary font-semibold">Supermercado más barato:</div>
                    <div className="mb-2 text-2xl font-bold text-green-600">
                      {mejor.sucursal.sucursales_nombre} - ${mejor.total.toFixed(2)}
                    </div>
                    <div className="mb-2 text-sm text-gray-500">Comparativa de sucursales:</div>
                    <ul className="mb-2">
                      {totales.map(t => (
                        <li
                          key={t.sucursal.id_sucursal}
                          className={t.sucursal.id_sucursal === mejor.sucursal.id_sucursal
                            ? 'font-bold text-primary'
                            : ''}
                        >
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

        {/* TAB INICIO */}
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
                      <div className="font-semibold text-sm text-primary">
                        {sug.productos_descripcion}
                      </div>
                      <div className="text-xs text-gray-500">{sug.productos_marca}</div>
                      <div className="text-xs text-gray-400">
                        ${Number(sug.precio_min || 0).toFixed(2)} - $
                        {Number(sug.precio_max || 0).toFixed(2)}
                      </div>
                    </li>
                  ))}
                  {loadingBusqueda && (
                    <li className="px-3 py-2 text-xs text-gray-400">Buscando...</li>
                  )}
                </ul>
              )}
            </div>
        {/* SCANNER */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[1000] flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-none shadow-none p-0 w-full h-full flex flex-col items-center justify-center relative">
              <button
                className="absolute top-4 right-4 z-[1100] bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ opacity: 0.95 }}
                onClick={() => {
                  const videos = document.querySelectorAll('video');
                  videos.forEach(video => {
                    if (video.srcObject) {
                      const stream = video.srcObject as MediaStream;
                      stream.getTracks().forEach(track => track.stop());
                      video.srcObject = null;
                    }
                  });
                  setShowScanner(false);
                } }
                aria-label="Cerrar escáner"
              >
                ×
              </button>

              <Scanner
                onDetected={(code: string) => {
                  const prod = productos.find(p => String(p.id_producto) === String(code));

                  // detener cámara
                  const videos = document.querySelectorAll('video');
                  videos.forEach(video => {
                    if (video.srcObject) {
                      const stream = video.srcObject as MediaStream;
                      stream.getTracks().forEach(track => track.stop());
                      video.srcObject = null;
                    }
                  });

                  setShowScanner(false);
                  setProductoSeleccionado(prod || null);
                } }
                fullscreen />

              {productoSeleccionado && (
                <div className="w-full mt-4 flex flex-col items-center">
                  <div className="font-bold text-primary mb-1">
                    {productoSeleccionado.productos_descripcion}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    Código: {productoSeleccionado.id_producto}
                  </div>

                  {(() => {
                    const foto = obtenerFotoProducto(productoSeleccionado.id_producto);
                    if (foto) {
                      return (
                        <img
                          src={foto}
                          alt="foto producto"
                          className="w-24 h-24 object-cover rounded border mb-2" />
                      );
                    } else {
                      return (
                        <div className="flex flex-col items-center mb-2">
                          <span className="text-xs text-gray-400 mb-1">
                            No hay foto asociada.
                          </span>
                          <button
                            className="bg-primary text-white px-3 py-1 rounded text-xs font-semibold hover:bg-primary-dark"
                            onClick={() => {
                              setProductoParaFoto(productoSeleccionado.id_producto);
                              if (fileInputRef.current)
                                fileInputRef.current.value = '';
                              fileInputRef.current?.click();
                            } }
                          >
                            Tomar o subir foto
                          </button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CAPTURA DE FOTO DE TICKET */}
        {showPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-4 max-w-xs w-full flex flex-col items-center">
              <PhotoCapture
                autoStart
                onCapture={async (dataUrl) => {
                  agregarAGaleria({
                    tipo: 'ticket',
                    dataUrl,
                    nombre: 'Ticket sin nombre',
                  });
                  setShowPhoto(false);
                  setTab('galeria');
                } } />
              <button
                className="mt-4 w-full rounded py-2 font-semibold bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setShowPhoto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

          </>
        )}

  {/* SECCIÓN DE PRODUCTOS */}
  {renderProductsSection()}

        {/* MAPA Y PRECIOS - COMÚN A TODOS LOS TABS */}
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
                  Precios de{' '}
                  <span className="underline">{productoSeleccionado.productos_descripcion}</span>{' '}
                  en sucursales:
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
              onClick={e => {
                e.stopPropagation();
                setShowPhoto(true);
              } }
            >
              Tomar foto de ticket o producto
            </button>
            <span className="text-xs text-gray-400">
              Puedes tomar una foto de un ticket o producto para guardarla localmente.
            </span>
          </div>
        </section>

        {tab === 'galeria' && <GaleriaView />}
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;

// ==========================================================
// 🔹 COMPONENTE INTERNO: GALERÍA LOCAL
// ==========================================================
function GaleriaView() {
  const [items, setItems] = useState<GaleriaItem[]>(() => obtenerGaleria());
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  const refresh = () => setItems(obtenerGaleria());
  const handleDelete = (id: string) => {
    const filtered = items.filter(i => i.id !== id);
    localStorage.setItem('galeria', JSON.stringify(filtered));
    refresh();
  };

  const startEdit = (item: GaleriaItem) => {
    setEditingNameId(item.id);
    setEditingNameValue(item.nombre || '');
  };

  const saveEdit = () => {
    const all = obtenerGaleria();
    const idx = all.findIndex(i => i.id === editingNameId);
    if (idx >= 0) {
      all[idx].nombre = editingNameValue;
      localStorage.setItem('galeria', JSON.stringify(all));
      setEditingNameId(null);
      setEditingNameValue('');
      refresh();
    }
  };

  if (items.length === 0)
    return <div className="text-gray-400 text-center">No hay fotos en la galería.</div>;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.id} className="bg-gray-100 rounded p-2 flex flex-col items-center">
          <img
            src={item.dataUrl}
            alt={item.nombre || item.tipo}
            className="w-full h-24 object-cover rounded mb-2"
          />
          <div className="text-xs text-gray-600 w-full truncate">
            {item.productoId ? `Producto ${item.productoId}` : item.tipo}
          </div>

          {editingNameId === item.id ? (
            <div className="w-full flex gap-1 mt-1">
              <input
                className="flex-1 text-sm p-1 rounded border border-gray-300"
                value={editingNameValue}
                onChange={e => setEditingNameValue(e.target.value)}
              />
              <button
                className="px-2 bg-green-600 text-white rounded text-sm"
                onClick={saveEdit}
              >
                OK
              </button>
            </div>
          ) : (
            <div className="w-full flex gap-1 mt-1">
              <button
                className="flex-1 text-xs bg-primary text-white rounded py-1"
                onClick={() => startEdit(item)}
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
