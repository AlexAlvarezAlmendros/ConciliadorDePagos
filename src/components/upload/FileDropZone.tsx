/**
 * Componente de zona de arrastre para subir archivos
 */

import { useCallback, useRef } from 'react';
import { Upload, Trash2, FileText } from 'lucide-react';
import type { UploadedFile } from '../../types';
import { formatFileSize } from '../../utils';

interface FileDropZoneProps {
  title: string;
  subtitle: string;
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
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
  accentColor,
  accept = '.pdf',
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = colorClasses[accentColor];

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
            className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="truncate block max-w-[200px]" title={file.name}>
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
