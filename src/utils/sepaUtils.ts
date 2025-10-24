// src/utils/sepaUtils.ts

// --- PARSER CSV SIMPLE PARA SEPA ---
export function parseSepaCSV<T>(csv: string, headers: string[]): T[] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj: any = {};
    headers.forEach((h, i) => {
      let v: any = values[i];
      if (v !== undefined && /^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      obj[h] = v;
    });
    return obj as T;
  });
}

// --- TIPOS ---
export type SepaProducto = {
  id_producto: string;
  productos_ean: number;
  productos_descripcion: string;
  productos_marca: string;
  productos_precio_lista: number;
  productos_precio_referencia: number;
  productos_unidad_medida_referencia: string;
};

export type SepaSucursal = {
  id_sucursal: string;
  sucursales_nombre: string;
  sucursales_tipo: string;
  sucursales_latitud: number;
  sucursales_longitud: number;
  sucursales_provincia: string;
  sucursales_localidad: string;
};

// --- UTILIDAD DE CARRITO ---
export function calcularTotalesCarritoSEPA(
  carrito: string[],
  productos: SepaProducto[],
  sucursales: SepaSucursal[],
  preciosPorSucursal: Record<string, Record<string, number>>
) {
  const totales: { sucursal: SepaSucursal; total: number; faltantes: number }[] = [];
  for (const suc of sucursales) {
    let total = 0;
    let faltantes = 0;
    for (const id of carrito) {
      const precio = preciosPorSucursal[suc.id_sucursal]?.[id];
      if (typeof precio === 'number') total += precio;
      else faltantes++;
    }
    totales.push({ sucursal: suc, total, faltantes });
  }
  return totales;
}
