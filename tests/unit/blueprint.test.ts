import { describe, expect, it } from 'vitest';
import { lexicalSimilarity, metrics, normalize, splitExamples } from '../../src/domain/text';
import type { Example, Profile } from '../../src/domain/types';
import { partition, verifyProfiles } from '../../src/server/ai/blueprint-validation';

const samples: Example[] = [
  'Dosen minta referensi. Aku cari alasan.',
  'Kulkas sudah tutup saat aku ingat makan.',
  'Pakai sandal ke stasiun. Sandalnya lebih dulu sampai.',
  'Tadinya mau santai. Telepon kakak memulai rapat keluarga.',
  'Temanku bilang main catur sebentar. Aku pulang setelah makan malam.',
].map((text, index) => ({ id: index + 1, revision: 1, text }));

const profile: Profile = {
  name: 'Observasi', summary: 'Pola belokan singkat.', maxCharacters: 500,
  minEmoji: 0, maxEmoji: 2, miniExample: 'Niat cari hobi. Sekarang hobiku beli alat buat hobi.',
  rules: [{ dimension: 'Humor', instruction: 'Beri belokan di akhir.', core: true,
    evidence: [{ id: 1, revision: 1, quote: 'Aku cari alasan.' }] }],
};

describe('teks dan asal bukti', () => {
  it('memisahkan contoh sambil mempertahankan satu baris baru di dalam utas', () => {
    expect(splitExamples('Halo\r\nlanjutan\r\n---\r\nDua\n\nTiga')).toEqual(['Halo\r\nlanjutan', 'Dua', 'Tiga']);
  });
  it('menghitung emoji sebagai rangkaian, termasuk bendera dan keycap', () => {
    expect(metrics('Ini 🇮🇩, 👩🏽‍💻, dan 1️⃣!').emojis).toBe(3);
  });
  it('normalisasi menangkap perubahan kapital dan tanda baca', () => {
    expect(normalize('Halo, DUNIA!')).toBe('halo dunia');
    expect(lexicalSimilarity('ini utas yang sama', 'INI utas yang sama!')).toBe(1);
  });
  it('menyisihkan contoh yang tidak dipakai menyusun aturan', () => {
    const { training, heldOut } = partition(samples);
    expect(training).toHaveLength(4);
    expect(heldOut.map(({ id }) => id)).toEqual([5]);
  });
  it('menolak kutipan yang tidak ditemukan pada revisi yang tepat', () => {
    expect(() => verifyProfiles([profile], samples)).not.toThrow();
    const changed = samples.map((item) => ({ ...item, revision: 2 }));
    expect(() => verifyProfiles([profile], changed)).toThrow(/bukti/);
  });
  it('menolak contoh mini yang menyalin sumber', () => {
    expect(() => verifyProfiles([{ ...profile, miniExample: samples[0].text }], samples)).toThrow(/terlalu mirip/);
  });
});
