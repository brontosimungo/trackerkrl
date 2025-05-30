// Konversi waktu "HH:MM:SS" ke menit
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + (seconds || 0) / 60;
}

// Interpolasi koordinat antar dua titik
function interpolateBetweenCoords(coord1, coord2, ratio) {
  const lat = coord1[1] + (coord2[1] - coord1[1]) * ratio;
  const lng = coord1[0] + (coord2[0] - coord1[0]) * ratio;
  return [lng, lat];
}

// Format "HH:MM:SS" ke "HH:MM"
function formatTimeHHMM(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

// Hitung posisi semua KA berdasarkan waktu saat ini
export function interpolateAllPositions(currentMinutes, jadwalKA) {
  const positions = {};

  Object.entries(jadwalKA).forEach(([kaId, rute]) => {
    const firstStop = rute[0];
    // const lastStop = rute[rute.length - 1]; // Not strictly needed for current logic
    const firstDep = timeStringToMinutes(firstStop.waktuBerangkat);
    // const lastArr = timeStringToMinutes(lastStop.waktuTiba); // Not strictly needed for current logic

    // Tampilkan 10 menit sebelum keberangkatan pertama, kereta "standby" di stasiun awal
    if (currentMinutes >= firstDep - 10 && currentMinutes < firstDep) {
      positions[kaId] = {
        koordinat: firstStop.koordinat,
        currentStop: null, // Belum berangkat dari stasiun awal
        nextStop: firstStop,
        departureTime: formatTimeHHMM(firstStop.waktuBerangkat) // Menampilkan waktu keberangkatan
      };
      return;
    }

    // Lewat semua segmen antar stasiun
    for (let i = 0; i < rute.length - 1; i++) {
      const curr = rute[i];
      const next = rute[i + 1];

      const dep = timeStringToMinutes(curr.waktuBerangkat);
      const arr = timeStringToMinutes(next.waktuTiba);

      // Sedang bergerak di antara dua stasiun
      if (dep !== null && arr !== null && currentMinutes > dep && currentMinutes < arr) {
        const duration = arr - dep;
        // Handle edge case: if duration is 0, train "teleports" or is at next station
        if (duration <= 0) {
            positions[kaId] = {
                koordinat: next.koordinat,
                currentStop: next, // Anggap sudah sampai jika durasi 0 atau negatif
                nextStop: (i + 2 < rute.length) ? rute[i+2] : null, // Cek stasiun berikutnya setelah ini
                departureTime: formatTimeHHMM(next.waktuBerangkat) 
            };
        } else {
            const ratio = (currentMinutes - dep) / duration;
            const interpolated = interpolateBetweenCoords(curr.koordinat, next.koordinat, ratio);
            positions[kaId] = {
                koordinat: interpolated,
                currentStop: curr,
                nextStop: next,
                departureTime: null // Tidak menampilkan waktu berangkat saat sedang bergerak
            };
        }
        return;
      }

      // Tiba tepat di stasiun berikutnya (atau sedang menunggu keberangkatan dari stasiun ini)
      const nextDep = timeStringToMinutes(next.waktuBerangkat);
      if (currentMinutes === arr || (currentMinutes > arr && nextDep !== null && currentMinutes < nextDep)) {
        positions[kaId] = {
          koordinat: next.koordinat,
          currentStop: next, // Berhenti di stasiun 'next'
          nextStop: (i + 2 < rute.length) ? rute[i+2] : null, // Stasiun berikutnya setelah 'next'
          departureTime: formatTimeHHMM(next.waktuBerangkat) // Waktu berangkat dari stasiun 'next'
        };
        return;
      }
    }
    
    // Setelah loop, cek apakah kereta sudah sampai di stasiun terakhir dan menunggu
    const lastStop = rute[rute.length-1];
    const lastArrTime = timeStringToMinutes(lastStop.waktuTiba);
    const lastDepTime = timeStringToMinutes(lastStop.waktuBerangkat); // Biasanya null/tidak ada untuk stasiun tujuan akhir

    if (currentMinutes >= lastArrTime) {
        // Jika ada waktu berangkat dari stasiun terakhir (misal, untuk perjalanan kembali), dan belum lewat
        if (lastDepTime && currentMinutes < lastDepTime) {
            positions[kaId] = {
                koordinat: lastStop.koordinat,
                currentStop: lastStop,
                nextStop: null, // Atau rute berikutnya jika ada
                departureTime: formatTimeHHMM(lastStop.waktuBerangkat)
            };
            return;
        }
        // Jika tidak ada waktu berangkat dari stasiun terakhir, atau sudah lewat,
        // kereta dianggap telah selesai perjalanan (tidak ditampilkan, atau tampilkan di stasiun akhir tanpa next stop)
        // Untuk saat ini, kita tampilkan saja di stasiun akhir
        if (currentMinutes >= lastArrTime && (!lastDepTime || currentMinutes >= lastDepTime)) {
             positions[kaId] = {
                koordinat: lastStop.koordinat,
                currentStop: lastStop,
                nextStop: null,
                departureTime: null // Selesai, tidak ada waktu berangkat lagi
            };
            // Jika ingin tidak menampilkan setelah sampai, uncomment baris di bawah dan comment block di atas
            // delete positions[kaId]; 
            return;
        }
    }


    // Jika kereta telah selesai (melebihi waktu akhir), tidak ditampilkan
    // Ini sudah ditangani oleh logika di atas, jika kereta sampai di stasiun terakhir dan tidak ada jadwal berangkat lagi.
  });

  return positions;
}
