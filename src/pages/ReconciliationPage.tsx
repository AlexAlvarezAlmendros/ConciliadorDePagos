/**
 * Página principal de conciliación
 * Orquesta todos los componentes de la aplicación
 */

import { Header, FileDropZone, BankFileDropZone, ActionButton, ErrorMessage, ResultsTable } from '../components';
import { useReconciliationContext } from '../context';
import { downloadCsv, downloadPdf } from '../utils';

export function ReconciliationPage() {
  const {
    // PDF
    isPdfLoading,
    
    // Bank Files (múltiples bancos)
    bankFiles,
    addBankFiles,
    removeBankFile,
    updateBankFileType,
    
    // Supplier Files
    supplierFiles,
    addSupplierFiles,
    removeSupplierFile,
    updateSupplierSheets,
    
    // Reconciliation
    results,
    stats,
    isProcessing,
    error,
    startReconciliation,
    canProcess,
  } = useReconciliationContext();

  const timestamp = new Date().toISOString().split('T')[0];

  const handleExportCsv = () => {
    if (results.length > 0) {
      downloadCsv(results, `conciliacion_bancaria_${timestamp}.csv`);
    }
  };

  const handleExportPdf = () => {
    if (results.length > 0 && stats) {
      downloadPdf(results, stats, `conciliacion_bancaria_${timestamp}.pdf`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <Header isPdfLoading={isPdfLoading} />

        {/* Sección de carga de archivos */}
        <div className="grid md:grid-cols-2 gap-6">
          <BankFileDropZone
            title="Extractos Bancarios"
            subtitle="PDFs de BBVA, CaixaBank, Sabadell o Santander"
            files={bankFiles}
            onFilesAdd={addBankFiles}
            onFileRemove={removeBankFile}
            onBankTypeChange={updateBankFileType}
            accentColor="blue"
          />

          <FileDropZone
            title="Cartera Proveedores"
            subtitle="PDFs Listados o Excel (.xls/.xlsx) con cobros"
            files={supplierFiles}
            onFilesAdd={addSupplierFiles}
            onFileRemove={removeSupplierFile}
            onSheetSelectionChange={updateSupplierSheets}
            accentColor="emerald"
            accept=".pdf,.xls,.xlsx"
            showSheetSelector={true}
          />
        </div>

        {/* Área de acción */}
        <div className="flex flex-col items-center justify-center gap-4">
          {error && <ErrorMessage message={error} />}

          <ActionButton
            onClick={startReconciliation}
            disabled={!canProcess}
            isLoading={isProcessing}
            loadingText="Procesando Documentos..."
          >
            Iniciar Conciliación
          </ActionButton>
        </div>

        {/* Tabla de resultados */}
        {stats && (
          <ResultsTable
            records={results}
            stats={stats}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
          />
        )}
      </div>
    </div>
  );
}
