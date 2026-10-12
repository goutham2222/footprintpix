import { PhotoFootprint } from '../types/footprint';

interface SampleTravelPhoto {
  name: string;
  url: string;
  lat: number;
  lng: number;
  city: string;
  date: string;
  camera: string;
  lens: string;
  caption: string;
}

const SAMPLE_TRAVELS: SampleTravelPhoto[] = [
  {
    name: 'santorini_sunset.jpg',
    url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    lat: 36.4618,
    lng: 25.3753,
    city: 'Oia, Santorini, Greece',
    date: '2024-05-18T18:42:00.000Z',
    camera: 'Sony A7 IV',
    lens: 'FE 24-70mm F2.8 GM II',
    caption: 'Golden hour hues washing over the whitewashed caldera rooftops.'
  },
  {
    name: 'kyoto_fushimi_inari.jpg',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    lat: 34.9671,
    lng: 135.7727,
    city: 'Kyoto, Japan',
    date: '2024-04-03T07:15:00.000Z',
    camera: 'Fujifilm X-T5',
    lens: 'XF 23mm F1.4 R LM WR',
    caption: 'Serene morning ascent under thousands of vermilion torii gates.'
  },
  {
    name: 'banff_moraine_lake.jpg',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    lat: 51.3217,
    lng: -116.1860,
    city: 'Banff National Park, Canada',
    date: '2023-08-22T11:20:00.000Z',
    camera: 'Canon EOS R5',
    lens: 'RF 15-35mm F2.8 L IS USM',
    caption: 'Glacial turquoise waters mirroring the Valley of the Ten Peaks.'
  },
  {
    name: 'amalfi_positano.jpg',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    lat: 40.6281,
    lng: 14.4850,
    city: 'Positano, Amalfi Coast, Italy',
    date: '2023-09-14T17:10:00.000Z',
    camera: 'Leica Q2',
    lens: 'Summilux 28mm f/1.7 ASPH',
    caption: 'Cliffside pastel villas perched above the Tyrrhenian sea.'
  }
];

export async function createSampleFootprints(): Promise<PhotoFootprint[]> {
  const footprints: PhotoFootprint[] = [];

  for (const sample of SAMPLE_TRAVELS) {
    try {
      const resp = await fetch(sample.url);
      const blob = await resp.blob();
      const reader = new FileReader();

      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const footprint: PhotoFootprint = {
        id: 'sample_' + Math.random().toString(36).substring(2, 9),
        filename: sample.name,
        dataUrl,
        size: blob.size || 850000,
        mimeType: 'image/jpeg',
        uploadedAt: sample.date,
        hasGps: true,
        coordinates: {
          latitude: sample.lat,
          longitude: sample.lng
        },
        exif: {
          dateTimeOriginal: sample.date,
          cameraModel: sample.camera,
          lensModel: sample.lens,
          focalLength: 28,
          fNumber: 2.8,
          iso: 160
        },
        caption: sample.caption,
        locationName: sample.city
      };

      footprints.push(footprint);
    } catch (e) {
      console.warn('Could not load sample image:', sample.name, e);
    }
  }

  return footprints;
}

