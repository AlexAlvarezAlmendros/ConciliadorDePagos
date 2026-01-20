/**
 * Componente de encabezado principal de la aplicación
 */

import { Database, Loader2 } from 'lucide-react';

interface HeaderProps {
  isPdfLoading?: boolean;
}

export function Header({ isPdfLoading = false }: HeaderProps) {
  return (
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-3">
        <Database className="w-8 h-8 text-blue-600" />
        Conciliador Automático de Pagos
      </h1>
      <p className="text-slate-500">
        Sube tus extractos BBVA y listados de Proveedores para cruzar datos automáticamente.
      </p>
      {isPdfLoading && (
        <div className="text-xs text-orange-500 flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Cargando motor de análisis PDF...
        </div>
      )}
    </div>
  );
}
