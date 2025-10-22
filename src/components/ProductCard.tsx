import React from "react";
import { Producto } from "../types/Producto";

interface ProductCardProps {
  producto: Producto;
  onClick?: () => void;
  className?: string;
  fotoUrl?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ producto, onClick, className = "", fotoUrl }) => (
  <div className={`bg-white dark:bg-gray-800 rounded shadow p-4 flex flex-col gap-2 cursor-pointer hover:ring-2 hover:ring-primary ${className}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <img
        src={fotoUrl || producto.imagen_local || "/assets/placeholders/product.png"}
        alt={producto.productos_descripcion}
        className="h-16 w-16 object-contain rounded bg-gray-100"
      />
      <div className="flex-1">
        <h3 className="font-semibold text-base">{producto.productos_descripcion}</h3>
        <p className="text-xs text-gray-500">{producto.productos_marca}</p>
        <p className="text-xs text-gray-400">{producto.productos_categoria}</p>
      </div>
    </div>
    <div className="flex justify-between items-center mt-2">
      <span className="text-primary font-bold text-lg">${producto.productos_precio_lista.toFixed(2)}</span>
      {producto.productos_leyenda_promo1 && (
        <span className="text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-1">{producto.productos_leyenda_promo1}</span>
      )}
    </div>
  </div>
);

export default ProductCard;
