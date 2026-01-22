/**
 * Parser específico para extractos bancarios de CaixaBank en formato Excel (XLS/XLSX)
 * 
 * Formato detectado:
 * Fecha | Fecha valor | Movimiento | Más datos | Importe | Saldo
 * DD/MM/YYYY | DD/MM/YYYY | texto | texto opcional | -X.XXX,XX | X.XXX,XX
 */

import * as XLSX from 'xlsx';
import type { BankRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';

/**
 * Lee un archivo Excel y retorna su contenido como array de arrays
 */
async function readExcelFile(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a array de arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false, // Obtener valores formateados como strings
          defval: '' 
        }) as unknown[][];
        
        console.log(`[CaixaBank Excel] Hoja: ${firstSheetName}, Filas: ${jsonData.length}`);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normaliza una fecha de DD/MM/YYYY a DD/MM/YYYY
 */
function normalizeDate(dateStr: string | number | undefined): string {
  if (!dateStr) return '';
  
  const str = String(dateStr).trim();
  
  // Si ya está en formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }
  
  // Si está en formato DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str.replace(/-/g, '/');
  }
  
  // Si es un número serial de Excel (días desde 1900)
  if (/^\d+$/.test(str)) {
    const excelDate = parseInt(str, 10);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  return str;
}

/**
 * Encuentra el índice de la fila de encabezados
 */
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    
    const cells = row.map(c => String(c || '').toLowerCase().trim());
    
    // Buscar encabezados exactos de CaixaBank: Fecha, Fecha valor, Movimiento, Más datos, Importe, Saldo
    const hasDate = cells.some(c => c === 'fecha');
    const hasDateValue = cells.some(c => c === 'fecha valor');
    const hasMovement = cells.some(c => c === 'movimiento');
    const hasAmount = cells.some(c => c === 'importe');
    
    if (hasDate && hasDateValue && hasMovement && hasAmount) {
      console.log(`[CaixaBank Excel] ✓ Encabezados encontrados en fila ${i}:`, row);
      return i;
    }
    
    // Fallback: buscar por contenido parcial
    const rowStr = cells.join(' ');
    if (rowStr.includes('fecha') && rowStr.includes('movimiento') && rowStr.includes('importe')) {
      console.log(`[CaixaBank Excel] ✓ Encabezados (parcial) encontrados en fila ${i}:`, row);
      return i;
    }
  }
  
  console.log(`[CaixaBank Excel] ✗ No se encontraron encabezados`);
  return -1;
}

/**
 * Parsea las filas de datos del Excel de CaixaBank
 * Formato: Fecha | Fecha valor | Movimiento | Más datos | Importe | Saldo
 */
function parseDataRows(rows: unknown[][], startIndex: number, fileName: string): BankRecord[] {
  const records: BankRecord[] = [];
  const seenEntries = new Set<string>();

  console.log(`[CaixaBank Excel] Parseando desde fila ${startIndex}, total filas: ${rows.length}`);

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - muy corta:`, row);
      continue;
    }

    // Formato: Fecha | Fecha valor | Movimiento | Más datos | Importe | Saldo
    const [fecha, fechaValor, movimiento, masDatos, importe, saldo] = row.map(c => 
      c !== null && c !== undefined ? String(c).trim() : ''
    );

    console.log(`[CaixaBank Excel] Fila ${i}:`, { fecha, fechaValor, movimiento, masDatos, importe, saldo });

    // Validar que tenemos al menos fecha y movimiento
    if (!fecha || !movimiento) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - sin fecha o movimiento`);
      continue;
    }

    // Validar que la fecha parece una fecha válida
    const fechaNorm = normalizeDate(fecha);
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNorm)) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - fecha inválida: ${fecha} -> ${fechaNorm}`);
      continue;
    }

    const fechaValorNorm = normalizeDate(fechaValor) || fechaNorm;
    
    // Construir concepto combinando movimiento y más datos
    const concepto = masDatos 
      ? `${movimiento} - ${masDatos}`.trim()
      : movimiento;

    // Normalizar importe (quitar espacios, EUR, €)
    let importeClean = importe.replace(/\s/g, '').replace(/€/g, '').replace(/EUR/gi, '').trim();
    
    // Si el importe está vacío, saltar
    if (!importeClean) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - importe vacío`);
      continue;
    }

    // Detectar formato del importe y convertir a formato español (1.234,56)
    // Formato inglés del Excel: -25.99 o -9,467.18 (coma miles, punto decimal)
    // Formato español esperado: -25,99 o -9.467,18 (punto miles, coma decimal)
    
    // Detectar si es formato inglés (punto decimal)
    // Patrón inglés: opcional negativo, dígitos, opcionalmente coma+3 dígitos (miles), punto + 1-2 dígitos (decimal)
    const formatoIngles = /^-?\d{1,3}(?:,\d{3})*\.\d{1,2}$/.test(importeClean) || 
                          /^-?\d+\.\d{1,2}$/.test(importeClean);
    
    if (formatoIngles) {
      // Convertir de formato inglés a español
      // 1. Quitar comas (separador de miles en inglés)
      // 2. Reemplazar punto por coma (decimal)
      importeClean = importeClean.replace(/,/g, '').replace('.', ',');
      console.log(`[CaixaBank Excel] Fila ${i}: convertido de formato inglés a español: ${importe} -> ${importeClean}`);
    }

    // Validar que el importe parece un número en formato español
    // Aceptar: -25,99 | -1.234,56 | 25,99 | 1234,56 | -25 | 1234
    const esFormatoValido = /^-?\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(importeClean) || 
                            /^-?\d+,\d{1,2}$/.test(importeClean) ||
                            /^-?\d+$/.test(importeClean);
    
    if (!esFormatoValido) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - importe no válido: ${importeClean}`);
      continue;
    }

    // Si es número entero, añadir decimales
    if (/^-?\d+$/.test(importeClean)) {
      importeClean = importeClean + ',00';
    }

    const uniqueKey = `${fechaNorm}-${fechaValorNorm}-${concepto.substring(0, 30)}-${importeClean}`;
    
    if (seenEntries.has(uniqueKey)) {
      console.log(`[CaixaBank Excel] Fila ${i} ignorada - duplicado`);
      continue;
    }
    seenEntries.add(uniqueKey);

    const saldoClean = saldo ? saldo.replace(/\s/g, '').replace(/€/g, '').replace(/EUR/gi, '').trim() : null;

    const record: BankRecord = {
      id: generateFileId(),
      fContable: fechaNorm,
      fValor: fechaValorNorm,
      concepto,
      importeRaw: importeClean,
      importe: parseCurrency(importeClean),
      saldo: saldoClean ? parseCurrency(saldoClean) : null,
      sourceFile: fileName,
      bankType: 'caixabank',
    };

    console.log(`[CaixaBank Excel] ✓ Registro añadido:`, {
      fContable: fechaNorm,
      fValor: fechaValorNorm,
      concepto: concepto.substring(0, 40) + (concepto.length > 40 ? '...' : ''),
      importe: importeClean,
      saldo: saldoClean,
    });

    records.push(record);
  }

  return records;
}

/**
 * Parsea un archivo Excel de CaixaBank y extrae los movimientos
 * @param file - Archivo Excel (XLS o XLSX) del extracto bancario
 * @returns Array de registros bancarios encontrados
 */
export async function parseCaixabankExcelFile(file: File): Promise<BankRecord[]> {
  console.log(`[CaixaBank Excel] Procesando archivo: ${file.name}`);
  
  try {
    const rows = await readExcelFile(file);
    
    if (rows.length === 0) {
      console.warn(`[CaixaBank Excel] El archivo está vacío`);
      return [];
    }

    // Mostrar primeras filas para debug
    console.log(`[CaixaBank Excel] Primeras 5 filas:`, rows.slice(0, 5));

    // Encontrar la fila de encabezados
    const headerIndex = findHeaderRow(rows);
    
    if (headerIndex === -1) {
      console.warn(`[CaixaBank Excel] No se encontraron encabezados, intentando desde fila 0`);
      // Intentar parsear desde la primera fila que tenga datos
      return parseDataRows(rows, 0, file.name);
    }

    // Parsear desde la fila siguiente a los encabezados
    const records = parseDataRows(rows, headerIndex + 1, file.name);
    
    console.log(`[CaixaBank Excel] Total de registros encontrados: ${records.length}`);
    
    return records;
  } catch (error) {
    console.error(`[CaixaBank Excel] Error al procesar archivo:`, error);
    throw error;
  }
}
