/**
 * Hook principal para el proceso de conciliación
 */

import { useState, useCallback } from 'react';
import type { MatchedBankRecord, ReconciliationStats, UploadedFile } from '../types';
import { parseBankFiles, parseSupplierFiles } from '../services/pdf';
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
    bankFiles: UploadedFile[],
    supplierFiles: UploadedFile[]
  ) => {
    if (bankFiles.length === 0 || supplierFiles.length === 0) {
      setError('Por favor, sube archivos de ambos tipos.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setStats(null);

    try {
      // Extraer los File nativos para proveedores
      const supplierNativeFiles = supplierFiles.map((f) => f.file);

      // Parsear documentos bancarios (usa el bankType de cada archivo)
      const bankData = await parseBankFiles(bankFiles);
      const supplierData = await parseSupplierFiles(supplierNativeFiles);

      if (bankData.length === 0) {
        throw new Error(
          'No se encontraron movimientos en los PDFs bancarios. ' +
          'El PDF parece ser una IMAGEN ESCANEADA (no tiene texto seleccionable). ' +
          'Soluciones: 1) Usa el PDF original del banco, no un escaneo. ' +
          '2) Si solo tienes el escaneo, necesitarás un software OCR para convertirlo a texto. ' +
          '3) Verifica que has seleccionado el banco correcto para cada archivo.'
        );
      }

      if (supplierData.length === 0) {
        throw new Error(
          'No se encontraron registros en los PDFs de Proveedores. ' +
          'Verifica que sean PDFs válidos y no escaneados como imagen.'
        );
      }

      // Ejecutar conciliación
      const result = performReconciliation(bankData, supplierData);

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
