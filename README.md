# Conciliador Automático de Pagos

Aplicación web para conciliar automáticamente pagos bancarios (BBVA) con registros de proveedores mediante el análisis de PDFs.

##  Características

- **Parseo de PDFs**: Extrae datos de extractos bancarios BBVA y listados de proveedores
- **Conciliación automática**: Cruza movimientos bancarios con documentos de proveedores
- **Exportación CSV**: Descarga los resultados en formato CSV para Excel
- **Interfaz intuitiva**: Drag & drop para subir archivos

##  Estructura del Proyecto

```
src/
 components/          # Componentes UI reutilizables
    common/         # Botones, mensajes de error, etc.
    layout/         # Header, Footer, etc.
    results/        # Tabla de resultados
    upload/         # Zona de carga de archivos
 context/            # Contexto global de React
 hooks/              # Custom hooks
 pages/              # Páginas/vistas principales
 services/           # Lógica de negocio
    pdf/            # Parsers de PDF (BBVA, proveedores)
    reconciliation/ # Algoritmo de matching
 types/              # Definiciones TypeScript
 utils/              # Utilidades (moneda, archivos, CSV)
```

##  Tecnologías

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **PDF.js** - Procesamiento de PDFs
- **Lucide React** - Iconos

##  Instalación

```bash
npm install
npm run dev
```

##  Licencia

MIT
