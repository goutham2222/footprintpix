import React from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';

interface ManualLocationModalProps {
  pendingPhotos: PhotoFootprint[];
  currentIndex: number;
  isOpen: boolean;
  onStartMapPick: () => void;
  onSkip: () => void;
  onCancelAll: () => void;
}

export const ManualLocationModal: React.FC<ManualLocationModalProps> = ({
  pendingPhotos,
  currentIndex,
  isOpen,
  onStartMapPick,
  onSkip,
  onCancelAll
}) => {
  if (!isOpen || pendingPhotos.length === 0 || currentIndex >= pendingPhotos.length) {
    return null;
  }

  const currentPhoto = pendingPhotos[currentIndex];
  const remainingCount = pendingPhotos.length - currentIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-stone-200 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                GPS Metadata Not Found
              </h3>
              <p className="text-xs text-stone-400">
                Photo {currentIndex + 1} of {pendingPhotos.length} ({remainingCount} remaining)
              </p>
            </div>
          </div>
          <button
            onClick={onCancelAll}
            className="p-1 text-stone-500 hover:text-stone-300 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Preview */}
        <div className="relative w-full h-48 bg-stone-950 rounded-xl overflow-hidden border border-stone-800/80 flex items-center justify-center">
          <img
            src={currentPhoto.dataUrl}
            alt={currentPhoto.filename}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded text-xs font-mono text-stone-300 truncate max-w-[85%]">
            {currentPhoto.filename}
          </div>
        </div>

        {/* Prompt Note */}
        <p className="text-xs text-stone-400 leading-relaxed">
          This photograph doesn't contain embedded GPS coordinates. You can pin it manually by clicking its location on the world map.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Skip Photo
          </button>

          <button
            onClick={onStartMapPick}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-orange-950/40 flex items-center space-x-2 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Pin Location on Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};

