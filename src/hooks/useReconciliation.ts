/**
 * Hook principal para el proceso de conciliación
 */

import { useState, useCallback } from 'react';
import type { MatchedBankRecord, ReconciliationStats, UploadedFile } from '../types';
import { parseBbvaFiles, parseSupplierFiles } from '../services/pdf';
import { performReconciliation } from '../services/reconciliation';

interface UseReconciliationReturn {
  results: MatchedBankRecord[];
  stats: ReconciliationStats | null;
  isProcessing: boolean;
  error: string | null;
  process: (bbvaFiles: UploadedFile[], supplierFiles: UploadedFile[]) => Promise<void>;
  reset: () => void;
}

export function useReconciliation(): UseReconciliationReturn {
  const [results, setResults] = useState<MatchedBankRecord[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (
    bbvaFiles: UploadedFile[],
    supplierFiles: UploadedFile[]
  ) => {
    if (bbvaFiles.length === 0 || supplierFiles.length === 0) {
      setError('Por favor, sube archivos de ambos tipos.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setStats(null);

    try {
      // Extraer los File nativos
      const bbvaNativeFiles = bbvaFiles.map((f) => f.file);
      const supplierNativeFiles = supplierFiles.map((f) => f.file);

      // Parsear documentos
      const bbvaData = await parseBbvaFiles(bbvaNativeFiles);
      const supplierData = await parseSupplierFiles(supplierNativeFiles);

      if (bbvaData.length === 0) {
        throw new Error(
          'No se encontraron movimientos en los PDFs del BBVA. ' +
          'Verifica que sean PDFs válidos y no escaneados como imagen.'
        );
      }

      if (supplierData.length === 0) {
        throw new Error(
          'No se encontraron registros en los PDFs de Proveedores. ' +
          'Verifica que sean PDFs válidos y no escaneados como imagen.'
        );
      }

      // Ejecutar conciliación
      const result = performReconciliation(bbvaData, supplierData);

      setResults(result.records);
      setStats(result.stats);
    } catch (err) {
      console.error('Error en conciliación:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error desconocido al procesar los archivos.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setStats(null);
    setError(null);
  }, []);

  return {
    results,
    stats,
    isProcessing,
    error,
    process,
    reset,
  };
}
