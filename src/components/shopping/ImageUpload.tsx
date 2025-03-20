import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Upload } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
}

export function ImageUpload({ currentImageUrl, onImageSelect, onImageRemove }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  return (
    <div className="relative">
      {previewUrl ? (
        <div className="relative aspect-square rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt="תצוגה מקדימה"
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
            aria-label="הסר תמונה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <span className="text-sm text-gray-500">לחץ להעלאת תמונה</span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
} 