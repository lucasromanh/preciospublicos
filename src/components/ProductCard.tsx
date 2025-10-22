import React from "react";
import { Producto } from "../types/Producto";

interface ProductCardProps {
  producto: Producto;
  onClick?: () => void;
  className?: string;
  fotoUrl?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ producto, onClick, className = "", fotoUrl }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded shadow p-3 flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-primary ${className}`}
    style={{ minHeight: 120, maxHeight: 120, height: 120 }}
    onClick={onClick}
  >
    <div className="flex items-center h-full">
      <img
        src={fotoUrl || producto.imagen_local || "/assets/placeholders/product.png"}
        alt={producto.productos_descripcion}
        className="h-14 w-14 object-contain rounded bg-gray-100 mr-2 flex-shrink-0"
      />
      <div className="flex flex-col justify-between flex-1 min-w-0 h-full">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-lg truncate max-w-[6rem]" title={producto.productos_precio_lista.toFixed(2)}>
            ${producto.productos_precio_lista.toFixed(2).length > 10 ? producto.productos_precio_lista.toFixed(2).slice(0, 10) + '…' : producto.productos_precio_lista.toFixed(2)}
          </span>
          {producto.productos_leyenda_promo1 && (
            <span className="text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-1 truncate max-w-[5rem]" title={producto.productos_leyenda_promo1}>{producto.productos_leyenda_promo1}</span>
          )}
        </div>
        <div className="mt-1">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}} title={producto.productos_descripcion}>{producto.productos_descripcion}</h3>
          <p className="text-xs text-gray-500 line-clamp-1 leading-tight" style={{display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}} title={producto.productos_marca}>{producto.productos_marca}</p>
        </div>
      </div>
    </div>
  </div>
);

export default ProductCard;
