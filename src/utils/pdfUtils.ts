import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist';
import { ExtractedPage, PDFTextItem } from '../types/pdf';

// Use a specific version of pdf.js worker
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

function normalizeTextContent(textContent: any) {
  const items: PDFTextItem[] = [];
  let lastY: number | null = null;
  let currentLine: PDFTextItem[] = [];

  // Process each text item
  textContent.items.forEach((item: TextItem & TextMarkedContent) => {
    // Skip empty or whitespace-only strings
    if (!item.str.trim()) return;

    const [a, b, c, d, x, y] = item.transform;
    const fontSize = Math.sqrt(a * a + b * b);
    
    // Detect new line based on y-coordinate change
    if (lastY !== null && Math.abs(y - lastY) > fontSize / 2) {
      // Add current line to items
      items.push(...currentLine);
      // Add line break
      if (currentLine.length > 0) {
        items.push({
          str: '\n',
          transform: [1, 0, 0, 1, 0, y],
          width: 0,
          height: fontSize,
          fontName: 'Times-Roman',
          fontSize,
          color: '#000000'
        });
      }
      currentLine = [];
    }

    // Create normalized text item
    const textItem: PDFTextItem = {
      str: item.str,
      transform: item.transform,
      width: item.width || 0,
      height: item.height || fontSize,
      fontName: item.fontName || 'Times-Roman',
      fontSize,
      color: '#000000'
    };

    currentLine.push(textItem);
    lastY = y;
  });

  // Add remaining line
  items.push(...currentLine);

  return items;
}

export async function extractPageContent(page: any): Promise<ExtractedPage> {
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();
  const textItems = normalizeTextContent(textContent);
  
  // Extract images (if available)
  const operatorList = await page.getOperatorList();
  const images = [];
  
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    if (operatorList.fnArray[i] === 82) { // 82 is the code for "paintImageXObject"
      const imgData = operatorList.argsArray[i][0];
      if (imgData) {
        images.push({
          url: '', // Would need additional processing to extract actual image data
          name: `image_${images.length + 1}`,
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height
        });
      }
    }
  }

  return {
    pageNumber: page.pageNumber,
    width: viewport.width,
    height: viewport.height,
    textItems,
    images
  };
}

export async function extractPDFContent(file: File): Promise<ExtractedPage[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: ExtractedPage[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const pageContent = await extractPageContent(page);
      pages.push(pageContent);
    }

    return pages;
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to extract PDF content');
  }
}

export async function loadPDFDocument(file: File): Promise<PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return await getDocument({ data: arrayBuffer }).promise;
}