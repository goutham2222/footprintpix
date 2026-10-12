import { get, set, del } from 'idb-keyval';
import { PhotoFootprint } from '../types/footprint';

const STORAGE_KEY = 'footprintpix_photos_v1';

export async function loadPersistedFootprints(): Promise<PhotoFootprint[]> {
  try {
    const data = await get<PhotoFootprint[]>(STORAGE_KEY);
    return data || [];
  } catch (error) {
    console.error('Failed to load footprints from IndexedDB:', error);
    return [];
  }
}

export async function savePersistedFootprints(footprints: PhotoFootprint[]): Promise<void> {
  try {
    await set(STORAGE_KEY, footprints);
  } catch (error) {
    console.error('Failed to save footprints to IndexedDB:', error);
  }
}

export async function clearAllPersistedFootprints(): Promise<void> {
  try {
    await del(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear footprints:', error);
  }
}

