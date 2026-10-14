import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { getStorageClients, isStorageConfigured } from '../storageClient';
import { FootprintTableEntity } from './footprintsApi';

const PARTITION_KEY = 'default';
const DEFAULT_RETENTION_DAYS = 30;

/**
 * Core expiration utility: Finds all records where isDeleted = true and deletedAt
 * is older than retentionDays (default: 30 days), and permanently deletes their
 * associated Azure Blob images and Table Storage rows.
 */
export async function cleanupExpiredFootprints(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<{
  purgedCount: number;
  purgedIds: string[];
}> {
  if (!isStorageConfigured()) {
    throw new Error('Azure Storage is not configured.');
  }

  const { containerClient, tableClient } = await getStorageClients();
  const thresholdTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const entities = tableClient.listEntities<FootprintTableEntity>({
    queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` }
  });

  let purgedCount = 0;
  const purgedIds: string[] = [];

  for await (const entity of entities) {
    const isEntityDeleted = entity.isDeleted === true || (entity.isDeleted as any) === 'true';
    if (isEntityDeleted && entity.deletedAt) {
      const deletedTimestamp = Date.parse(entity.deletedAt);
      if (!Number.isNaN(deletedTimestamp) && deletedTimestamp < thresholdTime) {
        // 1. Purge Blob from Azure Blob Storage
        if (entity.blobName) {
          await containerClient.deleteBlob(entity.blobName).catch(() => {});
        }
        // 2. Purge row from Azure Table Storage
        await tableClient.deleteEntity(PARTITION_KEY, entity.rowKey).catch(() => {});

        purgedCount++;
        purgedIds.push(entity.rowKey);
      }
    }
  }

  return { purgedCount, purgedIds };
}

// 1. Nightly Azure Timer Function (Runs every day at 02:00 UTC: "0 0 2 * * *")
app.timer('nightlyExpiredFootprintsCleanup', {
  schedule: '0 0 2 * * *',
  handler: async (timer: Timer, context: InvocationContext): Promise<void> => {
    context.log('Running nightly expired soft-deleted footprints cleanup job...');
    try {
      const result = await cleanupExpiredFootprints(DEFAULT_RETENTION_DAYS);
      context.log(`Nightly cleanup completed. Permanently purged ${result.purgedCount} expired footprint(s).`);
    } catch (error: any) {
      context.error('Failed to execute nightly footprints cleanup:', error);
    }
  }
});

// 2. Optional on-demand HTTP invocation endpoint: POST /api/cleanup/purge-expired
app.http('manualPurgeExpired', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'cleanup/purge-expired',
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (!isStorageConfigured()) {
      return { status: 503, jsonBody: { error: 'Azure Storage is not configured.' } };
    }

    try {
      const body = (await req.json().catch(() => ({}))) as { retentionDays?: number };
      const days = Number(body?.retentionDays) || DEFAULT_RETENTION_DAYS;
      const result = await cleanupExpiredFootprints(days);
      return { status: 200, jsonBody: result };
    } catch (error: any) {
      return {
        status: 500,
        jsonBody: { error: error?.message || 'Failed to run expiration cleanup.' }
      };
    }
  }
});

