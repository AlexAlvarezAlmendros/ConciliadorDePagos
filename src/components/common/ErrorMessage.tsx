/**
 * Mensaje de error con estilo
 */

import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
