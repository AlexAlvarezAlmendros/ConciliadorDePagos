/**
 * Parser específico para listados de proveedores
 * Soporta múltiples formatos de cartera de proveedores
 */

import type { SupplierRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Múltiples patrones regex para capturar registros de proveedores
 * Formato esperado: Fecha Codigo Nombre Documento Referencia Importe Eur
 * 
 * NOTA: El campo "Documento" es el que nos interesa para el matching (ej: 1/FC/250482)
 */
const SUPPLIER_PATTERNS = [
  // Patrón 1: Formato completo con Documento antes de Referencia
  // Fecha | Codigo | Nombre | Documento | Referencia | Importe | Eur
  /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+(\d+\/[A-Z]{2,}\/\d+)\s+([A-Z0-9/-]+)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*Eur/gi,
  
  // Patrón 2: Documento con formato alfanumérico (ej: FC-2024-001)
  /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+([A-Z]{2,}-?\d+[-/]?\d*)\s+([A-Z0-9/-]+)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*Eur/gi,
  
  // Patrón 3: Formato más flexible
  /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+([A-Z0-9]+\/[A-Z]+\/\d+)\s+\S+\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*Eur/gi,
  
  // Patrón 4: Sin referencia explícita (documento seguido directamente de importe)
  /(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+(\d+\/[A-Z]{2,}\/\d+)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*Eur/gi,
];

/**
 * Extrae registros de proveedores usando múltiples patrones
 */
function extractSupplierRecords(text: string, fileName: string): SupplierRecord[] {
  const records: SupplierRecord[] = [];
  const seenEntries = new Set<string>();

  for (let patternIndex = 0; patternIndex < SUPPLIER_PATTERNS.length; patternIndex++) {
    const pattern = SUPPLIER_PATTERNS[patternIndex];
    pattern.lastIndex = 0;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      // Los patrones tienen diferente número de grupos
      // Patrones 1, 2, 3: 6 grupos (fecha, codigo, nombre, documento, referencia, importe)
      // Patrón 4: 5 grupos (fecha, codigo, nombre, documento, importe)
      
      const hasReferencia = match.length >= 7;
      
      const fecha = match[1];
      const codigo = match[2];
      const nombre = match[3].trim();
      const documento = match[4]; // Este es el campo DOCUMENTO que queremos
      const referencia = hasReferencia ? match[5] : '';
      const importeRaw = hasReferencia ? match[6] : match[5];

      // Clave única para evitar duplicados
      const uniqueKey = `${fecha}-${documento}-${importeRaw}`;
      
      if (!seenEntries.has(uniqueKey) && documento) {
        seenEntries.add(uniqueKey);
        
        const record: SupplierRecord = {
          id: generateFileId(),
          fecha,
          codigo,
          nombre,
          documento,
          referencia,
          importeRaw,
          importe: parseCurrency(importeRaw),
          sourceFile: fileName,
        };
        
        console.log(`[Supplier Parser] Match (patrón ${patternIndex + 1}):`, {
          fecha,
          codigo,
          nombre: nombre.substring(0, 20) + '...',
          documento, // <-- Este es el valor que usamos para el matching
          referencia,
          importe: importeRaw,
        });
        
        records.push(record);
      }
    }
  }

  return records;
}

/**
 * Parsea un archivo PDF de listado de proveedores
 * @param file - Archivo PDF del listado
 * @returns Array de registros de proveedores encontrados
 */
export async function parseSupplierFile(file: File): Promise<SupplierRecord[]> {
  const text = await extractTextFromPdf(file);
  
  console.log(`[Supplier Parser] Archivo: ${file.name}`);
  console.log(`[Supplier Parser] Texto extraído (primeros 800 chars):`, text.substring(0, 800));
  
  const records = extractSupplierRecords(text, file.name);
  
  console.log(`[Supplier Parser] Registros encontrados: ${records.length}`);
  
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
