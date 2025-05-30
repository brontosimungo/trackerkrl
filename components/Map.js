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
  const [isLoadingJalur, setIsLoadingJalur] = useState(true); // Tambahkan untuk jalur

  useEffect(() => {
    setIsLoadingJalur(true); // Set loading true
    fetch('/data/jalurRel.json')
      .then(res => {
        if (!res.ok) { // Cek jika response tidak OK (misal 404)
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(dataJalur => { // Menggunakan nama parameter yang jelas: dataJalur
        console.log("Data Jalur Dimuat:", dataJalur);
        const filtered = {
          ...dataJalur, // Menggunakan dataJalur
          features: dataJalur.features.filter(f => f.geometry.type === 'LineString')
        };
        setJalur(filtered);
        setIsLoadingJalur(false); // Set loading false
      })
      .catch(error => {
        console.error("Gagal memuat data jalurRel:", error);
        setIsLoadingJalur(false); // Set loading false juga jika error
      });
  }, []);

  useEffect(() => {
    setIsLoadingStations(true); // Set loading true
    fetch('/data/stasiun.json')
      .then(res => {
        if (!res.ok) { // Cek jika response tidak OK
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(dataStasiun => { // Menggunakan nama parameter yang jelas: dataStasiun
        console.log("Data Stasiun Dimuat untuk state:", dataStasiun);
        setStasiun(dataStasiun); // Menggunakan dataStasiun
        setIsLoadingStations(false); // Set loading false
      })
      .catch(error => {
        console.error("Gagal memuat data stasiun:", error);
        setIsLoadingStations(false); // Set loading false juga jika error
      });
  }, []);

  console.log("State stasiun sebelum render:", stasiun);
  console.log("State jalur sebelum render:", jalur);

  // Custom icon for stations (hanya dot kecil)
  const stationDotIcon = L.divIcon({
    className: 'station-dot-icon',
    html: `<span class="station-marker-dot-only"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  // Custom icon for trains
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

  // Jika salah satu data penting masih loading, bisa tampilkan pesan loading global untuk map
  if (isLoadingStations || isLoadingJalur) {
    console.log("Map.js: Masih memuat data penting (stasiun atau jalur)...");
    // Anda bisa return komponen loading di sini agar tidak render MapContainer prematur
    // return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><p>Memuat peta dan data...</p></div>;
  }

  return (
    <MapContainer center={[-6.30, 106.55]} zoom={10} style={{ height: 'calc(100vh - 100px)', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — Tren Realtime oleh GAPEKA Explorer'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
      />

      {/* Garis jalur rel */}
      {!isLoadingJalur && jalur && jalur.features.map((feature, i) => ( // Cek isLoadingJalur juga
        <Polyline
          key={`jalur-${i}`}
          positions={feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          color="#2c3e50"
          weight={3}
          opacity={0.6}
        />
      ))}

      {/* Marker stasiun */}
      {!isLoadingStations && stasiun && stasiun.length > 0 && stasiun.map((s, i) => {
        // console.log(`Rendering stasiun: ${s.nama}`, s.koordinat);
        if (!s.koordinat || s.koordinat.length !== 2 || typeof s.koordinat[0] !== 'number' || typeof s.koordinat[1] !== 'number') {
          console.warn("Koordinat stasiun tidak valid atau bukan angka:", s);
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
      {!isLoadingJalur && positions && jalur && Object.entries(positions).map(([kaId, pos]) => { // Cek isLoadingJalur
        const koord = pos.koordinat;
        if (!Array.isArray(koord) || koord.length !== 2) return null;

        // Pastikan jalur.features ada sebelum findNearestPoint
        if (!jalur || !jalur.features || jalur.features.length === 0) return null;

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
