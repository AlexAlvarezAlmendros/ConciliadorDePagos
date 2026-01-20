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
 * Extrae el texto completo de un archivo PDF
 * @param file - Archivo PDF a procesar
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  if (!window.pdfjsLib) {
    throw new Error('La librería PDF.js no está cargada');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}
