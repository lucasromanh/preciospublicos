// ========================================
// 📸 Servicio de fotos (productos / tickets)
// ========================================

export type GaleriaItem = {
  id: string;
  tipo: "ticket" | "product";
  productoId?: string;
  nombre?: string;
  dataUrl: string;
  createdAt: string;
};

// -------------------------
// 💾 Guardar imagen local
// -------------------------
export async function guardarFotoProducto(id_producto: string, file: File) {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem("foto_" + id_producto, dataUrl);
      agregarAGaleria({
        tipo: "product",
        productoId: id_producto,
        dataUrl,
      });
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// -------------------------
// 🧠 Guardar desde base64
// -------------------------
export async function guardarFotoProductoDataUrl(
  id_producto: string,
  dataUrl: string
) {
  localStorage.setItem("foto_" + id_producto, dataUrl);
  agregarAGaleria({
    tipo: "product",
    productoId: id_producto,
    dataUrl,
  });
  return dataUrl;
}

// -------------------------
// 📤 Subir imagen al backend
// -------------------------
export async function subirFotoAlServidor(
  id_producto: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const formData = new FormData();
    formData.append("file", blob, "producto.jpg");
    formData.append("id_producto", id_producto);

    const response = await fetch(
      "https://masbarato.saltacoders.com/api.php?action=uploadImage",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();
    if (result.success && result.url) {
      guardarFotoProductoDataUrl(id_producto, result.url);
      return result.url;
    } else {
      console.warn("Error del backend al subir imagen:", result);
      return null;
    }
  } catch (err) {
    console.error("❌ Error al subir imagen:", err);
    return null;
  }
}

// -------------------------
// 🔍 Obtener foto guardada
// -------------------------
export function obtenerFotoProducto(id_producto: string): string | null {
  return localStorage.getItem("foto_" + id_producto);
}

// -------------------------
// 🖼️ Manejo de galería local
// -------------------------
export function agregarAGaleria(
  item: Omit<GaleriaItem, "id" | "createdAt">
): GaleriaItem | null {
  try {
    const prev =
      (JSON.parse(localStorage.getItem("galeria") || "[]") as GaleriaItem[]) ||
      [];

    // evitar duplicados por productoId y tipo
    const duplicado = prev.find(
      (i) =>
        i.productoId === item.productoId &&
        i.tipo === item.tipo &&
        i.dataUrl === item.dataUrl
    );
    if (duplicado) return duplicado;

    const nuevo: GaleriaItem = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      ...item,
    };

    prev.unshift(nuevo);
    localStorage.setItem("galeria", JSON.stringify(prev));
    return nuevo;
  } catch (e) {
    console.error("Error guardando en galería", e);
    return null;
  }
}

export function obtenerGaleria(): GaleriaItem[] {
  try {
    return JSON.parse(localStorage.getItem("galeria") || "[]") as GaleriaItem[];
  } catch {
    return [];
  }
}
