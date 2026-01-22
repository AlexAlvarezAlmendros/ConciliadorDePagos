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
 * Valida que un archivo sea Excel (XLS, XLSX, ODS)
 */
export function isExcelFile(file: File): boolean {
  const excelTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
  ];
  
  const excelExtensions = ['.xls', '.xlsx', '.ods'];
  const fileName = file.name.toLowerCase();
  
  return excelTypes.includes(file.type) || 
         excelExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Valida que un archivo sea PDF o Excel
 */
export function isSupportedFile(file: File): boolean {
  return isPdfFile(file) || isExcelFile(file);
}

/**
 * Filtra solo archivos PDF válidos de una lista
 */
export function filterPdfFiles(files: File[]): File[] {
  return files.filter(isPdfFile);
}

/**
 * Filtra archivos soportados (PDF y Excel) de una lista
 */
export function filterSupportedFiles(files: File[]): File[] {
  return files.filter(isSupportedFile);
}
