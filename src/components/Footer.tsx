import React from "react";

const Footer: React.FC = () => (
  <footer className="w-full p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
    <span>
      © {new Date().getFullYear()} Precios Claros Argentina · Datos SEPA · Licencia CC-BY
    </span>
    <div className="mt-1">
      Desarrollado por <span className="font-semibold text-primary">Lucas Roman</span> &mdash; Software Developer, Salta Capital<br />
      <a href="mailto:lucas@saltacoders.com" className="underline hover:text-primary">lucas@saltacoders.com</a>
    </div>
  </footer>
);

export default Footer;
