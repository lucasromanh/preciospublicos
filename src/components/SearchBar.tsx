import React from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => (
  <div className="w-full flex items-center gap-2 p-2">
    <input
      type="text"
      className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "Buscar producto, marca o código..."}
      aria-label="Buscar"
    />
  </div>
);

export default SearchBar;
