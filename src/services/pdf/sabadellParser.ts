/**
 * Parser específico para extractos bancarios del Banco Sabadell
 * Soporta el formato típico de extractos de Sabadell
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Patrones para capturar movimientos Sabadell
 * Sabadell suele usar formatos como:
 * - Fecha Valor Concepto Debe/Haber Saldo
 * - Fecha Concepto Importe Saldo
 */

/**
 * Intenta extraer movimientos del texto de Sabadell
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>();

  // Patrón 1: Formato con fecha operación y fecha valor
  // Ejemplo: 15/01/2025 16/01/2025 RECIBO DOMICILIADO -234,56 1.234,56
  const pattern1 = /(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})(?:\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2}))?/gi;

  // Patrón 2: Formato con una sola fecha
  // Ejemplo: 15/01/2025 TRANSFERENCIA SEPA -1.500,00 EUR
  const pattern2 = /(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:EUR|€)?/gi;

  // Intentamos primero con el patrón de dos fechas
  const matches1 = Array.from(text.matchAll(pattern1));
  
  for (const match of matches1) {
    const fContable = normalizeDate(match[1]);
    const fValor = normalizeDate(match[2]);
    const concepto = match[3].trim();
    const importeRaw = match[4];
    const saldoRaw = match[5] || null;

    const uniqueKey = `${fContable}-${fValor}-${concepto.substring(0, 30)}-${importeRaw}`;
    
    if (!seenEntries.has(uniqueKey) && concepto && concepto.length > 2 && !isHeaderText(concepto)) {
      seenEntries.add(uniqueKey);
      
      const record: BankRecord = {
        id: generateFileId(),
        fContable,
        fValor,
        concepto,
        importeRaw,
        importe: parseCurrency(importeRaw),
        saldo: saldoRaw ? parseCurrency(saldoRaw) : null,
        sourceFile: fileName,
        bankType: 'sabadell',
      };
      
      console.log(`[Sabadell Parser] Match (2 fechas):`, {
        fContable,
        fValor,
        concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
        importe: importeRaw,
        saldo: saldoRaw,
      });
      
      records.push(record);
    }
  }

  // Si no encontramos con dos fechas, intentamos con una sola fecha
  if (records.length === 0) {
    const matches2 = Array.from(text.matchAll(pattern2));
    
    for (const match of matches2) {
      const fecha = normalizeDate(match[1]);
      const concepto = match[2].trim();
      const importeRaw = match[3];

      const uniqueKey = `${fecha}-${concepto.substring(0, 30)}-${importeRaw}`;
      
      if (!seenEntries.has(uniqueKey) && concepto && concepto.length > 2 && !isHeaderText(concepto)) {
        seenEntries.add(uniqueKey);
        
        const record: BankRecord = {
          id: generateFileId(),
          fContable: fecha,
          fValor: fecha,
          concepto,
          importeRaw,
          importe: parseCurrency(importeRaw),
          saldo: null,
          sourceFile: fileName,
          bankType: 'sabadell',
        };
        
        console.log(`[Sabadell Parser] Match (1 fecha):`, {
          fecha,
          concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
          importe: importeRaw,
        });
        
        records.push(record);
      }
    }
  }

  return records;
}

/**
 * Normaliza la fecha al formato DD/MM/YYYY
 */
function normalizeDate(date: string): string {
  return date.replace(/-/g, '/');
}

/**
 * Verifica si el texto es parte de un encabezado y no un concepto real
 */
function isHeaderText(text: string): boolean {
  const headerKeywords = [
    'fecha', 'concepto', 'importe', 'saldo', 'debe', 'haber',
    'operación', 'valor', 'descripción', 'movimiento'
  ];
  const lowerText = text.toLowerCase();
  return headerKeywords.some(keyword => lowerText.includes(keyword) && text.length < 30);
}

/**
 * Parsea un archivo PDF de extracto Sabadell
 * @param file - Archivo PDF del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseSabadellFile(file: File): Promise<BankRecord[]> {
  const text = await extractTextFromPdf(file);
  
  console.log(`[Sabadell Parser] Archivo: ${file.name}`);
  console.log(`[Sabadell Parser] Texto extraído (primeros 500 chars):`, text.substring(0, 500));
  
  const records = extractMovementsFromText(text, file.name);
  
  console.log(`[Sabadell Parser] Movimientos encontrados: ${records.length}`);
  
  return records;
}

/**
 * Parsea múltiples archivos PDF de Sabadell
 * @param files - Array de archivos PDF
 * @returns Array consolidado de todos los registros
 */
export async function parseSabadellFiles(files: File[]): Promise<BankRecord[]> {
  const allRecords: BankRecord[] = [];

  for (const file of files) {
    try {
      const records = await parseSabadellFile(file);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo Sabadell ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return allRecords;
}
