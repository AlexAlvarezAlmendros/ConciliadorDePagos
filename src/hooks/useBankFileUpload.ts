/**
 * Hook para gestión de archivos bancarios con soporte para múltiples bancos
 */

import { useState, useCallback } from 'react';
import type { UploadedFile, BankType } from '../types';
import { filterPdfFiles, generateFileId } from '../utils';

interface UseBankFileUploadReturn {
  files: UploadedFile[];
  addFiles: (files: File[], bankType: BankType) => void;
  removeFile: (fileId: string) => void;
  updateBankType: (fileId: string, bankType: BankType) => void;
  clearFiles: () => void;
  hasFiles: boolean;
}

/**
 * Convierte un File a UploadedFile con bankType
 */
function fileToUploadedFileWithBank(file: File, bankType: BankType): UploadedFile {
  return {
    id: generateFileId(),
    file,
    name: file.name,
    size: file.size,
    uploadedAt: new Date(),
    bankType,
  };
}

export function useBankFileUpload(): UseBankFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = useCallback((newFiles: File[], bankType: BankType) => {
    const pdfFiles = filterPdfFiles(newFiles);
    const uploadedFiles = pdfFiles.map((file) => fileToUploadedFileWithBank(file, bankType));
    setFiles((prev) => [...prev, ...uploadedFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateBankType = useCallback((fileId: string, bankType: BankType) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, bankType } : f
      )
    );
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    updateBankType,
    clearFiles,
    hasFiles: files.length > 0,
  };
}
