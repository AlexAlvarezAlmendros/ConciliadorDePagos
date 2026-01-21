/**
 * Parser específico para listados de proveedores
 * Soporta múltiples formatos de cartera de proveedores
 */

import type { SupplierRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';
import { extractTextFromPdf } from './pdfLoader';

/**
 * Extrae registros de proveedores del texto del PDF
 * 
 * Formato extraído por PDF.js (orden interno del PDF):
 * Situación | Nombre | Código | Fecha | Referencia | Documento | Importe | Eur
 * 
 * Ejemplo real extraído:
 * Pendiente GURBTEC IGUANA TELECOM, S.L. 286 05/12/2025   I25632985 1/FC/250487   198,89   Eur
 */
function extractSupplierRecords(text: string, fileName: string): SupplierRecord[] {
  const records: SupplierRecord[] = [];
  const seenEntries = new Set<string>();

  // Patrón principal: Situacion Nombre Codigo Fecha Referencia Documento Importe Eur
  // El nombre puede contener comas, puntos, espacios, etc.
  // El documento siempre tiene formato número/letras/número (ej: 1/FC/250487)
  const pattern = /(?:Pendiente|Pagado|Vencido)\s+(.+?)\s+(\d{1,4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(\d+\/[A-Z]{2,}\/\d+)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*Eur/gi;
  
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    let nombre = match[1].trim();
    const codigo = match[2];
    const fecha = match[3];
    const referencia = match[4];
    const documento = match[5];
    const importeRaw = match[6];

    // Limpiar el nombre: quitar fecha si aparece al inicio (ej: "02/10/2025 SOLRED SA" -> "SOLRED SA")
    nombre = nombre.replace(/^\d{2}\/\d{2}\/\d{4}\s+/, '');

    const uniqueKey = `${fecha}-${documento}-${importeRaw}`;
    
    if (!seenEntries.has(uniqueKey) && documento && nombre) {
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
      
      console.log(`[Supplier Parser] Match:`, {
        fecha,
        codigo,
        nombre,
        documento,
        referencia,
        importe: importeRaw,
      });
      
      records.push(record);
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
