/**
 * Parser específico para listados de proveedores
 */

import type { SupplierRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Regex para capturar líneas de registros de proveedores
 * Formato esperado: Fecha Codigo Nombre Documento Referencia Importe Eur
 * Ejemplo: 30/12/2025 104 INDUSTRIAL... 1/FC/250482 ... 148,29 Eur
 */
const SUPPLIER_ROW_REGEX = /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+((?:\d\/[A-Z]+\/\d+)|(?:[A-Z0-9/-]+))\s+([A-Z0-9/-]+)\s+([-.]?[\d]+(?:[.]\d{3})*,\d{2})\s+Eur/gi;

/**
 * Parsea un archivo PDF de listado de proveedores
 * @param file - Archivo PDF del listado
 * @returns Array de registros de proveedores encontrados
 */
export async function parseSupplierFile(file: File): Promise<SupplierRecord[]> {
  const text = await extractTextFromPdf(file);
  const records: SupplierRecord[] = [];

  const matches = text.matchAll(SUPPLIER_ROW_REGEX);

  for (const match of matches) {
    records.push({
      id: generateFileId(),
      fecha: match[1],
      codigo: match[2],
      nombre: match[3].trim(),
      documento: match[4],
      referencia: match[5],
      importeRaw: match[6],
      importe: parseCurrency(match[6]),
      sourceFile: file.name,
    });
  }

  return records;
}

/**
 * Parsea múltiples archivos PDF de proveedores
 * @param files - Array de archivos PDF
 * @returns Array consolidado de todos los registros
 */
export async function parseSupplierFiles(files: File[]): Promise<SupplierRecord[]> {
  const allRecords: SupplierRecord[] = [];

  for (const file of files) {
    try {
      const records = await parseSupplierFile(file);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo de proveedor ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return allRecords;
}
