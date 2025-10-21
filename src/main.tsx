import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./tailwind.css";

// En desarrollo, desregistrar cualquier service worker previo
if (location.hostname === "localhost" && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach(r => r.unregister())).catch(()=>{});
}

try {
  console.log('Mounting PreciosAR app...');
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App mounted');
} catch (err) {
  console.error('Error mounting app', err);
}

// Ocultar fallback si el script corre
try {
  const fallback = document.getElementById('static-fallback');
  if (fallback) fallback.style.display = 'none';
} catch (e) {}
