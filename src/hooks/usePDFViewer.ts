import { useState } from 'react';
import { extractPDFContent } from '../utils/pdfUtils';
import type { ExtractedPage } from '../types/pdf';

export const usePDFViewer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [scale, setScale] = useState(1.0);
  const [isEditable, setIsEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      setFile(file);

      const extractedPages = await extractPDFContent(file);
      setPages(extractedPages);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF file. Please try again with a different PDF.');
      setFile(null);
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (pageNumber: number, textIndex: number, newText: string) => {
    setPages(prevPages => 
      prevPages.map(page => 
        page.pageNumber === pageNumber
          ? {
              ...page,
              textItems: page.textItems.map((item, idx) =>
                idx === textIndex ? { ...item, str: newText } : item
              )
            }
          : page
      )
    );
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const toggleEditable = () => setIsEditable(prev => !prev);

  const exportAsPlainText = () => {
    if (pages.length === 0) return;

    const text = pages
      .map(page => 
        page.textItems
          .map(item => item.str)
          .join(' ')
      )
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted_text.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    file,
    pages,
    scale,
    isEditable,
    isLoading,
    error,
    handleFileUpload,
    handleTextChange,
    handleZoomIn,
    handleZoomOut,
    toggleEditable,
    exportAsPlainText,
  };
};