import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import relasiKA from '../data/relasiKA';

// Fungsi hitung jarak Euclidean
function getDistance([lat1, lng1], [lat2, lng2]) {
  return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
}

// Fungsi cari titik terdekat dan arah dari polyline
function findNearestPointAndAngle(pos, polylines) {
  let nearest = null;
  let minDist = Infinity;
  let angle = 0;

  polylines.forEach(poly => {
    const coords = poly.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;
      const dist = getDistance([pos[1], pos[0]], [midLat, midLng]);

      if (dist < minDist) {
        minDist = dist;
        nearest = [midLat, midLng];
        angle = Math.atan2(lat2 - lat1, lng2 - lng1) * (180 / Math.PI);
      }
    }
  });

  return { point: nearest, angle };
}

export default function Map({ positions }) {
  const [jalur, setJalur] = useState(null);
  const [stasiun, setStasiun] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingJalur, setIsLoadingJalur] = useState(true);

  useEffect(() => {
    fetch('/data/jalurRel.json')
      .then(res => res.json())
      .then(dataJalur => {
        const filtered = {
          ...dataJalur,
          features: dataJalur.features.filter(f => f.geometry.type === 'LineString')
        };
        setJalur(filtered);
        setIsLoadingJalur(false);
      });
  }, []);

  useEffect(() => {
    fetch('/data/stasiun.json')
      .then(res => res.json())
      .then(dataStasiun => {
        setStasiun(dataStasiun);
        setIsLoadingStations(false);
      });
  }, []);

  const stationDotIcon = L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const createTriangleIcon = (angle) => {
    return L.divIcon({
      className: 'custom-train-div-icon',
      html: `<div class="train-triangle" style="transform: rotate(${angle}deg);"></div>`
    });
  };

  return (
    <MapContainer
      center={[-6.3, 106.55]}
      zoom={10}
      minZoom={10}
      maxBounds={[[-6.7, 106.0], [-5.9, 107.0]]}
      style={{ height: 'calc(100vh - 100px)', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
        className="blur-tile-layer"
      />

      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap, Carto'
      />

      {!isLoadingJalur && jalur.features.map((feature, i) => (
        <Polyline
          key={`jalur-${i}`}
          positions={feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          color="#2c3e50"
          weight={3}
          opacity={0.6}
        />
      ))}

      {!isLoadingStations && stasiun.map((s, i) => (
        s.koordinat && (
          <Marker
            key={`s-${i}`}
            position={[s.koordinat[1], s.koordinat[0]]}
            icon={stationDotIcon}
            zIndexOffset={100}
          >
            <Tooltip
              direction="top"
              offset={[0, -7]}
              opacity={1}
              permanent
              className="station-tooltip-label"
            >
              {s.nama}
            </Tooltip>
          </Marker>
        )
      ))}

      {!isLoadingJalur && positions && Object.entries(positions).map(([kaId, pos]) => {
        const koord = pos.koordinat;
        if (!koord || koord.length !== 2) return null;

        const { point, angle } = findNearestPointAndAngle(koord, jalur.features);
        if (!point) return null;

        return (
          <Marker
            key={kaId}
            position={point}
            icon={createTriangleIcon(angle)}
            zIndexOffset={1000}
          />
        );
      })}
    </MapContainer>
  );
}
