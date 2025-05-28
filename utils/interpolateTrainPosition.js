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
    const lastStop = rute[rute.length - 1];
    const firstDep = timeStringToMinutes(firstStop.waktuBerangkat);
    const lastArr = timeStringToMinutes(lastStop.waktuTiba);

    // Tampilkan 10 menit sebelum keberangkatan pertama
    if (currentMinutes >= firstDep - 10 && currentMinutes < firstDep) {
      positions[kaId] = {
        koordinat: firstStop.koordinat,
        currentStop: null,
        nextStop: firstStop,
        departureTime: formatTimeHHMM(firstStop.waktuBerangkat)
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
        const ratio = (currentMinutes - dep) / (arr - dep);
        const interpolated = interpolateBetweenCoords(curr.koordinat, next.koordinat, ratio);
        positions[kaId] = {
          koordinat: interpolated,
          currentStop: curr,
          nextStop: next
        };
        return;
      }

      // Tiba tepat di stasiun berikutnya
      if (currentMinutes === arr) {
        positions[kaId] = {
          koordinat: next.koordinat,
          currentStop: next,
          nextStop: null
        };
        return;
      }
    }

    // Cek jika sedang berhenti di stasiun (di antara waktuTiba dan waktuBerangkat di titik yang sama)
    for (let i = 0; i < rute.length; i++) {
      const stop = rute[i];
      const tiba = timeStringToMinutes(stop.waktuTiba);
      const berangkat = timeStringToMinutes(stop.waktuBerangkat);

      if (tiba !== null && berangkat !== null && currentMinutes >= tiba && currentMinutes < berangkat) {
        positions[kaId] = {
          koordinat: stop.koordinat,
          currentStop: stop,
          nextStop: null
        };
        return;
      }
    }

    // Jika kereta telah selesai (melebihi waktu akhir), tidak ditampilkan
  });

  return positions;
}
