# Precios Claros Argentina — Frontend (PWA)

Aplicación Progressive Web App (PWA) construida con React + TypeScript + Vite + TailwindCSS para consultar y comparar precios del Sistema SEPA (Precios Claros) — interfaz frontend modular lista para integrarse con un backend.

## Resumen

- Mobile-first, instalable (manifest + service worker).
- Escaneo de códigos de barras con `@zxing/browser`.
- Captura de fotos y almacenamiento local (IndexedDB via `idb`).
- Geolocalización y mapa con Leaflet (`react-leaflet`).
- Carga y parseo de CSVs SEPA (servicio `sepaParser.ts`) — backend no incluido.

## Requisitos

- Node.js 18+ recomendado
- npm

## Instalación (local)

```bash
# instalar dependencias
npm install

# inicializar Tailwind (si es necesario)
npx tailwindcss init -p
```

## Desarrollo

```bash
# iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:5173 (Vite puede elegir un puerto alternativo si 5173 está en uso).

Si ves la página en blanco:

- Asegúrate de que el servidor esté corriendo.
- Haz hard refresh (Ctrl+Shift+R).
- Revisa la consola de DevTools para errores de recursos.

## Build / Previsualizar

```bash
npm run build
npm run preview
```

## Estructura principal

- `public/` — `manifest.json`, `sw.js`, `icons/`, `index.html`
- `src/`
  - `assets/` — logos y placeholders
  - `types/` — definiciones `Producto`, `Sucursal`, `Comercio`
  - `components/` — componentes UI (Scanner, PhotoCapture, MapView, etc.)
  - `pages/` — `HomePage`, `ProductPage`, `ComparePage`, `GalleryPage`, `AboutPage`
  - `services/` — `sepaParser`, `cacheService`, `eanService`, `geoService`, `comparisonService`, `offlineService`
  - `hooks/` — `useCamera`, `useGeoLocation`, `useCSVData`, `useOfflineMode`
  - `context/` — `AppContext`, `ProductContext`
  - `App.tsx`, `router.tsx`, `main.tsx`, `tailwind.css`

## Notas de PWA y Desarrollo

- Durante desarrollo el Service Worker se registra _solo en producción_ para evitar problemas de cacheo durante `npm run dev`.
- `sw.js` está diseñado para ser tolerante en dev (ignora archivos faltantes).
- Manifest configurado para instalación en Android/iOS.

## Dependencias clave

- react, react-dom, react-router-dom
- @zxing/browser (escaneo de barras)
- idb (IndexedDB)
- leaflet, react-leaflet (mapa)
- tailwindcss, autoprefixer, postcss

## Cómo probar el Scanner y la cámara

- Abre la app en un dispositivo móvil o en Chrome/Edge con permisos de cámara.
- Usa la función Escanear en la Home para abrir el componente `Scanner`.

## Contribuir

1. Haz fork del repo
2. Crea una rama: `git checkout -b feat/mi-cambio`
3. Haz commit y push
4. Abre un Pull Request

## Licencia

Proyecto abierto bajo licencia MIT (por definir exactamente según tus requerimientos).

---
