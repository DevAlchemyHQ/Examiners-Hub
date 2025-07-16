import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useMetadataStore } from "../store/metadataStore";

export const ImageUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addImages = useMetadataStore((state) => state.addImages);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.length) {
      try {
        setIsLoadingExam(true);
        await addImages(Array.from(e.target.files), false);
      } finally {
        setIsLoadingExam(false);
        e.target.value = "";
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingExam}
          className={`w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-xl transition-all group shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95`}
        >
          {isLoadingExam ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} className="group-hover:scale-110 transition-transform" />
          )}
          <span>{isLoadingExam ? "Uploading..." : "Upload Exam Photos"}</span>
        </button>
      </div>
    </div>
  );
};
