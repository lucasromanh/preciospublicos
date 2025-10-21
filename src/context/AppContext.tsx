import React, { createContext, useContext, useState } from "react";

interface AppContextProps {
  offline: boolean;
  setOffline: (offline: boolean) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [offline, setOffline] = useState(false);
  return (
    <AppContext.Provider value={{ offline, setOffline }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext debe usarse dentro de AppProvider");
  return ctx;
};
