import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PhotoFootprint, GeoCoordinates } from '../../types/footprint';
import { createFootprintIcon } from './FootprintMarker';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface MapViewProps {
  footprints: PhotoFootprint[];
  selectedFootprintId: string | null;
  selectionTrigger?: number;
  fitBoundsTrigger?: number;
  isDrawerOpen?: boolean;
  onSelectFootprint: (id: string) => void;
  onDismissSelection?: () => void;
  isPickingLocation: boolean;
  onLocationPicked: (coords: GeoCoordinates) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  footprints,
  selectedFootprintId,
  selectionTrigger = 0,
  fitBoundsTrigger = 0,
  isDrawerOpen = false,
  onSelectFootprint,
  onDismissSelection,
  isPickingLocation,
  onLocationPicked
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default view: broad world / travel viewpoint
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2.5,
      minZoom: 2.5,
      maxZoom: 19,
      maxBounds: [
        [-85, -180],
        [85, 180]
      ],
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false
    });

    // Free, public standard OpenStreetMap tiles requiring no API key
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Zoom control in bottom right for minimalist layout
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle map click: either manually picking location or dismissing active selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation) {
        onLocationPicked({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        });
      } else if (onDismissSelection) {
        onDismissSelection();
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingLocation, onLocationPicked, onDismissSelection]);

  // Render Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    const map = mapInstanceRef.current;
    if (!markersGroup || !map) return;

    markersGroup.clearLayers();

    footprints.forEach((fp) => {
      const isSelected = fp.id === selectedFootprintId;
      const icon = createFootprintIcon(isSelected);

      const marker = L.marker([fp.coordinates.latitude, fp.coordinates.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : 100
      });

      if (!isSelected) {
        const dateStr = fp.exif.dateTimeOriginal
          ? new Date(fp.exif.dateTimeOriginal).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : new Date(fp.uploadedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

        const rawTitle = fp.caption?.trim() || fp.locationName?.trim() || '';
        const escapedTitle = rawTitle ? escapeHtml(rawTitle) : '';
        const escapedDate = escapeHtml(dateStr);

        const tooltipHtml = `
          <div class="flex items-center space-x-2.5">
            <img src="${fp.dataUrl}" alt="" class="w-9 h-9 rounded-lg object-cover border border-stone-700 shrink-0" />
            <div class="flex flex-col max-w-[160px] overflow-hidden">
              ${
                escapedTitle
                  ? `<span class="text-xs font-semibold text-stone-100 truncate leading-tight">${escapedTitle}</span>
                     <span class="text-[10px] text-stone-400 leading-tight mt-0.5">${escapedDate}</span>`
                  : `<span class="text-xs font-medium text-stone-200 leading-tight">${escapedDate}</span>`
              }
            </div>
          </div>
        `;

        marker.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -42],
          opacity: 1,
          className: 'footprint-pin-tooltip'
        });
      }

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        marker.closeTooltip();
        onSelectFootprint(fp.id);
      });

      marker.addTo(markersGroup);
    });
  }, [footprints, selectedFootprintId, onSelectFootprint]);

  // Smooth Cinematic Zoom (flyTo) & Side Drawer Offset
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!selectedFootprintId || !map) return;

    const selected = footprints.find((fp) => fp.id === selectedFootprintId);
    if (!selected) return;

    // Target zoom 14, or keep current zoom if already zoomed in closer (> 14)
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 14);

    // Calculate offset center in pixel space at targetZoom so the pin is centered
    // in the unobstructed left viewport when the side drawer is open (~448px max-w-md)
    const pinLatLng = L.latLng(
      selected.coordinates.latitude,
      selected.coordinates.longitude
    );

    let targetCenter = pinLatLng;
    const viewportWidth = map.getSize().x;

    // Apply horizontal offset on desktop/tablet screens where drawer occupies right side
    if (isDrawerOpen && viewportWidth > 640) {
      const drawerWidth = Math.min(448, viewportWidth * 0.45);
      const horizontalOffsetPx = drawerWidth / 2;
      const pinPoint = map.project(pinLatLng, targetZoom);
      // Shift camera center to the right so the pin sits to the left in the open area
      const offsetPoint = L.point(pinPoint.x + horizontalOffsetPx, pinPoint.y);
      targetCenter = map.unproject(offsetPoint, targetZoom);
    }

    map.flyTo(targetCenter, targetZoom, {
      duration: 1.2,
      easeLinearity: 0.25
    });
  }, [selectedFootprintId, selectionTrigger]);

  // Fit All Pins overview camera animation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!fitBoundsTrigger || !map || footprints.length === 0) return;

    if (footprints.length === 1) {
      const single = footprints[0];
      map.flyTo([single.coordinates.latitude, single.coordinates.longitude], 12, {
        duration: 1.2,
        easeLinearity: 0.25
      });
      return;
    }

    const bounds = L.latLngBounds(
      footprints.map((fp) => [fp.coordinates.latitude, fp.coordinates.longitude] as [number, number])
    );

    map.flyToBounds(bounds, {
      paddingTopLeft: [80, 100],
      paddingBottomRight: [80, 140],
      maxZoom: 14,
      duration: 1.2,
      easeLinearity: 0.25
    });
  }, [fitBoundsTrigger]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#aad3df]" />

      {/* Manual Pinning Overlay Banner */}
      {isPickingLocation && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-stone-900/90 text-stone-100 backdrop-blur-md px-6 py-3 rounded-full border border-orange-500/50 shadow-2xl flex items-center space-x-3 animate-bounce">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-sm font-medium tracking-wide">
              Click anywhere on the map to place your footprint
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

