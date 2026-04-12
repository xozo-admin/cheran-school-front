// components/student/TransportLeafletMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createCustomIcon = (color: string, type: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
      ">
        <span style="transform: rotate(45deg); color: white; font-size: 16px;">${type === 'bus' ? '🚌' : type === 'stop' ? '⏹️' : '📍'}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const busIcon = createCustomIcon('#3b82f6', 'bus');
const stopIcon = createCustomIcon('#10b981', 'stop');
const userIcon = createCustomIcon('#ef4444', 'user');

interface BusStop {
  stop_name: string;
  order_number: number;
  arrival_time: string;
  latitude: number;
  longitude: number;
}

interface BusLocation {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface TransportLeafletMapProps {
  mapCenter: [number, number];
  routePath: [number, number][];
  stops: BusStop[] | any;
  nextStopOrder?: number;
  busNumber: string;
  busLocation: BusLocation | null;
  currentLocation: { lat: number; lng: number } | null;
  formatTime: (time: string) => string;
  formatLastUpdated: (timestamp?: string) => string;
  onStopSelect: (stop: BusStop) => void;
  onMapReady: (map: L.Map) => void;
}

export default function TransportLeafletMap({
  mapCenter,
  routePath,
  stops,
  nextStopOrder,
  busNumber,
  busLocation,
  currentLocation,
  formatTime,
  formatLastUpdated,
  onStopSelect,
  onMapReady
}: TransportLeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(mapCenter, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapRef.current = map;
    onMapReady(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapCenter, onMapReady]);

  // Update route path
 useEffect(() => {
  if (!mapRef.current) return;
  if (!Array.isArray(routePath)) return;

  // ✅ Remove bad coordinates
  const safeRoute:any = routePath
  .map(p => [Number(p[0]), Number(p[1])])
  .filter(p => !isNaN(p[0]) && !isNaN(p[1]));


  if (safeRoute.length === 0) return;

  // Remove old line
  if (polylineRef.current) {
    polylineRef.current.remove();
  }

  // Add new line
  polylineRef.current = L.polyline(safeRoute, {
    color: '#3b82f6',
    weight: 4,
    opacity: 0.7,
    dashArray: '10, 10',
  }).addTo(mapRef.current);

}, [routePath]);


  // Update stop markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing stop markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add stop markers
    stops.forEach((stop:any) => {
      const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="text-sm">
            <h3 class="font-bold">${stop.stop_name}</h3>
            <p class="text-gray-600">Stop #${stop.order_number}</p>
            <p class="text-gray-600">Arrival: ${formatTime(stop.arrival_time)}</p>
            ${nextStopOrder === stop.order_number ? 
              '<span class="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Next Stop</span>' : 
              ''}
          </div>
        `);

      marker.on('click', () => onStopSelect(stop));
      markersRef.current[`stop-${stop.order_number}`] = marker;
    });
  }, [stops, nextStopOrder, formatTime, onStopSelect]);

  // Update bus location marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing bus marker
    if (markersRef.current['bus']) {
      markersRef.current['bus'].remove();
    }

    // Add new bus marker
    if (busLocation) {
      const marker = L.marker([busLocation.latitude, busLocation.longitude], { icon: busIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="text-sm">
            <h3 class="font-bold">Your Bus</h3>
            <p class="text-gray-600">${busNumber}</p>
            <p class="text-gray-600">Speed: ${busLocation.speed.toFixed(1)} km/h</p>
            <p class="text-gray-600">Last updated: ${formatLastUpdated(busLocation.timestamp)}</p>
          </div>
        `);

      markersRef.current['bus'] = marker;
    }
  }, [busLocation, busNumber, formatLastUpdated]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing user marker
    if (markersRef.current['user']) {
      markersRef.current['user'].remove();
    }

    // Add new user marker
    if (currentLocation) {
      const marker = L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="text-sm">
            <h3 class="font-bold">Your Location</h3>
          </div>
        `);

      markersRef.current['user'] = marker;
    }
  }, [currentLocation]);

  return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
}