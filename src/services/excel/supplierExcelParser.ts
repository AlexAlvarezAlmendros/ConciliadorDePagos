/**
 * Parser específico para archivos Excel de cobros de proveedores
 * 
 * Formato detectado:
 * - Múltiples hojas, cada una representa un mes
 * - Columnas: Client/Previsió, Data fra., Num. fra., Venciment, IMPORT, NEGOC./COBRAT, En cartera, BANCO
 */

import * as XLSX from 'xlsx';
import type { SupplierRecord } from '../../types';
import { parseCurrency, generateFileId } from '../../utils';

export interface ExcelSheetInfo {
  name: string;
  month: string;
  year: string;
  recordCount: number;
}

export interface SupplierExcelData {
  sheets: ExcelSheetInfo[];
  records: Map<string, SupplierRecord[]>; // sheetName -> records
}

/**
 * Lee todas las hojas de un archivo Excel y retorna información sobre ellas
 */
export async function getExcelSheets(file: File): Promise<ExcelSheetInfo[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets: ExcelSheetInfo[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: '' 
          }) as unknown[][];
          
          // Intentar extraer mes y año de la hoja
          const { month, year } = extractMonthYear(jsonData, sheetName);
          
          // Contar registros válidos (aproximado)
          const recordCount = countValidRecords(jsonData);
          
          return {
            name: sheetName,
            month,
            year,
            recordCount
          };
        });
        
        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parsea las hojas seleccionadas de un archivo Excel de cobros
 */
export async function parseSupplierExcel(
  file: File, 
  selectedSheets: string[]
): Promise<SupplierRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allRecords: SupplierRecord[] = [];
        
        // Procesar solo las hojas seleccionadas
        for (const sheetName of selectedSheets) {
          if (!workbook.SheetNames.includes(sheetName)) {
            console.warn(`[Supplier Excel] Hoja no encontrada: ${sheetName}`);
            continue;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: '' 
          }) as unknown[][];
          
          console.log(`[Supplier Excel] Procesando hoja: ${sheetName}, Filas: ${jsonData.length}`);
          
          const records = parseSheet(jsonData, file.name, sheetName);
          allRecords.push(...records);
        }
        
        console.log(`[Supplier Excel] Total registros parseados: ${allRecords.length}`);
        resolve(allRecords);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extrae el mes y año de los datos de la hoja
 */
function extractMonthYear(rows: unknown[][], sheetName: string): { month: string; year: string } {
  // Buscar en las primeras filas una celda con formato "Mes: NOMBRE YYYY"
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    for (const cell of row) {
      const str = String(cell || '').trim();
      
      // Buscar patrón como "OCTUBRE", "FEBRER", etc seguido de año
      const monthYearMatch = /^(GENER|FEBRER|MARÇ|ABRIL|MAIG|JUNY|JULIOL|AGOST|SETEMBRE|OCTUBRE|NOVEMBRE|DESEMBRE|ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(\d{4})$/i.exec(str);
      
      if (monthYearMatch) {
        return {
          month: monthYearMatch[1],
          year: monthYearMatch[2]
        };
      }
    }
  }
  
  // Fallback: usar el nombre de la hoja
  return {
    month: sheetName,
    year: ''
  };
}

/**
 * Cuenta registros válidos (filas con datos de cliente)
 */
function countValidRecords(rows: unknown[][]): number {
  let count = 0;
  const headerRow = findHeaderRow(rows);
  
  if (headerRow === -1) return 0;
  
  // Identificar columnas de forma dinámica
  const header = rows[headerRow].map(c => String(c || '').toLowerCase().trim());
  const colClient = header.findIndex(h => h.includes('client') || h.includes('previsió') || h.includes('previsio'));
  const colNumFra = header.findIndex(h => h.includes('num') && h.includes('fra'));
  const colImport = header.findIndex(h => h === 'import');
  
  if (colClient === -1 || (colNumFra === -1 && colImport === -1)) return 0;
  
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= Math.max(colClient, colNumFra, colImport)) continue;
    
    const cliente = String(row[colClient] || '').trim();
    const numFactura = colNumFra >= 0 ? String(row[colNumFra] || '').trim() : '';
    const importe = colImport >= 0 ? String(row[colImport] || '').trim() : '';
    
    // Si tiene cliente y (número de factura o importe), es un registro válido
    if (cliente && (numFactura || importe)) {
      // Filtrar totales
      if (cliente === 'T O T A L S' || cliente.includes('TOTAL')) continue;
      count++;
    }
  }
  
  return count;
}

/**
 * Encuentra el índice de la fila de encabezados
 */
function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    
    const cells = row.map(c => String(c || '').toLowerCase().trim());
    
    // Buscar encabezados: Còdic (opcional), Client/Previsió, Data fra., Num. fra., Venciment, IMPORT
    const hasClient = cells.some(c => c.includes('client') || c.includes('previsió') || c.includes('previsio'));
    const hasDataFra = cells.some(c => c.includes('data fra'));
    const hasNumFra = cells.some(c => c.includes('num') && c.includes('fra'));
    const hasImport = cells.some(c => c === 'import');
    const hasVenciment = cells.some(c => c.includes('venciment'));
    
    // Aceptar si tiene cliente y al menos dos de los otros campos clave
    const keyFieldsCount = [hasDataFra, hasNumFra, hasImport, hasVenciment].filter(Boolean).length;
    
    if (hasClient && keyFieldsCount >= 2) {
      console.log(`[Supplier Excel] ✓ Encabezados encontrados en fila ${i}`);
      return i;
    }
  }
  
  return -1;
}

/**
 * Normaliza una fecha de varios formatos a DD/MM/YYYY
 * Formatos soportados:
 * - DD-MMM-YY (ej: 25-oct-25)
 * - MM/DD/YYYY (ej: 10/30/2025) - formato americano
 * - DD/MM/YYYY (ej: 30/10/2025) - formato europeo
 * - Serial de Excel
 */
function normalizeDate(dateStr: string | number | undefined): string {
  if (!dateStr) return '';
  
  const str = String(dateStr).trim();
  
  // Formato DD-MMM-YY (ej: 25-nov-24) - PRIORIDAD ALTA
  const monthMap: Record<string, string> = {
    'ene': '01', 'enero': '01', 'gen': '01', 'gener': '01', 'jan': '01',
    'feb': '02', 'febrero': '02', 'febrer': '02',
    'mar': '03', 'marzo': '03', 'març': '03',
    'abr': '04', 'abril': '04', 'apr': '04',
    'may': '05', 'mayo': '05', 'maig': '05',
    'jun': '06', 'junio': '06', 'juny': '06',
    'jul': '07', 'julio': '07', 'juliol': '07',
    'ago': '08', 'agosto': '08', 'agost': '08', 'aug': '08',
    'sep': '09', 'septiembre': '09', 'setembre': '09', 'sept': '09',
    'oct': '10', 'octubre': '10',
    'nov': '11', 'noviembre': '11', 'novembre': '11',
    'dic': '12', 'diciembre': '12', 'desembre': '12', 'dec': '12'
  };
  
  const matchDDMMMYY = /^(\d{1,2})-([a-zá-ú]+)-(\d{2,4})$/i.exec(str);
  if (matchDDMMMYY) {
    const day = matchDDMMMYY[1].padStart(2, '0');
    const monthName = matchDDMMMYY[2].toLowerCase();
    const yearShort = matchDDMMMYY[3];
    
    const month = monthMap[monthName] || '01';
    const year = yearShort.length === 2 ? `20${yearShort}` : yearShort;
    
    return `${day}/${month}/${year}`;
  }
  
  // Formato MM/DD/YYYY (ej: 10/30/2025) - formato americano
  // También formato MM/DD/YY (ej: 10/30/25) - formato americano con año corto
  // En estos archivos Excel, todas las fechas con / son formato americano
  const matchSlashLong = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  const matchSlashShort = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(str);
  
  if (matchSlashLong) {
    const month = matchSlashLong[1].padStart(2, '0');
    const day = matchSlashLong[2].padStart(2, '0');
    const year = matchSlashLong[3];
    
    return `${day}/${month}/${year}`;
  }
  
  if (matchSlashShort) {
    const month = matchSlashShort[1].padStart(2, '0');
    const day = matchSlashShort[2].padStart(2, '0');
    const yearShort = matchSlashShort[3];
    const year = `20${yearShort}`;
    
    return `${day}/${month}/${year}`;
  }
  
  // Si es un número serial de Excel
  if (/^\d+$/.test(str) && parseInt(str, 10) > 1000) {
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
 * Parsea una hoja del Excel
 */
function parseSheet(rows: unknown[][], fileName: string, sheetName: string): SupplierRecord[] {
  const records: SupplierRecord[] = [];
  const headerRow = findHeaderRow(rows);
  
  if (headerRow === -1) {
    console.warn(`[Supplier Excel] No se encontraron encabezados en hoja: ${sheetName}`);
    return records;
  }
  
  // Identificar índices de columnas (buscando de forma flexible)
  const header = rows[headerRow].map(c => String(c || '').toLowerCase().trim());
  
  const colCodic = header.findIndex(h => h.includes('còdic') || h.includes('codic') || h === 'codi');
  const colClient = header.findIndex(h => h.includes('client') || h.includes('previsió') || h.includes('previsio'));
  const colDataFra = header.findIndex(h => h.includes('data fra'));
  const colNumFra = header.findIndex(h => h.includes('num') && h.includes('fra'));
  const colVenciment = header.findIndex(h => h.includes('venciment'));
  const colImport = header.findIndex(h => h === 'import');
  const colFecha = header.findIndex(h => h === 'fecha');
  
  console.log(`[Supplier Excel] Columnas - Còdic: ${colCodic}, Cliente: ${colClient}, Data fra: ${colDataFra}, Num fra: ${colNumFra}, Venciment: ${colVenciment}, Import: ${colImport}, Fecha: ${colFecha}`);
  
  // Procesar filas de datos
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < Math.max(colClient, colImport) + 1) continue;
    
    const codic = colCodic >= 0 ? String(row[colCodic] || '').trim() : '';
    const cliente = String(row[colClient] || '').trim();
    const dataFra = colDataFra >= 0 ? String(row[colDataFra] || '').trim() : '';
    const numFra = colNumFra >= 0 ? String(row[colNumFra] || '').trim() : '';
    const venciment = colVenciment >= 0 ? String(row[colVenciment] || '').trim() : '';
    const importRaw = colImport >= 0 ? String(row[colImport] || '').trim() : '';
    const fechaCol = colFecha >= 0 ? String(row[colFecha] || '').trim() : '';
    
    // Saltar filas vacías o totales
    if (!cliente || !numFra || !importRaw) continue;
    if (cliente === 'T O T A L S' || cliente.includes('TOTAL')) continue;
    
    // Parsear importe
    const importe = parseCurrency(importRaw);
    if (importe === 0) continue;
    
    // Normalizar fechas - priorizar fecha de vencimiento, luego fecha de factura
    let fecha = normalizeDate(venciment || dataFra);
    
    // Si hay una columna FECHA y tiene datos, usarla como referencia adicional
    if (fechaCol && !fecha) {
      fecha = normalizeDate(fechaCol);
    }
    
    const record: SupplierRecord = {
      id: generateFileId(),
      fecha,
      codigo: codic,
      nombre: cliente,
      documento: numFra,
      referencia: '', // No disponible en este formato
      importeRaw: importRaw,
      importe,
      sourceFile: `${fileName} - ${sheetName}`
    };
    
    console.log(`[Excel Record] ${sheetName} | Cliente: ${cliente} | Fecha: ${fecha} | Doc: ${numFra} | Importe: ${importe}`);
    records.push(record);
  }
  
  console.log(`[Supplier Excel] Hoja ${sheetName}: ${records.length} registros válidos`);
  console.table(records.map(r => ({
    Fecha: r.fecha,
    Cliente: r.nombre,
    Documento: r.documento,
    Importe: r.importe,
    ImporteRaw: r.importeRaw
  })));
  
  return records;
}
