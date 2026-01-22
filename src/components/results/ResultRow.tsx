/**
 * Fila individual de resultado
 */

import type { MatchedBankRecord } from '../../types';
import { BANK_NAMES } from '../../types';

interface ResultRowProps {
  record: MatchedBankRecord;
}

const bankColors: Record<string, string> = {
  bbva: 'bg-blue-100 text-blue-800',
  caixabank: 'bg-cyan-100 text-cyan-800',
  sabadell: 'bg-amber-100 text-amber-800',
  santander: 'bg-red-100 text-red-800',
};

export function ResultRow({ record }: ResultRowProps) {
  const isMatched = record.status === 'match';
  const bankColorClass = bankColors[record.bankType] || 'bg-slate-100 text-slate-800';

  return (
    <tr
      className={`hover:bg-slate-50 transition-colors ${
        isMatched ? 'bg-emerald-50/30' : ''
      }`}
    >
      <td className="px-6 py-3">
        {isMatched ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            Conciliado
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            Pendiente
          </span>
        )}
      </td>
      <td className="px-6 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bankColorClass}`}>
          {BANK_NAMES[record.bankType] || record.bankType}
        </span>
      </td>
      <td className="px-6 py-3 font-medium text-slate-900">{record.fValor}</td>
      <td className="px-6 py-3 text-slate-500">{record.fContable}</td>
      <td
        className="px-6 py-3 text-slate-600 max-w-xs truncate"
        title={record.concepto}
      >
        {record.concepto}
      </td>
      <td
        className={`px-6 py-3 text-right font-mono ${
          record.importe < 0 ? 'text-red-600' : 'text-slate-700'
        }`}
      >
        {record.importeRaw}
      </td>
      <td className="px-6 py-3 border-l border-slate-100 font-bold text-indigo-700">
        {record.matchedDoc || '-'}
      </td>
    </tr>
  );
}
