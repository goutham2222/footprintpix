import exifr from 'exifr';
import { ExifMetadata, GeoCoordinates } from '../types/footprint';

export interface ExtractedPhotoData {
  coordinates: GeoCoordinates | null;
  exif: ExifMetadata;
}

/**
 * Parses EXIF metadata and GPS coordinates directly from a raw image File.
 * Uses full exifr parsing with chunked: false to ensure iPhone JPEG APP1/EXIF
 * segments containing GPS and camera info are completely parsed.
 */
export async function extractExifFromFile(file: File): Promise<ExtractedPhotoData> {
  try {
    const rawData = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      gps: true,
      // Ensure full parsing rather than restricted chunking so iPhone JPEG APP1/EXIF segments aren't missed
      chunked: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
    } as any);

    let coordinates: GeoCoordinates | null = null;
    const latitude = rawData?.latitude;
    const longitude = rawData?.longitude;

    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      coordinates = {
        latitude,
        longitude
      };
    }

    const exif: ExifMetadata = {};
    if (rawData) {
      if (rawData.DateTimeOriginal) {
        exif.dateTimeOriginal = new Date(rawData.DateTimeOriginal).toISOString();
      } else if (rawData.CreateDate) {
        exif.dateTimeOriginal = new Date(rawData.CreateDate).toISOString();
      }

      if (rawData.Make) exif.cameraMake = String(rawData.Make).trim();
      if (rawData.Model) exif.cameraModel = String(rawData.Model).trim();
      if (rawData.LensModel) exif.lensModel = String(rawData.LensModel).trim();
      if (rawData.FocalLength) exif.focalLength = Number(rawData.FocalLength);
      if (rawData.FNumber) exif.fNumber = Number(rawData.FNumber);
      if (rawData.ISO) exif.iso = Number(rawData.ISO);
      if (rawData.ExposureTime) exif.exposureTime = Number(rawData.ExposureTime);
      if (rawData.GPSAltitude) exif.altitude = Number(rawData.GPSAltitude);
    }

    return {
      coordinates,
      exif
    };
  } catch (error) {
    console.warn('Could not extract EXIF from file:', error);
    return {
      coordinates: null,
      exif: {}
    };
  }
}

/**
 * Converts a File to a Base64 data URL with optional max dimensions to preserve local storage DX
 */
export function readFileAsDataUrl(file: File, maxDimension: number = 2400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        return reject(new Error('Failed to read file'));
      }

      // If it's not an image (or if canvas resize isn't needed), return raw dataUrl
      if (!file.type.startsWith('image/')) {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Only scale down if exceedingly massive to prevent IndexedDB bloat while retaining high quality
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // High quality jpeg/webp output
            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            return resolve(canvas.toDataURL(outputType, 0.92));
          }
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl); // fallback to raw
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

