export interface Producto {
  id_producto: string;
  productos_ean: 0 | 1;
  productos_descripcion: string;
  productos_marca: string;
  productos_cantidad_presentacion: string;
  productos_unidad_medida_presentacion: string;
  productos_precio_lista: number;
  productos_precio_referencia: number;
  productos_unidad_medida_referencia: string;
  productos_categoria?: string;
  productos_leyenda_promo1?: string;
  productos_leyenda_promo2?: string;
  imagen_local?: string; // foto tomada por el usuario
}
