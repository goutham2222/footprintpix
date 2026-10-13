import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol
} from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'footprints';
const TABLE_NAME = process.env.AZURE_STORAGE_TABLE_NAME || 'Footprints';

let isInitialized = false;

function getConnectionString(): string {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not configured.');
  }
  return connStr;
}

function parseAccountCredentials(connStr: string): { accountName: string; accountKey: string } {
  const parts = connStr.split(';');
  let accountName = '';
  let accountKey = '';
  for (const part of parts) {
    if (part.startsWith('AccountName=')) {
      accountName = part.substring('AccountName='.length);
    } else if (part.startsWith('AccountKey=')) {
      accountKey = part.substring('AccountKey='.length);
    }
  }
  if (!accountName || !accountKey) {
    throw new Error('Invalid AZURE_STORAGE_CONNECTION_STRING: missing AccountName or AccountKey.');
  }
  return { accountName, accountKey };
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING);
}

export async function getStorageClients() {
  const connStr = getConnectionString();
  const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const tableClient = TableClient.fromConnectionString(connStr, TABLE_NAME);

  if (!isInitialized) {
    await Promise.all([
      containerClient.createIfNotExists(),
      tableClient.createTable().catch((err: any) => {
        // Ignore 409 TableAlreadyExists error
        if (err?.statusCode !== 409) throw err;
      })
    ]);
    isInitialized = true;
  }

  return { containerClient, tableClient };
}

export function createUploadSasUrl(blobName: string, contentType: string): {
  uploadUrl: string;
  readUrl: string;
} {
  const connStr = getConnectionString();
  const { accountName, accountKey } = parseAccountCredentials(connStr);
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const now = new Date();
  const startsOn = new Date(now.getTime() - 2 * 60 * 1000); // 2 min clock skew buffer
  const uploadExpiresOn = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes to upload

  const writeSas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // create + write only
      startsOn,
      expiresOn: uploadExpiresOn,
      protocol: SASProtocol.HttpsAndHttp,
      contentType
    },
    sharedKeyCredential
  ).toString();

  const baseUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${encodeURIComponent(blobName)}`;
  return {
    uploadUrl: `${baseUrl}?${writeSas}`,
    readUrl: createReadSasUrl(blobName)
  };
}

export function createReadSasUrl(blobName: string): string {
  const connStr = getConnectionString();
  const { accountName, accountKey } = parseAccountCredentials(connStr);
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const now = new Date();
  const startsOn = new Date(now.getTime() - 5 * 60 * 1000);
  const expiresOn = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour read SAS

  const readSas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // read only
      startsOn,
      expiresOn,
      protocol: SASProtocol.HttpsAndHttp
    },
    sharedKeyCredential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${encodeURIComponent(blobName)}?${readSas}`;
}

