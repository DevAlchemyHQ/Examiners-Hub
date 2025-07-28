import React, { useState, useEffect } from 'react';
import { FileText, ZoomIn, ZoomOut, Upload, RotateCw, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { usePDFStore } from '../../store/pdfStore';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerSectionProps {
  title: string;
  file: File | null;
  scale: number;
  onFileChange: (file: File | null) => void;
  onZoom: (action: 'in' | 'out') => void;
}

interface PageRotation {
  [pageNumber: number]: number;
}

const PDFViewerSection: React.FC<PDFViewerSectionProps> = ({
  title,
  file,
  scale,
  onFileChange,
  onZoom,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageRotations, setPageRotations] = useState<PageRotation>({});
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      try {
        await onFileChange(file);
      } finally {
        setIsLoading(false);
      }
      setPageRotations({});
    }
  };

  const handleRotatePage = (pageNumber: number) => {
    setPageRotations(prev => ({
      ...prev,
      [pageNumber]: ((prev[pageNumber] || 0) + 90) % 360
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-120px)] flex flex-col">
      <div className="p-2 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-800 dark:text-white">{title}</h3>
          <div className="flex items-center gap-1">
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
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Upload PDF"
            >
              {isLoading ? (
                <Loader2 size={16} className="text-slate-600 dark:text-white animate-spin" />
              ) : (
                <Upload size={16} className="text-slate-600 dark:text-white" />
              )}
            </button>
            <button
              onClick={() => onZoom('out')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} className="text-slate-600 dark:text-white" />
            </button>
            <button
              onClick={() => onZoom('in')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} className="text-slate-600 dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-gray-800 p-4">
        {file ? (
          <Document
            file={file}
            className="flex flex-col items-center"
            onLoadSuccess={async ({ numPages }) => {
              setNumPages(numPages);
              await loadPDF(file);
            }}
            loading={
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            }
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div 
                key={index + 1} 
                className="mb-4 relative group bg-white dark:bg-gray-800"
                data-page-number={index + 1}
              >
                <div className="relative">
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    rotate={pageRotations[index + 1] || 0}
                    className="shadow-lg bg-white"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    loading={
                      <div className="w-full aspect-[1/1.4] bg-slate-100 dark:bg-gray-700 animate-pulse rounded-lg" />
                    }
                  />
                </div>
                <button
                  onClick={() => handleRotatePage(index + 1)}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rotate Page"
                >
                  <RotateCw size={16} className="text-slate-600" />
                </button>
              </div>
            ))}
          </Document>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <FileText size={40} />
              <p>Upload a PDF to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const loadPDF = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    return pdf;
  } catch (error) {
    console.error('Error loading PDF:', error);
    return null;
  }
};

export const PDFViewer: React.FC = () => {
  const { file1, file2, setFile1, setFile2, loadPDFs } = usePDFStore();
  const [scale1, setScale1] = useState(1.0);
  const [scale2, setScale2] = useState(1.0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Load PDFs only on very first mount
  useEffect(() => {
    if (!hasLoadedOnce) {
      const loadFiles = async () => {
        try {
          await loadPDFs();
        } finally {
          setIsInitialLoad(false);
          setHasLoadedOnce(true);
        }
      };
      loadFiles();
    } else {
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoom = (viewer: 1 | 2, action: 'in' | 'out') => {
    const setScale = viewer === 1 ? setScale1 : setScale2;
    setScale(prev => {
      if (action === 'in') return Math.min(prev + 0.1, 2.0);
      return Math.max(prev - 0.1, 0.5);
    });
  };

  if (isInitialLoad) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading PDFs...</p>
        </div>
      </div>
    );
  }

  // If both files are null, show empty state
  if (!file1 && !file2) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <FileText size={40} />
          <p>Upload a PDF to view its contents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      <PDFViewerSection
        title="PDF Viewer 1"
        file={file1}
        scale={scale1}
        onFileChange={setFile1}
        onZoom={(action) => handleZoom(1, action)}
      />
      <PDFViewerSection
        title="PDF Viewer 2"
        file={file2}
        scale={scale2}
        onFileChange={setFile2}
        onZoom={(action) => handleZoom(2, action)}
      />
    </div>
  );
};