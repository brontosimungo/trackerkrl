import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import relasiKA from '../data/relasiKA';

// Fungsi hitung jarak Euclidean
function getDistance([lat1, lng1], [lat2, lng2]) {
  return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
}

// Cari titik polyline terdekat
function findNearestPoint(pos, polylines) {
  let nearest = null;
  let minDist = Infinity;

  polylines.forEach(poly => {
    poly.geometry.coordinates.forEach(([lng, lat]) => {
      const dist = getDistance([pos[1], pos[0]], [lat, lng]);
      if (dist < minDist) {
        minDist = dist;
        nearest = [lat, lng];
      }
    });
  });

  return nearest;
}

// Triangle icon generator
const createTriangleTrainIcon = (rotationDeg = 0) =>
  L.divIcon({
    className: 'custom-train-icon',
    html: `<div class="triangle-icon" style="transform: rotate(${rotationDeg}deg);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

export default function Map({ positions }) {
  const [jalur, setJalur] = useState(null);
  const [stasiun, setStasiun] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingJalur, setIsLoadingJalur] = useState(true);

  useEffect(() => {
    setIsLoadingJalur(true);
    fetch('/data/jalurRel.json')
      .then(res => res.json())
      .then(dataJalur => {
        const filtered = {
          ...dataJalur,
          features: dataJalur.features.filter(f => f.geometry.type === 'LineString')
        };
        setJalur(filtered);
        setIsLoadingJalur(false);
      })
      .catch(err => {
        console.error("Gagal memuat jalur:", err);
        setIsLoadingJalur(false);
      });
  }, []);

  useEffect(() => {
    setIsLoadingStations(true);
    fetch('/data/stasiun.json')
      .then(res => res.json())
      .then(data => {
        setStasiun(data);
        setIsLoadingStations(false);
      })
      .catch(err => {
        console.error("Gagal memuat stasiun:", err);
        setIsLoadingStations(false);
      });
  }, []);

  const stationDotIcon = L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const bounds = [
    [-6.45, 106.10], // SouthWest
    [-6.10, 106.90], // NorthEast
  ];

  return (
    <MapContainer
      center={[-6.3, 106.55]}
      zoom={11}
      minZoom={10}
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
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

      {!isLoadingJalur && jalur && jalur.features.map((feature, i) => (
        <Polyline
          key={`jalur-${i}`}
          positions={feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          color="#2c3e50"
          weight={3}
          opacity={0.6}
        />
      ))}

      {!isLoadingStations && stasiun.map((s, i) => (
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
      ))}

      {!isLoadingJalur && positions && jalur && Object.entries(positions).map(([kaId, pos]) => {
        const koord = pos.koordinat;
        if (!Array.isArray(koord) || koord.length !== 2) return null;
        const nearest = findNearestPoint(koord, jalur.features);
        if (!nearest) return null;
        const heading = pos.heading || 0; // derajat arah
        const relasiDetail = relasiKA[kaId]?.[0] || '';

        return (
          <Marker
            key={kaId}
            position={nearest}
            icon={createTriangleTrainIcon(heading)}
            zIndexOffset={1000}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="train-tooltip">
                <strong>{kaId}</strong><br />
                {pos.currentStop?.stasiun} → {pos.nextStop?.stasiun}<br />
                {relasiDetail}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
