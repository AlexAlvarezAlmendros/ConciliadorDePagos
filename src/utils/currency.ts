/**
 * Utilidades para el manejo de formatos de moneda
 */

/**
 * Parsea un string con formato de moneda europea (1.234,56) a número
 * @param str - String con el importe en formato europeo
 * @returns Número parseado o 0 si no es válido
 */
export function parseCurrency(str: string | null | undefined): number {
  if (!str) return 0;
  
  // Formato europeo: 1.234,56 -> eliminar puntos, reemplazar coma por punto
  const cleanStr = str
    .replace(/\./g, '')      // Eliminar separadores de miles
    .replace(',', '.')       // Reemplazar coma decimal por punto
    .replace(/[^\d.-]/g, ''); // Eliminar caracteres no numéricos excepto dígitos, punto y menos
  
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea un número como moneda en formato europeo
 * @param amount - Cantidad a formatear
 * @param currency - Código de moneda (default: EUR)
 * @returns String formateado
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Compara dos importes con tolerancia para errores de redondeo
 * @param amount1 - Primer importe
 * @param amount2 - Segundo importe
 * @param tolerance - Tolerancia permitida (default: 0.01)
 * @returns true si los importes coinciden dentro de la tolerancia
 */
export function amountsMatch(
  amount1: number,
  amount2: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(Math.abs(amount1) - Math.abs(amount2)) < tolerance;
}
