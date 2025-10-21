import React, { createContext, useContext, useState } from "react";
import { Producto } from "../types/Producto";

interface ProductContextProps {
  productos: Producto[];
  setProductos: (productos: Producto[]) => void;
  imagenes: Record<string, string>; // id_producto -> dataUrl
  setImagen: (id: string, dataUrl: string) => void;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [imagenes, setImagenes] = useState<Record<string, string>>({});

  const setImagen = (id: string, dataUrl: string) => {
    setImagenes((prev) => ({ ...prev, [id]: dataUrl }));
  };

  return (
    <ProductContext.Provider value={{ productos, setProductos, imagenes, setImagen }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProductContext = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProductContext debe usarse dentro de ProductProvider");
  return ctx;
};
