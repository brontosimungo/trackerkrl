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
    if (!rute || rute.length === 0) return;

    const firstStop = rute[0];
    const lastStop = rute[rute.length - 1];
    
    const firstDepTime = timeStringToMinutes(firstStop.waktuBerangkat);
    const lastArrTime = timeStringToMinutes(lastStop.waktuTiba);
    const lastDepTimeFromFinal = timeStringToMinutes(lastStop.waktuBerangkat); // Waktu berangkat dari stasiun terakhir (jika ada, misal untuk kembali)

    // Logika untuk menghilangkan kereta setelah 5 menit di tujuan akhir
    // Jika kereta sudah tiba di stasiun akhir (lastArrTime)
    // DAN tidak ada jadwal berangkat lagi dari stasiun akhir (lastDepTimeFromFinal null atau sudah lewat)
    // DAN sudah lebih dari 5 menit sejak tiba.
    if (lastArrTime !== null && currentMinutes >= lastArrTime + 5) {
        if (!lastDepTimeFromFinal || currentMinutes >= lastDepTimeFromFinal) {
            return; // Jangan tampilkan kereta ini
        }
    }
    
    let trainPositionData = null; // Temporary holder for this train's data

    // Tampilkan 10 menit sebelum keberangkatan pertama, kereta "standby" di stasiun awal
    if (firstDepTime !== null && currentMinutes >= firstDepTime - 10 && currentMinutes < firstDepTime) {
      trainPositionData = {
        koordinat: firstStop.koordinat,
        currentStop: null, 
        nextStop: firstStop,
        departureTime: formatTimeHHMM(firstStop.waktuBerangkat),
        prevStopForBearing: null // Untuk bearing, belum ada prev
      };
    } else {
      // Lewat semua segmen antar stasiun
      for (let i = 0; i < rute.length - 1; i++) {
        const curr = rute[i];
        const next = rute[i + 1];

        const dep = timeStringToMinutes(curr.waktuBerangkat);
        const arr = timeStringToMinutes(next.waktuTiba);

        // Sedang bergerak di antara dua stasiun
        if (dep !== null && arr !== null && currentMinutes >= dep && currentMinutes < arr) {
          const duration = arr - dep;
          if (duration <= 0) { // "Teleport" or very short travel
            trainPositionData = {
              koordinat: next.koordinat,
              currentStop: next, 
              nextStop: (i + 2 < rute.length) ? rute[i+2] : null,
              departureTime: formatTimeHHMM(next.waktuBerangkat),
              prevStopForBearing: curr
            };
          } else {
            const ratio = (currentMinutes - dep) / duration;
            const interpolated = interpolateBetweenCoords(curr.koordinat, next.koordinat, ratio);
            trainPositionData = {
              koordinat: interpolated,
              currentStop: curr,
              nextStop: next,
              departureTime: null, // Tidak menampilkan waktu berangkat saat sedang bergerak
              prevStopForBearing: curr // Untuk bearing saat bergerak
            };
          }
          break; // Found position, exit loop for this train
        }

        // Tiba tepat di stasiun berikutnya (atau sedang menunggu keberangkatan dari stasiun ini)
        const nextDep = timeStringToMinutes(next.waktuBerangkat);
        if (arr !== null && (currentMinutes === arr || (currentMinutes > arr && nextDep !== null && currentMinutes < nextDep))) {
          trainPositionData = {
            koordinat: next.koordinat,
            currentStop: next, 
            nextStop: (i + 2 < rute.length) ? rute[i+2] : null, 
            departureTime: formatTimeHHMM(next.waktuBerangkat),
            prevStopForBearing: curr // Bearing dari stasiun sebelumnya ke stasiun saat ini
          };
          break; // Found position, exit loop for this train
        }
      }
    }
    
    // Jika setelah loop tidak ada posisi (misal, kereta sudah selesai atau belum mulai jauh)
    // Cek kondisi di stasiun terakhir (jika belum ditangani di atas)
    if (!trainPositionData && lastArrTime !== null && currentMinutes >= lastArrTime) {
        // Kereta berada di stasiun terakhir
        if (lastDepTimeFromFinal && currentMinutes < lastDepTimeFromFinal) { // Menunggu keberangkatan kembali
            trainPositionData = {
                koordinat: lastStop.koordinat,
                currentStop: lastStop,
                nextStop: null, // Atau rute berikutnya jika ada
                departureTime: formatTimeHHMM(lastStop.waktuBerangkat),
                prevStopForBearing: rute.length > 1 ? rute[rute.length-2] : null
            };
        } else { // Sudah tiba di stasiun akhir dan tidak ada keberangkatan lagi, atau sudah lewat waktu berangkat kembali
                 // Ini akan difilter oleh logika 5 menit di awal jika sudah lewat
            trainPositionData = {
                koordinat: lastStop.koordinat,
                currentStop: lastStop,
                nextStop: null,
                departureTime: null, // Selesai
                prevStopForBearing: rute.length > 1 ? rute[rute.length-2] : null
            };
        }
    }

    if (trainPositionData) {
      positions[kaId] = trainPositionData;
    }
    // Jika trainPositionData tetap null (misal, perjalanan belum mulai sama sekali atau sudah sangat lama selesai dan terfilter),
    // KA tersebut tidak akan masuk ke object `positions`.
  });

  return positions;
}
