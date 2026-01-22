/**
 * Parser unificado para múltiples bancos
 * Gestiona la selección del parser correcto según el tipo de banco
 */

import type { BankRecord, BankType, UploadedFile } from '../../types';
import { parseBbvaFile } from './bbvaParser';
import { parseCaixabankFile } from './caixabankParser';
import { parseSabadellFile } from './sabadellParser';
import { parseSantanderFile } from './santanderParser';

/**
 * Mapa de parsers por tipo de banco
 */
const bankParsers: Record<BankType, (file: File) => Promise<BankRecord[]>> = {
  bbva: parseBbvaFile,
  caixabank: parseCaixabankFile,
  sabadell: parseSabadellFile,
  santander: parseSantanderFile,
};

/**
 * Parsea un archivo PDF según el tipo de banco especificado
 * @param file - Archivo PDF del extracto bancario
 * @param bankType - Tipo de banco (bbva, caixabank, sabadell, santander)
 * @returns Array de registros bancarios encontrados
 */
export async function parseBankFile(file: File, bankType: BankType): Promise<BankRecord[]> {
  const parser = bankParsers[bankType];
  
  if (!parser) {
    throw new Error(`Parser no disponible para el banco: ${bankType}`);
  }
  
  console.log(`[Bank Parser] Procesando archivo ${file.name} como ${bankType}`);
  
  return parser(file);
}

/**
 * Parsea múltiples archivos PDF de bancos
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
  return Object.keys(bankParsers) as BankType[];
}
