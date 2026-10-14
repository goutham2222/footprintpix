import React, { useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';

interface PhotoStripProps {
  footprints: PhotoFootprint[];
  selectedFootprintId: string | null;
  deletingId?: string | null;
  onSelect: (id: string) => void;
}

export const PhotoStrip: React.FC<PhotoStripProps> = ({
  footprints,
  selectedFootprintId,
  deletingId,
  onSelect
}) => {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll into view if selecting an active, non-deleted photo
    if (!selectedFootprintId || selectedFootprintId === deletingId) return;
    const activeEl = itemRefs.current[selectedFootprintId];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedFootprintId, deletingId]);

  if (footprints.length === 0) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-3 sm:left-6 z-20 pointer-events-none transition-all duration-300 ease-out ${
        selectedFootprintId ? 'right-3 sm:right-28 md:right-[468px]' : 'right-3 sm:right-28'
      }`}
    >
      <div
        ref={scrollContainerRef}
        className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-none pointer-events-auto p-1 sm:p-1.5 max-w-full scroll-smooth"
      >
        {footprints.map((fp) => {
          const isSelected = fp.id === selectedFootprintId;
          const isDeleting = fp.id === deletingId;
          const dateStr = fp.exif.dateTimeOriginal
            ? new Date(fp.exif.dateTimeOriginal).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              })
            : null;

          return (
            <button
              key={fp.id}
              ref={(el) => {
                itemRefs.current[fp.id] = el;
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDeleting) onSelect(fp.id);
              }}
              disabled={isDeleting}
              className={`group relative shrink-0 h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden transition-all duration-300 ease-out text-left bg-stone-900 shadow-xl ${
                isDeleting
                  ? '!w-0 opacity-0 scale-75 !p-0 !border-0 pointer-events-none'
                  : 'border-2 hover:scale-105'
              } ${
                isSelected && !isDeleting
                  ? 'border-orange-500 ring-4 ring-orange-500/30 scale-105'
                  : 'border-stone-800/80 hover:border-stone-600'
              }`}
            >
              <img
                src={fp.dataUrl}
                alt={fp.filename}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-col justify-end text-white">
                {fp.caption ? (
                  <span className="text-[9px] sm:text-[10px] font-medium truncate leading-tight drop-shadow">
                    {fp.caption}
                  </span>
                ) : fp.locationName ? (
                  <span className="text-[9px] sm:text-[10px] font-medium truncate leading-tight drop-shadow text-stone-200">
                    {fp.locationName}
                  </span>
                ) : null}

                {dateStr && (
                  <span className="text-[8px] sm:text-[9px] text-stone-300 flex items-center space-x-0.5 mt-0.5 opacity-90 drop-shadow">
                    <Calendar className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                    <span>{dateStr}</span>
                  </span>
                )}
              </div>

              {isSelected && !isDeleting && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
