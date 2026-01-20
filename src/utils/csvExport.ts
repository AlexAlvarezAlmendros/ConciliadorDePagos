import type { MatchedBankRecord } from '../types';

/**
 * Genera contenido CSV a partir de los resultados de conciliación
 */
export function generateCsvContent(records: MatchedBankRecord[]): string {
  const headers = [
    'F. Contable',
    'F. Valor',
    'Concepto',
    'Importe',
    'Documento Proveedor',
    'Proveedor (Nombre)',
    'Estado',
  ];

  const rows = records.map((record) => [
    record.fContable,
    record.fValor,
    `"${record.concepto.replace(/"/g, '""')}"`, // Escapar comillas dobles
    record.importeRaw,
    record.matchedDoc || 'NO ENCONTRADO',
    record.supplierName || '-',
    record.status === 'match' ? 'Conciliado' : 'Pendiente',
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n');

  return csvContent;
}

/**
 * Descarga un archivo CSV con los resultados
 */
export function downloadCsv(records: MatchedBankRecord[], filename: string = 'conciliacion_bancaria.csv'): void {
  const csvContent = generateCsvContent(records);
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
