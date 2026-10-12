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
  dataUrl: string; // Base64 data URL for preview and storage
  size: number;
  mimeType: string;
  uploadedAt: string;
  hasGps: boolean;
  coordinates: GeoCoordinates;
  exif: ExifMetadata;
  caption?: string;
  locationName?: string; // Optional reverse geocoded or formatted string
}

