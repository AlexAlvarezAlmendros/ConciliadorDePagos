/**
 * Parser específico para extractos bancarios del BBVA
 * Soporta múltiples formatos de extractos (originales y editados)
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Patrón principal para capturar movimientos BBVA
 * Formato: FechaContable FechaValor Concepto Importe EUR Saldo EUR
 * 
 * Ejemplo del texto extraído:
 * 31/12/2025   31/12/2025   CUOTAS DE LA SEGURIDAD SOCIAL  N 2025363003862843 TGSS. COTIZACION 001 REGIMEN GENERAL   -3.572,32 EUR   21.158,15 EUR
 */

/**
 * Intenta extraer movimientos del texto
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>(); // Evitar duplicados

  // Patrón: dos fechas, concepto, importe EUR, opcionalmente saldo EUR
  // Nota: algunos importes tienen 1 decimal (ej: -2,3 EUR) y otros 2 (ej: -2,30 EUR)
  const pattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR(?:\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s*EUR)?/gi;
  
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const fContable = match[1];
    const fValor = match[2];
    const concepto = match[3].trim();
    const importeRaw = match[4];
    const saldoRaw = match[5] || null;

    // Crear clave única incluyendo concepto para evitar duplicados
    const uniqueKey = `${fContable}-${fValor}-${concepto.substring(0, 30)}-${importeRaw}`;
    
    if (!seenEntries.has(uniqueKey)) {
      seenEntries.add(uniqueKey);
      
      // Validar que el concepto no sea solo espacios o muy corto
      if (concepto && concepto.length > 2) {
        const record: BankRecord = {
          id: generateFileId(),
          fContable,
          fValor,
          concepto,
          importeRaw,
          importe: parseCurrency(importeRaw),
          saldo: saldoRaw ? parseCurrency(saldoRaw) : null,
          sourceFile: fileName,
        };
        
        console.log(`[BBVA Parser] Match:`, {
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
