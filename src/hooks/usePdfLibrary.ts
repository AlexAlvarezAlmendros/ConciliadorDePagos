/**
 * Hook para cargar y verificar el estado de PDF.js
 */

import { useState, useEffect, useCallback } from 'react';
import { loadPdfLibrary, isPdfLibraryLoaded } from '../services/pdf';

interface UsePdfLibraryReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function usePdfLibrary(): UsePdfLibraryReturn {
  const [isLoaded, setIsLoaded] = useState(isPdfLibraryLoaded());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isPdfLibraryLoaded()) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadPdfLibrary();
      setIsLoaded(true);
    } catch (err) {
      const message = err instanceof Error 
        ? err.message 
        : 'Error al cargar la librería de PDF';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    isLoaded,
    isLoading,
    error,
    reload: load,
  };
}
