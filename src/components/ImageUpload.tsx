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
          className={`w-full flex items-center justify-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all group shadow ${
            isLoadingSketch || isLoadingExam
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-indigo-600'
          }`}
        >
          {isLoadingSketch ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Upload Sketch Images</span>
            </>
          )}
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
          className={`w-full flex items-center justify-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all group shadow ${
            isLoadingSketch || isLoadingExam
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-indigo-600'
          }`}
        >
          {isLoadingExam ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Upload Exam Photos</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};