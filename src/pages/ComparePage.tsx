import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PriceComparisonTable, { PriceRow } from "../components/PriceComparisonTable";
import MapView from "../components/MapView";

const rows: PriceRow[] = [
  { supermercado: "Super Uno", localidad: "CABA", precio: 100, distancia: 2.1, ultimaActualizacion: "2025-10-21" },
  { supermercado: "Super Dos", localidad: "CABA", precio: 120, distancia: 3.5, ultimaActualizacion: "2025-10-21" },
  { supermercado: "Super Tres", localidad: "CABA", precio: 90, distancia: 1.2, ultimaActualizacion: "2025-10-21" }
];

const ComparePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-4 flex flex-col gap-4">
        <h1 className="font-bold text-xl mb-2">Comparar precios</h1>
        <PriceComparisonTable rows={rows} />
        <div className="mt-4">
          <MapView sucursales={[{ id_sucursal: 's1', sucursales_nombre: 'Super Uno', sucursales_tipo: 'Hiper', sucursales_calle: 'Av. Corrientes', sucursales_numero: '123', sucursales_latitud: -34.607, sucursales_longitud: -58.381, sucursales_localidad: 'CABA', sucursales_provincia: 'Ciudad Autónoma de Buenos Aires' }]} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ComparePage;
