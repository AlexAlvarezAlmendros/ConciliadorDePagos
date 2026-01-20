/**
 * Aplicación principal - Conciliador de Pagos
 * 
 * Esta aplicación permite conciliar automáticamente pagos bancarios
 * con registros de proveedores mediante el análisis de PDFs.
 */

import { ReconciliationProvider } from './context';
import { ReconciliationPage } from './pages';

function App() {
  return (
    <ReconciliationProvider>
      <ReconciliationPage />
    </ReconciliationProvider>
  );
}

export default App;

