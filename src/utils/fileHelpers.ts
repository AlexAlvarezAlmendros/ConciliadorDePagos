import type { UploadedFile } from '../types';

/**
 * Genera un ID único para archivos
 */
export function generateFileId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Convierte un File nativo a UploadedFile
 */
export function fileToUploadedFile(file: File): UploadedFile {
  return {
    id: generateFileId(),
    file,
    name: file.name,
    size: file.size,
    uploadedAt: new Date(),
  };
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida que un archivo sea PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Filtra solo archivos PDF válidos de una lista
 */
export function filterPdfFiles(files: File[]): File[] {
  return files.filter(isPdfFile);
}
