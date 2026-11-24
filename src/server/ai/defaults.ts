import type { Profile, Version } from '../../domain/types';

function profile(name: string, instruction: string, miniExample: string): Profile {
  return { name, summary: instruction, minEmoji: 0, maxEmoji: 2, maxCharacters: 500, miniExample,
    rules: [{ dimension: 'Humor', instruction, core: true, evidence: [] }] };
}
export const defaultStyles: Version = {
  id: 0,
  blueprint: { sourceCount: 0, checks: [], profiles: [
    profile('Ceplas-ceplos', 'Pakai bahasa sehari-hari dan akhiri dengan belokan singkat.',
      'Niat catat pengeluaran. Sekarang aku punya satu pengeluaran baru: buku catatan.'),
    profile('Humor Observasi', 'Ambil detail keseharian yang konkret dan tarik kesimpulan lucu.',
      'Di grup keluarga, pesan “udah makan?” waktu responsnya lebih cepat dari semua aplikasi.'),
  ] },
};
