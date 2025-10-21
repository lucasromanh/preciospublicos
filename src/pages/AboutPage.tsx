import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const AboutPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
    <Header />
    <main className="flex-1 p-4 flex flex-col gap-4">
      <h1 className="font-bold text-xl mb-2">Sobre Precios Claros</h1>
      <p>
        Esta aplicación utiliza datos abiertos del Sistema SEPA (Precios Claros) para consultar y comparar precios reales de supermercados argentinos.
      </p>
      <p>
        <a href="https://www.argentina.gob.ar/preciosclaros" className="text-primary underline" target="_blank" rel="noopener noreferrer">Sitio oficial Precios Claros</a>
      </p>
      <p className="text-xs text-gray-500 mt-4">
        Licencia: CC-BY. Esta app es un desarrollo independiente y no oficial.
      </p>
    </main>
    <Footer />
  </div>
);

export default AboutPage;
