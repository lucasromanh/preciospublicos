import React, { useEffect, useState } from "react";

// SVG simple de "instalar app"
const installIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16V4M12 16l-4-4m4 4l4-4" stroke="#377dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="4" y="18" width="16" height="2" rx="1" fill="#377dff"/>
  </svg>
);

// Extiende el tipo Navigator para incluir 'standalone'
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as NavigatorStandalone).standalone === true;
};

const InstallAppBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Leer preferencia de ocultar/minimizar
    const oculto = localStorage.getItem('ocultarInstallBanner');
    const mini = localStorage.getItem('minimizarInstallBanner');
    if (oculto === '1') return; // No mostrar nunca más
    if (!isStandalone() && mini !== '1') {
      setShow(true);
    }
    if (mini === '1') setMinimized(true);
    // Detectar nueva versión del SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.onupdatefound = () => {
            setUpdateAvailable(true);
          };
        }
      });
    }
    // Detectar evento de instalación
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else {
      alert(
        'Para instalar la app, abre el menú de tu navegador y elige "Agregar a la pantalla de inicio".\n\nEn Chrome: menú ⋮ > Agregar a pantalla de inicio.\nEn Safari: menú compartir > Agregar a pantalla de inicio.'
      );
    }
  };

  if ((!show && !updateAvailable) || localStorage.getItem('ocultarInstallBanner') === '1') return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-primary rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-in">
      {installIcon}
      {!minimized && (
        <div className="flex flex-col text-sm">
          {!isStandalone() && (
            <>
              <span className="font-semibold text-primary">¿Querés instalar la app?</span>
              <span>Agregala a tu inicio para usarla sin conexión y más rápido.</span>
              <button
                className="mt-1 bg-primary text-white rounded px-3 py-1 text-xs font-semibold hover:bg-primary-dark"
                onClick={handleInstall}
              >
                Cómo instalar
              </button>
            </>
          )}
          {updateAvailable && (
            <>
              <span className="font-semibold text-primary">¡Nueva versión disponible!</span>
              <button
                className="mt-1 bg-primary text-white rounded px-3 py-1 text-xs font-semibold hover:bg-primary-dark"
                onClick={() => window.location.reload()}
              >
                Actualizar ahora
              </button>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1 ml-2">
        <button className="text-gray-400 hover:text-primary text-lg" onClick={() => {
          setShow(false);
          localStorage.setItem('ocultarInstallBanner', '1');
        }} title="No mostrar más">✕</button>
        {!minimized && (
          <button className="text-gray-400 hover:text-primary text-lg" onClick={() => {
            setMinimized(true);
            localStorage.setItem('minimizarInstallBanner', '1');
          }} title="Minimizar">—</button>
        )}
        {minimized && (
          <button className="text-gray-400 hover:text-primary text-lg" onClick={() => {
            setMinimized(false);
            localStorage.removeItem('minimizarInstallBanner');
          }} title="Mostrar">▣</button>
        )}
      </div>
    </div>
  );
};

export default InstallAppBanner;
