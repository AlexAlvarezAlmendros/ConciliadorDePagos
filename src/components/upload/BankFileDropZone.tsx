/**
 * Componente de zona de arrastre para subir archivos bancarios
 * Incluye selector de banco para cada archivo
 */

import { useCallback, useRef } from 'react';
import { Upload, Trash2, FileText, Building2 } from 'lucide-react';
import type { UploadedFile, BankType } from '../../types';
import { BANK_NAMES } from '../../types';
import { formatFileSize } from '../../utils';

interface BankFileDropZoneProps {
  title: string;
  subtitle: string;
  files: UploadedFile[];
  onFilesAdd: (files: File[], bankType: BankType) => void;
  onFileRemove: (fileId: string) => void;
  onBankTypeChange: (fileId: string, bankType: BankType) => void;
  accentColor: 'blue' | 'emerald';
  accept?: string;
}

const colorClasses = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-50',
    uploadIcon: 'text-blue-400',
    selectBorder: 'border-blue-200 focus:border-blue-400',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    border: 'border-emerald-200',
    hoverBg: 'hover:bg-emerald-50',
    uploadIcon: 'text-emerald-400',
    selectBorder: 'border-emerald-200 focus:border-emerald-400',
  },
};

const bankOptions: { value: BankType; label: string }[] = [
  { value: 'bbva', label: BANK_NAMES.bbva },
  { value: 'caixabank', label: BANK_NAMES.caixabank },
  { value: 'sabadell', label: BANK_NAMES.sabadell },
  { value: 'santander', label: BANK_NAMES.santander },
];

export function BankFileDropZone({
  title,
  subtitle,
  files,
  onFilesAdd,
  onFileRemove,
  onBankTypeChange,
  accentColor,
  accept = '.pdf',
}: BankFileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = colorClasses[accentColor];

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFilesAdd(Array.from(e.target.files), 'bbva');
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
        onFilesAdd(Array.from(e.dataTransfer.files), 'bbva');
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
              <div className="flex-1 min-w-0">
                <span className="truncate block max-w-[180px] font-medium" title={file.name}>
                  {file.name}
                </span>
                <span className="text-xs text-slate-400">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <button
                onClick={() => onFileRemove(file.id)}
                className="text-red-400 hover:text-red-600 p-1 transition-colors"
                aria-label={`Eliminar ${file.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3 h-3 text-slate-400" />
              <select
                value={file.bankType || 'bbva'}
                onChange={(e) => onBankTypeChange(file.id, e.target.value as BankType)}
                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-300"
              >
                {bankOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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
              Click o arrastra para subir PDF(s)
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
