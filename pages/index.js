import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import jadwalKA from '../data/jadwal';
import { interpolateAllPositions } from '../utils/interpolateTrainPosition';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

export default function Home() {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    const updatePositions = () => {
      const now = new Date();
      const localMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const pos = interpolateAllPositions(localMinutes, jadwalKA);
      setPositions(pos);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000); // update setiap 1 detik
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.2rem', textAlign: 'center' }}>
    Tracker KA Rangkasbitung - Tanah Abang<br />By aufalmarom
  </h1>
      {positions ? (
        <Map positions={positions} />
      ) : (
        <p>Memuat posisi kereta...</p>
      )}
    </div>
  );
}
