/**
 * Hook para gestión de archivos subidos
 */

import { useState, useCallback } from 'react';
import type { UploadedFile } from '../types';
import { fileToUploadedFile, filterPdfFiles } from '../utils';

interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  hasFiles: boolean;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfFiles = filterPdfFiles(newFiles);
    const uploadedFiles = pdfFiles.map(fileToUploadedFile);
    setFiles((prev) => [...prev, ...uploadedFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    hasFiles: files.length > 0,
  };
}
