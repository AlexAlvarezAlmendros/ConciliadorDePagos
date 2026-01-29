/**
 * Servicio de Conciliación Bancaria
 * Implementa la lógica de matching entre movimientos bancarios y registros de proveedores
 */

import type {
  BankRecord,
  SupplierRecord,
  MatchedBankRecord,
  ReconciliationResult,
  ReconciliationStats,
} from '../../types';
import { amountsMatch } from '../../utils';

/**
 * Opciones de configuración para el algoritmo de matching
 */
export interface MatchingOptions {
  /** Tolerancia para comparación de importes (default: 0.01) */
  amountTolerance?: number;
  /** Comparar también con fecha contable además de fecha valor */
  useAccountingDate?: boolean;
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  amountTolerance: 0.01,
  useAccountingDate: true,
};

/**
 * Extrae mes y año de una fecha en formato DD/MM/YYYY
 * @param dateStr - Fecha en formato string
 * @returns String con formato MM/YYYY o null si es inválido
 */
function getMonthYear(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Asumiendo formato DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const month = parts[1];
  const year = parts[2];
  
  return `${month}/${year}`;
}

/**
 * Convierte una fecha en formato DD/MM/YYYY a objeto Date
 * @param dateStr - Fecha en formato string
 * @returns Objeto Date o null si es inválido
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-11
  const year = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Encuentra el proveedor con la fecha más cercana a la fecha objetivo
 * @param suppliers - Lista de proveedores candidatos
 * @param targetDate - Fecha objetivo del banco
 * @returns El proveedor con la fecha más cercana
 */
function findClosestDateMatch(suppliers: SupplierRecord[], targetDate: string): SupplierRecord | null {
  if (suppliers.length === 0) return null;
  
  const targetDateTime = parseDate(targetDate);
  if (!targetDateTime) return suppliers[0];
  
  let closestSupplier = suppliers[0];
  let smallestDiff = Infinity;
  
  for (const supplier of suppliers) {
    const supplierDateTime = parseDate(supplier.fecha);
    if (!supplierDateTime) continue;
    
    const diff = Math.abs(targetDateTime.getTime() - supplierDateTime.getTime());
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestSupplier = supplier;
    }
  }
  
  return closestSupplier;
}

/**
 * Busca una coincidencia de proveedor para un movimiento bancario
 * Estrategia: Primero buscar por importe, luego por mes/año, y si no hay match buscar la fecha más cercana
 * @param bankRecord - Registro bancario a buscar
 * @param supplierRecords - Lista de registros de proveedores
 * @param options - Opciones de matching
 * @returns Registro de proveedor coincidente o null
 */
function findSupplierMatch(
  bankRecord: BankRecord,
  supplierRecords: SupplierRecord[],
  options: Required<MatchingOptions>
): SupplierRecord | null {
  // Paso 1: Buscar todas las coincidencias por importe
  const amountMatches = supplierRecords.filter((supplier) =>
    amountsMatch(supplier.importe, bankRecord.importe, options.amountTolerance)
  );

  // Si no hay coincidencias por importe, no hay match
  if (amountMatches.length === 0) {
    return null;
  }

  // Si solo hay una coincidencia por importe, es el match
  if (amountMatches.length === 1) {
    return amountMatches[0];
  }

  // Paso 2: Si hay múltiples coincidencias por importe, intentar filtrar por fecha valor (mes/año)
  const fValorMonthYear = getMonthYear(bankRecord.fValor);
  if (fValorMonthYear) {
    const fValorMatches = amountMatches.filter((supplier) => {
      const supplierMonthYear = getMonthYear(supplier.fecha);
      return supplierMonthYear === fValorMonthYear;
    });
    
    if (fValorMatches.length > 0) {
      // Si hay múltiples coincidencias de mes/año, buscar la fecha más cercana
      if (fValorMatches.length > 1) {
        return findClosestDateMatch(fValorMatches, bankRecord.fValor);
      }
      return fValorMatches[0];
    }
  }

  // Paso 3: Si no hay coincidencia con fecha valor, intentar con fecha contable (mes/año)
  if (options.useAccountingDate) {
    const fContableMonthYear = getMonthYear(bankRecord.fContable);
    if (fContableMonthYear) {
      const fContableMatches = amountMatches.filter((supplier) => {
        const supplierMonthYear = getMonthYear(supplier.fecha);
        return supplierMonthYear === fContableMonthYear;
      });
      
      if (fContableMatches.length > 0) {
        // Si hay múltiples coincidencias de mes/año, buscar la fecha más cercana
        if (fContableMatches.length > 1) {
          return findClosestDateMatch(fContableMatches, bankRecord.fContable);
        }
        return fContableMatches[0];
      }
    }
  }

  // Paso 4: Si no hay coincidencia de mes/año, buscar la fecha más cercana entre todas las coincidencias de importe
  // Intentar primero con fecha valor
  const closestMatch = findClosestDateMatch(amountMatches, bankRecord.fValor);
  
  // Si está habilitado, también considerar fecha contable
  if (options.useAccountingDate && closestMatch) {
    const closestWithContable = findClosestDateMatch(amountMatches, bankRecord.fContable);
    
    // Comparar cuál fecha bancaria está más cerca del proveedor encontrado
    const closestDate = parseDate(closestMatch.fecha);
    const fValorDate = parseDate(bankRecord.fValor);
    const fContableDate = parseDate(bankRecord.fContable);
    
    if (closestDate && fValorDate && fContableDate && closestWithContable) {
      const diffValor = Math.abs(closestDate.getTime() - fValorDate.getTime());
      const diffContable = Math.abs(closestDate.getTime() - fContableDate.getTime());
      
      // Usar la fecha contable si está más cerca
      if (diffContable < diffValor) {
        return closestWithContable;
      }
    }
  }
  
  return closestMatch;
}

/**
 * Calcula las estadísticas de la conciliación
 */
function calculateStats(
  records: MatchedBankRecord[],
  supplierTotal: number
): ReconciliationStats {
  const matches = records.filter((r) => r.status === 'match').length;
  const unmatchedCount = records.length - matches;
  const matchPercentage = records.length > 0 ? (matches / records.length) * 100 : 0;

  return {
    bankTotal: records.length,
    supplierTotal,
    matches,
    unmatchedCount,
    matchPercentage,
  };
}

/**
 * Ejecuta el proceso de conciliación bancaria
 * @param bankRecords - Registros del extracto bancario
 * @param supplierRecords - Registros de proveedores
 * @param options - Opciones de configuración
 * @returns Resultado de la conciliación con estadísticas
 */
export function performReconciliation(
  bankRecords: BankRecord[],
  supplierRecords: SupplierRecord[],
  options: MatchingOptions = {}
): ReconciliationResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Crear una copia de proveedores para marcar los ya usados
  const availableSuppliers = [...supplierRecords];

  const matchedRecords: MatchedBankRecord[] = bankRecords.map((bankRecord) => {
    const match = findSupplierMatch(bankRecord, availableSuppliers, mergedOptions);

    if (match) {
      // Remover el proveedor usado para evitar duplicados
      const matchIndex = availableSuppliers.findIndex((s) => s.id === match.id);
      if (matchIndex > -1) {
        availableSuppliers.splice(matchIndex, 1);
      }

      return {
        ...bankRecord,
        matchedDoc: match.documento,
        supplierName: match.nombre,
        status: 'match' as const,
      };
    }

    return {
      ...bankRecord,
      matchedDoc: null,
      supplierName: null,
      status: 'unmatched' as const,
    };
  });

  const stats = calculateStats(matchedRecords, supplierRecords.length);

  return {
    records: matchedRecords,
    stats,
  };
}
