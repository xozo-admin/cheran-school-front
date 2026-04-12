'use client';

import { useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface StopLocationPickerMapProps {
  center: [number, number];
  selectedPoint: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function StopLocationPickerMap({
  center,
  selectedPoint,
  onPick,
}: StopLocationPickerMapProps) {
  const mapCenter = useMemo<[number, number]>(() => center, [center]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapClickHandler onPick={onPick} />

      {selectedPoint && (
        <CircleMarker
          center={selectedPoint}
          radius={8}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.7 }}
        />
      )}
    </MapContainer>
  );
}
