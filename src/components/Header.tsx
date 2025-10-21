import React from "react";

interface HeaderProps {
  onScanClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onScanClick }) => (
  <header className="flex items-center justify-between p-4 bg-primary text-white shadow-md">
    <div className="flex items-center gap-2">
      <img src="/assets/logos/logo.svg" alt="PreciosAR" className="h-8 w-8" />
      <span className="font-bold text-lg">PreciosAR</span>
    </div>
    {onScanClick && (
      <button
        onClick={onScanClick}
        className="bg-white text-primary rounded-full px-4 py-2 font-semibold shadow hover:bg-gray-100"
      >
        Escanear
      </button>
    )}
  </header>
);

export default Header;

