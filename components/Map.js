import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import { useEffect, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import relasiKA from '../data/relasiKA';

// Fungsi hitung jarak Euclidean (digunakan oleh findNearestPoint)
function getDistance([lat1, lng1], [lat2, lng2]) {
  return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
}

// Fungsi cari titik terdekat dari polyline
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

// Fungsi untuk menghitung bearing (sudut arah)
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const toDegrees = (radians) => radians * 180 / Math.PI;

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const λ1 = toRadians(lng1);
  const λ2 = toRadians(lng2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  const brng = (toDegrees(θ) + 360) % 360;
  return brng;
}

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
      .catch(error => {
        console.error("Gagal memuat data jalurRel:", error);
        setIsLoadingJalur(false);
      });
  }, []);

  useEffect(() => {
    setIsLoadingStations(true);
    fetch('/data/stasiun.json')
      .then(res => res.json())
      .then(dataStasiun => {
        setStasiun(dataStasiun);
        setIsLoadingStations(false);
      })
      .catch(error => {
        console.error("Gagal memuat data stasiun:", error);
        setIsLoadingStations(false);
      });
  }, []);

  const stationDotIcon = useMemo(() => L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  }), []);

  return (
    <MapContainer
      center={[-6.30, 106.55]}
      zoom={10}
      style={{ height: 'calc(100vh - 100px)', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
        className="blur-tile-layer"
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap, Carto'
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

      {!isLoadingStations && stasiun.map((s, i) => {
        if (!s.koordinat || s.koordinat.length !== 2) return null;
        return (
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
              sticky
              className="station-tooltip-label"
            >
              {s.nama}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
