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
 * Busca una coincidencia de proveedor para un movimiento bancario
 * Estrategia: Primero buscar por importe, si hay más de una coincidencia filtrar por fecha
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

  // Paso 2: Si hay más de una coincidencia por importe, filtrar por fecha
  const dateAndAmountMatches = amountMatches.filter((supplier) => {
    return (
      supplier.fecha === bankRecord.fValor ||
      (options.useAccountingDate && supplier.fecha === bankRecord.fContable)
    );
  });

  // Si hay coincidencia por fecha e importe, devolver la primera
  if (dateAndAmountMatches.length > 0) {
    return dateAndAmountMatches[0];
  }

  // Si no hay coincidencia por fecha pero sí por importe, devolver la primera coincidencia por importe
  return amountMatches[0];
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
