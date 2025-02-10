import React from 'react';
import { ExtractedPage } from '../../types/pdf';
import { TextLayer } from './TextLayer';

interface PageViewProps {
  page: ExtractedPage;
  scale: number;
  isEditable?: boolean;
  onTextChange?: (pageNumber: number, textIndex: number, newText: string) => void;
}

export const PageView: React.FC<PageViewProps> = ({
  page,
  scale,
  isEditable = false,
  onTextChange
}) => {
  const handleTextChange = (textIndex: number, newText: string) => {
    onTextChange?.(page.pageNumber, textIndex, newText);
  };

  return (
    <div
      className="relative bg-white shadow-md mb-4"
      style={{
        width: page.width * scale,
        height: page.height * scale,
      }}
    >
      <TextLayer
        textItems={page.textItems}
        scale={scale}
        isEditable={isEditable}
        onTextChange={handleTextChange}
      />
      
      {page.images.map((image, index) => (
        <img
          key={index}
          src={image.url}
          alt={image.name}
          className="absolute"
          style={{
            left: image.x * scale,
            top: image.y * scale,
            width: image.width * scale,
            height: image.height * scale,
          }}
        />
      ))}
    </div>
  );
};