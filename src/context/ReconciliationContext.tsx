/**
 * Contexto global para la aplicación de conciliación
 * Permite compartir estado entre componentes sin prop drilling
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { usePdfLibrary, useFileUpload, useReconciliation } from '../hooks';
import type { UploadedFile, MatchedBankRecord, ReconciliationStats } from '../types';

interface ReconciliationContextValue {
  // PDF Library
  isPdfLoaded: boolean;
  isPdfLoading: boolean;
  pdfError: string | null;

  // BBVA Files
  bbvaFiles: UploadedFile[];
  addBbvaFiles: (files: File[]) => void;
  removeBbvaFile: (fileId: string) => void;
  clearBbvaFiles: () => void;

  // Supplier Files
  supplierFiles: UploadedFile[];
  addSupplierFiles: (files: File[]) => void;
  removeSupplierFile: (fileId: string) => void;
  clearSupplierFiles: () => void;

  // Reconciliation
  results: MatchedBankRecord[];
  stats: ReconciliationStats | null;
  isProcessing: boolean;
  error: string | null;
  startReconciliation: () => Promise<void>;
  resetResults: () => void;

  // Computed
  canProcess: boolean;
}

const ReconciliationContext = createContext<ReconciliationContextValue | null>(null);

interface ReconciliationProviderProps {
  children: ReactNode;
}

export function ReconciliationProvider({ children }: ReconciliationProviderProps) {
  // PDF Library
  const { isLoaded: isPdfLoaded, isLoading: isPdfLoading, error: pdfError } = usePdfLibrary();

  // File uploads
  const bbvaUpload = useFileUpload();
  const supplierUpload = useFileUpload();

  // Reconciliation
  const reconciliation = useReconciliation();

  // Start reconciliation with current files
  const startReconciliation = useCallback(async () => {
    await reconciliation.process(bbvaUpload.files, supplierUpload.files);
  }, [reconciliation, bbvaUpload.files, supplierUpload.files]);

  // Computed values
  const canProcess = isPdfLoaded && bbvaUpload.hasFiles && supplierUpload.hasFiles && !reconciliation.isProcessing;

  const value: ReconciliationContextValue = {
    // PDF Library
    isPdfLoaded,
    isPdfLoading,
    pdfError,

    // BBVA Files
    bbvaFiles: bbvaUpload.files,
    addBbvaFiles: bbvaUpload.addFiles,
    removeBbvaFile: bbvaUpload.removeFile,
    clearBbvaFiles: bbvaUpload.clearFiles,

    // Supplier Files
    supplierFiles: supplierUpload.files,
    addSupplierFiles: supplierUpload.addFiles,
    removeSupplierFile: supplierUpload.removeFile,
    clearSupplierFiles: supplierUpload.clearFiles,

    // Reconciliation
    results: reconciliation.results,
    stats: reconciliation.stats,
    isProcessing: reconciliation.isProcessing,
    error: reconciliation.error,
    startReconciliation,
    resetResults: reconciliation.reset,

    // Computed
    canProcess,
  };

  return (
    <ReconciliationContext.Provider value={value}>
      {children}
    </ReconciliationContext.Provider>
  );
}

export function useReconciliationContext(): ReconciliationContextValue {
  const context = useContext(ReconciliationContext);
  if (!context) {
    throw new Error('useReconciliationContext debe usarse dentro de ReconciliationProvider');
  }
  return context;
}
