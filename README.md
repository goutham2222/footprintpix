# FootprintPix 👣📸

> Retrace your personal journeys on an interactive, minimalist world map.

FootprintPix is a local-first web application that allows users to upload travel snapshots, extract GPS EXIF metadata in the browser, and visualize them on an interactive world map using custom footprint pin markers.

---

## ✨ Features

- **Interactive Full-Bleed Map Canvas:** Powered by Leaflet with OpenStreetMap tiles, boundary clamping, and seamless ocean styling.
- **Custom Footprint Markers:** Minimalist footprint marker pin design featuring sole and toe geometry with photo thumbnails and active selection indicators.
- **In-Browser EXIF & GPS Extraction:** Fast client-side metadata parsing using `exifr` with support for camera make/model, focal length, aperture, ISO, and iPhone `.JPG` EXIF structures.
- **Graceful Manual Fallback:** If an uploaded snapshot lacks embedded GPS metadata, users can pin the location directly by clicking on the world map.
- **Dedicated Side Inspection Drawer:** Non-intrusive slide-out panel replacing cluttered popups to view high-resolution photos, optical specs, coordinates, Google Maps links, and editable travel notes/reflections.
- **Local-First Persistence:** Persists all journey snapshots, coordinates, and notes locally in IndexedDB (`idb-keyval`).
- **Quick Travel Gallery:** Bottom photo strip for rapid photo switching and previewing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 20+)
- npm 9+

### Installation & Run

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Map Engine:** Leaflet + OpenStreetMap
- **EXIF Engine:** `exifr`
- **Local Persistence:** `idb-keyval` (IndexedDB)
- **Icons:** Lucide React

---

## 📄 License

MIT
