'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface Props {
  mapCenter: [number, number];
  routePath: [number, number][];
  stops: BusStop[];
  nextStopOrder?: number;
  busNumber: string;
  busLocation: BusLocation | null;
  currentLocation: { lat: number; lng: number } | null;
  formatTime: (time: string) => string;
  formatLastUpdated: (timestamp?: string) => string;
  onStopSelect: (stop: BusStop) => void;
  onMapReady: (map: L.Map) => void;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color: string, type: 'bus' | 'stop' | 'user') =>
  L.divIcon({
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
        <span style="transform: rotate(45deg); color: white; font-size: 16px;">
          ${type === 'bus' ? '🚌' : type === 'stop' ? '⏹️' : '📍'}
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const busIcon = createCustomIcon('#3b82f6', 'bus');
const stopIcon = createCustomIcon('#10b981', 'stop');
const userIcon = createCustomIcon('#ef4444', 'user');

function MapReadyHandler({
  onMapReady,
}: {
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
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
  onMapReady,
}: Props) {
  return (
    <MapContainer
      key={`map-${mapCenter[0]}-${mapCenter[1]}`}
      center={mapCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <MapReadyHandler onMapReady={onMapReady} />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {routePath.length > 1 && (
        <Polyline
          positions={routePath}
          color="#3b82f6"
          weight={4}
          opacity={0.7}
          dashArray="10, 10"
        />
      )}

      {stops.map((stop) => (
        <Marker
          key={stop.order_number}
          position={[stop.latitude, stop.longitude]}
          icon={stopIcon}
          eventHandlers={{
            click: () => onStopSelect(stop),
          }}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold">{stop.stop_name}</h3>
              <p className="text-gray-600">Stop #{stop.order_number}</p>
              <p className="text-gray-600">Arrival: {formatTime(stop.arrival_time)}</p>
              {nextStopOrder === stop.order_number && (
                <span className="mt-1 inline-block rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                  Next Stop
                </span>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {busLocation && (
        <Marker
          position={[busLocation.latitude, busLocation.longitude]}
          icon={busIcon}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold">Your Bus</h3>
              <p className="text-gray-600">{busNumber}</p>
              <p className="text-gray-600">Speed: {busLocation.speed.toFixed(1)} km/h</p>
              <p className="text-gray-600">
                Last updated: {formatLastUpdated(busLocation.timestamp)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {currentLocation && (
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold">Your Location</h3>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
