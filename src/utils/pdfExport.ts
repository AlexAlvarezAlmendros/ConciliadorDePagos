/**
 * Utilidad para exportar resultados de conciliación a PDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MatchedBankRecord, ReconciliationStats } from '../types';
import { BANK_NAMES } from '../types';

/**
 * Genera y descarga un PDF con los resultados de la conciliación
 */
export function downloadPdf(
  records: MatchedBankRecord[],
  stats: ReconciliationStats,
  filename: string = 'conciliacion_bancaria.pdf'
): void {
  // Crear documento en formato A4 horizontal para mejor visualización de la tabla
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe de Conciliación Bancaria', pageWidth / 2, 15, { align: 'center' });

  // Fecha de generación
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generado: ${fecha}`, pageWidth / 2, 22, { align: 'center' });

  // Estadísticas resumen
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen:', 14, 32);
  
  doc.setFont('helvetica', 'normal');
  doc.text('- Movimientos Bancarios: ' + stats.bankTotal, 14, 38);
  doc.text('- Registros Proveedores: ' + stats.supplierTotal, 14, 44);
  doc.text('- Conciliados: ' + stats.matches + ' (' + stats.matchPercentage.toFixed(1) + '%)', 80, 38);
  doc.text('- Pendientes: ' + stats.unmatchedCount, 80, 44);

  // Preparar datos para la tabla
  const tableData = records.map((record) => [
    record.status === 'match' ? 'SI' : 'NO',
    record.bankType ? BANK_NAMES[record.bankType] : '-',
    record.fValor,
    record.fContable,
    record.concepto.length > 35 ? record.concepto.substring(0, 32) + '...' : record.concepto,
    record.importeRaw,
    record.matchedDoc || '-',
    record.supplierName 
      ? (record.supplierName.length > 18 ? record.supplierName.substring(0, 15) + '...' : record.supplierName)
      : '-',
  ]);

  // Generar tabla
  autoTable(doc, {
    startY: 52,
    head: [[
      'Conciliado',
      'Banco',
      'F. Valor',
      'F. Contable',
      'Concepto',
      'Importe',
      'Documento',
      'Proveedor',
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' }, // Conciliado
      1: { cellWidth: 22 }, // Banco
      2: { cellWidth: 20 }, // F. Valor
      3: { cellWidth: 20 }, // F. Contable
      4: { cellWidth: 65 }, // Concepto
      5: { cellWidth: 22, halign: 'right' }, // Importe
      6: { cellWidth: 32 }, // Documento
      7: { cellWidth: 35 }, // Proveedor
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gris muy claro
    },
    didParseCell: (data) => {
      // Colorear la columna de estado
      if (data.column.index === 0 && data.section === 'body') {
        const text = data.cell.text[0] || '';
        if (text === 'SI') {
          data.cell.styles.textColor = [16, 185, 129]; // Verde
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [107, 114, 128]; // Gris
        }
      }
      // Colorear importes negativos en rojo
      if (data.column.index === 5 && data.section === 'body') {
        const text = data.cell.text[0] || '';
        if (text.startsWith('-')) {
          data.cell.styles.textColor = [220, 38, 38]; // Rojo
        }
      }
    },
    margin: { top: 52, left: 14, right: 14 },
  });

  // Pie de página con número de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Descargar
  doc.save(filename);
}
