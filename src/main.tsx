import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// @ts-ignore
import "./tailwind.css";

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
// Si el script corre, ocultar el fallback estático
try {
  const fallback = document.getElementById('static-fallback');
  if (fallback) fallback.style.display = 'none';
} catch (e) {}
