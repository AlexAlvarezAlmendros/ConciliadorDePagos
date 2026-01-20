/**
 * Parser específico para extractos bancarios del BBVA
 * Soporta múltiples formatos de extractos (originales y editados)
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Múltiples patrones regex para capturar movimientos BBVA
 * Soportamos diferentes formatos que pueden aparecer en extractos originales o editados
 */
const BBVA_PATTERNS = [
  // Patrón 1: Formato estándar con dos fechas, concepto, importe y EUR
  // Ejemplo: 31/12/2025 31/12/2025 CONCEPTO... -3.572,32 EUR
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s*EUR/gi,
  
  // Patrón 2: Formato con separadores de miles como puntos
  // Ejemplo: 31/12/2025 31/12/2025 PAGO PROVEEDOR -1.234,56 EUR
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*EUR/gi,
  
  // Patrón 3: Formato sin separador de miles
  // Ejemplo: 31/12/2025 31/12/2025 PAGO -123,45 EUR
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d+,\d{2})\s*EUR/gi,
  
  // Patrón 4: Formato con EUR antes o sin EUR explícito
  // Ejemplo: 31/12/2025 31/12/2025 CONCEPTO 1.234,56
  /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s|$)/gi,
  
  // Patrón 5: Solo una fecha (algunos extractos editados)
  // Ejemplo: 31/12/2025 PAGO PROVEEDOR -1.234,56 EUR
  /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*EUR/gi,
];

/**
 * Intenta extraer movimientos usando múltiples patrones
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>(); // Evitar duplicados

  for (const pattern of BBVA_PATTERNS) {
    // Reset del regex para cada iteración
    pattern.lastIndex = 0;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      // Determinar si es patrón de una o dos fechas
      const hasTwoDates = match.length >= 5;
      
      const fContable = match[1];
      const fValor = hasTwoDates ? match[2] : match[1]; // Si solo hay una fecha, usar la misma
      const concepto = hasTwoDates ? match[3] : match[2];
      const importeRaw = hasTwoDates ? match[4] : match[3];

      // Crear clave única para evitar duplicados
      const uniqueKey = `${fContable}-${fValor}-${importeRaw}`;
      
      if (!seenEntries.has(uniqueKey)) {
        seenEntries.add(uniqueKey);
        
        // Validar que el concepto no sea solo espacios o muy corto
        if (concepto && concepto.trim().length > 1) {
          records.push({
            id: generateFileId(),
            fContable,
            fValor,
            concepto: concepto.trim(),
            importeRaw,
            importe: parseCurrency(importeRaw),
            saldo: null,
            sourceFile: fileName,
          });
        }
      }
    }
  }

  return records;
}

/**
 * Parsea un archivo PDF de extracto BBVA
 * @param file - Archivo PDF del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseBbvaFile(file: File): Promise<BankRecord[]> {
  const text = await extractTextFromPdf(file);
  
  // Debug: mostrar primeros caracteres del texto extraído en consola
  console.log(`[BBVA Parser] Archivo: ${file.name}`);
  console.log(`[BBVA Parser] Texto extraído (primeros 500 chars):`, text.substring(0, 500));
  
  const records = extractMovementsFromText(text, file.name);
  
  console.log(`[BBVA Parser] Movimientos encontrados: ${records.length}`);
  
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
