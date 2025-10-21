// Servicio para comparación de precios
export function calcularPromedio(precios: number[]): number {
  if (!precios.length) return 0;
  return precios.reduce((a, b) => a + b, 0) / precios.length;
}

export function precioMinMax(precios: number[]): { min: number; max: number } {
  if (!precios.length) return { min: 0, max: 0 };
  return { min: Math.min(...precios), max: Math.max(...precios) };
}
