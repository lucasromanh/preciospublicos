// Servicio centralizado para consumir la API PHP de masbarato.saltacoders.com
// Todos los métodos devuelven promesas y lanzan error si la respuesta no es ok

const API_URL = "https://masbarato.saltacoders.com/api.php";

export async function getProductByEAN(ean: string) {
  const res = await fetch(`${API_URL}?action=getProductByEAN&ean=${encodeURIComponent(ean)}`);
  if (!res.ok) throw new Error("Error al buscar producto por EAN");
  return res.json();
}

export async function getNearbyStores(lat: number, lng: number) {
  const res = await fetch(`${API_URL}?action=getNearbyStores&lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Error al buscar sucursales cercanas");
  return res.json();
}

export async function getComparaciones(q?: string) {
  const url = q
    ? `${API_URL}?action=getComparaciones&q=${encodeURIComponent(q)}`
    : `${API_URL}?action=getComparaciones`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al comparar precios");
  return res.json();
}

export async function updateSEPA() {
  const res = await fetch(`${API_URL}?action=updateSEPA`);
  if (!res.ok) throw new Error("Error al forzar importación SEPA");
  return res.json();
}

export async function uploadImage(id_producto: string, file: File) {
  const formData = new FormData();
  formData.append("id_producto", id_producto);
  formData.append("file", file);
  const res = await fetch(`${API_URL}?action=uploadImage`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error al subir imagen");
  return res.json();
}
