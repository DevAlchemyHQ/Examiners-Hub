import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMetadataStore } from '../store/metadataStore';
import { ImageMetadata } from '../types';
import { Edit2, Trash2 } from 'lucide-react';

export const ImageListItem: React.FC = () => {
  const { images, updateImageMetadata, removeImage } = useMetadataStore();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  const handleEdit = (img: ImageMetadata) => {
    setEditingId(img.id);
  };

  const handleSave = (img: ImageMetadata) => {
    setEditingId(null);
  };

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-300px)] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const img = images[virtualRow.index];
          const isEditing = editingId === img.id;

          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex items-center gap-4 p-2 hover:bg-slate-50 transition-colors">
                <img
                  src={img.preview}
                  alt={img.fileName || img.file?.name || 'Image'}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {img.fileName || img.file?.name || 'Unknown file'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {img.photoNumber ? `Photo ${img.photoNumber}` : 'Unnumbered'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(img)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};