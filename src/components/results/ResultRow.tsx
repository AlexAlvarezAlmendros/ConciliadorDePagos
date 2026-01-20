/**
 * Fila individual de resultado
 */

import type { MatchedBankRecord } from '../../types';

interface ResultRowProps {
  record: MatchedBankRecord;
}

export function ResultRow({ record }: ResultRowProps) {
  const isMatched = record.status === 'match';

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
