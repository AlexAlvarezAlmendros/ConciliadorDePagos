/**
 * Componente de zona de arrastre para subir archivos
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, Trash2, FileText, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import type { UploadedFile } from '../../types';
import { formatFileSize, isExcelFile } from '../../utils';

interface FileDropZoneProps {
  title: string;
  subtitle: string;
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  onSheetSelectionChange?: (fileId: string, selectedSheets: string[]) => void;
  accentColor: 'blue' | 'emerald';
  accept?: string;
  showSheetSelector?: boolean;
}

const colorClasses = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-50',
    uploadIcon: 'text-blue-400',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    border: 'border-emerald-200',
    hoverBg: 'hover:bg-emerald-50',
    uploadIcon: 'text-emerald-400',
  },
};

export function FileDropZone({
  title,
  subtitle,
  files,
  onFilesAdd,
  onFileRemove,
  onSheetSelectionChange,
  accentColor,
  accept = '.pdf',
  showSheetSelector = false,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = colorClasses[accentColor];
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  /**
   * Determina el icono apropiado según el tipo de archivo
   */
  const getFileIcon = (file: UploadedFile) => {
    if (file.isExcel || isExcelFile(file.file)) {
      return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    }
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  /**
   * Toggle expansión de selector de hojas
   */
  const toggleExpanded = useCallback((fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  /**
   * Maneja el cambio de selección individual de una hoja
   */
  const handleSheetToggle = useCallback(
    (fileId: string, sheetName: string, currentSelected: string[]) => {
      const isSelected = currentSelected.includes(sheetName);
      const newSelection = isSelected
        ? currentSelected.filter(s => s !== sheetName)
        : [...currentSelected, sheetName];
      onSheetSelectionChange?.(fileId, newSelection);
    },
    [onSheetSelectionChange]
  );

  /**
   * Seleccionar/deseleccionar todas las hojas
   */
  const handleToggleAll = useCallback(
    (fileId: string, allSheets: string[], currentSelected: string[]) => {
      const newSelection = currentSelected.length === allSheets.length ? [] : allSheets;
      onSheetSelectionChange?.(fileId, newSelection);
    },
    [onSheetSelectionChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFilesAdd(Array.from(e.target.files));
        // Reset input para permitir subir el mismo archivo
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [onFilesAdd]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        onFilesAdd(Array.from(e.dataTransfer.files));
      }
    },
    [onFilesAdd]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className={`${colors.iconBg} p-2 rounded-lg`}>
          <FileText className={`w-6 h-6 ${colors.iconText}`} />
        </div>
        <div>
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Lista de archivos */}
      <div className="flex-1 space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="bg-slate-50 p-3 rounded-lg text-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <span className="truncate block max-w-[160px] font-medium" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onFileRemove(file.id)}
                className="text-red-400 hover:text-red-600 p-1 transition-colors"
                aria-label={`Eliminar ${file.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Selector de hojas para archivos Excel */}
            {showSheetSelector && file.isExcel && file.excelSheets && file.excelSheets.length > 0 && (
              <div className="mt-2 border-t border-slate-200 pt-2">
                <button
                  onClick={() => toggleExpanded(file.id)}
                  className="flex items-center justify-between w-full text-xs text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <span className="font-medium">
                    Seleccionar meses ({file.selectedSheets?.length || 0}/{file.excelSheets.length})
                  </span>
                  {expandedFiles.has(file.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedFiles.has(file.id) && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto bg-white rounded border border-slate-200 p-2">
                    {/* Opción de seleccionar/deseleccionar todos */}
                    <label className="flex items-center gap-2 px-2 py-1 hover:bg-emerald-50 rounded cursor-pointer text-xs font-medium text-emerald-700">
                      <input
                        type="checkbox"
                        checked={file.selectedSheets?.length === file.excelSheets.length}
                        onChange={() => handleToggleAll(
                          file.id,
                          file.excelSheets!.map(s => s.name),
                          file.selectedSheets || []
                        )}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Todos los meses</span>
                    </label>
                    
                    <div className="border-t border-slate-100 my-1"></div>
                    
                    {/* Lista de hojas individuales */}
                    {file.excelSheets.map((sheet) => {
                      const isSelected = file.selectedSheets?.includes(sheet.name) || false;
                      return (
                        <label
                          key={sheet.name}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSheetToggle(
                              file.id,
                              sheet.name,
                              file.selectedSheets || []
                            )}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs flex-1">
                            <span className="font-medium">{sheet.month} {sheet.year}</span>
                            <span className="text-slate-400 ml-1">({sheet.recordCount} registros)</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Zona de drop */}
        <label
          className={`
            flex flex-col items-center justify-center w-full h-32
            border-2 border-dashed ${colors.border} rounded-lg
            cursor-pointer ${colors.hoverBg} transition-colors
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-8 h-8 ${colors.uploadIcon} mb-2`} />
            <p className="text-sm text-slate-500">
              {accept.includes('.xls') ? 'Click o arrastra PDF o Excel' : 'Click o arrastra para subir PDF(s)'}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept={accept}
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}
