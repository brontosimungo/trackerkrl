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
      const dist = getDistance([pos[1], pos[0]], [lat, lng]); // pos is [lng, lat], so pos[1] is lat, pos[0] is lng
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
  const brng = (toDegrees(θ) + 360) % 360; // Arah dalam derajat
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

  const stationDotIcon = useMemo(() => L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  }), []);

  const createTrainIcon = (kaId, currentStationName, nextStationName, departureTime, relasiDetail, bearing) => {
    return L.divIcon({
      className: 'custom-train-div-icon', // Class ini akan menampung style untuk label selalu tampil
      html: `
        <div class="train-marker-container">
          <div class="train-icon-base" style="transform: rotate(${bearing || 0}deg);">
            <svg class="train-arrow-icon" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/>
            </svg>
          </div>
          <div class="train-info-card">
            <div class="train-info-id">${kaId}</div>
            <div class="train-info-route">
              <span class="station-from">${currentStationName || 'Berangkat'}</span>
              <span class="route-arrow">→</span>
              <span class="station-to">${nextStationName || 'Tiba'}</span>
            </div>
            ${departureTime ? `<div class="train-info-time">Berangkat: ${departureTime}</div>` : ''}
            ${relasiDetail ? `<div class="train-info-relasi">${relasiDetail}</div>` : ''}
          </div>
        </div>
      `,
      iconAnchor: [12, 12] // Anchor di tengah base icon
    });
  };

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

      {!isLoadingJalur && positions && jalur && Object.entries(positions).map(([kaId, posData]) => {
        const koord = posData.koordinat; // koord is [lng, lat]
        if (!Array.isArray(koord) || koord.length !== 2) return null;
        if (!jalur.features || jalur.features.length === 0) return null;

        const nearestOnTrack = findNearestPoint(koord, jalur.features); // nearestOnTrack is [lat, lng]
        if (!nearestOnTrack) return null;
        
        let bearing = 0;
        if (posData.currentStop && posData.nextStop) {
            // currentStop.koordinat and nextStop.koordinat are [lng, lat]
            bearing = calculateBearing(
                posData.currentStop.koordinat[1], posData.currentStop.koordinat[0],
                posData.nextStop.koordinat[1], posData.nextStop.koordinat[0]
            );
        } else if (posData.prevStopForBearing && posData.currentStop) { // If at station, use previous to current
             bearing = calculateBearing(
                posData.prevStopForBearing.koordinat[1], posData.prevStopForBearing.koordinat[0],
                posData.currentStop.koordinat[1], posData.currentStop.koordinat[0]
            );
        }


        const relasiDetail = relasiKA[kaId]?.[0] || '';

        return (
          <Marker
            key={kaId}
            position={nearestOnTrack} // Use the snapped position for the marker
            icon={createTrainIcon(
              kaId,
              posData.currentStop?.stasiun,
              posData.nextStop?.stasiun,
              posData.departureTime,
              relasiDetail,
              bearing
            )}
            zIndexOffset={1000}
          />
        );
      })}
    </MapContainer>
  );
}
