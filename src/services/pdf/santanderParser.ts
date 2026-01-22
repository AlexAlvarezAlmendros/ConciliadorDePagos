/**
 * Parser específico para extractos bancarios del Banco Santander
 * Soporta el formato típico de extractos online de Santander
 * 
 * Formato detectado:
 * F. Valor
 * [Concepto multilínea] [Importe] EUR [Saldo] EUR
 * [Fecha contable DD/MM/YYYY]
 * [Fecha valor DD/MM/YYYY]
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Intenta extraer movimientos del texto de Santander
 * Formato: "F. Valor" seguido de concepto, importe, saldo y luego las fechas
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>();

  // Normalizar saltos de línea y espacios múltiples
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Patrón principal para el formato Santander online:
  // "F. Valor" marca el inicio de cada movimiento
  // Luego viene el concepto (puede ser multilínea), importe EUR, saldo EUR
  // Y finalmente las dos fechas (contable y valor)
  
  // Dividir por "F. Valor" para obtener cada bloque de movimiento
  const blocks = normalizedText.split(/F\.\s*Valor\s*/i);
  
  // El primer bloque es el encabezado, lo ignoramos
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    
    if (!block) continue;
    
    // Buscar el patrón: Concepto ... Importe EUR Saldo EUR seguido de fechas
    // El concepto puede contener saltos de línea
    // Patrón: texto ... [-]X.XXX,XX EUR X.XXX,XX EUR \n fecha \n fecha
    const movementPattern = /^([\s\S]+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR\s+(\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR\s*\n?\s*(\d{2}[/-]\d{2}[/-]\d{4})\s*\n?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i;
    
    const match = block.match(movementPattern);
    
    if (match) {
      const conceptoRaw = match[1];
      const importeRaw = match[2];
      const saldoRaw = match[3];
      const fContable = normalizeDate(match[4]);
      const fValor = normalizeDate(match[5]);
      
      // Limpiar el concepto (quitar saltos de línea extras, espacios múltiples)
      const concepto = cleanConcept(conceptoRaw);
      
      const uniqueKey = `${fContable}-${fValor}-${concepto.substring(0, 30)}-${importeRaw}`;
      
      if (!seenEntries.has(uniqueKey) && isValidConcept(concepto)) {
        seenEntries.add(uniqueKey);
        
        const record: BankRecord = {
          id: generateFileId(),
          fContable,
          fValor,
          concepto,
          importeRaw,
          importe: parseCurrency(importeRaw),
          saldo: parseCurrency(saldoRaw),
          sourceFile: fileName,
          bankType: 'santander',
        };
        
        console.log(`[Santander Parser] Match:`, {
          fContable,
          fValor,
          concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
          importe: importeRaw,
          saldo: saldoRaw,
        });
        
        records.push(record);
      }
    }
  }

  // Si no encontramos nada con el formato de bloques, intentar formato alternativo
  // (para otros tipos de extractos de Santander)
  if (records.length === 0) {
    records.push(...extractAlternativeFormat(normalizedText, fileName, seenEntries));
  }

  return records;
}

/**
 * Formato alternativo: fechas al principio de línea
 * DD/MM/YYYY DD/MM/YYYY Concepto Importe EUR Saldo EUR
 */
function extractAlternativeFormat(text: string, fileName: string, seenEntries: Set<string>): BankRecord[] {
  const records: BankRecord[] = [];
  
  // Patrón con dos fechas al inicio
  const pattern = /(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR(?:\s+(\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR)?/gi;
  
  const matches = Array.from(text.matchAll(pattern));
  
  for (const match of matches) {
    const fContable = normalizeDate(match[1]);
    const fValor = normalizeDate(match[2]);
    const concepto = cleanConcept(match[3]);
    const importeRaw = match[4];
    const saldoRaw = match[5] || null;

    const uniqueKey = `${fContable}-${fValor}-${concepto.substring(0, 30)}-${importeRaw}`;
    
    if (!seenEntries.has(uniqueKey) && isValidConcept(concepto)) {
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
        bankType: 'santander',
      };
      
      console.log(`[Santander Parser] Match (alt):`, {
        fContable,
        fValor,
        concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
        importe: importeRaw,
      });
      
      records.push(record);
    }
  }
  
  return records;
}

/**
 * Normaliza la fecha al formato DD/MM/YYYY
 * Soporta años de 2 y 4 dígitos
 */
function normalizeDate(date: string): string {
  let normalized = date.replace(/-/g, '/');
  
  // Si el año tiene solo 2 dígitos, expandirlo
  const parts = normalized.split('/');
  if (parts.length === 3 && parts[2].length === 2) {
    const year = parseInt(parts[2], 10);
    // Asumimos que años < 50 son 20XX, >= 50 son 19XX
    parts[2] = year < 50 ? `20${parts[2]}` : `19${parts[2]}`;
    normalized = parts.join('/');
  }
  
  return normalized;
}

/**
 * Limpia el concepto de caracteres no deseados
 */
function cleanConcept(concept: string): string {
  return concept
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Verifica si el concepto es válido (no es un encabezado o texto basura)
 */
function isValidConcept(concept: string): boolean {
  if (!concept || concept.length < 3) return false;
  
  const invalidKeywords = [
    'fecha', 'concepto', 'importe', 'saldo', 'debe', 'haber',
    'operación', 'valor', 'descripción', 'movimiento', 'página',
    'extracto', 'cuenta', 'titular', 'iban'
  ];
  
  const lowerConcept = concept.toLowerCase();
  
  // Si es muy corto y contiene palabras de encabezado, rechazar
  if (concept.length < 30) {
    if (invalidKeywords.some(keyword => lowerConcept === keyword)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Parsea un archivo PDF de extracto Santander
 * @param file - Archivo PDF del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseSantanderFile(file: File): Promise<BankRecord[]> {
  const text = await extractTextFromPdf(file);
  
  console.log(`[Santander Parser] Archivo: ${file.name}`);
  console.log(`[Santander Parser] Texto extraído (primeros 500 chars):`, text.substring(0, 500));
  
  const records = extractMovementsFromText(text, file.name);
  
  console.log(`[Santander Parser] Movimientos encontrados: ${records.length}`);
  
  return records;
}

/**
 * Parsea múltiples archivos PDF de Santander
 * @param files - Array de archivos PDF
 * @returns Array consolidado de todos los registros
 */
export async function parseSantanderFiles(files: File[]): Promise<BankRecord[]> {
  const allRecords: BankRecord[] = [];

  for (const file of files) {
    try {
      const records = await parseSantanderFile(file);
      allRecords.push(...records);
    } catch (error) {
      console.error(`Error procesando archivo Santander ${file.name}:`, error);
      throw new Error(`Error al procesar ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return allRecords;
}
