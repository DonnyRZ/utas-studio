const angles = [
  ['mencari ide', 'Katanya tinggal mulai. Aku udah mulai dari bikin folder “final banget”.'],
  ['jadwal yang padat', 'Kalender penuh, tapi selalu ada satu slot kosong buat panik.'],
  ['biaya kecil', 'Uang bisa dicari. Struk ongkir entah ke mana.'],
  ['minta pendapat', 'Ada tiga pilihan. Aku pilih tanya pendapat enam orang.'],
  ['revisi terakhir', 'Bilangnya revisi kecil. Kursi kerjaku sudah tahu nada itu.'],
  ['kopi sore', 'Baru setengah jalan, tapi kopi udah minta lembur.'],
  ['notifikasi', 'Semua terkendali sampai satu notifikasi bilang “sebentar ya”.'],
  ['tab browser', 'Bagian paling susah itu jelasin kenapa tab browserku ada 37.'],
  ['tugas baru', 'Keahlian baru: kelihatan paham sambil diam-diam googling.'],
  ['persiapan', 'Sudah siap menerima kritik, selama kritiknya “rapi banget”.'],
  ['kerja kelompok', 'Yang kerja satu orang, yang debat di kepala sekelas.'],
  ['rencana cadangan', 'Aku bikin cadangan. Cadangannya sudah minta cadangan.'],
  ['alur kerja', 'Sudah dibikin sederhana. Tinggal jelasin kesederhanaannya dalam 12 slide.'],
  ['camilan', 'Langkah pertama cari ide. Langkah kedua cari camilan.'],
  ['target harian', 'Target hari ini sederhana: jangan keburu bikin target besok.'],
  ['hemat waktu', 'Niatnya hemat waktu. Malah belajar tiga cara baru buat menunda.'],
  ['fokus', 'Kukira perlu fokus. Ternyata perlu colokan.'],
  ['kerja malam', 'Kalau dibaca ulang jam dua pagi, semuanya terdengar visioner.'],
  ['judul', 'Seriusnya 10 menit. Milih judulnya sampai lupa makan.'],
  ['catatan', 'Doa sebelum mulai: semoga besok ngerti catatan hari ini.'],
  ['saran teman', 'Teman bilang coba aja. Sayangnya dia nggak ikut beresin akibatnya.'],
  ['strategi', 'Kukira butuh strategi. Ternyata cuma perlu berhenti ganti-ganti font.'],
  ['rapat', 'Bisa dijelaskan dalam satu kalimat. Jangan tanya kenapa butuh tiga rapat.'],
  ['prioritas', 'Aku bikin daftar prioritas. Daftarnya sekarang masuk daftar prioritas.'],
  ['petunjuk', 'Ada yang namanya intuisi. Ada juga yang namanya belum baca petunjuk.'],
  ['waktu istirahat', 'Sudah coba pendekatan baru: tidur cukup. Masih uji coba.'],
  ['solusi', 'Sore tadi nemu solusi. Masalahnya, lupa masalah yang mana.'],
  ['ide baru', 'Semua idenya masuk akal kecuali nyoba semuanya sore ini.'],
  ['keberanian', 'Dia bilang “gampang kok” dengan ketenangan orang yang sudah menyerah.'],
  ['selesai kerja', 'Kok bisa selesai? Aku juga penasaran. Jangan ganggu dulu.'],
  ['perangkat baru', 'Aku baca manualnya. Manualnya ternyata menyarankan baca manual yang lain.'],
  ['pembagian tugas', 'Aku menunjuk diri sendiri sebagai ketua supaya ada yang bisa kusalahin.'],
  ['waktu luang', 'Niat menunggu lima menit. Tahu-tahu aku ahli sejarah mesin cuci.'],
  ['motivasi', 'Mulai dari hal kecil. Aku mulai dengan mengecilkan volume notifikasi.'],
  ['sistem baru', 'Sistem baru mengurangi dua langkah dan menambahkan password yang kelima.'],
  ['laporan', 'Grafiknya naik. Kecurigaanku juga.'],
];
const perspectives = ['Akhirnya nyoba', 'Catatan kecil soal', 'Hari pertama belajar', 'Obrolan di balik'];

export function demoCandidates(topic: string, slot: number, batchId: number, round: number) {
  const start = slot - 1 + (batchId - 1) * 5 + round * 7;
  const subject = [...topic].slice(0, 62).join('').replace(/[.!?]+$/u, '');
  return Array.from({ length: angles.length * perspectives.length }, (_, index) => {
    const [angle, joke] = angles[(start + index) % angles.length];
    const lead = perspectives[(Math.floor(index / angles.length) + batchId - 1) % perspectives.length];
    return { angle, device: 'Belokan observasi', text: `${lead} ${subject}. ${joke}` };
  });
}
