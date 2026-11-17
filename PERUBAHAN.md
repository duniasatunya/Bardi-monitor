# Redesain UI/UX Bardi Monitor: catatan perubahan

Status: **Tahap 1-3 selesai, revisi 1 (12 Nov) sudah dikerjakan. Menunggu Gerbang 1.**
Folder ini salinan kerja terpisah. Folder asli `bardi-monitor` tidak disentuh, dan belum ada yang dimasukkan ke GitHub.

## Berkas yang berubah / baru

| Berkas | Perubahan |
| --- | --- |
| `ui-kit.js` | Bagian lama (`css`, `js`, `header`, `LINKS`) **tidak diubah**. Ditambah ekspor baru `ds` (design system): token warna terang/gelap, ikon SVG, komponen, kerangka halaman (sidebar, bar tab bawah, bar atas, panel Lainnya). Bentuk ekspor tetap: `{ css, js, header, LINKS, ds }`. |
| `report-server.js` | **Hanya satu bagian diganti**: konstanta `MAIN_PAGE` (HTML halaman Laporan) sekarang diambil dari `beranda-page.js`. Rute, login, kunci 5x salah, PDF, penyimpanan data: tidak berubah (lihat `perubahan.diff`). |
| `beranda-page.js` (baru) | Halaman Beranda (alamat tetap `/displaycostum.html`). |
| `assets/fonts/PlusJakartaSans-latin.woff2` (baru) | Font Plus Jakarta Sans (lisensi SIL OFL, `OFL-LICENSE.txt`). **Belum dipakai**, lihat "Butuh keputusan". |
| `ui-dev/` (baru) | Pratinjau dengan data palsu dan alat uji. Tidak dimuat program asli. |
| `*.bak-ui` | Cadangan `ui-kit.js` dan `report-server.js` sebelum diubah. |

Berkas terlarang (24 berkas: `monitor.js`, `guard.js`, `onvif-*.js` backend, `updater.js`, `.bat`, `.vbs`, `.ps1`, dll.) dibuktikan tidak berubah dengan hash MD5 (semua cocok).

## Design tokens (ringkas)
Terang: latar #F3F6F8, kartu #FFFFFF, teks #13202A / #5B6B78, aksen teal #47B8C5, tombol/tautan #0F7C8A, status ok #1FA971, beku #F2A900, error #E5484D, offline #8A97A3. Gelap: sesuai brief. Alias lama `--card`, `--bd`, `--pri` tetap ada.
Tambahan kecil (keputusan visual, dicatat sesuai brief): warna teks khusus untuk pil status (`--ok-ink` dll.), pil sumber (`--src-ink`), dan titik status (`--dot-*`), karena warna status asli di atas latar muda tidak mencapai kontras minimum. Hasil cek kontras: `python3 ui-dev/kontras.py` (0 gagal, terang dan gelap).

## Komponen yang sudah ada (Tahap 2)
Kartu, pil status (ikon + kata + warna), pil Live berdenyut, tombol (utama, sekunder, bahaya, ikon bulat, kaca, memproses), segmented pill, sidebar desktop, bar tab bawah HP (dengan area aman iPhone), bar atas (judul, cari Ctrl+K, pil koneksi, lonceng, tema; berkaca saat digulir; di HP mengecil saat gulir turun), sheet HP / laci desktop (fokus terkunci, Esc, tombol Kembali browser, tarik ke bawah, animasi membesar dari kartu), toast dengan Urungkan, skeleton, cincin progres, meteran setengah lingkaran, titik per kamera (bentuk beda per status), grafik area SVG dengan tooltip, geser-untuk-konfirmasi, angka menghitung, tarik-untuk-memuat-ulang, pengambil data dengan mundur bertahap 5/10/20/30 dtk + data terakhir dari browser + banner "menampilkan data X lalu".
**Ditunda ke tahap yang memakainya:** VideoTile, Joystick PTZ (Tahap 4), Wizard, SwipeRow, ReorderDrag (Tahap 5), Mode Wall (Tahap 6). Galeri komponen terpisah belum dibuat; komponen yang ada bisa dilihat dan diuji langsung di Beranda pratinjau.

## Beranda: paritas fitur Laporan lama
- [x] Status kamera sekarang: saring Semua / Hanya bermasalah; hitungan dipantau, normal, error, beku/menyambung; kartu tiap kamera (nama, status, lantai, kode, lama); semua kamera terjangkau (12 pertama + "Tampilkan semua").
- [x] Ringkasan gangguan: rentang 24 jam / 7 hari / Semua; Per lantai / Per kamera; kartu lantai -> detail lantai -> riwayat per kamera; Kembali dan Tutup.
- [x] Riwayat gangguan: waktu, kamera, kejadian, kode; 10 awal, +20, sampai 200 terakhir.
- [x] Menu: Pembaruan (Cek pembaruan, Perbarui sekarang), Unduh PDF, Hentikan pemantauan (sekarang geser-untuk-konfirmasi), Lihat layar PC: semuanya di panel Lainnya.
- [x] Baris info lama (mode, lama berjalan, IP publik) pindah ke bawah judul.
- [x] Tampilan 3 tab di HP diganti satu halaman gulir.
- Konfirmasi "Perbarui sekarang" (dulu jendela confirm) sekarang: ketuk dua kali dalam 4 detik.

Baru: hero dengan cincin "N dari M normal", 4 kartu KPI yang memfilter halaman, strip "Kamera bermasalah sekarang", grafik gangguan per jam / per 6 jam, garis waktu 24 jam per lantai (bisa ditukar ke daftar), filter sumber Semua / Portal Bardi / ONVIF, cari kamera (Ctrl+K), lonceng gangguan baru, tema terang/gelap/otomatis.

## Data yang tidak tersedia (tidak dikarang)
- Selisih "dari 1 jam lalu" di kartu KPI: server tidak menyimpannya, jadi **tidak ditampilkan**.
- Grafik & garis waktu memakai `/api/events` (batas 1000 kejadian). Jika 1000 kejadian tidak menutup rentangnya, grafik diberi catatan "hanya mencakup sejak ...".
- Riwayat gangguan, ringkasan, grafik, garis waktu: hanya Portal Bardi (ditandai pil "Portal Bardi"). Kamera ONVIF ikut di hero, KPI, strip, daftar status, dan kartu lantai (ditandai "ONVIF").
- Gambar diam per kamera: tidak ada sumbernya.

## Permintaan jaringan
Interval sama dengan versi lama: status 2 dtk, ringkasan & riwayat 10 dtk. **Tambahan:** `/api/onvif/cameras` tiap 10 dtk (untuk kamera ONVIF di Beranda) dan `/api/events?limit=1000&hours=24` tiap 60 dtk (grafik & garis waktu; 7 hari hanya saat dipilih). Semua berhenti saat tab tersembunyi. Nol permintaan ke host luar.

## Hasil uji (pratinjau, Chromium)
- 62 uji interaksi lulus (desktop + HP): detail lantai, riwayat kamera, Kembali, Esc, tombol Kembali browser, Per kamera, 7 hari, filter KPI, Hanya bermasalah, +20 riwayat, garis waktu <-> daftar, isi Lainnya, geser setengah (tidak berhenti) / penuh (berhenti), Pembaruan, cari, tema diingat, offline (pil Terputus, banner, data tetap tampil), kembali Terhubung, tanpa error konsol.
- Lebar 390, 1280, 1920: tanpa gulir mendatar; target sentuh HP >= 40px (sebagian besar 48px).
- Skenario normal, masalah, kosong, banyak (142 kamera).
- Slow 4G tiruan: angka status terbaca 1,1-1,7 detik.
- "Kurangi gerakan": animasi mati. Ukuran halaman 104 KB (28 KB bila dikompres; server belum mengompres).
- Halaman lama (ONVIF, Kejadian, Klip, Multiview) dan PDF tetap jalan.
- **Belum diuji:** Safari iPhone asli, layar 3840 px, beban CPU PC pemantauan selama 10 menit.

## Butuh keputusan (Gerbang 1)
1. **Font dan logo.** Server memasang aturan keamanan (CSP) yang hanya mengizinkan berkas dari server sendiri, dan tidak ada rute untuk `assets/`. Agar font Plus Jakarta Sans dan logo Bardi tampil, perlu rute baru sekitar 6 baris di `report-server.js` (sebelum pemeriksaan login, supaya halaman login juga bisa memakainya), hanya untuk dua berkas tetap:
   ```js
   if (p === '/assets/fonts/PlusJakartaSans-latin.woff2' || p === '/assets/Logo.png') {
     const f = path.join(dir, p.slice(1));
     try { return send(res, 200, p.endsWith('.woff2') ? 'font/woff2' : 'image/jpeg', fs.readFileSync(f), { 'Cache-Control': 'public, max-age=604800' }); }
     catch (_) { return send(res, 404, 'text/plain', 'Tidak ditemukan'); }
   }
   ```
   (`Logo.png` sebenarnya berkas JPEG.) Selama belum disetujui: font sistem dan logo berupa tulisan BARDI.
2. **Gulir di HP.** Brief meminta Beranda HP satu halaman gulir; permintaan sebelumnya "semua halaman muat satu layar tanpa scroll". Sekarang mengikuti brief.
3. Gerbang 2 (Live): Multiview ikut didesain ulang atau tidak.

## Cara menjalankan pratinjau
```
cd bardi-monitor-ui
node ui-dev/srv.js masalah 3998      (skenario: normal | masalah | kosong | banyak)
```
Buka http://localhost:3998/ dengan password `uji123`. Pratinjau butuh `node_modules` (salin dari folder asli). Uji otomatis: `node ui-dev/shots.js 3998 masalah`, `node ui-dev/interact.js 3998 masalah`, `python3 ui-dev/kontras.py`.
Jangan jalankan pratinjau di port 3000 bersamaan dengan program asli.

## Cara kembali ke versi lama
Tampilan lama tidak hilang: folder asli `bardi-monitor` belum diubah. Jika nanti versi baru sudah dipasang dan ingin kembali: kembalikan `ui-kit.js` dan `report-server.js` dari `*.bak-ui` (atau `PULIHKAN-VERSI-LAMA.bat` bila dipasang lewat pembaruan GitHub), lalu buka ulang Bardi Monitor. `beranda-page.js` boleh dibiarkan.

## Revisi 1 (12 Nov 2026) dari masukan Aziz
- Desktop sekarang layar penuh (batas lebar 1880 px dihapus).
- Pil "Terhubung" di bar atas dihapus. Banner "menampilkan data X lalu" saat putus tetap ada.
- Sidebar desktop diperbesar (lebar 96 px, ikon 28 px, nama menu selalu tampil di bawah ikon).
- Ringkasan gangguan tidak lagi dibangun ulang tiap 10 detik bila isinya sama (penyebab kedip), dan animasi muncul hanya saat pertama.
- HP: empat kartu ringkasan (Normal, Bermasalah, Beku/Menyambung, Offline) tersusun 2 baris x 2, tidak perlu digeser ke samping.
- Multiview HP (potret) mengikuti gambar referensi: judul "Semua Kamera" (buka daftar kamera), menu titik tiga + tutup, nama kamera terpilih, grid 4/9/16 kanal, joystick arah (lepas = berhenti), zoom +/-, tombol layar penuh, bilah bawah (Suara, Foto, Kualitas SD/HD, Kamera ini layar penuh, Atur). Desktop dan HP mendatar tidak berubah. `onvif-multiview.js.bak-ui` = cadangan.

## Gerbang 1: keputusan Aziz (12 Nov)
- Rute font dan logo disetujui dan sudah dipasang di `report-server.js` (2 berkas tetap, sebelum cek login). Font Plus Jakarta Sans dan logo Bardi tampil. Uji: font 200, logo 200, `/assets/../config.json` dialihkan ke login, halaman lain tetap butuh login.
- Bilah bawah Multiview HP: Suara, Foto, Kualitas SD/HD, Kamera ini layar penuh, Atur (mikrofon dan rekam tidak dibuat).

## Revisi 2 (12 Nov)
- Teks "Belum ada kamera..." di Multiview dihapus (desktop dan HP).
- Beranda HP: tidak ada lagi geser ke samping. "Kamera bermasalah sekarang" jadi daftar ke bawah (4 teratas, sisanya ada di Status kamera), garis waktu muat lebar layar.
- Multiview desktop memakai tampilan HP yang sama (keputusan Aziz). HP mendatar: grid di kiri, kontrol di kanan. Susunan halaman diperbaiki (kontrol berada di dalam area utama).

## Tahap 5: Kejadian, Kamera, Papan klip

File berubah: `ui-kit.js` (ikon + gaya formulir), `papan-klip.js`, `onvif-kejadian.js`, `onvif-page.js` (cadangan `.bak-ui` ada). Server/endpoint tidak diubah.

Daftar fitur yang dipertahankan:
- Papan klip: cari, salin dengan satu ketukan, tempel otomatis tersimpan, tulis catatan + Simpan, hapus dengan Urungkan (dihapus sungguhan setelah ~5 detik), geser kiri = hapus, Selengkapnya, muat bertahap.
- Kejadian: daftar per hari, filter kamera, pemutar, garis waktu dengan penanda merah, tombol Titik putus, Unduh, ukuran berkas, status perekam, pembaruan tiap 10 detik.
- Kamera: kartu per lantai, status, codec/resolusi/fps, bitrate, Lihat (live Real-time/Stabil, kualitas, suara, diagnosa), Tes, Ubah, Hapus, Tambah kamera (wizard 4 langkah: pindai jaringan / cari otomatis / IP manual + cek port), seret kartu ke lantai lain, ringkasan beban + perkiraan 7 hari.

Catatan jujur:
- Ukuran berkas kejadian tidak ada di data server; diambil lewat permintaan Range ke berkas.
- Daftar Status perekam belum diuji dengan data nyata (di sandbox kosong).
- Pindai jaringan, live view kamera asli, dan geser di iPhone belum bisa diuji di sandbox.
- "Urungkan" dibuat sebagai hapus tertunda (tanpa endpoint baru).
- Rollback: kembalikan `*.js.bak-ui` ke nama aslinya, atau jalankan program dari folder `bardi-monitor` asli.

## Revisi 3 (setelah Tahap 5)
- Multiview HP: "Kamera ini" (layar penuh) sekarang jalan di iPhone: bila browser tidak punya layar penuh asli, kotak kamera memenuhi layar sendiri (tombol silang untuk keluar, Esc di PC).
- Multiview desktop: kontrol PTZ melayang di atas video (kanan bawah), tidak lagi memakan tinggi layar.
- Suara: semua kamera yang tampil suaranya hidup; tombol "Suara" di HP = hidup/mati untuk semua (diingat). Tombol suara per kotak (desktop) tetap per kamera. Browser menahan suara sampai sentuhan pertama, setelah itu otomatis menyala.
- Tambah kamera, langkah 4: tombol "Lihat kamera dulu" (kamera disimpan dulu, lalu gambar kecil/hemat dibuka; nama bisa diisi sesudahnya). Tanpa endpoint baru.
- Papan klip: tempel di kolom tulis tidak lagi dicegat; ada tombol "Tempel"; penyalinan di iPhone dibuat lebih tahan.
- Pemberitahuan (toast) maksimal 3; yang paling atas ditutup dengan animasi saat ada yang baru.
Cadangan sebelum revisi: `*.bak-r3`. Belum diuji di iPhone asli dan dengan kamera asli.

## Revisi 4: header kustom halaman Bardi (izin Aziz untuk monitor.js)
- `monitor.js` ditambah satu blok kecil (cadangan: `monitor.js.bak-kustom`) yang memuat `kustom-header.js` dan `kustom.css`. Bila gagal, hanya dicatat; pemantauan tetap jalan.
- `kustom-header.js`: mengganti tulisan "BARDI Smart home" menjadi "Pondok Pesantren Daarul Rahman Jakarta" dan logo Bardi di header menjadi `assets/pondok-logo.png`. Mencari berdasarkan teks, bukan nama class, jadi tahan terhadap perubahan Bardi. Pengaturan di bagian atas file.
- `kustom.css`: kolom CSS bebas (seperti vMix) untuk warna, sembunyikan bagian, dll.
- Tiap penggantian dicatat di monitor.log dengan awalan "[kustom]" untuk mempermudah penyesuaian.
- Belum diuji di halaman Bardi asli (hanya halaman tiruan). Matikan: `aktif: false` di kustom-header.js, atau pulihkan monitor.js.bak-kustom.
- Papan klip: kolom "Salin manual" (tekan lama lalu Salin) sebagai cadangan di iPhone.
- Revisi 4b: logo header sekarang dicari hanya di baris yang sama di kiri tulisan judul (gambar lain seperti foto "My Home" tidak disentuh).

## Tahap 1 Rekaman 24 jam: mesin perekam (belum ada halaman)
- File baru `rekam-24jam.js`. `report-server.js` hanya ditambah 3 baris untuk menyalakannya (cadangan: `report-server.js.bak-rekam24`). Tanpa endpoint baru, tanpa halaman baru.
- Semua kamera ONVIF direkam 24 jam (video disalin apa adanya, tanpa suara), potongan sekitar 10 menit: `<hardisk>\BardiRekaman\penuh\<Nama kamera (id8)>\<tanggal>\<jam-menit-detik>.ts`. Catatan kamera putus/tersambung, hardisk hilang, dll: `...\penuh\_log\<tanggal>.jsonl`.
- Pengaturan di `rekam-pengaturan.json` (dibuat sendiri; data lokal, tidak ikut GitHub): `aktif`, `penuh.serial` (nomor seri volume hardisk), `hari` 20, `batasTB` 4.1, `sisaMinimumGB` 50, `persenCadangan` 80, `segmenDetik` 600. Bila hardisk belum dipilih, program memilih hardisk non-sistem terbesar lalu mengingat nomor serinya.
- Drive sistem (C:) tidak pernah dipakai. Hardisk utama hilang -> pindah ke hardisk lain sebagai cadangan (batas 80% kapasitasnya); utama kembali -> pindah lagi; tanpa hardisk -> tidak merekam (status merah).
- Rotasi tiap 2 menit: hapus potongan paling lama (urut waktu lintas kamera) bila umur > 20 hari, pemakaian > 4,1 TB, atau sisa ruang < 50 GB. Bila sisa ruang tetap < 50 GB dan tidak ada yang bisa dihapus, rekaman berhenti (status merah) sampai ada ruang.
- Diuji di sandbox dengan video palsu dan hardisk palsu: merekam, nama folder/berkas, rotasi, kamera putus/pulih (catatan kejadian), hardisk utama hilang/kembali, hanya drive sistem, sisa ruang menipis/pulih. LULUS semua.
- BELUM diuji: daftar hardisk Windows (PowerShell, nomor seri volume), kamera asli, hardisk USB asli, beban 28 kamera sekaligus. Perekam ini membuka SATU sambungan RTSP tambahan per kamera (selain perekam kejadian dan tampilan live).
- Mematikan: `"aktif": false` di rekam-pengaturan.json, lalu mulai ulang program. Atau pulihkan `report-server.js.bak-rekam24`.

## Perekam kejadian diganti rekaman 24 jam (permintaan Aziz)
- `report-server.js` tidak lagi memuat/menjalankan `onvif-incident.js` (file itu TIDAK dihapus, hanya tidak dipakai; bisa dihapus belakangan). Cadangan sebelum perubahan: `report-server.js.bak-rekam24`.
- Tidak ada klip 2 menit lagi. Kamera putus/tersambung dicatat di rekaman 24 jam sebagai kejadian (`_log\<tanggal>.jsonl`) = dasar tanda merah di garis waktu nanti.
- Penghubung kecil di `report-server.js` menjaga halaman lama tetap jalan: halaman Kamera (Mbps per kamera) dan Kejadian memakai status/Mbps dari perekam 24 jam; daftar Kejadian berisi kamera putus/tersambung sejak program dinyalakan (tanpa klip/berkas).
- Folder `rekaman-kejadian` lama dan isinya tidak disentuh. Sambungan video tambahan per kamera berkurang satu (perekam kejadian tidak jalan lagi).
- Kamera H.265 direkam apa adanya; memutarnya di browser nanti perlu pengolahan saat diputar (belum dibuat).

## Halaman Rekaman (menggantikan Kejadian)
- Baru: `rekaman-page.js` (halaman /rekaman: Putar ulang + Status perekam), `rekaman-api.js` (/api/rekaman/ringkasan, /api/rekaman/hari, /rekaman/f/... potongan MP4 dengan Range).
- `rekam-24jam.js`: tambah `segmentPath`, `hariAda`.
- `report-server.js`: /rekaman, /kejadian dialihkan ke /rekaman. `ui-kit.js` & `onvif-multiview.js`: menu jadi "Rekaman".
- Putar ulang memakai potongan 10 menit utuh (disalin ke MP4 sementara, H.265 diubah ke H.264). Folder sementara dibersihkan otomatis.
