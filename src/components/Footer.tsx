import React from "react";

const Footer: React.FC = () => (
  <footer className="w-full p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
    <span>
      © {new Date().getFullYear()} Precios Claros Argentina · Datos SEPA · Licencia CC-BY
    </span>
  </footer>
);

export default Footer;
