import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { extractExifFromFile, readFileAsDataUrl } from '../../utils/exif';
import { PhotoFootprint } from '../../types/footprint';

interface UploadDropzoneProps {
  onPhotosProcessed: (newFootprints: PhotoFootprint[], missingGpsPhotos: PhotoFootprint[]) => void;
  variant?: 'compact' | 'full';
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ 
  onPhotosProcessed,
  variant = 'full'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(
      (file) => file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|avif)$/i.test(file.name)
    );
    if (imageFiles.length === 0) return;

    setIsProcessing(true);
    const withGps: PhotoFootprint[] = [];
    const withoutGps: PhotoFootprint[] = [];

    for (const file of imageFiles) {
      try {
        const [exifData, dataUrl] = await Promise.all([
          extractExifFromFile(file),
          readFileAsDataUrl(file)
        ]);

        const footprintId = 'fp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const hasGps = exifData.coordinates !== null;

        const footprint: PhotoFootprint = {
          id: footprintId,
          filename: file.name,
          dataUrl,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          hasGps,
          coordinates: exifData.coordinates || { latitude: 0, longitude: 0 },
          exif: exifData.exif,
          caption: ''
        };

        if (hasGps) {
          withGps.push(footprint);
        } else {
          withoutGps.push(footprint);
        }
      } catch (err) {
        console.error('Error processing image:', file.name, err);
      }
    }

    setIsProcessing(false);
    onPhotosProcessed(withGps, withoutGps);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      // Reset input value so re-selecting same file fires change
      e.target.value = '';
    }
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-orange-950/40 active:scale-95 transition-all disabled:opacity-75"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5" />
          )}
          <span>{isProcessing ? 'Processing...' : 'Add Photos'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`group cursor-pointer rounded-2xl border border-dashed transition-all duration-300 p-4 sm:p-5 flex items-center space-x-3 backdrop-blur-xl ${
          isDragging
            ? 'border-orange-500 bg-orange-950/40 text-orange-200 scale-[1.02]'
            : 'border-stone-800 bg-stone-900/80 hover:bg-stone-900/95 hover:border-stone-700 text-stone-300'
        } shadow-2xl`}
      >
        <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>

        <div className="text-left flex-1 min-w-0">
          <div className="text-xs font-semibold text-stone-200 truncate flex items-center space-x-1.5">
            <span>{isProcessing ? 'Extracting GPS & EXIF...' : 'Drop snapshots or click to add'}</span>
          </div>
          <p className="text-[11px] text-stone-400 truncate">
            {isProcessing ? 'Analyzing metadata in browser' : 'Automatic geotag pin positioning'}
          </p>
        </div>

        <div className="hidden sm:flex items-center text-[10px] text-stone-400 font-mono bg-stone-800/80 px-2 py-1 rounded">
          <ImageIcon className="w-3 h-3 mr-1" />
          JPG / PNG
        </div>
      </div>
    </div>
  );
};

