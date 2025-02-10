import React from 'react';
import { Copy, Download, FileDown } from 'lucide-react';

interface ExtractedContentProps {
  text: string;
  images: { url: string; name: string }[];
  onCopyText: () => void;
  onDownloadImage: (url: string, name: string) => void;
  onExport: () => void;
}

export const ExtractedContent: React.FC<ExtractedContentProps> = ({
  text,
  images,
  onCopyText,
  onDownloadImage,
  onExport,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800">Extracted Content</h3>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <FileDown size={16} />
          Export All
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            readOnly
            className="w-full h-[300px] p-3 border border-slate-200 rounded-lg font-mono text-sm resize-none"
          />
          <button
            onClick={onCopyText}
            className="absolute top-2 right-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Copy Text"
          >
            <Copy size={16} />
          </button>
        </div>

        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Extracted Images</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`Extracted ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onDownloadImage(image.url, image.name)}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  >
                    <Download className="text-white" size={24} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};