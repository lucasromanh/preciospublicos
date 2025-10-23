
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
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
  className: '',
});
// Icono naranja para sucursales
const svgShop = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41' fill='none'>
<path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='%23ff8800'/>
</svg>`);
const shopIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${svgShop}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
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

  const pedirUbicacion = () => {
    console.log('pedirUbicacion llamado desde MapView');
    setLoadingGeo(true);
    setGeoError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoadingGeo(false);
        },
        err => {
          setGeoError("No se pudo obtener tu ubicación. ¿Diste permisos?");
          setLoadingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      setGeoError("El navegador no soporta geolocalización");
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
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {center && (
            <Marker position={center} icon={userIcon}>
              <Popup>Tu ubicación</Popup>
            </Marker>
          )}
          {sucursales.map((suc) => (
            <Marker key={suc.id_sucursal} position={{ lat: suc.sucursales_latitud, lng: suc.sucursales_longitud }} icon={shopIcon}>
              <Popup>
                <span className="font-bold">{suc.sucursales_nombre}</span><br />
                {suc.sucursales_tipo && <span className="text-xs text-gray-500">{suc.sucursales_tipo}</span>}<br />
                {suc.sucursales_calle} {suc.sucursales_numero}
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
    </div>
    );
};

export default MapView;

