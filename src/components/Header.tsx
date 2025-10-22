import React from "react";

interface HeaderProps {
  onScanClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onScanClick }) => (
  <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md">
    <div className="flex items-center gap-2">
      <img src="/assets/logos/logo.svg" alt="+Barato" className="h-8 w-8" />
      <span className="font-bold text-lg">+Barato</span>
    </div>
    {onScanClick && (
      <button
        onClick={onScanClick}
        className="bg-primary text-white rounded-full px-4 py-2 font-semibold shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Escanear
      </button>
    )}
  </header>
);

export default Header;


