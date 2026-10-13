import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  isStorageConfigured,
  getStorageClients,
  createUploadSasUrl,
  createReadSasUrl
} from '../storageClient';

const PARTITION_KEY = 'default';

interface FootprintTableEntity {
  partitionKey: string;
  rowKey: string;
  filename: string;
  blobName?: string;
  inlineDataUrl?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  hasGps: boolean;
  latitude: number;
  longitude: number;
  exifJson: string;
  caption?: string;
  locationName?: string;
}

function entityToFootprint(entity: FootprintTableEntity) {
  let exif = {};
  try {
    if (entity.exifJson) {
      exif = JSON.parse(entity.exifJson);
    }
  } catch {
    exif = {};
  }

  const dataUrl = entity.blobName
    ? createReadSasUrl(entity.blobName)
    : entity.inlineDataUrl || '';

  return {
    id: entity.rowKey,
    filename: entity.filename,
    blobName: entity.blobName,
    dataUrl,
    size: Number(entity.size || 0),
    mimeType: entity.mimeType || 'image/jpeg',
    uploadedAt: entity.uploadedAt,
    hasGps: Boolean(entity.hasGps),
    coordinates: {
      latitude: Number(entity.latitude || 0),
      longitude: Number(entity.longitude || 0)
    },
    exif,
    caption: entity.caption || '',
    locationName: entity.locationName || undefined
  };
}

// 1. POST /api/uploads/sas — Mint a short-lived SAS URL for direct client-side Blob PUT
app.http('generateUploadSas', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'uploads/sas',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (!isStorageConfigured()) {
      return {
        status: 503,
        jsonBody: { error: 'Azure Storage is not configured.' }
      };
    }

    try {
      const body = (await req.json()) as {
        id?: string;
        filename?: string;
        contentType?: string;
      };

      const id = body.id || `fp_${Date.now()}`;
      const safeName = (body.filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const contentType = body.contentType || 'image/jpeg';
      const blobName = `${id}_${safeName}`;

      // Ensure container exists before client uploads to it
      await getStorageClients();
      const { uploadUrl, readUrl } = createUploadSasUrl(blobName, contentType);

      return {
        status: 200,
        jsonBody: {
          blobName,
          uploadUrl,
          readUrl
        }
      };
    } catch (error: any) {
      return {
        status: 500,
        jsonBody: { error: error?.message || 'Failed to generate SAS token.' }
      };
    }
  }
});

// 2. GET / POST / DELETE /api/footprints — List all, Upsert batch/single, or Clear all
app.http('footprintsCollection', {
  methods: ['GET', 'POST', 'DELETE'],
  authLevel: 'anonymous',
  route: 'footprints',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (!isStorageConfigured()) {
      return {
        status: 503,
        jsonBody: { error: 'Azure Storage is not configured.' }
      };
    }

    try {
      const { containerClient, tableClient } = await getStorageClients();

      if (req.method === 'GET') {
        const footprints: any[] = [];
        const entities = tableClient.listEntities<FootprintTableEntity>({
          queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
        });

        for await (const entity of entities) {
          footprints.push(entityToFootprint(entity));
        }

        return {
          status: 200,
          jsonBody: { footprints }
        };
      }

      if (req.method === 'POST') {
        const fp = (await req.json()) as any;
        if (!fp || !fp.id) {
          return { status: 400, jsonBody: { error: 'Missing footprint id.' } };
        }

        const entity: FootprintTableEntity = {
          partitionKey: PARTITION_KEY,
          rowKey: fp.id,
          filename: fp.filename || 'photo.jpg',
          blobName: fp.blobName || undefined,
          // Only store inline dataUrl if no blobName was uploaded (e.g. lightweight SVG sample pins)
          inlineDataUrl: fp.blobName ? undefined : fp.dataUrl,
          size: Number(fp.size || 0),
          mimeType: fp.mimeType || 'image/jpeg',
          uploadedAt: fp.uploadedAt || new Date().toISOString(),
          hasGps: Boolean(fp.hasGps),
          latitude: Number(fp.coordinates?.latitude || 0),
          longitude: Number(fp.coordinates?.longitude || 0),
          exifJson: JSON.stringify(fp.exif || {}),
          caption: fp.caption || '',
          locationName: fp.locationName || ''
        };

        await tableClient.upsertEntity(entity, 'Replace');
        return {
          status: 201,
          jsonBody: { footprint: entityToFootprint(entity) }
        };
      }

      if (req.method === 'DELETE') {
        const entities = tableClient.listEntities<FootprintTableEntity>({
          queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
        });

        for await (const entity of entities) {
          if (entity.blobName) {
            await containerClient.deleteBlob(entity.blobName).catch(() => {});
          }
          await tableClient.deleteEntity(PARTITION_KEY, entity.rowKey).catch(() => {});
        }

        return { status: 200, jsonBody: { cleared: true } };
      }

      return { status: 405, jsonBody: { error: 'Method not allowed' } };
    } catch (error: any) {
      return {
        status: 500,
        jsonBody: { error: error?.message || 'Internal storage error' }
      };
    }
  }
});

// 3. PATCH / DELETE /api/footprints/{id} — Update caption/coordinates or delete single pin + blob
app.http('footprintItem', {
  methods: ['PATCH', 'DELETE'],
  authLevel: 'anonymous',
  route: 'footprints/{id}',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (!isStorageConfigured()) {
      return {
        status: 503,
        jsonBody: { error: 'Azure Storage is not configured.' }
      };
    }

    const id = req.params.id;
    if (!id) {
      return { status: 400, jsonBody: { error: 'Missing footprint id parameter.' } };
    }

    try {
      const { containerClient, tableClient } = await getStorageClients();

      if (req.method === 'PATCH') {
        const patch = (await req.json()) as {
          caption?: string;
          locationName?: string;
          coordinates?: { latitude: number; longitude: number };
        };

        const updateEntity: Record<string, any> = {
          partitionKey: PARTITION_KEY,
          rowKey: id
        };

        if (typeof patch.caption === 'string') {
          updateEntity.caption = patch.caption;
        }
        if (typeof patch.locationName === 'string') {
          updateEntity.locationName = patch.locationName;
        }
        if (patch.coordinates) {
          updateEntity.latitude = Number(patch.coordinates.latitude);
          updateEntity.longitude = Number(patch.coordinates.longitude);
        }

        await tableClient.updateEntity(updateEntity as any, 'Merge');
        return { status: 200, jsonBody: { updated: true } };
      }

      if (req.method === 'DELETE') {
        try {
          const existing = await tableClient.getEntity<FootprintTableEntity>(PARTITION_KEY, id);
          if (existing?.blobName) {
            await containerClient.deleteBlob(existing.blobName).catch(() => {});
          }
        } catch {
          // Entity may not exist yet
        }
        await tableClient.deleteEntity(PARTITION_KEY, id).catch(() => {});
        return { status: 200, jsonBody: { deleted: true } };
      }

      return { status: 405, jsonBody: { error: 'Method not allowed' } };
    } catch (error: any) {
      return {
        status: 500,
        jsonBody: { error: error?.message || 'Failed to update/delete footprint.' }
      };
    }
  }
});

