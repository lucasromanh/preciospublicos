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
      {fotoUrl || producto.imagen_local ? (
        <img
          src={fotoUrl || producto.imagen_local}
          alt={producto.productos_descripcion}
          className="h-14 w-14 object-contain rounded bg-gray-100 mr-2 flex-shrink-0"
        />
      ) : (
        <div className="h-14 w-14 flex items-center justify-center rounded bg-gray-100 mr-2 flex-shrink-0 border border-dashed border-gray-300">
          <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
            <rect x="6" y="6" width="20" height="20" rx="4" fill="#e5e7eb" stroke="#a1a1aa" strokeWidth="2" />
            <path d="M16 10v8M12 14h8" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <div className="flex flex-col justify-between flex-1 min-w-0 h-full">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-lg truncate max-w-[6rem]" title={String(Number(producto.productos_precio_lista ?? 0).toFixed(2))}>
            {(() => {
              const precio = Number(producto.productos_precio_lista ?? 0);
              const precioStr = precio.toFixed(2);
              return `$${precioStr.length > 10 ? precioStr.slice(0, 10) + '…' : precioStr}`;
            })()}
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
