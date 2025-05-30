import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import relasiKA from '../data/relasiKA';

// Fungsi hitung jarak Euclidean
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

export default function Map({ positions }) {
  const [jalur, setJalur] = useState(null);
  const [stasiun, setStasiun] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingJalur, setIsLoadingJalur] = useState(true);

  useEffect(() => {
    setIsLoadingJalur(true);
    fetch('/data/jalurRel.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
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
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(dataStasiun => {
        setStasiun(dataStasiun);
        setIsLoadingStations(false);
      })
      .catch(error => {
        console.error("Gagal memuat data stasiun:", error);
        setIsLoadingStations(false);
      });
  }, []);

  const stationDotIcon = L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  const createTrainIcon = (kaId, currentStation, nextStation, departureTime, relasiDetail) => {
    return L.divIcon({
      className: 'custom-train-div-icon',
      html: `
        <div class="train-marker-container">
          <div class="train-icon-base">
            <div class="train-icon-pulse"></div>
          </div>
          <div class="train-info-card">
            <div class="train-info-id">${kaId}</div>
            <div class="train-info-route">
              <span class="station-from">${currentStation || 'Berangkat'}</span>
              <span class="route-arrow">→</span>
              <span class="station-to">${nextStation || 'Tiba'}</span>
            </div>
            ${departureTime ? `<div class="train-info-time">Berangkat: ${departureTime}</div>` : ''}
            ${relasiDetail ? `<div class="train-info-relasi">${relasiDetail}</div>` : ''}
          </div>
        </div>
      `,
      iconAnchor: [12, 12]
    });
  };

  return (
    <MapContainer
      center={[-6.30, 106.55]}
      zoom={10}
      style={{ height: 'calc(100vh - 100px)', width: '100%' }}
      scrollWheelZoom={true}
    >
      {/* Layer peta bawah yang blur */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
        className="blur-tile-layer"
      />

      {/* Layer label tajam di atas */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap, Carto'
      />

      {/* Garis jalur rel */}
      {!isLoadingJalur && jalur && jalur.features.map((feature, i) => (
        <Polyline
          key={`jalur-${i}`}
          positions={feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          color="#2c3e50"
          weight={3}
          opacity={0.6}
        />
      ))}

      {/* Marker stasiun */}
      {!isLoadingStations && stasiun.map((s, i) => {
        if (!s.koordinat || s.koordinat.length !== 2 || typeof s.koordinat[0] !== 'number' || typeof s.koordinat[1] !== 'number') {
          console.warn("Koordinat stasiun tidak valid:", s);
          return null;
        }
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
              permanent
              className="station-tooltip-label"
            >
              {s.nama}
            </Tooltip>
          </Marker>
        );
      })}

      {/* Marker kereta */}
      {!isLoadingJalur && positions && jalur && Object.entries(positions).map(([kaId, pos]) => {
        const koord = pos.koordinat;
        if (!Array.isArray(koord) || koord.length !== 2) return null;
        if (!jalur.features || jalur.features.length === 0) return null;

        const nearest = findNearestPoint(koord, jalur.features);
        if (!nearest) return null;

        const relasiDetail = relasiKA[kaId]?.[0] || '';

        return (
          <Marker
            key={kaId}
            position={nearest}
            icon={createTrainIcon(
              kaId,
              pos.currentStop?.stasiun,
              pos.nextStop?.stasiun,
              pos.departureTime,
              relasiDetail
            )}
            zIndexOffset={1000}
          />
        );
      })}
    </MapContainer>
  );
}
