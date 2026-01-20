/**
 * Tipos para PDF.js que se carga dinámicamente
 */

export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
  getTextContent(): Promise<TextContent>;
}

export interface TextContent {
  items: TextItem[];
}

export interface TextItem {
  str: string;
}

export interface PDFJSLib {
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

declare global {
  interface Window {
    pdfjsLib?: PDFJSLib;
  }
}
