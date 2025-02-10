import React from 'react';
import { PDFTextItem } from '../../types/pdf';

interface TextLayerProps {
  textItems: PDFTextItem[];
  scale: number;
  isEditable?: boolean;
  onTextChange?: (index: number, newText: string) => void;
}

export const TextLayer: React.FC<TextLayerProps> = ({
  textItems,
  scale,
  isEditable = false,
  onTextChange
}) => {
  return (
    <div className="absolute inset-0">
      {textItems.map((item, index) => {
        const [a, b, c, d, x, y] = item.transform;
        const transform = `matrix(${a * scale},${b * scale},${c * scale},${d * scale},${x * scale},${y * scale})`;
        
        // Skip rendering empty line breaks
        if (item.str === '\n') return null;
        
        return (
          <div
            key={index}
            className={`absolute ${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
            style={{
              transform,
              transformOrigin: '0% 0%',
              fontSize: `${item.fontSize * scale}px`,
              fontFamily: item.fontName,
              color: item.color,
              whiteSpace: 'pre',
              minWidth: `${item.width * scale}px`,
              minHeight: `${item.height * scale}px`,
            }}
          >
            {isEditable ? (
              <input
                type="text"
                value={item.str}
                onChange={(e) => onTextChange?.(index, e.target.value)}
                className="bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 w-full h-full"
              />
            ) : (
              <span className="select-text">{item.str}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};