/**
 * Parser específico para extractos bancarios del BBVA
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Regex para capturar líneas de movimientos BBVA
 * Formato esperado: FECHA FECHA CONCEPTO IMPORTE EUR [SALDO EUR]
 * Ejemplo: 31/12/2025 31/12/2025 CONCEPTO... -3.572,32 EUR 21.158,15 EUR
 */
const BBVA_MOVEMENT_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([-.]?[\d]+(?:[.]\\d{3})*,\d{2})\s+EUR/g;

/**
 * Parsea un archivo PDF de extracto BBVA
 * @param file - Archivo PDF del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseBbvaFile(file: File): Promise<BankRecord[]> {
  const text = await extractTextFromPdf(file);
  const records: BankRecord[] = [];

  // Usamos matchAll para mejor compatibilidad
  const matches = text.matchAll(BBVA_MOVEMENT_REGEX);

  for (const match of matches) {
    records.push({
      id: generateFileId(),
      fContable: match[1],
      fValor: match[2],
      concepto: match[3].trim(),
      importeRaw: match[4],
      importe: parseCurrency(match[4]),
      saldo: null,
      sourceFile: file.name,
    });
  }

  return records;
}

/**
 * Parsea múltiples archivos PDF de BBVA
 * @param files - Array de archivos PDF
 * @returns Array consolidado de todos los registros
 */
export async function parseBbvaFiles(files: File[]): Promise<BankRecord[]> {
  const allRecords: BankRecord[] = [];

  for (const file of files) {
    try {
      const records = await parseBbvaFile(file);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo BBVA ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return allRecords;
}
