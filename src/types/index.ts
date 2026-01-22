// ============================================
// TIPOS PARA BANCOS SOPORTADOS
// ============================================

export type BankType = 'bbva' | 'caixabank' | 'sabadell' | 'santander';

export const BANK_NAMES: Record<BankType, string> = {
  bbva: 'BBVA',
  caixabank: 'CaixaBank',
  sabadell: 'Banco Sabadell',
  santander: 'Banco Santander',
};

// ============================================
// TIPOS PARA REGISTROS BANCARIOS
// ============================================

export interface BankRecord {
  id: string;
  fContable: string;
  fValor: string;
  concepto: string;
  importeRaw: string;
  importe: number;
  saldo: number | null;
  sourceFile: string;
  bankType: BankType;
}

export interface MatchedBankRecord extends BankRecord {
  matchedDoc: string | null;
  supplierName: string | null;
  status: 'match' | 'unmatched';
}

// ============================================
// TIPOS PARA REGISTROS DE PROVEEDORES
// ============================================

export interface SupplierRecord {
  id: string;
  fecha: string;
  codigo: string;
  nombre: string;
  documento: string;
  referencia: string;
  importeRaw: string;
  importe: number;
  sourceFile: string;
}

// ============================================
// TIPOS PARA ESTADÍSTICAS Y RESULTADOS
// ============================================

export interface ReconciliationStats {
  bankTotal: number;
  supplierTotal: number;
  matches: number;
  unmatchedCount: number;
  matchPercentage: number;
}

export interface ReconciliationResult {
  records: MatchedBankRecord[];
  stats: ReconciliationStats;
}

// ============================================
// TIPOS PARA ARCHIVOS
// ============================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  uploadedAt: Date;
  bankType?: BankType;
}

export type FileType = 'bbva' | 'supplier';

// ============================================
// TIPOS PARA EL ESTADO DE LA APLICACIÓN
// ============================================

export interface AppState {
  bbvaFiles: UploadedFile[];
  supplierFiles: UploadedFile[];
  results: MatchedBankRecord[];
  stats: ReconciliationStats | null;
  isProcessing: boolean;
  error: string | null;
  pdfLibLoaded: boolean;
}

export type AppAction =
  | { type: 'ADD_FILES'; payload: { fileType: FileType; files: UploadedFile[] } }
  | { type: 'REMOVE_FILE'; payload: { fileType: FileType; fileId: string } }
  | { type: 'CLEAR_FILES'; payload: { fileType: FileType } }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: ReconciliationResult }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PDF_LIB_LOADED'; payload: boolean }
  | { type: 'RESET_RESULTS' };
