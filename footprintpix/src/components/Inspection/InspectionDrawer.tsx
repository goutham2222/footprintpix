import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Camera, 
  Aperture, 
  Clock, 
  Trash2, 
  ExternalLink,
  Edit3,
  Check
} from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';

interface InspectionDrawerProps {
  footprint: PhotoFootprint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onDeleteFootprint: (id: string) => void;
  onRelocate: (footprint: PhotoFootprint) => void;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  footprint,
  isOpen,
  onClose,
  onUpdateCaption,
  onDeleteFootprint,
  onRelocate
}) => {
  const [caption, setCaption] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (footprint) {
      setCaption(footprint.caption || '');
    }
  }, [footprint]);

  if (!isOpen || !footprint) return null;

  const handleSaveCaption = () => {
    onUpdateCaption(footprint.id, caption);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
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

  const hasExifCamera = footprint.exif.cameraMake || footprint.exif.cameraModel;
  const cameraLabel = [footprint.exif.cameraMake, footprint.exif.cameraModel]
    .filter(Boolean)
    .join(' ');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${footprint.coordinates.latitude},${footprint.coordinates.longitude}`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-stone-900/95 backdrop-blur-xl border-l border-stone-800 text-stone-200 shadow-2xl flex flex-col transition-all duration-300 ease-out">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/40">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Journey Inspection
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          title="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Photo Preview Container */}
        <div className="relative group rounded-xl overflow-hidden bg-stone-950 border border-stone-800/80 shadow-inner">
          <img
            src={footprint.dataUrl}
            alt={footprint.filename}
            className="w-full h-auto max-h-72 object-contain mx-auto"
          />
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[11px] bg-black/60 backdrop-blur-md text-stone-300 font-mono">
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
              className="w-full px-3.5 py-2.5 rounded-lg bg-stone-950/60 border border-stone-800 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/50 text-stone-200 placeholder-stone-500 text-sm resize-none outline-none transition-all"
            />
          </div>
        </div>

        {/* GPS Location Data Card */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>Coordinates</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onRelocate(footprint)}
                className="text-orange-400 hover:text-orange-300 underline text-xs transition-colors"
              >
                Reposition Pin
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

          <div className="grid grid-cols-2 gap-2 text-sm font-mono bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/50">
            <div>
              <div className="text-[10px] text-stone-500 uppercase">Latitude</div>
              <div className="text-stone-200 font-medium">
                {footprint.coordinates.latitude.toFixed(6)}°
              </div>
            </div>
            <div>
              <div className="text-[10px] text-stone-500 uppercase">Longitude</div>
              <div className="text-stone-200 font-medium">
                {footprint.coordinates.longitude.toFixed(6)}°
              </div>
            </div>
          </div>

          {!footprint.hasGps && (
            <div className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1.5 rounded">
              ⚠️ Manually pinned (No original GPS in EXIF).
            </div>
          )}
        </div>

        {/* Date & Time Taken */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>Captured Date</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-stone-300">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Camera & Lens Technical EXIF */}
        <div className="p-4 rounded-xl bg-stone-950/40 border border-stone-800/80 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
            <Camera className="w-3.5 h-3.5 text-orange-400" />
            <span>Camera & Optics</span>
          </div>

          {hasExifCamera ? (
            <div className="space-y-2 text-xs">
              <div className="text-stone-200 font-medium text-sm">{cameraLabel}</div>
              {footprint.exif.lensModel && (
                <div className="text-stone-400">{footprint.exif.lensModel}</div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800/60 font-mono text-center">
                {footprint.exif.focalLength && (
                  <div className="bg-stone-900/80 p-1.5 rounded">
                    <span className="text-[10px] text-stone-500 block">Focal</span>
                    {footprint.exif.focalLength}mm
                  </div>
                )}
                {footprint.exif.fNumber && (
                  <div className="bg-stone-900/80 p-1.5 rounded">
                    <span className="text-[10px] text-stone-500 block">Aperture</span>
                    ƒ/{footprint.exif.fNumber}
                  </div>
                )}
                {footprint.exif.iso && (
                  <div className="bg-stone-900/80 p-1.5 rounded">
                    <span className="text-[10px] text-stone-500 block">ISO</span>
                    {footprint.exif.iso}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic flex items-center space-x-1.5">
              <Aperture className="w-3.5 h-3.5" />
              <span>Camera metadata was not encoded in this image.</span>
            </p>
          )}
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

