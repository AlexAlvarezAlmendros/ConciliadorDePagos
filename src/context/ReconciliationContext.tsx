/**
 * Contexto global para la aplicación de conciliación
 * Permite compartir estado entre componentes sin prop drilling
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { usePdfLibrary, useFileUpload, useBankFileUpload, useReconciliation } from '../hooks';
import type { UploadedFile, MatchedBankRecord, ReconciliationStats, BankType } from '../types';

interface ReconciliationContextValue {
  // PDF Library
  isPdfLoaded: boolean;
  isPdfLoading: boolean;
  pdfError: string | null;

  // Bank Files (soporta múltiples bancos)
  bankFiles: UploadedFile[];
  addBankFiles: (files: File[], bankType: BankType) => void;
  removeBankFile: (fileId: string) => void;
  updateBankFileType: (fileId: string, bankType: BankType) => void;
  clearBankFiles: () => void;

  // Supplier Files
  supplierFiles: UploadedFile[];
  addSupplierFiles: (files: File[]) => void;
  removeSupplierFile: (fileId: string) => void;
  updateSupplierSheets: (fileId: string, selectedSheets: string[]) => void;
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
  const bankUpload = useBankFileUpload();
  const supplierUpload = useFileUpload();

  // Reconciliation
  const reconciliation = useReconciliation();

  // Start reconciliation with current files
  const startReconciliation = useCallback(async () => {
    await reconciliation.process(bankUpload.files, supplierUpload.files);
  }, [reconciliation, bankUpload.files, supplierUpload.files]);

  // Computed values
  const canProcess = isPdfLoaded && bankUpload.hasFiles && supplierUpload.hasFiles && !reconciliation.isProcessing;

  const value: ReconciliationContextValue = {
    // PDF Library
    isPdfLoaded,
    isPdfLoading,
    pdfError,

    // Bank Files
    bankFiles: bankUpload.files,
    addBankFiles: bankUpload.addFiles,
    removeBankFile: bankUpload.removeFile,
    updateBankFileType: bankUpload.updateBankType,
    clearBankFiles: bankUpload.clearFiles,

    // Supplier Files
    supplierFiles: supplierUpload.files,
    addSupplierFiles: supplierUpload.addFiles,
    removeSupplierFile: supplierUpload.removeFile,
    updateSupplierSheets: supplierUpload.updateSheets,
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
