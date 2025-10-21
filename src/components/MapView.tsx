import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { Sucursal } from "../types/Sucursal";

interface MapViewProps {
  sucursales: Sucursal[];
  userLocation?: { lat: number; lng: number };
}

const MapView: React.FC<MapViewProps> = ({ sucursales, userLocation }) => {
  const center = userLocation || { lat: -34.6037, lng: -58.3816 }; // CABA por defecto
  return (
    <div className="w-full h-48 rounded overflow-hidden">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <Marker position={center}>
            <Popup>Tu ubicación</Popup>
          </Marker>
        )}
        {sucursales.map((suc) => (
          <Marker key={suc.id_sucursal} position={{ lat: suc.sucursales_latitud, lng: suc.sucursales_longitud }}>
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

