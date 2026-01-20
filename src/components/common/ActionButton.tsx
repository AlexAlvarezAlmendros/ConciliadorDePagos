/**
 * Botón primario reutilizable
 */

import { RefreshCw, ArrowRight } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function ActionButton({
  onClick,
  disabled = false,
  isLoading = false,
  loadingText = 'Procesando...',
  children,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white
        shadow-lg transition-all transform hover:scale-105
        ${disabled || isLoading
          ? 'bg-slate-400 cursor-not-allowed hover:scale-100'
          : 'bg-indigo-600 hover:bg-indigo-700'
        }
      `}
    >
      {isLoading ? (
        <>
          <RefreshCw className="w-5 h-5 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <ArrowRight className="w-5 h-5" />
          {children}
        </>
      )}
    </button>
  );
}
