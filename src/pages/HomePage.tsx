import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import Scanner from "../components/Scanner";
import LoadingSpinner from "../components/LoadingSpinner";
import { Producto } from "../types/Producto";

const HomePage: React.FC = () => {
  console.log('HomePage render');
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  // Datos de ejemplo para desarrollo
  const productos: Producto[] = [
    {
      id_producto: 'p1',
      productos_ean: 1,
      productos_descripcion: 'Leche entera 1L',
      productos_marca: 'MarcaX',
      productos_cantidad_presentacion: '1',
      productos_unidad_medida_presentacion: 'L',
      productos_precio_lista: 212.5,
      productos_precio_referencia: 212.5,
      productos_unidad_medida_referencia: 'L',
      productos_categoria: 'Lácteos',
      productos_leyenda_promo1: '2x1',
    },
  ];

  console.log('productos sample:', productos);
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header onScanClick={() => setShowScanner(true)} />
      <main className="flex-1 p-4 flex flex-col gap-4">
        <SearchBar value={search} onChange={setSearch} />
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
            <div className="bg-white rounded shadow-lg p-4 max-w-xs w-full">
              <Scanner onDetected={(code) => { setShowScanner(false); /* TODO: buscar producto */ }} />
              <button className="mt-4 w-full bg-gray-200 rounded py-2" onClick={() => setShowScanner(false)}>Cerrar</button>
            </div>
          </div>
        )}
        <section>
          <h2 className="font-bold text-lg mb-2">Productos más consultados</h2>
          <div className="grid grid-cols-2 gap-2">
            {productos.length === 0 ? <LoadingSpinner /> : productos.map((p) => <ProductCard key={p.id_producto} producto={p} />)}
          </div>
        </section>
        <section>
          <h2 className="font-bold text-lg mb-2">Cerca de mí</h2>
          {/* TODO: mostrar productos cercanos */}
          <div className="text-gray-400">Próximamente</div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
