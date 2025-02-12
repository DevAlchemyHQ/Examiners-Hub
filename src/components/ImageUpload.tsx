import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useMetadataStore } from "../store/metadataStore";

export const ImageUpload: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const addImages = useMetadataStore((state) => state.addImages);
  const [isLoadingSketch, setIsLoadingSketch] = useState(false);
  const [isLoadingExam, setIsLoadingExam] = useState(false);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isSketch: boolean = false
  ) => {
    if (e.target.files?.length) {
      try {
        isSketch ? setIsLoadingSketch(true) : setIsLoadingExam(true);
        await addImages(Array.from(e.target.files), isSketch);
      } finally {
        isSketch ? setIsLoadingSketch(false) : setIsLoadingExam(false);
        e.target.value = "";
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="file"
          ref={sketchInputRef}
          onChange={(e) => handleFileChange(e, true)}
          className="hidden"
          multiple
          accept="image/*"
        />
        <button
          onClick={() => sketchInputRef.current?.click()}
          disabled={isLoadingSketch || isLoadingExam}
          className={`w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-xl transition-all group shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95`}
        >
          {isLoadingSketch ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} className="group-hover:scale-110 transition-transform" />
          )}
          <span>{isLoadingSketch ? "Uploading..." : "Upload Sketch Images"}</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, false)}
          className="hidden"
          multiple
          accept="image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingSketch || isLoadingExam}
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
