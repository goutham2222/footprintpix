import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  Loader2,
  Calendar
} from 'lucide-react';
import { PhotoFootprint } from '../../types/footprint';
import { 
  loadDeletedFootprints,
  restoreFootprint,
  permanentlyDeleteFootprint,
  permanentlyDeleteAllDeleted
} from '../../utils/storage';

interface RecentlyDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFootprintRestored: (footprint: PhotoFootprint) => void;
}

export const RecentlyDeletedModal: React.FC<RecentlyDeletedModalProps> = ({
  isOpen,
  onClose,
  onFootprintRestored
}) => {
  const [deletedList, setDeletedList] = useState<PhotoFootprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  const fetchDeleted = async () => {
    setIsLoading(true);
    try {
      const items = await loadDeletedFootprints();
      setDeletedList(items);
    } catch (err) {
      console.error('Failed to load deleted footprints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeleted();
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRestore = async (fp: PhotoFootprint) => {
    setActionInProgressId(fp.id);
    try {
      const restored = await restoreFootprint(fp.id);
      if (restored) {
        setDeletedList((prev) => prev.filter((item) => item.id !== fp.id));
        onFootprintRestored(restored);
      }
    } catch (err) {
      console.error('Failed to restore footprint:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this photo and its stored image? This cannot be undone.')) {
      return;
    }
    setActionInProgressId(id);
    try {
      await permanentlyDeleteFootprint(id);
      setDeletedList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to permanently delete footprint:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (
      !confirm(
        `Permanently purge all ${deletedList.length} photo(s) from cloud storage? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsPurgingAll(true);
    try {
      await permanentlyDeleteAllDeleted();
      setDeletedList([]);
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setIsPurgingAll(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-stone-900/95 border border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-stone-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Recently Deleted</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
                  {deletedList.length}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                Items remain recoverable for 30 days before permanent auto-purge
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {deletedList.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={isPurgingAll}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                {isPurgingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>Empty Trash</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-stone-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <span className="text-xs">Loading deleted items...</span>
            </div>
          ) : deletedList.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-stone-500 space-y-2">
              <Trash2 className="w-10 h-10 text-stone-700 stroke-1" />
              <p className="text-sm font-medium text-stone-400">Trash is empty</p>
              <p className="text-xs text-stone-500 max-w-xs text-center">
                When you remove pins or clear the map, photos are kept here for 30 days so you can restore them anytime.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {deletedList.map((fp) => {
                const deletedTimestamp = fp.deletedAt ? Date.parse(fp.deletedAt) : Date.now();
                const daysElapsed = Math.floor(
                  (Date.now() - (Number.isNaN(deletedTimestamp) ? Date.now() : deletedTimestamp)) /
                    (1000 * 60 * 60 * 24)
                );
                const daysRemaining = Math.max(0, 30 - daysElapsed);
                const isWorking = actionInProgressId === fp.id;

                const deletedDateStr = fp.deletedAt
                  ? new Date(fp.deletedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Recently';

                return (
                  <div
                    key={fp.id}
                    className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 hover:border-stone-700 flex space-x-3 items-center transition-all group"
                  >
                    {/* Thumbnail Preview */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shrink-0 relative">
                      <img
                        src={fp.dataUrl}
                        alt={fp.filename}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-200 truncate">
                        {fp.caption || fp.locationName || fp.filename}
                      </p>

                      <div className="flex items-center space-x-2 text-[10px] text-stone-400 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-stone-500" />
                          <span>Deleted {deletedDateStr}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1 text-amber-400/90 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{daysRemaining}d left</span>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleRestore(fp)}
                          disabled={isWorking}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-emerald-950/60 border border-stone-700 hover:border-emerald-800/60 text-stone-300 hover:text-emerald-300 text-[11px] font-medium flex items-center space-x-1 transition-all disabled:opacity-50"
                        >
                          {isWorking ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3 text-emerald-400" />
                          )}
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => handlePermanentDelete(fp.id)}
                          disabled={isWorking}
                          className="p-1 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          title="Permanently delete now"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
