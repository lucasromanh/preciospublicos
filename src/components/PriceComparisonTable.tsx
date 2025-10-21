import React from "react";
import { Sucursal } from "../types/Sucursal";

export interface PriceRow {
  supermercado: string;
  localidad: string;
  precio: number;
  distancia: number;
  ultimaActualizacion: string;
}

interface PriceComparisonTableProps {
  rows: PriceRow[];
  orderBy?: "precio" | "distancia";
  onOrderChange?: (order: "precio" | "distancia") => void;
}

const PriceComparisonTable: React.FC<PriceComparisonTableProps> = ({ rows, orderBy, onOrderChange }) => {
  if (!rows.length) return <div className="text-center text-gray-400">No hay datos para comparar</div>;
  const precios = rows.map(r => r.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="p-2 cursor-pointer" onClick={() => onOrderChange?.("precio")}>Supermercado</th>
            <th className="p-2">Localidad</th>
            <th className="p-2 cursor-pointer" onClick={() => onOrderChange?.("precio")}>Precio</th>
            <th className="p-2 cursor-pointer" onClick={() => onOrderChange?.("distancia")}>Distancia</th>
            <th className="p-2">Actualización</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="text-center border-b last:border-0">
              <td className="p-2 font-semibold">{row.supermercado}</td>
              <td className="p-2">{row.localidad}</td>
              <td className={`p-2 font-bold ${row.precio === min ? "text-green-600" : row.precio === max ? "text-red-600" : ""}`}>${row.precio.toFixed(2)}</td>
              <td className="p-2">{row.distancia.toFixed(1)} km</td>
              <td className="p-2 text-xs">{row.ultimaActualizacion}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-gray-500">
        <span>Promedio: ${ (precios.reduce((a, b) => a + b, 0) / precios.length).toFixed(2) }</span>
      </div>
    </div>
  );
};

export default PriceComparisonTable;
