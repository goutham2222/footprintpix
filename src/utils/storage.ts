import { get, set, del } from 'idb-keyval';
import { GeoCoordinates, PhotoFootprint } from '../types/footprint';

const STORAGE_KEY = 'footprintpix_photos_v1';
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

let cloudModeActive = false;
const syncedCloudIds = new Set<string>();

export function isCloudStorageActive(): boolean {
  return cloudModeActive;
}

/**
 * Converts a base64 dataUrl ('data:image/jpeg;base64,...') into a binary Blob
 * for direct PUT upload to Azure Blob Storage via SAS token.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Uploads a single PhotoFootprint to Azure Blob Storage (via SAS URL)
 * and persists its metadata record in Azure Table Storage.
 */
async function uploadFootprintToAzure(fp: PhotoFootprint): Promise<void> {
  let blobName = fp.blobName;

  // Upload binary image to Azure Blob Storage if not yet uploaded and not an SVG sample
  if (
    !blobName &&
    fp.dataUrl.startsWith('data:image/') &&
    !fp.dataUrl.startsWith('data:image/svg+xml')
  ) {
    const sasRes = await fetch(`${API_BASE}/uploads/sas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: fp.id,
        filename: fp.filename,
        contentType: fp.mimeType || 'image/jpeg'
      })
    });

    if (sasRes.ok) {
      const sasData = (await sasRes.json()) as {
        blobName: string;
        uploadUrl: string;
        readUrl: string;
      };

      const binaryBlob = await dataUrlToBlob(fp.dataUrl);
      const putRes = await fetch(sasData.uploadUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': fp.mimeType || 'image/jpeg'
        },
        body: binaryBlob
      });

      if (putRes.ok) {
        blobName = sasData.blobName;
        fp.blobName = blobName;
      }
    }
  }

  // Save metadata record to Azure Table Storage
  const metaRes = await fetch(`${API_BASE}/footprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...fp,
      blobName,
      // Do not send multi-MB base64 strings to Table Storage once stored in Blob Storage
      dataUrl: blobName ? undefined : fp.dataUrl
    })
  });

  if (metaRes.ok) {
    syncedCloudIds.add(fp.id);
  }
}

/**
 * Loads footprints from Azure Table Storage + Blob SAS URLs if the `/api` backend
 * is reachable and configured, or falls back to local IndexedDB in local-only mode.
 */
export async function loadPersistedFootprints(): Promise<PhotoFootprint[]> {
  try {
    const res = await fetch(`${API_BASE}/footprints`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = (await res.json()) as { footprints?: PhotoFootprint[] };
        if (Array.isArray(payload.footprints)) {
          cloudModeActive = true;
          syncedCloudIds.clear();
          payload.footprints.forEach((fp) => syncedCloudIds.add(fp.id));
          return payload.footprints;
        }
      }
    }
  } catch {
    // Cloud API not reachable (e.g. local Vite dev server) — fall back to IndexedDB
  }

  cloudModeActive = false;
  try {
    const data = await get<PhotoFootprint[]>(STORAGE_KEY);
    return data || [];
  } catch (error) {
    console.error('Failed to load footprints from IndexedDB:', error);
    return [];
  }
}

/**
 * Saves footprints to local IndexedDB and, when Cloud Mode is active,
 * uploads any newly added footprints to Azure Blob + Table Storage.
 */
export async function savePersistedFootprints(footprints: PhotoFootprint[]): Promise<void> {
  // Always keep local IndexedDB cache updated as a fast local backup
  try {
    await set(STORAGE_KEY, footprints);
  } catch (error) {
    console.error('Failed to save footprints to IndexedDB:', error);
  }

  if (!cloudModeActive) return;

  const unsynced = footprints.filter((fp) => !syncedCloudIds.has(fp.id));
  for (const fp of unsynced) {
    try {
      await uploadFootprintToAzure(fp);
    } catch (error) {
      console.error('Failed to sync footprint to Azure:', fp.id, error);
    }
  }
}

/**
 * Updates caption or repositioned coordinates for a single footprint in Azure Table Storage.
 */
export async function updatePersistedFootprint(
  id: string,
  patch: { caption?: string; locationName?: string; coordinates?: GeoCoordinates }
): Promise<void> {
  if (!cloudModeActive) return;
  try {
    await fetch(`${API_BASE}/footprints/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
  } catch (error) {
    console.error('Failed to update footprint in Azure:', error);
  }
}

/**
 * Deletes a single footprint and its underlying blob in Azure Storage.
 */
export async function deletePersistedFootprint(id: string): Promise<void> {
  syncedCloudIds.delete(id);
  if (!cloudModeActive) return;
  try {
    await fetch(`${API_BASE}/footprints/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Failed to delete footprint from Azure:', error);
  }
}

/**
 * Clears all footprints from both IndexedDB and Azure Storage.
 */
export async function clearAllPersistedFootprints(): Promise<void> {
  syncedCloudIds.clear();
  try {
    await del(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear footprints from IndexedDB:', error);
  }

  if (!cloudModeActive) return;
  try {
    await fetch(`${API_BASE}/footprints`, { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to clear footprints from Azure:', error);
  }
}
