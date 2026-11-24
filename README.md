# Utas Studio

Aplikasi lokal untuk membuat blueprint gaya dari contoh utas dan menyiapkan hingga 25 draf Threads per batch.

## Mulai di komputer sendiri

Siapkan Node.js 24 dan Docker dengan Docker Compose. Dari folder proyek, jalankan:

```sh
npm ci
docker compose up -d --wait
npm run db:migrate
```

Jalankan web dan worker dari dua terminal terpisah di folder yang sama.

```sh
npm run worker
```

```sh
npm run dev
```

Buka **http://127.0.0.1:3000**. Tanpa kredensial, label **Mode demo** muncul dan worker memakai respons simulasi. Demo dan live punya batch, antrean, dan blueprint terpisah di database yang sama. Pustaka contoh dipakai bersama agar bisa ditinjau ulang sebelum analisis live.

Untuk mode live, salin `.env.example` ke `.env.local` lalu isi `OPENAI_API_KEY` dari proyek yang memiliki akses ke model di `OPENAI_MODEL` dan `OPENAI_EMBEDDING_MODEL`. Ubah kedua nama model itu di `.env.local` sesuai kebutuhan. Model generatif harus mendukung Responses API, Structured Outputs, dan pengaturan reasoning yang digunakan aplikasi. Setelah menarik perubahan proyek, jalankan `npm run db:migrate` untuk mendukung dimensi asli model embedding. Restart **web dan worker** agar mode keduanya sama. Teks yang dianalisis atau dibandingkan akan dikirim ke OpenAI. Vektor disimpan per model di PostgreSQL untuk dipakai ulang. Beralih model embedding membuat vektor baru saat diperlukan. Simpan kunci di mesin lokal.

Untuk menjalankan build produksi lokal, gunakan `npm run build` lalu `npm start`. Worker tetap berjalan di terminal lain.

## Menggunakan aplikasi

1. Di **Gaya Penulisan**, pilih **Tambah Contoh**. Pisahkan teks utas dengan satu baris kosong atau `---`.
2. Jalankan analisis dari setidaknya dua contoh. Tinjau aturan, bukti sumber, batas emoji, dan hasil validasi jika tersedia. Edit nama atau panduan, lalu simpan untuk mengaktifkan versi itu.
3. Di **Buat Postingan**, isi topik, pilih gaya, dan buat draf. Gaya bawaan tersedia sebelum blueprint pertama aktif.
4. Edit, salin, atau ganti satu draf. Gunakan **Riwayat** untuk membuka batch lama. Jika angka di bawah 25, **Lengkapi** menjalankan slot yang belum terisi.

## Struktur proyek

- `src/features/` dan `src/components/` memuat UI React dan CSS Modules. PNG bernomor di akar proyek adalah acuan, dan aset yang dipakai berada di `public/assets/`.
- `src/server/ai/` memisahkan klien OpenAI, prompt, blueprint, rencana slot, evaluasi, embedding, dan orisinalitas.
- `src/server/jobs/` memproses pekerjaan lewat pg-boss. Status, progres, dan hasil disimpan di PostgreSQL.
- `src/server/db/` berisi skema Drizzle dan akses data. `drizzle/` berisi migrasi SQL yang dapat dijalankan ulang.

## Verifikasi

```sh
npm run check
npm test
npm run build
```

Untuk tes integrasi dengan PostgreSQL dan pgvector, buat database khusus berakhiran `_test`. Tes mengosongkan tabel aplikasi di database tersebut dan memakai respons OpenAI simulasi.

```sh
docker compose exec -T postgres createdb -U utas utas_test
UTAS_TEST_DATABASE_URL=postgresql://utas:utas-local@127.0.0.1:54326/utas_test npm test
```

Untuk Playwright, gunakan database demo baru yang kosong dan jalankan migrasi, web, serta worker dengan `DATABASE_URL` yang sama. Kemudian jalankan `npx playwright install chromium` dan `npm run test:e2e`. Set `UTAS_E2E_BASE_URL` jika URL web berbeda dari default.

Uji akhir mode live memakai contoh Indonesia sebenarnya. Periksa bukti blueprint, jalankan satu batch 25 draf dan penggantian satu slot, lalu baca sampel tanpa label untuk menilai kesetiaan gaya. Uji parafrasa lelucon lama dan lelucon berbeda yang bertopik sama. Untuk mengukur manfaat contoh mini, bandingkan pasangan hasil dengan topik, versi profil, dan rubrik yang sama.
