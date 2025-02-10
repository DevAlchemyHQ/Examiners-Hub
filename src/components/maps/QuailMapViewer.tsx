import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Search, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface QuailMapViewerProps {
  url: string;
  title: string;
  onClose: () => void;
  embedded?: boolean;
}

export const QuailMapViewer: React.FC<QuailMapViewerProps> = ({ 
  url, 
  title, 
  onClose,
  embedded = false 
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateScale = useCallback(() => {
    if (!containerRef.current || !pageSize) return 1;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 48; // Account for padding
    const containerHeight = container.clientHeight - 48;

    // Calculate scale based on both dimensions
    const scaleX = containerWidth / pageSize.width;
    const scaleY = containerHeight / pageSize.height;

    // Use the smaller scale to ensure the page fits both dimensions
    return Math.min(scaleX, scaleY);
  }, [pageSize]);

  useEffect(() => {
    const updateScale = () => {
      const newScale = calculateScale();
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [calculateScale, pageSize]);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageSize({
      width: viewport.width,
      height: viewport.height
    });
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setSearchResults([{ page: currentPage }]);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!embedded) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && numPages && currentPage < numPages) {
        setCurrentPage(prev => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  useEffect(() => {
    if (!embedded) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentPage, numPages, embedded]);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const viewer = (
    <>
      <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-gray-700 border-b border-slate-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleRotate}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Download PDF"
          >
            <Download size={18} />
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-gray-600 mx-2" />
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search in document..."
              className="w-64 pl-8 pr-4 py-1.5 text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {numPages && (
          <div className="text-sm text-slate-600 dark:text-gray-300">
            Page {currentPage} of {numPages}
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        id="embedded-viewer"
        className="flex-1 overflow-auto bg-slate-100 dark:bg-gray-800 p-6"
      >
        {error ? (
          <div className="text-white bg-red-500/20 px-6 py-4 rounded-lg">
            {error}
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={() => setError('Failed to load PDF')}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            }
            className="flex items-center justify-center min-h-full"
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              rotate={rotation}
              className="shadow-xl"
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={handlePageLoadSuccess}
            />
          </Document>
        )}
      </div>

      {!error && numPages && (
        <div className="p-2 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))}
            disabled={currentPage >= numPages}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="h-full flex flex-col">{viewer}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-medium">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      {viewer}
    </div>
  );
};