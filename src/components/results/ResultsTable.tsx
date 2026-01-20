/**
 * Tabla completa de resultados de conciliación
 */

import type { MatchedBankRecord, ReconciliationStats } from '../../types';
import { ResultsHeader } from './ResultsHeader';
import { ResultRow } from './ResultRow';

interface ResultsTableProps {
  records: MatchedBankRecord[];
  stats: ReconciliationStats;
  onExport: () => void;
}

export function ResultsTable({ records, stats, onExport }: ResultsTableProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in-up">
      <ResultsHeader stats={stats} onExport={onExport} />

      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
            <tr>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">F. Valor (BBVA)</th>
              <th className="px-6 py-3">F. Contable</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3 text-right">Importe</th>
              <th className="px-6 py-3 bg-indigo-50 text-indigo-700 border-l border-indigo-100">
                Documento (Match)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <ResultRow key={record.id} record={record} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
