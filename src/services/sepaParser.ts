// Servicio para parsear archivos CSV del sistema SEPA
export function parseProducto(row: string[]): any {
  // TODO: mapear columnas reales según Anexo SEPA
  return {
    id_producto: row[0],
    productos_ean: Number(row[1]),
    productos_descripcion: row[2],
    productos_marca: row[3],
    productos_cantidad_presentacion: row[4],
    productos_unidad_medida_presentacion: row[5],
    productos_precio_lista: Number(row[6]),
    productos_precio_referencia: Number(row[7]),
    productos_unidad_medida_referencia: row[8],
    productos_categoria: row[9],
    productos_leyenda_promo1: row[10],
    productos_leyenda_promo2: row[11],
  };
}

// Similar para sucursales y comercios
