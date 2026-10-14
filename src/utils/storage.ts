import { get, set, del } from 'idb-keyval';
import { GeoCoordinates, PhotoFootprint } from '../types/footprint';

const STORAGE_KEY = 'footprintpix_photos_v1';
const STORAGE_KEY_DELETED = 'footprintpix_photos_deleted_v1';
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
        fp.dataUrl = sasData.readUrl;
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
 * Loads active footprints from Azure Table Storage if connected,
 * or falls back to local IndexedDB.
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
          return payload.footprints.filter((fp) => !fp.isDeleted);
        }
      }
    }
  } catch {
    // Cloud API not reachable — fall back to IndexedDB
  }

  cloudModeActive = false;
  try {
    const data = await get<PhotoFootprint[]>(STORAGE_KEY);
    return (data || []).filter((fp) => !fp.isDeleted);
  } catch (error) {
    console.error('Failed to load footprints from IndexedDB:', error);
    return [];
  }
}

/**
 * Loads soft-deleted footprints from Azure Table Storage (GET /api/footprints/deleted)
 * or falls back to local IndexedDB deleted store.
 */
export async function loadDeletedFootprints(): Promise<PhotoFootprint[]> {
  if (cloudModeActive) {
    try {
      const res = await fetch(`${API_BASE}/footprints/deleted`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const payload = (await res.json()) as { footprints?: PhotoFootprint[] };
        if (Array.isArray(payload.footprints)) {
          return payload.footprints;
        }
      }
    } catch (err) {
      console.error('Failed to load deleted footprints from cloud:', err);
    }
  }

  try {
    const deleted = await get<PhotoFootprint[]>(STORAGE_KEY_DELETED);
    return deleted || [];
  } catch {
    return [];
  }
}

/**
 * Saves active footprints to local IndexedDB and syncs new footprints to Azure.
 */
export async function savePersistedFootprints(footprints: PhotoFootprint[]): Promise<void> {
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
 * Soft deletes a single footprint: flags as isDeleted = true with timestamp.
 * Does NOT delete the image binary from Azure Blob Storage.
 */
export async function softDeleteFootprint(id: string, fp?: PhotoFootprint): Promise<void> {
  syncedCloudIds.delete(id);

  if (cloudModeActive) {
    try {
      await fetch(`${API_BASE}/footprints/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to soft delete footprint from Azure:', error);
    }
  }

  // Update local IndexedDB storage
  try {
    const active = (await get<PhotoFootprint[]>(STORAGE_KEY)) || [];
    const itemToTrash = fp || active.find((x) => x.id === id);
    const updatedActive = active.filter((x) => x.id !== id);
    await set(STORAGE_KEY, updatedActive);

    if (itemToTrash) {
      const deletedList = (await get<PhotoFootprint[]>(STORAGE_KEY_DELETED)) || [];
      const trashedItem: PhotoFootprint = {
        ...itemToTrash,
        isDeleted: true,
        deletedAt: new Date().toISOString()
      };
      await set(STORAGE_KEY_DELETED, [trashedItem, ...deletedList.filter((x) => x.id !== id)]);
    }
  } catch (error) {
    console.error('Failed to update local stores on soft delete:', error);
  }
}

/**
 * Restores a soft-deleted footprint back to the active map.
 */
export async function restoreFootprint(id: string): Promise<PhotoFootprint | null> {
  let restoredItem: PhotoFootprint | null = null;

  if (cloudModeActive) {
    try {
      const res = await fetch(`${API_BASE}/footprints/${encodeURIComponent(id)}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        const payload = (await res.json()) as { footprint?: PhotoFootprint };
        if (payload.footprint) {
          restoredItem = payload.footprint;
          syncedCloudIds.add(id);
        }
      }
    } catch (error) {
      console.error('Failed to restore footprint from Azure:', error);
    }
  }

  // Restore in local IndexedDB
  try {
    const deletedList = (await get<PhotoFootprint[]>(STORAGE_KEY_DELETED)) || [];
    const found = deletedList.find((x) => x.id === id);
    const updatedDeleted = deletedList.filter((x) => x.id !== id);
    await set(STORAGE_KEY_DELETED, updatedDeleted);

    if (found) {
      const activeList = (await get<PhotoFootprint[]>(STORAGE_KEY)) || [];
      const unflagged: PhotoFootprint = {
        ...found,
        isDeleted: false,
        deletedAt: null
      };
      await set(STORAGE_KEY, [...activeList.filter((x) => x.id !== id), unflagged]);
      if (!restoredItem) {
        restoredItem = unflagged;
      }
    }
  } catch (error) {
    console.error('Failed to restore in local store:', error);
  }

  return restoredItem;
}

/**
 * Permanently hard-deletes a single footprint (purges blob from Blob Storage + row from Table).
 */
export async function permanentlyDeleteFootprint(id: string): Promise<void> {
  syncedCloudIds.delete(id);

  if (cloudModeActive) {
    try {
      await fetch(`${API_BASE}/footprints/${encodeURIComponent(id)}/permanent`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to permanently delete footprint from Azure:', error);
    }
  }

  try {
    const deletedList = (await get<PhotoFootprint[]>(STORAGE_KEY_DELETED)) || [];
    await set(STORAGE_KEY_DELETED, deletedList.filter((x) => x.id !== id));
  } catch (error) {
    console.error('Failed to purge from local deleted store:', error);
  }
}

/**
 * Permanently purges all soft-deleted footprints ("Empty Trash").
 */
export async function permanentlyDeleteAllDeleted(): Promise<void> {
  if (cloudModeActive) {
    try {
      await fetch(`${API_BASE}/footprints/deleted`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to empty trash in Azure:', error);
    }
  }

  try {
    await del(STORAGE_KEY_DELETED);
  } catch (error) {
    console.error('Failed to empty local trash store:', error);
  }
}

/**
 * Soft deletes all active footprints.
 */
export async function clearAllPersistedFootprints(): Promise<void> {
  syncedCloudIds.clear();

  if (cloudModeActive) {
    try {
      await fetch(`${API_BASE}/footprints`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear footprints from Azure:', error);
    }
  }

  try {
    const active = (await get<PhotoFootprint[]>(STORAGE_KEY)) || [];
    const nowIso = new Date().toISOString();
    const trashed = active.map((fp) => ({
      ...fp,
      isDeleted: true,
      deletedAt: nowIso
    }));
    const existingDeleted = (await get<PhotoFootprint[]>(STORAGE_KEY_DELETED)) || [];
    await set(STORAGE_KEY_DELETED, [...trashed, ...existingDeleted]);
    await del(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear footprints from IndexedDB:', error);
  }
}
