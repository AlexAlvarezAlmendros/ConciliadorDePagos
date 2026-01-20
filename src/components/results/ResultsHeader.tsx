/**
 * Encabezado de la tabla de resultados con estadísticas
 */

import { CheckCircle, Download } from 'lucide-react';
import type { ReconciliationStats } from '../../types';

interface ResultsHeaderProps {
  stats: ReconciliationStats;
  onExport: () => void;
}

export function ResultsHeader({ stats, onExport }: ResultsHeaderProps) {
  return (
    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h3 className="text-xl font-bold text-slate-800">
          Resultados del Cruce
        </h3>
        <div className="flex gap-4 mt-2 text-sm flex-wrap">
          <span className="text-slate-500">
            BBVA: <b className="text-slate-800">{stats.bbvaTotal}</b>
          </span>
          <span className="text-slate-500">
            Proveedores: <b className="text-slate-800">{stats.supplierTotal}</b>
          </span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Coincidencias: {stats.matches} ({stats.matchPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Descargar CSV
      </button>
    </div>
  );
}
