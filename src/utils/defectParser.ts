export interface ParsedDefect {
  photoNumber: string;
  description: string;
  date: string;
  fileName: string;
}

export interface ParseResult {
  defects: ParsedDefect[];
  missingImages: string[];
  projectDate: string;
}

// Function to convert DD-MM-YY format to YYYY-MM-DD format
const convertDateFormat = (dateStr: string): string => {
  // Parse DD-MM-YY format
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr; // Return original if not in expected format
  
  const [, day, month, year] = match;
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
  
  return `${fullYear}-${month}-${day}`;
};

export const parseDefectText = (text: string): ParseResult => {
  const lines = text.trim().split('\n');
  const defects: ParsedDefect[] = [];
  const missingImages: string[] = [];
  let projectDate = '';

  // Skip the "Defects:" header if present
  const startIndex = lines[0].toLowerCase().includes('defects:') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse line format: "Photo 01 ^ apple orange banana grape pear ^ 09-07-25    PB080001 copy.JPG"
    const parts = line.split('^').map(part => part.trim());
    
    if (parts.length >= 3) {
      const photoNumber = parts[0].replace(/^Photo\s+/i, ''); // Remove "Photo " prefix
      const description = parts[1];
      const remainingParts = parts[2].split(/\s+/);
      
      // Extract date and filename
      const date = remainingParts[0];
      const fileName = remainingParts.slice(1).join(' ');

      if (photoNumber && description && date && fileName) {
        defects.push({
          photoNumber,
          description,
          date,
          fileName
        });

        // Store the date for project details (convert to proper format)
        if (!projectDate) {
          projectDate = convertDateFormat(date);
        }
      }
    }
  }

  return {
    defects,
    missingImages: [],
    projectDate
  };
};

export const findMatchingImages = (defects: ParsedDefect[], availableImages: string[]): string[] => {
  const missingImages: string[] = [];
  
  defects.forEach(defect => {
    if (!availableImages.some(img => img.toLowerCase().includes(defect.fileName.toLowerCase()))) {
      missingImages.push(defect.fileName);
    }
  });

  return missingImages;
}; 