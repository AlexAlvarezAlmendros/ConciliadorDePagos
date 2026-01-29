/**
 * Hook para gestión de archivos subidos (incluyendo Excel de proveedores)
 */

import { useState, useCallback } from 'react';
import type { UploadedFile } from '../types';
import { fileToUploadedFile, isExcelFile } from '../utils';
import { getExcelSheets } from '../services/excel';

interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  updateSheets: (fileId: string, selectedSheets: string[]) => void;
  clearFiles: () => void;
  hasFiles: boolean;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const supportedFiles = newFiles.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.pdf') || name.endsWith('.xls') || name.endsWith('.xlsx');
    });
    const uploadedFiles = supportedFiles.map(fileToUploadedFile);
    
    // Procesar archivos Excel para obtener sus hojas
    for (const uploadedFile of uploadedFiles) {
      if (isExcelFile(uploadedFile.file)) {
        try {
          const sheets = await getExcelSheets(uploadedFile.file);
          uploadedFile.isExcel = true;
          uploadedFile.excelSheets = sheets;
          uploadedFile.selectedSheets = sheets.map(s => s.name); // Seleccionar todas por defecto
        } catch (error) {
          console.error('Error al leer hojas de Excel:', error);
          uploadedFile.isExcel = true;
          uploadedFile.excelSheets = [];
          uploadedFile.selectedSheets = [];
        }
      }
    }
    
    setFiles((prev) => [...prev, ...uploadedFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateSheets = useCallback((fileId: string, selectedSheets: string[]) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, selectedSheets } : f
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
    updateSheets,
    clearFiles,
    hasFiles: files.length > 0,
  };
}
