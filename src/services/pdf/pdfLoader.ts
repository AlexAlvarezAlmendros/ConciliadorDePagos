/**
 * Servicio para cargar la librería PDF.js dinámicamente
 */

const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Carga la librería PDF.js desde CDN
 * @returns Promise que se resuelve cuando la librería está lista
 */
export function loadPdfLibrary(): Promise<void> {
  if (isLoaded && window.pdfjsLib) {
    return Promise.resolve();
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PDFJS_CDN_BASE}/pdf.min.js`;
    script.async = true;

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.js`;
        isLoaded = true;
        resolve();
      } else {
        reject(new Error('PDF.js no se cargó correctamente'));
      }
    };

    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Error al cargar la librería PDF.js desde CDN'));
    };

    document.body.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Verifica si PDF.js está cargado
 */
export function isPdfLibraryLoaded(): boolean {
  return isLoaded && !!window.pdfjsLib;
}

/**
 * Información de diagnóstico del PDF
 */
export interface PdfDiagnostics {
  fileName: string;
  numPages: number;
  textLength: number;
  hasText: boolean;
  sampleText: string;
}

/**
 * Extrae el texto completo de un archivo PDF con diagnósticos
 * @param file - Archivo PDF a procesar
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  if (!window.pdfjsLib) {
    throw new Error('La librería PDF.js no está cargada');
  }

  const arrayBuffer = await file.arrayBuffer();
  
  // Intentar cargar con diferentes opciones
  const loadingTask = window.pdfjsLib.getDocument({ 
    data: arrayBuffer,
    // Intentar habilitar extracción de texto más agresiva
  });
  
  const pdf = await loadingTask.promise;
  
  console.log(`[PDF Loader] Archivo: ${file.name}, Páginas: ${pdf.numPages}`);
  
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Unir items con espacios, preservando saltos de línea
    const pageText = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ');
    
    console.log(`[PDF Loader] Página ${i}: ${textContent.items.length} items de texto, ${pageText.length} chars`);
    
    fullText += pageText + '\n';
  }

  // Diagnóstico final
  const trimmedText = fullText.trim();
  console.log(`[PDF Loader] Texto total extraído: ${trimmedText.length} caracteres`);
  
  if (trimmedText.length === 0) {
    console.warn(`[PDF Loader] ⚠️ ADVERTENCIA: El PDF "${file.name}" no contiene texto extraíble.`);
    console.warn(`[PDF Loader] Esto puede significar:`);
    console.warn(`[PDF Loader]   1. El PDF es una imagen escaneada (necesitaría OCR)`);
    console.warn(`[PDF Loader]   2. El PDF está protegido o cifrado`);
    console.warn(`[PDF Loader]   3. El texto está en un formato especial no soportado`);
  }

  return fullText;
}

/**
 * Obtiene diagnósticos detallados de un PDF sin procesarlo completamente
 */
export async function getPdfDiagnostics(file: File): Promise<PdfDiagnostics> {
  const text = await extractTextFromPdf(file);
  const trimmedText = text.trim();
  
  return {
    fileName: file.name,
    numPages: 0, // Se podría mejorar para obtener esto
    textLength: trimmedText.length,
    hasText: trimmedText.length > 0,
    sampleText: trimmedText.substring(0, 200),
  };
}
