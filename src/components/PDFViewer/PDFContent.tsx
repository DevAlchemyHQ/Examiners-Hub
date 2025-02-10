import React, { useEffect, useRef } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// Set worker path
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFContentProps {
  file: File | null;
  scale: number;
}

export const PDFContent: React.FC<PDFContentProps> = ({ file, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;

    const loadPDF = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        setPdf(pdf);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPDF();
  }, [file]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Calculate the scale to fit the width while maintaining aspect ratio
        const containerWidth = containerRef.current!.clientWidth;
        const fitScale = containerWidth / viewport.width;
        const adjustedViewport = page.getViewport({ scale: scale * fitScale });

        canvas.height = adjustedViewport.height;
        canvas.width = adjustedViewport.width;

        await page.render({
          canvasContext: context,
          viewport: adjustedViewport,
        }).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
        Upload a PDF to view its contents
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-white dark:bg-gray-800">
      <canvas ref={canvasRef} className="mx-auto" />
    </div>
  );
};