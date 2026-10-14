import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash,
  Maximize2,
  History
} from 'lucide-react';
import { MapView, ReframeDeleteEvent } from './components/Map/MapView';
import { InspectionDrawer } from './components/Inspection/InspectionDrawer';
import { UploadDropzone } from './components/Upload/UploadDropzone';
import { ManualLocationModal } from './components/Upload/ManualLocationModal';
import { PhotoStrip } from './components/Gallery/PhotoStrip';
import { RecentlyDeletedModal } from './components/Gallery/RecentlyDeletedModal';
import { PhotoFootprint, GeoCoordinates } from './types/footprint';
import { 
  loadPersistedFootprints, 
  savePersistedFootprints, 
  updatePersistedFootprint,
  softDeleteFootprint,
  clearAllPersistedFootprints,
  isCloudStorageActive
} from './utils/storage';
import { createSampleFootprints } from './utils/sampleData';

function getFootprintTimestamp(fp: PhotoFootprint): number {
  if (fp.exif.dateTimeOriginal) {
    const parsed = Date.parse(fp.exif.dateTimeOriginal);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const uploadedParsed = Date.parse(fp.uploadedAt);
  return Number.isNaN(uploadedParsed) ? 0 : uploadedParsed;
}

function sortFootprintsChronologically(list: PhotoFootprint[]): PhotoFootprint[] {
  return [...list].sort((a, b) => getFootprintTimestamp(a) - getFootprintTimestamp(b));
}

export function App() {
  const [footprints, setFootprints] = useState<PhotoFootprint[]>([]);
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
  const [selectionTrigger, setSelectionTrigger] = useState(0);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reframeOnDelete, setReframeOnDelete] = useState<ReframeDeleteEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);

  // Fallback manual location state
  const [pendingNoGpsPhotos, setPendingNoGpsPhotos] = useState<PhotoFootprint[]>([]);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [relocatingFootprintId, setRelocatingFootprintId] = useState<string | null>(null);

  // Load persisted photos from Azure Storage (or local IndexedDB fallback) on initial mount
  useEffect(() => {
    async function init() {
      const saved = await loadPersistedFootprints();
      setIsCloudMode(isCloudStorageActive());
      if (saved && saved.length > 0) {
        setFootprints(sortFootprintsChronologically(saved));
      }
      setIsLoaded(true);
    }
    init();
  }, []);

  // Save footprints whenever updated
  useEffect(() => {
    if (isLoaded) {
      savePersistedFootprints(footprints);
    }
  }, [footprints, isLoaded]);

  // Handle uploaded photos from dropzone
  const handlePhotosProcessed = (
    newWithGps: PhotoFootprint[],
    newWithoutGps: PhotoFootprint[]
  ) => {
    if (newWithGps.length > 0) {
      const sortedNew = sortFootprintsChronologically(newWithGps);
      setFootprints((prev) => sortFootprintsChronologically([...prev, ...sortedNew]));
      // Select the first chronological new photo to highlight it
      setSelectedFootprintId(sortedNew[0].id);
      setIsDrawerOpen(true);
    }

    if (newWithoutGps.length > 0) {
      setPendingNoGpsPhotos(newWithoutGps);
      setCurrentPendingIndex(0);
      setIsManualModalOpen(true);
    }
  };

  // Manual GPS Picking flow
  const handleStartMapPick = () => {
    setIsManualModalOpen(false);
    setIsPickingLocationOnMap(true);
  };

  const handleLocationPickedOnMap = (coords: GeoCoordinates) => {
    if (relocatingFootprintId) {
      // User is relocating an existing pin
      const targetId = relocatingFootprintId;
      setFootprints((prev) =>
        prev.map((fp) =>
          fp.id === targetId
            ? { ...fp, coordinates: coords }
            : fp
        )
      );
      updatePersistedFootprint(targetId, { coordinates: coords });
      setRelocatingFootprintId(null);
      setIsPickingLocationOnMap(false);
      setIsDrawerOpen(true);
      return;
    }

    // User is placing pin for pending photo lacking GPS
    if (pendingNoGpsPhotos.length > 0 && currentPendingIndex < pendingNoGpsPhotos.length) {
      const currentPhoto = pendingNoGpsPhotos[currentPendingIndex];
      const updatedPhoto: PhotoFootprint = {
        ...currentPhoto,
        coordinates: coords,
        hasGps: false
      };

      setFootprints((prev) => sortFootprintsChronologically([...prev, updatedPhoto]));
      setSelectedFootprintId(updatedPhoto.id);

      const nextIndex = currentPendingIndex + 1;
      setIsPickingLocationOnMap(false);

      if (nextIndex < pendingNoGpsPhotos.length) {
        setCurrentPendingIndex(nextIndex);
        setIsManualModalOpen(true);
      } else {
        setPendingNoGpsPhotos([]);
        setCurrentPendingIndex(0);
        setIsDrawerOpen(true);
      }
    }
  };

  const handleSkipPendingPhoto = () => {
    const nextIndex = currentPendingIndex + 1;
    if (nextIndex < pendingNoGpsPhotos.length) {
      setCurrentPendingIndex(nextIndex);
    } else {
      setIsManualModalOpen(false);
      setPendingNoGpsPhotos([]);
      setCurrentPendingIndex(0);
    }
  };

  const handleCancelAllPending = () => {
    setIsManualModalOpen(false);
    setPendingNoGpsPhotos([]);
    setCurrentPendingIndex(0);
    setIsPickingLocationOnMap(false);
  };

  const handleSelectFootprint = (id: string) => {
    setSelectedFootprintId(id);
    setIsDrawerOpen(true);
    setSelectionTrigger((prev) => prev + 1);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedFootprintId(null);
  };

  const handleFitAllPins = () => {
    setIsDrawerOpen(false);
    setSelectedFootprintId(null);
    setFitBoundsTrigger((prev) => prev + 1);
  };

  const handleUpdateCaption = (id: string, newCaption: string) => {
    setFootprints((prev) =>
      prev.map((fp) => (fp.id === id ? { ...fp, caption: newCaption } : fp))
    );
    updatePersistedFootprint(id, { caption: newCaption });
  };

  const handleDeleteFootprint = async (id: string) => {
    const targetFp = footprints.find((fp) => fp.id === id);
    const remaining = footprints.filter((fp) => fp.id !== id);

    // 1. Immediately deselect active photo and smoothly close the inspection drawer
    if (selectedFootprintId === id) {
      setSelectedFootprintId(null);
    }
    setIsDrawerOpen(false);

    // 2. Trigger adaptive camera reframing on remaining pins
    setReframeOnDelete({
      trigger: Date.now(),
      deletedCoords: targetFp?.coordinates,
      remainingPins: remaining
    });

    // 3. Mark photo as deleting so PhotoStrip smoothly transitions it out
    setDeletingId(id);

    // 4. Soft delete in storage in the background
    softDeleteFootprint(id, targetFp).catch((err) =>
      console.error('Failed to soft delete footprint:', err)
    );

    // 5. Cleanly remove from footprints state after the 320ms transition completes
    setTimeout(() => {
      setFootprints((prev) => prev.filter((fp) => fp.id !== id));
      setDeletingId((prev) => (prev === id ? null : prev));
    }, 320);
  };

  const handleFootprintRestored = (restored: PhotoFootprint) => {
    setFootprints((prev) => sortFootprintsChronologically([...prev, restored]));
    setSelectedFootprintId(restored.id);
    setIsDrawerOpen(true);
    setSelectionTrigger((prev) => prev + 1);
  };

  const handleRelocate = (fp: PhotoFootprint) => {
    setRelocatingFootprintId(fp.id);
    setIsDrawerOpen(false);
    setIsPickingLocationOnMap(true);
  };

  const handleLoadSampleTrip = async () => {
    const samples = sortFootprintsChronologically(await createSampleFootprints());
    setFootprints((prev) => sortFootprintsChronologically([...prev, ...samples]));
    if (samples.length > 0) {
      setSelectedFootprintId(samples[0].id);
      setIsDrawerOpen(true);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all journey footprints from storage?')) {
      setSelectedFootprintId(null);
      setIsDrawerOpen(false);
      setReframeOnDelete({
        trigger: Date.now(),
        remainingPins: []
      });
      await clearAllPersistedFootprints();
      setFootprints([]);
    }
  };

  const selectedIndex = footprints.findIndex((fp) => fp.id === selectedFootprintId);
  const selectedFootprint = selectedIndex >= 0 ? footprints[selectedIndex] : null;

  const handlePrevFootprint = () => {
    if (footprints.length <= 1 || selectedIndex < 0) return;
    const prevIdx = (selectedIndex - 1 + footprints.length) % footprints.length;
    handleSelectFootprint(footprints[prevIdx].id);
  };

  const handleNextFootprint = () => {
    if (footprints.length <= 1 || selectedIndex < 0) return;
    const nextIdx = (selectedIndex + 1) % footprints.length;
    handleSelectFootprint(footprints[nextIdx].id);
  };

  return (
    <div className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-[#121417] text-stone-100 font-sans">
      {/* Top Responsive App Bar */}
      <header className="absolute top-3 left-3 right-3 sm:top-5 sm:left-5 sm:right-auto z-20 pointer-events-none flex flex-col space-y-2 sm:space-y-3">
        <div className="pointer-events-auto flex items-center justify-between sm:justify-start space-x-3 bg-stone-900/90 backdrop-blur-xl border border-stone-800/80 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-2xl">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Logo Footprint SVG */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-950/40 text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12.2 11.2c-1.8.3-3.2 1.9-3.2 3.8 0 2.2 1.8 4 4 4s3.7-1.4 3.9-3.3c.3-2.3-2.4-4.9-4.7-4.5z" />
                <path d="M11.8 19c-1.2 0-2.2.9-2.2 2s1 2 2.2 2 2.2-.9 2.2-2-1-2-2.2-2z" opacity="0.9" />
                <circle cx="8" cy="9.5" r="1.1" />
                <circle cx="10.2" cy="7.2" r="1.3" />
                <circle cx="12.8" cy="6.2" r="1.5" />
                <circle cx="15.6" cy="6.8" r="1.3" />
                <circle cx="17.8" cy="8.8" r="1.1" />
              </svg>
            </div>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center space-x-1.5">
                <span className="truncate">FootprintPix</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                    isCloudMode
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}
                >
                  {isCloudMode ? 'AZURE' : 'LOCAL'}
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-stone-400 truncate">
                {footprints.length} {footprints.length === 1 ? 'journey pin' : 'journey pins'} placed
              </p>
            </div>
          </div>

          {/* Compact Add Photos Button on Mobile inside Top Bar */}
          <div className="sm:hidden shrink-0">
            <UploadDropzone onPhotosProcessed={handlePhotosProcessed} variant="compact" />
          </div>
        </div>

        {/* Action Pills */}
        <div className="pointer-events-auto flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
          {footprints.length === 0 && (
            <button
              onClick={handleLoadSampleTrip}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 backdrop-blur-xl border border-stone-800 text-stone-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 shadow-xl shrink-0 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample</span>
            </button>
          )}

          {footprints.length > 0 && (
            <button
              onClick={handleFitAllPins}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 backdrop-blur-xl border border-stone-800 text-stone-300 hover:text-white text-xs font-medium flex items-center space-x-1.5 shadow-xl shrink-0 transition-all"
              title="Zoom to fit all journey pins"
            >
              <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Fit All Pins</span>
            </button>
          )}

          {/* Recently Deleted / Trash recovery button */}
          <button
            onClick={() => setIsTrashModalOpen(true)}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 backdrop-blur-xl border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-medium flex items-center space-x-1.5 shadow-xl shrink-0 transition-all"
            title="View recently deleted photos"
          >
            <History className="w-3.5 h-3.5 text-stone-400" />
            <span>Recently Deleted</span>
          </button>

          {footprints.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-900/90 hover:bg-rose-950/50 backdrop-blur-xl border border-stone-800 hover:border-rose-900/50 text-stone-400 hover:text-rose-400 text-xs shadow-xl shrink-0 transition-all"
              title="Clear all active pins"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Top Right Desktop Upload Dropzone */}
      <div className="hidden sm:block absolute top-5 right-5 z-20 max-w-xs sm:max-w-sm pointer-events-auto">
        <UploadDropzone onPhotosProcessed={handlePhotosProcessed} variant="full" />
      </div>

      {/* Primary Full-Bleed Map Canvas */}
      <main className="w-full h-full">
        <MapView
          footprints={footprints}
          selectedFootprintId={selectedFootprintId}
          selectionTrigger={selectionTrigger}
          fitBoundsTrigger={fitBoundsTrigger}
          reframeOnDelete={reframeOnDelete}
          deletingId={deletingId}
          isDrawerOpen={isDrawerOpen}
          onSelectFootprint={handleSelectFootprint}
          onDismissSelection={handleCloseDrawer}
          isPickingLocation={isPickingLocationOnMap}
          onLocationPicked={handleLocationPickedOnMap}
        />
      </main>

      {/* Bottom Horizontal Photo Quick Gallery */}
      <PhotoStrip
        footprints={footprints}
        selectedFootprintId={selectedFootprintId}
        deletingId={deletingId}
        onSelect={handleSelectFootprint}
      />

      {/* Dedicated Side Inspection Drawer */}
      <InspectionDrawer
        footprint={selectedFootprint}
        currentIndex={selectedIndex}
        totalCount={footprints.length}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onPrev={handlePrevFootprint}
        onNext={handleNextFootprint}
        onUpdateCaption={handleUpdateCaption}
        onDeleteFootprint={handleDeleteFootprint}
        onRelocate={handleRelocate}
      />

      {/* Modal for Photos Missing EXIF GPS */}
      <ManualLocationModal
        pendingPhotos={pendingNoGpsPhotos}
        currentIndex={currentPendingIndex}
        isOpen={isManualModalOpen}
        onStartMapPick={handleStartMapPick}
        onSkip={handleSkipPendingPhoto}
        onCancelAll={handleCancelAllPending}
      />

      {/* Recently Deleted Recovery Modal */}
      <RecentlyDeletedModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        onFootprintRestored={handleFootprintRestored}
      />
    </div>
  );
}

export default App;
