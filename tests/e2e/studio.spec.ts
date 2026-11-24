import { expect, test } from '@playwright/test';
import { examples } from '../integration/drafts-fixture';

test('impor, tutup-buka, kelola contoh, analisis, simpan, dan perbarui versi', async ({ page }) => {
  await page.goto('/gaya');
  await expect(page.getByText('Mode demo', { exact: true })).toBeVisible();
  await expect(page.getByText('Belum ada contoh')).toBeVisible();
  await expect(page.getByText('Blueprint belum dibuat')).toBeVisible();

  await page.getByRole('button', { name: 'Tambah Contoh' }).click();
  await page.getByRole('textbox', { name: 'Tempel beberapa utas' }).fill(examples.join('\n\n'));
  await expect(page.getByText('5 contoh terdeteksi')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Tambah Contoh' }).click();
  await expect(page.getByRole('textbox', { name: 'Tempel beberapa utas' })).toHaveValue(examples.join('\n\n'));
  await page.getByRole('button', { name: 'Simpan 5 contoh' }).click();
  await expect(page.getByRole('heading', { name: '5 contoh' })).toBeVisible();

  const library = page.getByRole('region', { name: 'Pustaka contoh' });
  await library.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'Isi utas' }).fill('Dosen minta referensi. Aku masih nyari keberanian.');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(library.getByText('Dosen minta referensi. Aku masih nyari keberanian.')).toBeVisible();
  await library.getByRole('button', { name: 'Hapus', exact: true }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Batal' }).click();
  await expect(page.getByRole('heading', { name: '5 contoh' })).toBeVisible();
  await library.getByRole('button', { name: 'Hapus', exact: true }).last().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('heading', { name: '4 contoh' })).toBeVisible();

  const first = page.getByRole('button', { name: 'Buat Blueprint' });
  await page.route('**/api/analyze', (route) => route.fulfill({ status: 502, json: { error: 'Simulasi analisis gagal.' } }),
    { times: 1 });
  await first.click();
  await expect(page.getByRole('alert')).toContainText('Simulasi analisis gagal.');
  await first.click();
  await expect(page.getByRole('region', { name: 'Blueprint' }).getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Buka pratinjau' }).click();
  await expect(page.getByRole('dialog', { name: 'Pratinjau blueprint' })).toBeVisible();
  await expect(page.getByText(/Contoh #/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Edit dan simpan' }).click();
  await page.getByRole('textbox', { name: 'Nama gaya' }).fill('Observasi Demo');
  await page.getByRole('button', { name: 'Simpan Gaya' }).click();
  await expect(page.getByText('Versi 1 · Aktif')).toBeVisible();

  await page.getByRole('button', { name: 'Perbarui Blueprint' }).click();
  await page.getByRole('button', { name: 'Buka pratinjau' }).click();
  await expect(page.getByRole('dialog').getByText('Versi 1 tetap aktif sampai versi baru disimpan.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit dan simpan' }).click();
  await page.getByRole('button', { name: 'Simpan versi baru' }).click();
  await expect(page.getByText('Versi 2 · Aktif')).toBeVisible();
});

test('buat 25 draf, edit, salin, ganti, buka riwayat, dan lengkapi tampilan parsial', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByText('Mode demo', { exact: true })).toBeVisible();
  const generate = page.getByRole('button', { name: 'Buat 25 postingan' });
  await expect(generate).toBeDisabled();
  await page.getByRole('textbox', { name: 'Topik postingan' }).fill('Suka dukanya jualan online');
  await page.getByRole('button', { name: /^Pilih gaya:/ }).click();
  await expect(page.getByRole('group', { name: 'Pilihan gaya' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: 'Pilihan gaya' })).toHaveCount(0);
  await generate.click();
  await expect(page.getByRole('heading', { name: 'Menyiapkan draf' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '25 draf siap' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(25);

  const first = page.getByRole('article').first();
  await first.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Isi postingan' }).fill('Toko buka. Energi masih di kasur.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Lanjut edit' }).click();
  await expect(page.getByRole('textbox', { name: 'Isi postingan' })).toHaveValue('Toko buka. Energi masih di kasur.');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(first).toContainText('Toko buka. Energi masih di kasur.');
  await first.getByRole('button', { name: 'Salin' }).click();
  await expect(page.getByText('Draf disalin.')).toBeVisible();
  await first.getByRole('button', { name: 'Ganti' }).click();
  await expect(first.getByRole('button', { name: 'Mencari alternatif…' })).toBeVisible();
  await expect(first).not.toContainText('Toko buka. Energi masih di kasur.');
  await expect(page.getByRole('article')).toHaveCount(25);

  await page.getByRole('button', { name: 'Riwayat' }).click();
  await expect(page.getByRole('dialog', { name: 'Riwayat' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Riwayat' }).click();
  await page.route(/\/api\/batches\/\d+$/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, drafts: data.drafts.slice(0, 18), lastError: 'Sebagian draf belum lolos.' } });
  }, { times: 1 });
  await page.getByRole('dialog').getByRole('button', { name: /Suka dukanya jualan online/ }).click();
  await expect(page.getByRole('heading', { name: '18 dari 25 draf siap' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lengkapi 7 draf' })).toBeVisible();
});
