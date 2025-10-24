import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Sucursal } from "../types/Sucursal";
import L from "leaflet";

/* =======================================================
   🎯 ICONOS PERSONALIZADOS (SVG embebidos corregidos)
   ======================================================= */
const createDivIcon = (color: string, size = 25) =>
  L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; transform: translate(-50%, -100%);">
        <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size * 1.64}' viewBox='0 0 25 41' fill='none'>
          <path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='${color}'/>
        </svg>
      </div>
    `,
    iconSize: [size, size * 1.64],
    iconAnchor: [size / 2, size * 1.64],
  });

const userIcon = createDivIcon("#377dff", 26);
const shopIcon = createDivIcon("#ff8800", 25);
const nearIcon = createDivIcon("#20c997", 25);
const osmIcon = createDivIcon("#f54291", 25);

/* =======================================================
   🗺️ INTERFAZ
   ======================================================= */
interface MapViewProps {
  sucursales: Sucursal[];
  userLocation?: { lat: number; lng: number };
}

/* =======================================================
   🧭 COMPONENTE PRINCIPAL
   ======================================================= */
const MapView: React.FC<MapViewProps> = ({ sucursales, userLocation }) => {
  const [center, setCenter] = React.useState<{ lat: number; lng: number } | null>(
    userLocation || null
  );
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = React.useState(false);
  const [radiusKm, setRadiusKm] = React.useState<number>(3);
  const [osmStores, setOsmStores] = React.useState<any[]>([]);

  /* =======================================================
     📍 FUNCIÓN DE GEOLOCALIZACIÓN
     ======================================================= */
  const pedirUbicacion = async () => {
    setLoadingGeo(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu dispositivo no soporta geolocalización");
      setLoadingGeo(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setLoadingGeo(false);
      },
      (err) => {
        console.warn("Error GPS:", err);
        setGeoError("No se pudo obtener tu ubicación (verifica permisos de GPS)");
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (userLocation && (center?.lat !== userLocation.lat || center?.lng !== userLocation.lng)) {
      setCenter(userLocation);
    } else if (!userLocation && !center) {
      pedirUbicacion();
    }
  }, [userLocation]);

  /* =======================================================
     📏 FUNCIÓN DISTANCIA ENTRE 2 PUNTOS
     ======================================================= */
  const distanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /* =======================================================
     🧮 SUCURSALES CON DISTANCIA Y FILTRADAS
     ======================================================= */
  const sucursalesFiltradas = React.useMemo(() => {
    return sucursales.filter(
      (s) =>
        s.sucursales_tipo?.toLowerCase().includes("super") ||
        s.sucursales_nombre?.toLowerCase().includes("super") ||
        s.sucursales_tipo?.toLowerCase().includes("hiper")
    );
  }, [sucursales]);

  const sucursalesConDistancia = React.useMemo(() => {
    if (!center) return [] as Array<any>;
    return sucursalesFiltradas
      .map((s) => ({
        suc: s,
        distancia: distanciaKm(center.lat, center.lng, s.sucursales_latitud, s.sucursales_longitud),
      }))
      .sort((a, b) => a.distancia - b.distancia);
  }, [sucursalesFiltradas, center]);

  const top5 = sucursalesConDistancia.slice(0, 5);

  /* =======================================================
     🌍 INTEGRACIÓN OSM (Overpass API)
     ======================================================= */
  useEffect(() => {
    if (!center) return;

    const fetchOSM = async () => {
      try {
        const query = `
          [out:json][timeout:25];
          (
            node["shop"="supermarket"](around:${radiusKm * 1000},${center.lat},${center.lng});
            node["shop"="convenience"](around:${radiusKm * 1000},${center.lat},${center.lng});
            node["shop"="mall"](around:${radiusKm * 1000},${center.lat},${center.lng});
          );
          out body;
        `;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
        });
        const data = await res.json();
        if (data?.elements) {
          setOsmStores(data.elements);
          // guardar automáticamente en tu backend (opcional)
          data.elements.forEach((store: any) => {
            const nombre = store.tags?.name || "Comercio sin nombre";
            const tipo = store.tags?.shop || "supermarket";
            const lat = store.lat;
            const lng = store.lon;
            fetch("https://masbarato.saltacoders.com/api.php?action=saveOSMStore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre, lat, lng, tipo }),
            }).catch(() => {});
          });
        }
      } catch (err) {
        console.error("Error cargando OSM:", err);
      }
    };

    fetchOSM();
  }, [center, radiusKm]);

  /* =======================================================
     🌀 SYNC CENTER (Centrar animado)
     ======================================================= */
  const SyncCenter: React.FC<{ center: { lat: number; lng: number } | null }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center) map.flyTo([center.lat, center.lng], 15, { animate: true });
    }, [center]);
    return null;
  };

  /* =======================================================
     🧩 CONTROL FLOANTE (📍 botón mapa)
     ======================================================= */
  const MapControls: React.FC<{ onLocate: () => void }> = ({ onLocate }) => {
    const map = useMap();
    useEffect(() => {
      const CustomControl = L.Control.extend({
        onAdd: function () {
          const container = L.DomUtil.create("div", "leaflet-bar custom-location-control");
          container.innerHTML = "📍";
          Object.assign(container.style, {
            background: "white",
            padding: "6px",
            cursor: "pointer",
            borderRadius: "4px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          });
          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.on(container, "click", onLocate);
          return container;
        },
      });
      const control = new CustomControl({ position: "bottomright" });
      control.addTo(map);
      return () => {
        control.remove();
      };
    }, [map, onLocate]);
    return null;
  };

  /* =======================================================
     🔵 ICONO ANIMADO (PULSO) DENTRO DEL MAPA
     ======================================================= */
  const createPulseIcon = () =>
    L.divIcon({
      className: "pulse-icon",
      html: `
        <div class="pulse-marker">
          <div class="pulse-ring"></div>
          <div class="pulse-dot"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

  /* =======================================================
     🗺️ RENDER DEL MAPA
     ======================================================= */
  return (
    <div className="w-full h-64 rounded overflow-hidden relative" style={{ zIndex: 0 }}>
      {geoError && (
        <div className="absolute z-20 left-0 right-0 top-0 bg-red-100 text-red-700 text-xs p-2 text-center">
          {geoError}
        </div>
      )}
      {loadingGeo && (
        <div className="absolute z-20 left-0 right-0 top-0 bg-blue-100 text-blue-700 text-xs p-2 text-center">
          Buscando ubicación...
        </div>
      )}

      <MapContainer
        center={center || { lat: -24.7859, lng: -65.4117 }}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SyncCenter center={center} />
        <MapControls onLocate={pedirUbicacion} />

        {/* 📍 MARCADOR USUARIO */}
        {center && (
          <>
            <Marker position={center} icon={createPulseIcon()} zIndexOffset={1500}>
              <Popup>📍 Estás aquí</Popup>
            </Marker>
            <Circle
              center={center}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#377dff", fillColor: "#377dff", fillOpacity: 0.15 }}
            />
          </>
        )}

        {/* 🏪 SUCURSALES LOCALES */}
        {sucursalesConDistancia.map(({ suc, distancia }) => (
          <Marker
            key={`suc-${suc.id_sucursal}`}
            position={{ lat: suc.sucursales_latitud, lng: suc.sucursales_longitud }}
            icon={distancia <= radiusKm ? nearIcon : shopIcon}
          >
            <Popup>
              <strong>{suc.sucursales_nombre}</strong>
              <br />
              {suc.sucursales_tipo && <span>{suc.sucursales_tipo}</span>}
              <br />
              {suc.sucursales_calle} {suc.sucursales_numero}
              <br />
              <span className="text-xs text-gray-500">{distancia.toFixed(2)} km</span>
            </Popup>
          </Marker>
        ))}

        {/* 🗺️ SUPERMERCADOS DE OPENSTREETMAP */}
        {osmStores.map((store, idx) => (
          <Marker
            key={`osm-${idx}`}
            position={{ lat: store.lat, lng: store.lon }}
            icon={osmIcon}
          >
            <Popup>
              🏪 <strong>{store.tags?.name || "Supermercado sin nombre"}</strong>
              <br />
              {store.tags?.brand && <span>Marca: {store.tags.brand}</span>}
              <br />
              <span className="text-xs text-gray-500">Fuente: OpenStreetMap</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* 🎛️ RADIO */}
      <div className="absolute top-2 right-2 bg-white rounded shadow p-2 text-xs">
        <label>Radio (km): </label>
        <select
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="text-xs"
        >
          <option value={1}>1</option>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </div>

      {/* 📍 BOTÓN EXTERIOR */}
      <div className="w-full flex justify-center mt-2">
        <button
          className="bg-primary text-white rounded-full shadow-lg px-4 py-2 text-sm font-semibold"
          onClick={pedirUbicacion}
        >
          📍 Mi ubicación
        </button>
      </div>

      {/* 🏪 LISTA SUCURSALES */}
      <div className="mt-3">
        <h3 className="font-semibold text-sm mb-2">Sucursales y supermercados cercanos</h3>
        {top5.length === 0 ? (
          <div className="text-xs text-gray-500">
            No hay sucursales cerca (o aún no se obtuvo tu ubicación).
          </div>
        ) : (
          <ul className="space-y-2">
            {top5.map((item) => (
              <li
                key={item.suc.id_sucursal}
                className="flex items-center justify-between bg-white p-2 rounded shadow-sm"
              >
                <div>
                  <div className="font-semibold text-sm">{item.suc.sucursales_nombre}</div>
                  <div className="text-xs text-gray-500">
                    {item.suc.sucursales_calle} {item.suc.sucursales_numero} —{" "}
                    {item.distancia.toFixed(2)} km
                  </div>
                </div>
                <button
                  className="bg-primary text-white text-xs px-2 py-1 rounded"
                  onClick={() =>
                    setCenter({
                      lat: item.suc.sucursales_latitud,
                      lng: item.suc.sucursales_longitud,
                    })
                  }
                >
                  Centrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MapView;

/* =======================================================
   🔵 ESTILOS PULSANTE DENTRO DEL MAPA (CSS INLINE)
   ======================================================= */
const css = `
.pulse-marker {
  position: relative;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
}
.pulse-ring {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(55,125,255,0.4);
  animation: pulse-ring 1.8s infinite;
}
.pulse-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 5px;
  left: 5px;
  border-radius: 50%;
  background: #377dff;
}
@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.7; }
  70% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(0.8); opacity: 0.7; }
}
`;
const style = document.createElement("style");
style.innerHTML = css;
document.head.appendChild(style);
