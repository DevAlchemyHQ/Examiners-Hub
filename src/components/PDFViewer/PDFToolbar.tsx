import React, { useRef } from 'react';
import { FileUp, Search, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface PDFToolbarProps {
  onFileUpload: (file: File) => void;
  onSearch: (query: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleViewer: () => void;
  showViewer: boolean;
  isLoading: boolean;
}

export const PDFToolbar: React.FC<PDFToolbarProps> = ({
  onFileUpload,
  onSearch,
  onZoomIn,
  onZoomOut,
  onToggleViewer,
  showViewer,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    }
  };

  return (
    <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isLoading 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        <FileUp size={16} />
        {isLoading ? 'Processing...' : 'Upload PDF'}
      </button>

      <div className="flex items-center gap-2">
        <input
          type="text"
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search..."
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <Search size={20} className="text-slate-400" />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
      </div>

      <button
        onClick={onToggleViewer}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
        title={showViewer ? "Hide PDF Viewer" : "Show PDF Viewer"}
      >
        {showViewer ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
    </div>
  );
};