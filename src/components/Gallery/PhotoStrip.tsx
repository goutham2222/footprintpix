import type React from 'react';
import { Calendar } from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';

interface PhotoStripProps {
  footprints: PhotoFootprint[];
  selectedFootprintId: string | null;
  onSelect: (id: string) => void;
}

export const PhotoStrip: React.FC<PhotoStripProps> = ({
  footprints,
  selectedFootprintId,
  onSelect
}) => {
  if (footprints.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-6 right-20 sm:right-28 z-20 pointer-events-none">
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none pointer-events-auto p-1.5 max-w-full">
        {footprints.map((fp) => {
          const isSelected = fp.id === selectedFootprintId;
          const dateStr = fp.exif.dateTimeOriginal
            ? new Date(fp.exif.dateTimeOriginal).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              })
            : null;

          return (
            <button
              key={fp.id}
              onClick={() => onSelect(fp.id)}
              className={`group relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left bg-stone-900 shadow-xl ${
                isSelected
                  ? 'border-orange-500 ring-4 ring-orange-500/30 scale-105'
                  : 'border-stone-800/80 hover:border-stone-600 hover:scale-105'
              }`}
            >
              <img
                src={fp.dataUrl}
                alt={fp.filename}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col justify-end text-white">
                <span className="text-[10px] font-medium truncate leading-tight drop-shadow">
                  {fp.caption || fp.filename}
                </span>
                {dateStr && (
                  <span className="text-[9px] text-stone-300 flex items-center space-x-0.5 mt-0.5 opacity-80">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{dateStr}</span>
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
