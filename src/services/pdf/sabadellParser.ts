/**
 * Parser específico para extractos bancarios del Banco Sabadell
 * Soporta el formato de "Consulta de Movimientos" de Sabadell
 * 
 * Formato detectado:
 * FECHA OPER | CONCEPTO | FECHA VALOR | IMPORTE | SALDO
 * DD/MM/YYYY | texto (puede ser multilínea) | DD/MM/YYYY | -X.XXX,XX | -X.XXX,XX
 */

import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Intenta extraer movimientos del texto de Sabadell
 */
function extractMovementsFromText(text: string, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>();

  // Normalizar el texto - quitar el encabezado de columnas
  let normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Eliminar la línea de encabezado de columnas para evitar confusiones
    .replace(/FECHA\s+OPER\s+CONCEPTO\s+FECHA\s+VALOR\s+IMPORTE\s+SALDO\s*/gi, '\n');

  console.log(`[Sabadell Parser] Texto normalizado (primeros 600 chars):`, normalizedText.substring(0, 600));

  // Patrón principal para el formato Sabadell:
  // FECHA OPER (DD/MM/YYYY) + CONCEPTO + FECHA VALOR (DD/MM/YYYY) + IMPORTE + SALDO
  // El saldo puede ser negativo también (ej: -1.838,69)
  // Ejemplo: 31/10/2025 GASTOS REMESA DÉBIT.DIRECT.SEPA 00810148037546 30/10/2025 -73,17 9.250,06
  const linePattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})/g;
  
  const matches = Array.from(normalizedText.matchAll(linePattern));
  
  console.log(`[Sabadell Parser] Matches encontrados con patrón principal: ${matches.length}`);
  
  for (const match of matches) {
    const fContable = match[1];
    const concepto = cleanConcept(match[2]);
    const fValor = match[3];
    const importeRaw = match[4];
    const saldoRaw = match[5];

    const uniqueKey = `${fContable}-${fValor}-${importeRaw}-${saldoRaw}`;
    
    console.log(`[Sabadell Parser] Procesando match:`, { fContable, concepto: concepto.substring(0, 40), fValor, importeRaw, saldoRaw });
    
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
        bankType: 'sabadell',
      };
      
      console.log(`[Sabadell Parser] ✓ Registro añadido:`, {
        fContable,
        fValor,
        concepto: concepto.substring(0, 50) + (concepto.length > 50 ? '...' : ''),
        importe: importeRaw,
        saldo: saldoRaw,
      });
      
      records.push(record);
    } else {
      console.log(`[Sabadell Parser] ✗ Registro descartado - duplicado o concepto inválido`);
    }
  }

  // Si no encontramos suficientes, intentar con formato de conceptos multilínea
  if (records.length === 0) {
    console.log(`[Sabadell Parser] Intentando formato multilínea...`);
    records.push(...extractMultilineFormat(normalizedText, fileName, seenEntries));
  }

  return records;
}

/**
 * Extrae movimientos cuando el concepto puede estar en múltiples líneas
 * Busca patrones de: fecha inicial ... fecha valor importe saldo
 */
function extractMultilineFormat(text: string, fileName: string, seenEntries: Set<string>): BankRecord[] {
  const records: BankRecord[] = [];
  
  // Dividir por líneas que empiezan con fecha (DD/MM/YYYY)
  const lines = text.split('\n');
  let currentEntry: { fContable: string; conceptoParts: string[] } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ¿La línea empieza con una fecha?
    const startsWithDate = /^(\d{2}\/\d{2}\/\d{4})/.test(line);
    
    if (startsWithDate) {
      // Intentar extraer movimiento completo de esta línea
      const fullMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})$/);
      
      if (fullMatch) {
        const fContable = fullMatch[1];
        const concepto = cleanConcept(fullMatch[2]);
        const fValor = fullMatch[3];
        const importeRaw = fullMatch[4];
        const saldoRaw = fullMatch[5];
        
        const uniqueKey = `${fContable}-${fValor}-${importeRaw}-${saldoRaw}`;
        
        if (!seenEntries.has(uniqueKey) && isValidConcept(concepto)) {
          seenEntries.add(uniqueKey);
          
          records.push({
            id: generateFileId(),
            fContable,
            fValor,
            concepto,
            importeRaw,
            importe: parseCurrency(importeRaw),
            saldo: parseCurrency(saldoRaw),
            sourceFile: fileName,
            bankType: 'sabadell',
          });
        }
        currentEntry = null;
      } else {
        // La línea empieza con fecha pero no tiene el formato completo
        // Puede ser el inicio de un concepto multilínea
        const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.*)$/);
        if (dateMatch) {
          currentEntry = {
            fContable: dateMatch[1],
            conceptoParts: [dateMatch[2]],
          };
        }
      }
    } else if (currentEntry && line) {
      // Continuación del concepto multilínea
      // Verificar si esta línea contiene la fecha valor y los importes
      const endMatch = line.match(/^(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})\s+([-]?\d{1,3}(?:\.\d{3})*,\d{1,2})$/);
      
      if (endMatch) {
        // Esta línea tiene la parte final del movimiento
        currentEntry.conceptoParts.push(endMatch[1]);
        const concepto = cleanConcept(currentEntry.conceptoParts.join(' '));
        const fValor = endMatch[2];
        const importeRaw = endMatch[3];
        const saldoRaw = endMatch[4];
        
        const uniqueKey = `${currentEntry.fContable}-${fValor}-${importeRaw}-${saldoRaw}`;
        
        if (!seenEntries.has(uniqueKey) && isValidConcept(concepto)) {
          seenEntries.add(uniqueKey);
          
          records.push({
            id: generateFileId(),
            fContable: currentEntry.fContable,
            fValor,
            concepto,
            importeRaw,
            importe: parseCurrency(importeRaw),
            saldo: parseCurrency(saldoRaw),
            sourceFile: fileName,
            bankType: 'sabadell',
          });
        }
        currentEntry = null;
      } else if (!line.match(/^SALDO|^Documento|^FECHA|^Cuenta|^Titular|^Divisa|^Selección/i)) {
        // Es una línea de continuación del concepto
        currentEntry.conceptoParts.push(line);
      }
    }
  }
  
  return records;
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
  
  const invalidPatterns = [
    /^FECHA\s+OPER/i,
    /^CONCEPTO$/i,
    /^IMPORTE$/i,
    /^SALDO$/i,
    /^FECHA\s+VALOR/i,
    /^Documento\s+obtenido/i,
    /^CONSULTA\s+DE\s+MOVIMIENTOS/i,
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(concept));
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
