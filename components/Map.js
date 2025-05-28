import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  useEffect(() => {
    fetch('/data/jalurRel.json')
      .then(res => res.json())
      .then(data => {
        const filtered = {
          ...data,
          features: data.features.filter(f => f.geometry.type === 'LineString')
        };
        setJalur(filtered);
      });
  }, []);

  useEffect(() => {
    fetch('/data/stasiun.json')
      .then(res => res.json())
      .then(setStasiun);
  }, []);

  return (
    <MapContainer center={[-6.34, 106.5]} zoom={11} style={{ height: '90vh', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Stasiun */}
      {stasiun.map((s, i) => (
        <Marker
          key={`s-${i}`}
          position={[s.koordinat[1], s.koordinat[0]]}
          icon={L.divIcon({
            className: 'station-label',
            html: `<div style="
              font-size: 18px;
              font-weight: bold;
              background: white;
              color: black;
              padding: 4px 6px;
              border: 1px solid black;
              border-radius: 4px;
              box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
            ">${s.nama}</div>`,
            iconAnchor: [0, 0]
          })}
          zIndexOffset={1000}
        />
      ))}

      {/* Jalur */}
      {jalur && jalur.features.map((feature, i) => (
        <Polyline
          key={i}
          positions={feature.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          color="green"
        />
      ))}

      {/* Kereta - kotak kecil hitam + label miring */}
      {positions && jalur && Object.entries(positions).map(([kaId, pos]) => {
        const koord = pos.koordinat;
        if (!Array.isArray(koord) || koord.length !== 2) return null;

        const nearest = findNearestPoint(koord, jalur.features);
        if (!nearest) return null;

        let label = `${kaId} ${pos.currentStop?.stasiun || '-'} → ${pos.nextStop?.stasiun || '-'}`;
        if (!pos.currentStop && pos.nextStop && pos.departureTime) {
          label += ` (Berangkat ${pos.departureTime})`;
        }

        return (
          <Marker
            key={kaId}
            position={nearest}
            icon={L.divIcon({
              className: 'train-label',
              html: `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="
                    width: 10px;
                    height: 10px;
                    background: black;
                    border-radius: 2px;
                  "></div>
                  <div style="
                    transform: rotate(-60deg);
                    transform-origin: left center;
                    font-size: 13px;
                    color: rgba(0,0,0,0.75);
                    font-weight: 600;
                    white-space: nowrap;
                  ">
                    ${label}
                  </div>
                </div>
              `,
              iconAnchor: [5, 5]
            })}
            zIndexOffset={3000}
          />
        );
      })}
    </MapContainer>
  );
}
