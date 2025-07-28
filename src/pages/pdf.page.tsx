import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, ZoomIn, ZoomOut, Upload, RotateCw, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Header } from '../components/Header';
import { usePDFStore } from '../store/pdfStore';
import { useThemeStore } from '../store/themeStore';
import { useMetadataStore } from '../store/metadataStore';
import { useAuthStore } from '../store/authStore';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerSectionProps {
    title: string;
    file: File | null;
    scale: number;
    viewerId: 1 | 2;
    onFileChange: (file: File | null) => void;
    onZoom: (action: 'in' | 'out') => void;
}

const PDFViewerSection: React.FC<PDFViewerSectionProps> = ({ title, file, scale, viewerId, onFileChange, onZoom, }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const store = usePDFStore();
    
    const pageStates = viewerId === 1 ? store.pageStates1 : store.pageStates2;
    const setPageState = viewerId === 1 ? store.setPageState1 : store.setPageState2;
    const currentPage = viewerId === 1 ? store.currentPage1 : store.currentPage2;

    useEffect(() => {
        const savedPage = localStorage.getItem(`currentPage${viewerId}`);
        if (savedPage) {
            store.setCurrentPage(viewerId, parseInt(savedPage));
        }
    }, [viewerId]);

    // Setup intersection observer to track current page
    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '1');
                        store.setCurrentPage(viewerId, pageNumber);
                    }
                });
            },
            { threshold: 0.5 }
        );

        return () => observerRef.current?.disconnect();
    }, [viewerId, store]);

    // Attach observer to page elements
    useEffect(() => {
        const observer = observerRef.current;
        if (!observer) return;

        document.querySelectorAll(`[data-page-number]`).forEach((element) => {
            observer.observe(element);
        });

        return () => observer.disconnect();
    }, [numPages]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setIsLoading(true);
            setError(null);
            try {
                await onFileChange(selectedFile);
            } catch (err) {
                console.error('Upload error:', err);
                setError(err instanceof Error ? err.message : 'Failed to upload PDF. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRotatePage = (pageNumber: number) => {
        const currentRotation = pageStates[pageNumber]?.rotation || 0;
        const newRotation = (currentRotation + 90) % 360;
    
        let adjustedScale = scale;
        if (newRotation === 90 || newRotation === 270) {
            adjustedScale = Math.max(scale * 0.2, 0.2);
        } else {
            adjustedScale = 1.5;
        }
    
        setPageState(pageNumber, { rotation: newRotation });
        onZoom(adjustedScale > scale ? 'in' : 'out');
    };

    const handlePageRender = (pageNumber: number) => {
        if (!pageStates[pageNumber]) {
            setPageState(pageNumber, {
                currentPage: pageNumber,
                rotation: 0,
            });
        }
        localStorage.setItem(`lastViewedPage_${viewerId}`, String(pageNumber));
    };

    // Memoize the Document component to prevent unnecessary re-renders
    const documentComponent = useMemo(() => {
        if (!file) return null;

        return (
            <Document
                file={file}
                className="flex flex-col items-center"
                onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    // Immediately scroll to saved page
                    const currentPage = viewerId === 1 ? store.currentPage1 : store.currentPage2;
                    if (currentPage > 1 && currentPage <= numPages) {
                        requestAnimationFrame(() => {
                            const element = document.querySelector(`[data-page-number="${currentPage}"]`);
                            if (element) {
                                element.scrollIntoView({ block: 'center', behavior: 'auto' });
                            }
                        });
                    }
                }}
                loading={
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-full aspect-[1/1.4] bg-slate-100 dark:bg-gray-700 animate-pulse rounded-lg" />
                    </div>
                }
            >
                {numPages && Array.from(new Array(numPages), (_, index) => {
                    const pageNumber = index + 1;
                    const pageState = pageStates[pageNumber] || { rotation: 0, currentPage: pageNumber };

                    return (
                        <div 
                            key={pageNumber}
                            className="mb-8 relative"
                            data-page-number={pageNumber}
                            ref={(el) => {
                                if (el) {
                                    observerRef.current?.observe(el);
                                }
                            }}
                        >
                            <div className="relative inline-block">
                                <Page
                                    key={`page_${pageNumber}_rotate_${pageState.rotation}`}
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    rotate={pageState.rotation} 
                                    className="shadow-lg bg-white"
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    onRenderSuccess={() => handlePageRender(pageNumber)}
                                    loading={
                                        <div className="w-full aspect-[1/1.4] bg-slate-100 dark:bg-gray-700 animate-pulse rounded-lg" />
                                    }
                                />
                                <button
                                    onClick={() => handleRotatePage(pageNumber)}
                                    className="absolute top-2 right-7 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors cursor-pointer z-50"
                                    title={`Rotate Page ${pageNumber}`}
                                >
                                    <RotateCw size={16} />
                                </button>
                            </div>
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                                Page {pageNumber} of {numPages}
                            </div>
                        </div>
                    );
                })}
            </Document>
        );
    }, [file, scale, pageStates, numPages, currentPage, viewerId]);

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
            {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-white dark:bg-gray-800 p-4 relative">
            {file ? documentComponent : (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                        <FileText size={40} />
                        <p>{isLoading ? "Loading PDF..." : "Upload a PDF to view its contents"}</p>
                    </div>
                </div>
            )}
        </div>
    </div>
    )
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

export const PDFViewerPage: React.FC = () => {
  const { file1, file2, initializePDFs, isInitialized, setFile1, setFile2 } = usePDFStore();
  const [scale1, setScale1] = useState(() => 
    parseFloat(localStorage.getItem('pdfScale1') || '1.2')
  );
  const [scale2, setScale2] = useState(() => 
    parseFloat(localStorage.getItem('pdfScale2') || '1.2')
  );
  const [error, setError] = useState<string | null>(null);
  const isDark = useThemeStore((state) => state.isDark);

  // Initialize PDFs on mount
  useEffect(() => {
    const initPDFs = async () => {
      try {
        setError(null);
        await initializePDFs();
      } catch (err) {
        console.error('Error initializing PDFs:', err);
        setError('Failed to initialize PDF viewer');
      }
    };
    
    initPDFs();
  }, [initializePDFs]);

  // Save scales
  useEffect(() => {
    localStorage.setItem('pdfScale1', scale1.toString());
  }, [scale1]);

  useEffect(() => {
    localStorage.setItem('pdfScale2', scale2.toString());
  }, [scale2]);

  const handleZoom = (viewer: 1 | 2, action: 'in' | 'out') => {
    const setScale = viewer === 1 ? setScale1 : setScale2;
    setScale(prev => {
      const newScale = action === 'in' ? 
        Math.min(prev + 0.1, 2.0) : 
        Math.max(prev - 0.1, 0.5);
      return Number(newScale.toFixed(1));
    });
  };

  if (error) {
    return (
      <div className={`min-h-screen overflow-auto ${isDark ? 'bg-gray-900' : 'bg-gray-100'} relative`}>
        <Header />
        <div className="flex items-center justify-center h-full mt-4 px-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">PDF Viewer Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-auto ${isDark ? 'bg-gray-900' : 'bg-gray-100'} relative`}>
      <Header />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full mt-4 px-4">
        <PDFViewerSection
          title="PDF Viewer 1"
          file={file1}
          scale={scale1}
          viewerId={1}
          onFileChange={setFile1}
          onZoom={(action) => handleZoom(1, action)}
        />
        <PDFViewerSection
          title="PDF Viewer 2"
          file={file2}
          scale={scale2}
          viewerId={2}
          onFileChange={setFile2}
          onZoom={(action) => handleZoom(2, action)}
        />
      </div>
    </div>
  );
};
