export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface ExifMetadata {
  dateTimeOriginal?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: number;
  altitude?: number;
}

export interface PhotoFootprint {
  id: string;
  filename: string;
  blobName?: string; // Azure Blob Storage object key when persisted in cloud
  dataUrl: string; // Base64 data URL locally, or signed Azure Blob SAS URL in cloud
  size: number;
  mimeType: string;
  uploadedAt: string;
  hasGps: boolean;
  coordinates: GeoCoordinates;
  exif: ExifMetadata;
  caption?: string;
  locationName?: string; // Optional reverse geocoded or formatted string
  isDeleted?: boolean; // Soft-delete flag
  deletedAt?: string | null; // ISO timestamp when marked as deleted
}

