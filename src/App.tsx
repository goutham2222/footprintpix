import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash
} from 'lucide-react';
import { MapView } from './components/Map/MapView';
import { InspectionDrawer } from './components/Inspection/InspectionDrawer';
import { UploadDropzone } from './components/Upload/UploadDropzone';
import { ManualLocationModal } from './components/Upload/ManualLocationModal';
import { PhotoStrip } from './components/Gallery/PhotoStrip';
import { PhotoFootprint, GeoCoordinates } from './types/footprint';
import { 
  loadPersistedFootprints, 
  savePersistedFootprints, 
  clearAllPersistedFootprints 
} from './utils/storage';
import { createSampleFootprints } from './utils/sampleData';

export function App() {
  const [footprints, setFootprints] = useState<PhotoFootprint[]>([]);
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
  const [selectionTrigger, setSelectionTrigger] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fallback manual location state
  const [pendingNoGpsPhotos, setPendingNoGpsPhotos] = useState<PhotoFootprint[]>([]);
  const [currentPendingIndex, setCurrentPendingIndex] = useState(0);
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [relocatingFootprintId, setRelocatingFootprintId] = useState<string | null>(null);

  // Load persisted photos from IndexedDB on initial mount
  useEffect(() => {
    async function init() {
      const saved = await loadPersistedFootprints();
      if (saved && saved.length > 0) {
        setFootprints(saved);
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
      setFootprints((prev) => [...prev, ...newWithGps]);
      // Select the first new photo to highlight it
      setSelectedFootprintId(newWithGps[0].id);
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
      setFootprints((prev) =>
        prev.map((fp) =>
          fp.id === relocatingFootprintId
            ? { ...fp, coordinates: coords }
            : fp
        )
      );
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

      setFootprints((prev) => [...prev, updatedPhoto]);
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

  const handleUpdateCaption = (id: string, newCaption: string) => {
    setFootprints((prev) =>
      prev.map((fp) => (fp.id === id ? { ...fp, caption: newCaption } : fp))
    );
  };

  const handleDeleteFootprint = (id: string) => {
    setFootprints((prev) => prev.filter((fp) => fp.id !== id));
    if (selectedFootprintId === id) {
      setSelectedFootprintId(null);
      setIsDrawerOpen(false);
    }
  };

  const handleRelocate = (fp: PhotoFootprint) => {
    setRelocatingFootprintId(fp.id);
    setIsDrawerOpen(false);
    setIsPickingLocationOnMap(true);
  };

  const handleLoadSampleTrip = async () => {
    const samples = await createSampleFootprints();
    setFootprints((prev) => [...prev, ...samples]);
    if (samples.length > 0) {
      setSelectedFootprintId(samples[0].id);
      setIsDrawerOpen(true);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all journey footprints from your local storage?')) {
      await clearAllPersistedFootprints();
      setFootprints([]);
      setSelectedFootprintId(null);
      setIsDrawerOpen(false);
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#121417] text-stone-100 font-sans">
      {/* Top Floating App Bar */}
      <header className="absolute top-5 left-5 z-20 pointer-events-none flex flex-col space-y-3">
        <div className="pointer-events-auto flex items-center space-x-3 bg-stone-900/90 backdrop-blur-xl border border-stone-800/80 px-4 py-3 rounded-2xl shadow-2xl">
          {/* Logo Footprint SVG */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-950/40 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12.2 11.2c-1.8.3-3.2 1.9-3.2 3.8 0 2.2 1.8 4 4 4s3.7-1.4 3.9-3.3c.3-2.3-2.4-4.9-4.7-4.5z" />
              <path d="M11.8 19c-1.2 0-2.2.9-2.2 2s1 2 2.2 2 2.2-.9 2.2-2-1-2-2.2-2z" opacity="0.9" />
              <circle cx="8" cy="9.5" r="1.1" />
              <circle cx="10.2" cy="7.2" r="1.3" />
              <circle cx="12.8" cy="6.2" r="1.5" />
              <circle cx="15.6" cy="6.8" r="1.3" />
              <circle cx="17.8" cy="8.8" r="1.1" />
            </svg>
          </div>

          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center space-x-1.5">
              <span>FootprintPix</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-medium">
                LOCAL
              </span>
            </h1>
            <p className="text-[11px] text-stone-400">
              {footprints.length} {footprints.length === 1 ? 'journey pin' : 'journey pins'} placed
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {footprints.length === 0 && (
            <button
              onClick={handleLoadSampleTrip}
              className="px-3.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 backdrop-blur-xl border border-stone-800 text-stone-300 hover:text-white text-xs font-medium flex items-center space-x-2 shadow-xl transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample Journey</span>
            </button>
          )}

          {footprints.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-stone-900/90 hover:bg-rose-950/50 backdrop-blur-xl border border-stone-800 hover:border-rose-900/50 text-stone-400 hover:text-rose-400 text-xs shadow-xl transition-all"
              title="Clear all pins"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Top Right Upload Widget */}
      <div className="absolute top-5 right-5 z-20 max-w-xs sm:max-w-sm pointer-events-auto">
        <UploadDropzone onPhotosProcessed={handlePhotosProcessed} />
      </div>

      {/* Primary Full-Bleed Map Canvas */}
      <main className="w-full h-full">
        <MapView
          footprints={footprints}
          selectedFootprintId={selectedFootprintId}
          selectionTrigger={selectionTrigger}
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
    </div>
  );
}

export default App;
