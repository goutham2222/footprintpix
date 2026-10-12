import L from 'leaflet';

/**
 * Generates an elegant Footprint Pin marker icon using an embedded SVG.
 * Clean footprint design with soft ambient shadow and terracotta branding.
 */
export function createFootprintIcon(isSelected: boolean = false, thumbnailSrc?: string): L.DivIcon {
  const size = isSelected ? 48 : 40;
  const pulseClass = isSelected ? 'ring-4 ring-orange-400 ring-offset-2 ring-offset-black scale-110' : 'hover:scale-110';
  
  // Custom SVG footprint icon
  const footprintSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" class="text-white drop-shadow-sm">
      <!-- Main sole pad -->
      <path d="M12.2 11.2c-1.8.3-3.2 1.9-3.2 3.8 0 2.2 1.8 4 4 4s3.7-1.4 3.9-3.3c.3-2.3-2.4-4.9-4.7-4.5z" />
      <path d="M11.8 19c-1.2 0-2.2.9-2.2 2s1 2 2.2 2 2.2-.9 2.2-2-1-2-2.2-2z" opacity="0.9" />
      <!-- Toes -->
      <circle cx="8" cy="9.5" r="1.1" />
      <circle cx="10.2" cy="7.2" r="1.3" />
      <circle cx="12.8" cy="6.2" r="1.5" />
      <circle cx="15.6" cy="6.8" r="1.3" />
      <circle cx="17.8" cy="8.8" r="1.1" />
    </svg>
  `;

  const html = `
    <div class="group relative flex items-center justify-center transition-all duration-300 transform -translate-x-1/2 -translate-y-full cursor-pointer">
      <!-- Marker Badge Container -->
      <div class="relative w-[${size}px] h-[${size}px] rounded-full bg-gradient-to-tr from-stone-900 to-stone-800 border-2 ${isSelected ? 'border-orange-500 shadow-orange-500/40 shadow-xl' : 'border-stone-400/30 shadow-2xl'} flex items-center justify-center overflow-hidden transition-all duration-300 ${pulseClass}">
        ${thumbnailSrc ? `
          <img src="${thumbnailSrc}" alt="thumb" class="w-full h-full object-cover transition-transform group-hover:scale-110 opacity-90 group-hover:opacity-100" />
          <div class="absolute inset-0 bg-stone-950/25 group-hover:bg-transparent transition-colors"></div>
          <div class="absolute bottom-1 right-1 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center border border-white/60 shadow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="9" height="9" fill="white">
              <path d="M12 11c-1.8.3-3.2 1.9-3.2 3.8 0 2.2 1.8 4 4 4s3.7-1.4 3.9-3.3c.3-2.3-2.4-4.9-4.7-4.5z"/>
              <circle cx="12" cy="7" r="1.5"/>
            </svg>
          </div>
        ` : `
          <div class="w-full h-full bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 flex items-center justify-center">
            ${footprintSvg}
          </div>
        `}
      </div>

      <!-- Marker Pointer Tail / Arrow -->
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isSelected ? 'bg-orange-500' : 'bg-stone-800'} border-r border-b ${isSelected ? 'border-orange-500' : 'border-stone-700/50'}"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-footprint-pin',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8]
  });
}

