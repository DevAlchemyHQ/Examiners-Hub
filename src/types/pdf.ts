export interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  color: string;
}

export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  textItems: PDFTextItem[];
  images: Array<{
    url: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}