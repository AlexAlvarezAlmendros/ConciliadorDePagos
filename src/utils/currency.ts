/**
 * Utilidades para el manejo de formatos de moneda
 */

/**
 * Parsea un string con formato de moneda europea (1.234,56) o americana (1,234.56) a número
 * @param str - String con el importe
 * @returns Número parseado o 0 si no es válido
 */
export function parseCurrency(str: string | null | undefined): number {
  if (!str) return 0;
  
  // Convertir a string y limpiar espacios
  let cleanStr = String(str).trim();
  
  // Eliminar símbolos de moneda y espacios
  cleanStr = cleanStr.replace(/[€$£¥\s]/g, '');
  
  // Detectar formato basándose en qué símbolo aparece último
  const hasComma = cleanStr.includes(',');
  const hasDot = cleanStr.includes('.');
  
  if (hasComma && hasDot) {
    // Tiene ambos: determinar formato por posición
    const lastCommaPos = cleanStr.lastIndexOf(',');
    const lastDotPos = cleanStr.lastIndexOf('.');
    
    if (lastDotPos > lastCommaPos) {
      // Formato americano: 1,234.56 (el punto está después de la coma)
      cleanStr = cleanStr.replace(/,/g, ''); // Eliminar comas
    } else {
      // Formato europeo: 1.234,56 (la coma está después del punto)
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    // Solo coma: formato europeo sin miles 234,56
    cleanStr = cleanStr.replace(',', '.');
  }
  // Si solo tiene punto, ya está en formato correcto para parseFloat
  
  // Eliminar cualquier otro caracter no numérico excepto punto decimal y signo negativo
  cleanStr = cleanStr.replace(/[^\d.-]/g, '');
  
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
