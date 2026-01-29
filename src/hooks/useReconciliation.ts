/**
 * Hook principal para el proceso de conciliación
 */

import { useState, useCallback } from 'react';
import type { MatchedBankRecord, ReconciliationStats, UploadedFile } from '../types';
import { parseBankFiles, parseSupplierFiles } from '../services/pdf';
import { parseSupplierExcel } from '../services/excel';
import { performReconciliation } from '../services/reconciliation';
import { isExcelFile } from '../utils';

interface UseReconciliationReturn {
  results: MatchedBankRecord[];
  stats: ReconciliationStats | null;
  isProcessing: boolean;
  error: string | null;
  process: (bbvaFiles: UploadedFile[], supplierFiles: UploadedFile[]) => Promise<void>;
  reset: () => void;
  updateDocument: (recordId: string, newDocument: string) => void;
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
      // Separar archivos PDF y Excel de proveedores
      const supplierPdfFiles: File[] = [];
      const supplierExcelFiles: UploadedFile[] = [];
      
      for (const uploadedFile of supplierFiles) {
        if (uploadedFile.isExcel || isExcelFile(uploadedFile.file)) {
          supplierExcelFiles.push(uploadedFile);
        } else {
          supplierPdfFiles.push(uploadedFile.file);
        }
      }

      // Parsear documentos bancarios (usa el bankType de cada archivo)
      const bankData = await parseBankFiles(bankFiles);
      
      // Parsear proveedores PDF
      const supplierPdfData = supplierPdfFiles.length > 0 
        ? await parseSupplierFiles(supplierPdfFiles)
        : [];
      
      // Parsear proveedores Excel
      const supplierExcelData = [];
      for (const excelFile of supplierExcelFiles) {
        if (!excelFile.selectedSheets || excelFile.selectedSheets.length === 0) {
          console.warn(`Excel ${excelFile.name}: No hay hojas seleccionadas`);
          continue;
        }
        const records = await parseSupplierExcel(excelFile.file, excelFile.selectedSheets);
        supplierExcelData.push(...records);
      }
      
      // Combinar datos de proveedores
      const supplierData = [...supplierPdfData, ...supplierExcelData];

      if (bankData.length === 0) {
        throw new Error(
          'No se encontraron movimientos en los archivos bancarios. ' +
          'Posibles causas: ' +
          '1) Si es un PDF, puede ser una imagen escaneada sin texto seleccionable. ' +
          '2) Si es un Excel, verifica que el formato sea el esperado (con columnas Fecha, Movimiento, Importe). ' +
          '3) Verifica que has seleccionado el banco correcto para cada archivo. ' +
          '4) Revisa la consola del navegador (F12) para ver más detalles del error.'
        );
      }

      if (supplierData.length === 0) {
        throw new Error(
          'No se encontraron registros en los archivos de Proveedores. ' +
          'Verifica que: 1) Los PDFs sean válidos y no escaneados como imagen. ' +
          '2) Los archivos Excel tengan hojas seleccionadas con datos válidos.'
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

  const updateDocument = useCallback((recordId: string, newDocument: string) => {
    setResults((prevResults) =>
      prevResults.map((record) =>
        record.id === recordId
          ? { ...record, matchedDoc: newDocument || null }
          : record
      )
    );
  }, []);

  return {
    results,
    stats,
    isProcessing,
    error,
    process,
    reset,
    updateDocument,
  };
}
