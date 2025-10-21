import React from "react";
import { Producto } from "../types/Producto";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PhotoCapture from "../components/PhotoCapture";

// TODO: obtener producto real por id
const producto: Producto = {
  id_producto: "1",
  productos_ean: 1,
  productos_descripcion: "Ejemplo de producto",
  productos_marca: "Marca",
  productos_cantidad_presentacion: "1",
  productos_unidad_medida_presentacion: "unidad",
  productos_precio_lista: 100,
  productos_precio_referencia: 100,
  productos_unidad_medida_referencia: "unidad",
  productos_categoria: "Almacén",
  productos_leyenda_promo1: "Promo",
  productos_leyenda_promo2: undefined,
  imagen_local: undefined
};

const ProductPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <img src={producto.imagen_local || "/assets/placeholders/product.png"} alt={producto.productos_descripcion} className="h-32 w-32 object-contain rounded bg-gray-100" />
          <h1 className="font-bold text-xl">{producto.productos_descripcion}</h1>
          <p className="text-gray-500">{producto.productos_marca}</p>
          <p className="text-gray-400 text-sm">{producto.productos_categoria}</p>
          <span className="text-primary font-bold text-2xl">${producto.productos_precio_lista.toFixed(2)}</span>
          {producto.productos_leyenda_promo1 && <span className="text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-1">{producto.productos_leyenda_promo1}</span>}
        </div>
        <div className="flex gap-2 mt-4">
          <button className="bg-primary text-white px-4 py-2 rounded shadow">Comparar precios</button>
          <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded shadow">Ver galería</button>
        </div>
        <div className="mt-4">
          <PhotoCapture onCapture={(dataUrl) => { /* TODO: guardar imagen */ }} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductPage;
