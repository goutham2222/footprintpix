import L from 'leaflet';

/**
 * Generates a crisp, fixed-size vector teardrop Footprint Pin marker.
 *
 * Specifications:
 * - Dimensions: Fixed width: 36px, height: 44px
 * - iconAnchor: [18, 44] (tip points precisely at coordinate)
 * - Pure SVG vector construction in brand accent orange (#f97316)
 * - Crisp white footprint icon in top circle
 * - Active selection: scale(1.2) from bottom tip anchor, bright white outline, and pulse ring
 */
export function createFootprintIcon(isSelected: boolean = false): L.DivIcon {
  const width = 36;
  const height = 44;

  const pinColor = isSelected ? '#ea580c' : '#f97316';
  const strokeColor = '#ffffff';
  const strokeWidth = isSelected ? 3.0 : 2.5;

  const pulseRipple = isSelected
    ? `<div class="footprint-pin-pulse"></div>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="${width}" height="${height}" style="display: block; overflow: visible;">
      <defs>
        <filter id="pin-shadow" x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.45" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.3" />
        </filter>
        ${isSelected ? `
        <filter id="pin-glow" x="-50%" y="-40%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.5" />
          <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#fb923c" flood-opacity="0.95" />
        </filter>` : ''}
      </defs>

      <!-- Pin Teardrop Body with High-Contrast 2.5px White Stroke -->
      <g filter="${isSelected ? 'url(#pin-glow)' : 'url(#pin-shadow)'}">
        <path
          d="M 18 42 C 16.5 37 4 23 4 15 C 4 7.268 10.268 1 18 1 C 25.732 1 32 7.268 32 15 C 32 23 19.5 37 18 42 Z"
          fill="${pinColor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
        />

        <!-- Inner circular badge background for high-contrast footprint visibility -->
        <circle cx="18" cy="15" r="9.5" fill="rgba(0, 0, 0, 0.22)" />

        <!-- Crisp White Footprint Icon (Sole + Toes) -->
        <g fill="#ffffff" transform="translate(11, 7.5) scale(0.6)">
          <!-- Main sole ball -->
          <path d="M12.2 11.2c-1.8.3-3.2 1.9-3.2 3.8 0 2.2 1.8 4 4 4s3.7-1.4 3.9-3.3c.3-2.3-2.4-4.9-4.7-4.5z" />
          <!-- Heel -->
          <ellipse cx="11.8" cy="20" rx="2.4" ry="2.2" />
          <!-- Toes -->
          <circle cx="7.8" cy="9.2" r="1.2" />
          <circle cx="10.2" cy="6.8" r="1.3" />
          <circle cx="12.8" cy="5.8" r="1.5" />
          <circle cx="15.6" cy="6.4" r="1.3" />
          <circle cx="17.8" cy="8.4" r="1.1" />
        </g>
      </g>
    </svg>
  `;

  const innerStyle = [
    `width: ${width}px`,
    `height: ${height}px`,
    'position: relative',
    'pointer-events: auto',
    'cursor: pointer',
    'transform-origin: 18px 44px',
    'transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    isSelected ? 'transform: scale(1.22)' : 'transform: scale(1)'
  ].join('; ');

  return L.divIcon({
    html: `<div class="footprint-pin-inner ${isSelected ? 'is-active' : ''}" style="${innerStyle}">${pulseRipple}${svg}</div>`,
    className: 'footprint-marker-pin',
    iconSize: [width, height],
    iconAnchor: [18, 44]
  });
}
