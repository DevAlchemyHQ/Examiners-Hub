import React, { useState } from "react";
import { X, ImageIcon, AlertCircle } from "lucide-react";
import { useMetadataStore } from "../store/metadataStore";

export const ImageList: React.FC = () => {
  const { images, updateImageMetadata, removeImage } = useMetadataStore();
  const [showNotice, setShowNotice] = useState(false);

  const handleFirstImageSelect = () => {
    if (images.length === 0) {
      setShowNotice(true);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-dashed border-slate-200">
        <ImageIcon size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-500 text-center">
          No images uploaded yet. Upload some images to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {images.map((img, index) => (
          <div
            key={img.id}
            className="flex items-start gap-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-500 transition-all"
          >
            <div className="relative group">
              <img
                src={img.preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg shadow-sm"
                onLoad={index === 0 ? handleFirstImageSelect : undefined}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Photo Number
                  </label>
                  <input
                    type="number"
                    value={img.photoNumber}
                    onChange={(e) =>
                      updateImageMetadata(img.id, { photoNumber: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Enter photo number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) =>
                      updateImageMetadata(img.id, { description: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Enter description"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => removeImage(img.id)}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Notice Popup Modal */}
      {showNotice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Important Notice
              </h3>
            </div>
            <p className="text-slate-600 dark:text-gray-300 mb-4 text-sm">
              Exametry.xyz does not store your images—it only processes file names. Your photos always remain on your computer, and only a reference copy is generated.
            </p>
            <ul className="text-sm text-slate-600 dark:text-gray-300 mb-6 space-y-1">
              <li>🔹 Refreshing or leaving the page will reset your progress (you’ll receive a confirmation before exiting).</li>
              <li>🔹 Logging out is safe, but closing your browser may clear your session.</li>
              <li>✅ To keep your work, make sure to download your package before exiting.</li>
            </ul>
            <button
              onClick={() => setShowNotice(false)}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
