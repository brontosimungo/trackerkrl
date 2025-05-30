import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import jadwalKA from '../data/jadwal';
import { interpolateAllPositions } from '../utils/interpolateTrainPosition';

const Map = dynamic(() => import('../components/Map'), { ssr: false });

export default function Home() {
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    const updatePositions = () => {
      const now = new Date();
      // Penyesuaian waktu simulasi: +7 jam untuk UTC+7 (WIB) dari waktu lokal browser
      // Jika server sudah UTC, maka now.getHours() sudah benar jika server di set UTC.
      // Jika server di set WIB, maka now.getHours() juga sudah benar.
      // Untuk konsistensi, kita gunakan UTC hours dan minutes lalu adjust ke GMT+7
      // const utcHours = now.getUTCHours();
      // const localMinutes = ((utcHours + 7) % 24) * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
      
      // Menggunakan waktu lokal client (browser)
      const localMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      const pos = interpolateAllPositions(localMinutes, jadwalKA);
      setPositions(pos);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000); // update setiap 1 detik
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Live Tracker KA Commuter Line Rangkasbitung - Tanah Abang</title>
        <meta name="description" content="Pantau pergerakan real-time (simulasi) Kereta Api Commuter Line Rangkasbitung - Tanah Abang berdasarkan jadwal GAPEKA terbaru." />
        <link rel="icon" href="/favicon.ico" /> {/* Tambahkan favicon jika ada */}
      </Head
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5819039672384090"
           crossorigin="anonymous"></script>
      <main className="app-container">
        <header className="app-header">
          <h1>Pantau Perjalanan KA Commuter Line</h1>
          <h2>Rangkasbitung ⇌ Tanah Abang</h2>
          <p className="gapeka-info">GAPEKA 2025</p>
        </header>
        
        <div className="map-wrapper">
          {positions ? (
            <Map positions={positions} />
          ) : (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Menghitung perkiraan posisi kereta...</p>
            </div>
          )}
        </div>
        <footer className="app-footer">
          <p>
            <strong>Disclaimer:</strong> Data ini adalah simulasi real-time berbasis jadwal resmi GAPEKA. 
            Keterlambatan aktual akibat gangguan operasional tidak tercermin karena ini bukan pelacakan GPS langsung.
          </p>
          <p>
            Dikembangkan dengan ❤️ oleh AUFAL MAROM.
          </p>
        </footer>
      </main>
    </>
  );
}
