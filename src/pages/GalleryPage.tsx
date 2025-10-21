import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

// TODO: conectar con imágenes reales de productos
const imagenes: { id_producto: string; url: string }[] = [
  { id_producto: "1", url: "/assets/placeholders/product.png" }
];

const GalleryPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
    <Header />
    <main className="flex-1 p-4 flex flex-col gap-4">
      <h1 className="font-bold text-xl mb-2">Galería de fotos</h1>
      <div className="grid grid-cols-2 gap-2">
        {imagenes.length === 0 ? (
          <div className="text-gray-400">No hay imágenes</div>
        ) : (
          imagenes.map((img, i) => (
            <div key={i} className="flex flex-col items-center gap-1 bg-gray-100 rounded p-2">
              <img src={img.url} alt="Foto producto" className="h-24 w-24 object-contain rounded" />
              <button className="text-xs text-red-600 mt-1">Eliminar</button>
            </div>
          ))
        )}
      </div>
    </main>
    <Footer />
  </div>
);

export default GalleryPage;
