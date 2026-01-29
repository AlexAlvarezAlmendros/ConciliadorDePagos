/**
 * Fila individual de resultado
 */

import { useState, useRef, useEffect } from 'react';
import type { MatchedBankRecord } from '../../types';
import { BANK_NAMES } from '../../types';

interface ResultRowProps {
  record: MatchedBankRecord;
  onUpdateDocument: (recordId: string, newDocument: string) => void;
}

const bankColors: Record<string, string> = {
  bbva: 'bg-blue-100 text-blue-800',
  caixabank: 'bg-cyan-100 text-cyan-800',
  sabadell: 'bg-amber-100 text-amber-800',
  santander: 'bg-red-100 text-red-800',
};

export function ResultRow({ record, onUpdateDocument }: ResultRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(record.matchedDoc || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const isMatched = record.status === 'match';
  const bankColorClass = bankColors[record.bankType] || 'bg-slate-100 text-slate-800';

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdateDocument(record.id, editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(record.matchedDoc || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

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
      <td className="px-6 py-3 border-l border-slate-100">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 w-full"
              placeholder="Número de documento"
            />
          </div>
        ) : (
          <div
            className="font-bold text-indigo-700 cursor-pointer hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            onClick={() => setIsEditing(true)}
            title="Clic para editar"
          >
            {record.matchedDoc || '-'}
          </div>
        )}
      </td>
    </tr>
  );
}
