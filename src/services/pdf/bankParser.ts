/**
 * Parser unificado para múltiples bancos
 * Gestiona la selección del parser correcto según el tipo de banco
 * Soporta tanto archivos PDF como Excel (XLS/XLSX)
 */

import type { BankRecord, BankType, UploadedFile } from '../../types';
import { parseBbvaFile } from './bbvaParser';
import { parseCaixabankFile } from './caixabankParser';
import { parseSabadellFile } from './sabadellParser';
import { parseSantanderFile } from './santanderParser';
import { parseCaixabankExcelFile } from '../excel';
import { isExcelFile } from '../../utils';

/**
 * Mapa de parsers PDF por tipo de banco
 */
const pdfParsers: Record<BankType, (file: File) => Promise<BankRecord[]>> = {
  bbva: parseBbvaFile,
  caixabank: parseCaixabankFile,
  sabadell: parseSabadellFile,
  santander: parseSantanderFile,
};

/**
 * Mapa de parsers Excel por tipo de banco
 * Solo CaixaBank soporta Excel por ahora
 */
const excelParsers: Partial<Record<BankType, (file: File) => Promise<BankRecord[]>>> = {
  caixabank: parseCaixabankExcelFile,
};

/**
 * Parsea un archivo según el tipo de banco especificado
 * Detecta automáticamente si es PDF o Excel
 * @param file - Archivo del extracto bancario (PDF o Excel)
 * @param bankType - Tipo de banco (bbva, caixabank, sabadell, santander)
 * @returns Array de registros bancarios encontrados
 */
export async function parseBankFile(file: File, bankType: BankType): Promise<BankRecord[]> {
  const isExcel = isExcelFile(file);
  
  console.log(`[Bank Parser] Procesando archivo ${file.name} como ${bankType} (${isExcel ? 'Excel' : 'PDF'})`);
  
  if (isExcel) {
    const excelParser = excelParsers[bankType];
    
    if (!excelParser) {
      throw new Error(`El banco ${bankType} no soporta archivos Excel. Por favor, use un archivo PDF.`);
    }
    
    return excelParser(file);
  }
  
  const pdfParser = pdfParsers[bankType];
  
  if (!pdfParser) {
    throw new Error(`Parser no disponible para el banco: ${bankType}`);
  }
  
  return pdfParser(file);
}

/**
 * Parsea múltiples archivos de bancos
 * Cada archivo debe tener un bankType asociado
 * @param files - Array de archivos con su tipo de banco
 * @returns Array consolidado de todos los registros
 */
export async function parseBankFiles(files: UploadedFile[]): Promise<BankRecord[]> {
  const allRecords: BankRecord[] = [];

  for (const uploadedFile of files) {
    // Si no tiene bankType, usar bbva por defecto (retrocompatibilidad)
    const bankType = uploadedFile.bankType || 'bbva';
    
    try {
      const records = await parseBankFile(uploadedFile.file, bankType);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo ${uploadedFile.name} (${bankType}):`, error);
      throw new Error(
        `Error al procesar ${uploadedFile.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  console.log(`[Bank Parser] Total de movimientos encontrados: ${allRecords.length}`);
  
  return allRecords;
}

/**
 * Obtiene los bancos soportados
 */
export function getSupportedBanks(): BankType[] {
  return Object.keys(pdfParsers) as BankType[];
}
