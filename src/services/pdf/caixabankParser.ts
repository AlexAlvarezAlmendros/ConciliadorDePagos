/**
 * Parser específico para extractos bancarios de CaixaBank
 * Soporta el formato típico de extractos de CaixaBank
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Patrones para capturar movimientos CaixaBank
 * CaixaBank suele usar formatos como:
 * - Fecha Concepto Importe Saldo
 * - O formatos con fecha valor y fecha operación
 */

/**
 * Intenta extraer movimientos del texto de CaixaBank
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>();

  // Patrón 1: Formato estándar CaixaBank
  // Fecha (DD/MM/YYYY o DD-MM-YYYY) Concepto Importe (con EUR opcional)
  // Ejemplo: 15/01/2025 TRANSFERENCIA RECIBIDA -1.234,56 EUR 5.678,90 EUR
  const pattern1 = /(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:EUR|€)?(?:\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:EUR|€)?)?/gi;

  // Patrón 2: Formato con dos fechas (fecha operación y fecha valor)
  // Ejemplo: 15/01/2025 16/01/2025 PAGO TARJETA -50,00 EUR
  const pattern2 = /(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*(?:EUR|€)?/gi;

  // Primero intentamos con el patrón de dos fechas
  const matches2 = Array.from(text.matchAll(pattern2));
  
  for (const match of matches2) {
    const fContable = normalizeDate(match[1]);
    const fValor = normalizeDate(match[2]);
    const concepto = match[3].trim();
    const importeRaw = match[4];

    const uniqueKey = `${fContable}-${fValor}-${concepto.substring(0, 30)}-${importeRaw}`;
    
    if (!seenEntries.has(uniqueKey) && concepto && concepto.length > 2) {
      seenEntries.add(uniqueKey);
      
      const record: BankRecord = {
        id: generateFileId(),
        fContable,
        fValor,
        concepto,
        importeRaw,
        importe: parseCurrency(importeRaw),
        saldo: null,
        sourceFile: fileName,
        bankType: 'caixabank',
      };
      
      console.log(`[CaixaBank Parser] Match (2 fechas):`, {
        fContable,
        fValor,
        concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
        importe: importeRaw,
      });
      
      records.push(record);
    }
  }

  // Si no encontramos con dos fechas, intentamos con una sola fecha
  if (records.length === 0) {
    const matches1 = Array.from(text.matchAll(pattern1));
    
    for (const match of matches1) {
      const fecha = normalizeDate(match[1]);
      const concepto = match[2].trim();
      const importeRaw = match[3];
      const saldoRaw = match[4] || null;

      const uniqueKey = `${fecha}-${concepto.substring(0, 30)}-${importeRaw}`;
      
      if (!seenEntries.has(uniqueKey) && concepto && concepto.length > 2) {
        seenEntries.add(uniqueKey);
        
        const record: BankRecord = {
          id: generateFileId(),
          fContable: fecha,
          fValor: fecha,
          concepto,
          importeRaw,
          importe: parseCurrency(importeRaw),
          saldo: saldoRaw ? parseCurrency(saldoRaw) : null,
          sourceFile: fileName,
          bankType: 'caixabank',
        };
        
        console.log(`[CaixaBank Parser] Match (1 fecha):`, {
          fecha,
          concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
          importe: importeRaw,
          saldo: saldoRaw,
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
 * Parsea un archivo PDF de extracto CaixaBank
 * @param file - Archivo PDF del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseCaixabankFile(file: File): Promise<BankRecord[]> {
  const text = await extractTextFromPdf(file);
  
  console.log(`[CaixaBank Parser] Archivo: ${file.name}`);
  console.log(`[CaixaBank Parser] Texto extraído (primeros 500 chars):`, text.substring(0, 500));
  
  const records = extractMovementsFromText(text, file.name);
  
  console.log(`[CaixaBank Parser] Movimientos encontrados: ${records.length}`);
  
  return records;
}

/**
 * Parsea múltiples archivos PDF de CaixaBank
 * @param files - Array de archivos PDF
 * @returns Array consolidado de todos los registros
 */
export async function parseCaixabankFiles(files: File[]): Promise<BankRecord[]> {
  const allRecords: BankRecord[] = [];

  for (const file of files) {
    try {
      const records = await parseCaixabankFile(file);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo CaixaBank ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return allRecords;
}
