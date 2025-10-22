
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { Sucursal } from "../types/Sucursal";
import L from "leaflet";

// Icono SVG embebido (azul, similar al default de Leaflet)
const svgIcon = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41' fill='none'>
<path d='M12.5 0C5.6 0 0 5.6 0 12.5C0 23.1 12.5 41 12.5 41C12.5 41 25 23.1 25 12.5C25 5.6 19.4 0 12.5 0ZM12.5 17.5C9.5 17.5 7.1 15.1 7.1 12.1C7.1 9.1 9.5 6.7 12.5 6.7C15.5 6.7 17.9 9.1 17.9 12.1C17.9 15.1 15.5 17.5 12.5 17.5Z' fill='%23377dff'/>
</svg>`);
const customIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,${svgIcon}`,
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
  const center = userLocation || { lat: -34.6037, lng: -58.3816 }; // CABA por defecto
  useEffect(() => {
    // Esto asegura que los iconos se apliquen solo una vez
  }, []);
  return (
    <div className="w-full h-48 rounded overflow-hidden">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <Marker position={center} icon={customIcon}>
            <Popup>Tu ubicación</Popup>
          </Marker>
        )}
        {sucursales.map((suc) => (
          <Marker key={suc.id_sucursal} position={{ lat: suc.sucursales_latitud, lng: suc.sucursales_longitud }} icon={customIcon}>
            <Popup>
              {suc.sucursales_nombre}
              <br />
              {suc.sucursales_calle} {suc.sucursales_numero}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;

