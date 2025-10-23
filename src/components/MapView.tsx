
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { Sucursal } from "../types/Sucursal";
import L from "leaflet";

// Icono azul para el usuario
const svgUser = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41' fill='none'>
<path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='%23377dff'/>
</svg>`);
const userIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${svgUser}`,
  iconSize: [36, 58],
  iconAnchor: [18, 58],
  popupAnchor: [0, -58],
  className: '',
});
// Icono naranja para sucursales
const svgShop = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41' fill='none'>
<path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='%23ff8800'/>
</svg>`);
const shopIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${svgShop}`,
  iconSize: [36, 58],
  iconAnchor: [18, 58],
  popupAnchor: [0, -58],
  className: '',
});

interface MapViewProps {
  sucursales: Sucursal[];
  userLocation?: { lat: number; lng: number };
}

const MapView: React.FC<MapViewProps> = ({ sucursales, userLocation }) => {
  const [center, setCenter] = React.useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = React.useState(false);
  const [radiusKm, setRadiusKm] = React.useState<number>(3);

  const pedirUbicacion = async () => {
    console.log('📍 Solicitando ubicación desde MapView...');
    setLoadingGeo(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Tu dispositivo no soporta geolocalización");
      setLoadingGeo(false);
      return;
    }

    try {
      // Comprobar permisos si está disponible
      if ((navigator as any).permissions) {
        try {
          const perm = await (navigator as any).permissions.query({ name: "geolocation" });
          console.log("Permiso actual de GPS:", perm.state);
        } catch (permErr) {
          console.warn('No se pudo consultar la API de permisos:', permErr);
        }
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log("✅ Coordenadas obtenidas:", coords);
          setCenter(coords);
          setLoadingGeo(false);
        },
        err => {
          console.warn("❌ Error GPS:", err);
          setGeoError("No se pudo obtener tu ubicación (verifica permisos de GPS)");
          setLoadingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (error) {
      console.error("Error solicitando ubicación:", error);
      setGeoError("Ocurrió un error al obtener la ubicación.");
      setLoadingGeo(false);
    }
  };

  // Siempre centrar el mapa en la ubicación real si está disponible
  useEffect(() => {
    if (userLocation && (center?.lat !== userLocation.lat || center?.lng !== userLocation.lng)) {
      setCenter(userLocation);
    } else if (!userLocation && !center) {
      pedirUbicacion();
    }
    // eslint-disable-next-line
  }, [userLocation]);

  // Componente interno para agregar control dentro del MapContainer (usa useMap)
  const MapControls: React.FC<{ onLocate: () => void }> = ({ onLocate }) => {
    const map = useMap();
    useEffect(() => {
      const CustomControl = L.Control.extend({
        onAdd: function () {
          const container = L.DomUtil.create('div', 'leaflet-bar custom-location-control');
          container.style.background = 'white';
          container.style.padding = '6px';
          container.style.cursor = 'pointer';
          container.style.borderRadius = '4px';
          container.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
          container.style.fontSize = '18px';
          container.title = 'Obtener mi ubicación';
          container.setAttribute('role', 'button');
          (container as HTMLElement).tabIndex = 0;
          container.innerHTML = '📍';
          // evitar que el mapa reciba los eventos
          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.disableScrollPropagation(container);
          L.DomEvent.on(container, 'click', function (e: any) {
            L.DomEvent.stopPropagation(e);
            console.log('control click');
            onLocate();
          });
          L.DomEvent.on(container, 'touchend', function (e: any) {
            L.DomEvent.stopPropagation(e);
            console.log('control touchend');
            onLocate();
          });
          // support keyboard
          L.DomEvent.on(container, 'keydown', function (e: any) {
            if (e.key === 'Enter' || e.key === ' ') {
              L.DomEvent.stopPropagation(e);
              console.log('control keydown');
              onLocate();
            }
          });
          return container;
        }
      });
      const control = new CustomControl({ position: 'bottomright' });
      control.addTo(map);
      return () => {
        control.remove();
      };
    }, [map, onLocate]);
    return null;
  };

  // Helper: distancia en km entre dos coordenadas (Haversine)
  const distanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calcular sucursales con distancia y ordenar por cercanía
  const sucursalesConDistancia = React.useMemo(() => {
    if (!center) return [] as Array<any>;
    return sucursales.map(s => ({
      suc: s,
      distancia: distanciaKm(center.lat, center.lng, s.sucursales_latitud, s.sucursales_longitud)
    })).sort((a,b) => a.distancia - b.distancia);
  }, [sucursales, center]);

  const cercanas = sucursalesConDistancia.filter(s => s.distancia <= radiusKm).slice(0, 10);
  const top5 = sucursalesConDistancia.slice(0,5);

  // Icono verde para sucursales cercanas
  const svgNear = encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41' fill='none'>
  <path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='%2320c997'/>
  </svg>`);
  const nearIcon = new L.Icon({
    iconUrl: `data:image/svg+xml,${svgNear}`,
    iconSize: [36, 58],
    iconAnchor: [18, 58],
    popupAnchor: [0, -58],
    className: '',
  });

  // Sincronizar el centro con el mapa haciendo panTo para evitar problemas de no refrescar
  const SyncCenter: React.FC<{ center: { lat: number; lng: number } | null }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center) map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
      // eslint-disable-next-line
    }, [center]);
    return null;
  };

    return (
    <div className="w-full h-56 rounded overflow-hidden relative" style={{ zIndex: 0 }}>
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
      <div className="relative w-full h-full">
        <MapContainer center={center || { lat: -34.6037, lng: -58.3816 }} zoom={13} style={{ height: "100%", width: "100%" }}>
          {/* Control dentro del mapa para forzar ubicación */}
          <MapControls onLocate={pedirUbicacion} />
          <SyncCenter center={center} />
          {/* Selector de radio (UI overlay) */}
          <div className="absolute top-2 right-2 z-40 bg-white rounded shadow p-2 text-xs">
            <label className="block text-gray-600 text-xs mb-1">Radio (km)</label>
            <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} className="text-sm">
              <option value={1}>1 km</option>
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
            </select>
          </div>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {center && (
            <Marker position={center} icon={userIcon} zIndexOffset={1000}>
              <Popup>Tu ubicación</Popup>
            </Marker>
          )}
          {sucursalesConDistancia.map(({ suc, distancia }: any) => (
            <Marker key={suc.id_sucursal} position={{ lat: suc.sucursales_latitud, lng: suc.sucursales_longitud }} icon={distancia <= radiusKm ? nearIcon : shopIcon} zIndexOffset={500}>
              <Popup>
                <span className="font-bold">{suc.sucursales_nombre}</span><br />
                {suc.sucursales_tipo && <span className="text-xs text-gray-500">{suc.sucursales_tipo}</span>}<br />
                {suc.sucursales_calle} {suc.sucursales_numero}
                <div className="text-xs text-gray-500 mt-1">{distancia.toFixed(2)} km</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="w-full flex justify-center mt-2">
        <button
          className="bg-primary text-white rounded-full shadow-lg px-4 py-2 text-sm font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={pedirUbicacion}
          title="Obtener mi ubicación"
          style={{minWidth: 44, minHeight: 44}}
        >
          📍 Mi ubicación
        </button>
      </div>
      {/* Lista top5 sucursales */}
      <div className="mt-3">
        <h3 className="font-semibold text-sm mb-2">Sucursales más cercanas</h3>
        {top5.length === 0 ? (
          <div className="text-xs text-gray-500">No hay sucursales cerca (o aún no se obtuvo tu ubicación).</div>
        ) : (
          <ul className="space-y-2">
            {top5.map((item: any) => (
              <li key={item.suc.id_sucursal} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                <div>
                  <div className="font-semibold text-sm">{item.suc.sucursales_nombre}</div>
                  <div className="text-xs text-gray-500">{item.suc.sucursales_calle} {item.suc.sucursales_numero} — {item.distancia.toFixed(2)} km</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="bg-primary text-white text-xs px-2 py-1 rounded" onClick={() => { setCenter({ lat: item.suc.sucursales_latitud, lng: item.suc.sucursales_longitud }); }}>
                    Centrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    );
};

export default MapView;

