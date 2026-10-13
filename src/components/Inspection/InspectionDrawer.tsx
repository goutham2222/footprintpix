import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Edit3, 
  Check, 
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';

interface InspectionDrawerProps {
  footprint: PhotoFootprint | null;
  currentIndex: number;
  totalCount: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onDeleteFootprint: (id: string) => void;
  onRelocate: (footprint: PhotoFootprint) => void;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  footprint,
  currentIndex,
  totalCount,
  isOpen,
  onClose,
  onPrev,
  onNext,
  onUpdateCaption,
  onDeleteFootprint,
  onRelocate
}) => {
  const [caption, setCaption] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isCopiedCoords, setIsCopiedCoords] = useState(false);

  useEffect(() => {
    if (footprint) {
      setCaption(footprint.caption || '');
    }
  }, [footprint]);

  // Keyboard accessibility: Escape to close, Left/Right arrows to step through photos
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Do not intercept Left/Right arrows when typing inside an input or textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      if (e.key === 'ArrowLeft' && totalCount > 1) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && totalCount > 1) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalCount, onClose, onPrev, onNext]);

  if (!isOpen || !footprint) return null;

  const handleSaveCaption = () => {
    onUpdateCaption(footprint.id, caption);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleCopyCoords = async () => {
    const coordString = `${footprint.coordinates.latitude.toFixed(4)}, ${footprint.coordinates.longitude.toFixed(4)}`;
    try {
      await navigator.clipboard.writeText(coordString);
      setIsCopiedCoords(true);
      setTimeout(() => setIsCopiedCoords(false), 2000);
    } catch (err) {
      console.warn('Could not copy coordinates:', err);
    }
  };

  const formattedDate = footprint.exif.dateTimeOriginal
    ? new Date(footprint.exif.dateTimeOriginal).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date(footprint.uploadedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${footprint.coordinates.latitude},${footprint.coordinates.longitude}`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-stone-900/95 backdrop-blur-xl border-l border-stone-800 text-stone-200 shadow-2xl flex flex-col transition-all duration-300 ease-out"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/40">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Journey Inspection
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {totalCount > 1 && (
            <div className="flex items-center bg-stone-950/60 border border-stone-800 rounded-lg px-1 py-0.5 mr-1">
              <button
                onClick={onPrev}
                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                title="Previous footprint (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-stone-400 px-2 select-none">
                {currentIndex + 1} / {totalCount}
              </span>
              <button
                onClick={onNext}
                className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                title="Next footprint (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Close panel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Aspect-Ratio Photo Preview Container (Fully visible without cut-off) */}
        <div className="relative group rounded-2xl overflow-hidden bg-stone-950/80 border border-stone-800/80 shadow-2xl flex items-center justify-center aspect-[4/3]">
          <img
            src={footprint.dataUrl}
            alt={footprint.filename}
            className="w-full h-full object-contain p-1 rounded-2xl"
          />
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] bg-black/60 backdrop-blur-md text-stone-300 font-mono border border-white/10">
            {(footprint.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>

        {/* Caption / Journey Notes Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
              <Edit3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Travel Notes & Caption</span>
            </label>
            {isSavedNotice && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={handleSaveCaption}
              placeholder="Add your reflections, travel memories, or location highlights here..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/60 border border-stone-800 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/50 text-stone-200 placeholder-stone-500 text-sm resize-none outline-none transition-all"
            />
          </div>
        </div>

        {/* Clean Coordinates Card */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>Location & Coordinates</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onRelocate(footprint)}
                className="text-orange-400 hover:text-orange-300 underline text-xs transition-colors"
              >
                Reposition
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-stone-400 hover:text-stone-200 transition-colors"
                title="View in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Place name if available */}
          {footprint.locationName && (
            <div className="text-xs font-medium text-stone-300 truncate">
              {footprint.locationName}
            </div>
          )}

          {/* Rounded 4-decimal coordinates with copy button */}
          <div className="flex items-center justify-between bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/60 font-mono text-sm">
            <div className="flex items-center space-x-3 text-stone-200">
              <span>{footprint.coordinates.latitude.toFixed(4)}° N</span>
              <span className="text-stone-600">|</span>
              <span>{footprint.coordinates.longitude.toFixed(4)}° E</span>
            </div>

            <button
              onClick={handleCopyCoords}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center space-x-1 text-xs"
              title="Copy coordinates"
            >
              {isCopiedCoords ? (
                <span className="text-emerald-400 flex items-center space-x-1 text-[11px] font-sans">
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {!footprint.hasGps && (
            <div className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1.5 rounded-lg">
              ⚠️ Manually pinned on map (No original GPS in EXIF).
            </div>
          )}
        </div>

        {/* Date & Time Taken */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>Captured Date & Time</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-stone-300">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-stone-800/80 bg-stone-900/70 flex items-center justify-between">
        <button
          onClick={() => onDeleteFootprint(footprint.id)}
          className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-2 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove Footprint</span>
        </button>

        <button
          onClick={handleSaveCaption}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};
