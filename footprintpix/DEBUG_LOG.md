# FootprintPix Debug & Defect Log

Permanent log of all bugs, compile errors, runtime issues, and UI/UX defects resolved during development.

---

[ERR-001] Strict TypeScript Build & Unused Import Errors
- **Timestamp:** Phase 1 Local Setup (2026-10-11)
- **Component:** `src/App.tsx`, `src/utils/sampleData.ts`, `src/components/Gallery/PhotoStrip.tsx`
- **Technical Issue:** TypeScript strict flags (`noUnusedLocals: true`, `noUnusedParameters: true`) caused build failure due to unused icons and incorrect relative import path (`../../types/footprint` vs `../types/footprint`).
- **Resolution:** Corrected import paths and removed unused icons (`Map`, `Info`, `Layers`, `Compass`, `MapPin`) to ensure `npm run build` (`tsc -b && vite build`) passes with zero warnings.
- **In Plain English:** When compiling the application, strict TypeScript checking flagged unused variables and a slightly misaligned folder path for type definitions. We cleaned up the imports and path references so the app compiles cleanly.

---

[ERR-002] Map Watermark "API KEY REQUIRED" Tile Defect
- **Timestamp:** Phase 1 Local Setup (2026-10-11)
- **Component:** `src/components/Map/MapView.tsx`
- **Technical Issue:** CartoDB basemap raster endpoint recently mandated API keys, producing repetitive "API KEY REQUIRED carto.com/basemaps/apikey" watermark tiles across the entire map canvas.
- **Resolution:** Switched Leaflet's tile layer endpoint to OpenStreetMap's standard public tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), which operate without an API key and provide complete world map coverage locally out of the box.
- **In Plain English:** The map tiles were showing an "API KEY REQUIRED" watermark because the third-party CartoDB tile server now requires an authentication key. We updated the map to use official OpenStreetMap tiles so the full world map renders cleanly without needing any API key.

---

[ERR-003] iPhone JPEG GPS Extraction Bypassed by Chunking & Restrictive Pick Filter
- **Timestamp:** Phase 1 Local Setup (2026-10-11)
- **Component:** `src/utils/exif.ts`
- **Technical Issue:** iPhone camera photos (`IMG_*.JPG`) placed GPS tags inside APP1/TIFF structures that were either partially truncated by chunked reads or excluded by restrictive `pick` filters, leading to `coordinates` returning null and falsely triggering the manual location fallback modal.
- **Resolution:** Updated `exifr.parse` to pass the raw `File` object directly, explicitly set `gps: true`, `tiff: true`, `xmp: true`, and disabled restrictive chunking with `chunked: false`. Also simplified latitude and longitude retrieval directly from `metadata?.latitude` and `metadata?.longitude`.
- **In Plain English:** When iPhone photos are uploaded, their GPS information is stored in a specific section of the image file that was being missed because the parser was reading in small chunks. By reading the full file without restrictive chunking and explicitly requesting GPS tags, the app now reliably extracts the coordinates and automatically pins iPhone photos on the map.

---

[ERR-004] TypeScript Language Server Missing Ambient CSS Module Declarations
- **Timestamp:** Phase 1 Local Setup (2026-10-11)
- **Component:** `src/components/Map/MapView.tsx`, `src/vite-env.d.ts`
- **Technical Issue:** The IDE language server flagged line 3 in `MapView.tsx` (`import 'leaflet/dist/leaflet.css';`) with *"Cannot find module or type declarations for side-effect import of 'leaflet/dist/leaflet.css'"* because standard ambient Vite environment type declarations (`vite/client` and `*.css` module definitions) were missing from the project source tree.
- **Resolution:** Added [vite-env.d.ts](file:///Users/goutham/Documents/Projects/Tech/Footprint-Pix/footprintpix/src/vite-env.d.ts) referencing `<reference types="vite/client" />` and explicit `declare module '*.css'` declarations.
- **In Plain English:** TypeScript's language server in the editor did not recognize `.css` files as valid modules to import in code. We created the standard Vite environment declaration file (`vite-env.d.ts`) so the editor and TypeScript cleanly recognize CSS asset imports.

---
