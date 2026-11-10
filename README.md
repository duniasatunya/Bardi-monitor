# Bardi Monitor v1

Memulihkan tile kamera di https://ipc.bardi.co.id secara otomatis (Playwright).

## Pasang (sekali, di PC ruang monitoring)

1. Pasang Node.js (LTS) dari nodejs.org.
2. Buka terminal di folder ini, jalankan:
   `npm install` lalu `npx playwright install chromium`

## Login (sekali)

`npm run login`  
Scan QR di jendela yang terbuka, pastikan halaman kamera tampil, lalu **tutup jendelanya**. Sesi tersimpan di folder `profile/`.

## Jalankan

1. Uji dulu tanpa klik: `npm run dry` (hanya mencatat di `monitor.log`).
2. Jalan sungguhan: `npm start` (jendela terbuka maksimal)
3. Layar penuh tanpa tab/address bar: `npm run full` (sama seperti F11; daftar kamera di kiri tetap tampil)

Susun dulu grid kamera yang mau dipantau (mis. 16 kamera per layar) di jendela yang dibuka script. Script hanya memantau tile yang sedang tampil.

## Logika

| Kondisi tile | Tindakan |
|---|---|
| ERROR ("Failed to connect") | klik Retry |
| PLAY tapi `currentTime` tidak naik 60 dtk (beku) | klik kanan, Close, lalu klik nama kamera di "All Devices" (tile beku tidak punya tombol Retry) |
| CONNECTING lebih dari 45 dtk | klik kanan, Close, lalu klik nama kamera di "All Devices" |

- Jeda antar-percobaan = 60 dtk x nomor percobaan. Maksimal 5 percobaan, lalu kamera ditandai `OFFLINE` di log dan dicoba lagi tiap 10 menit.
- Kamera dianggap pulih setelah PLAY normal 60 dtk, lalu hitungan percobaan di-reset.
- Tidak ada tile selama 3 menit: log `ALERT` (kemungkinan sesi QR habis). Script tidak mencoba login sendiri.
- Semua angka ada di objek `CFG` paling atas `monitor.js`.

## Yang sudah dan belum teruji

- Terbukti di halaman asli: struktur tile, tombol Retry, menu klik kanan Close, dan membuka ulang kamera lewat satu klik di "All Devices".
- Diuji pada halaman tiruan: pembacaan status tile, pemilihan Retry (bukan "Copy Error Code"), dan pemilihan "Close" (bukan "Close All").
- **Belum teruji** di Playwright sungguhan pada halaman Bardi: seluruh alur end-to-end, lama bertahan sesi QR, dan apakah kamera kembali ke slot tile yang sama setelah dibuka ulang.
- Selector memakai potongan nama class. Kalau Bardi update situsnya dan script berhenti menemukan elemen, cek bagian `SEL` di `monitor.js`.

## Catatan / log

Semua file ada di folder yang sama dengan script (`C:\Users\azize\Documents\bardi-monitor`):

- `kamera-bermasalah.csv`: catatan kamera yang gagal tersambung (buka dengan Excel). Kolom: waktu, kamera, kejadian, kode_error, percobaan, durasi_detik, hasil, mode.
  - `ERROR`: kamera menampilkan "Failed to connect" (kode_error berisi angkanya, mis. 11 atau 15).
  - `RETRY` / `REOPEN`: script mencoba memulihkan, kolom `hasil` berisi "klik terkirim" atau "GAGAL: ...".
  - `PULIH`: kamera tersambung kembali (durasi_detik = berapa lama bermasalah).
  - `OFFLINE`: kamera gagal berkali-kali dan ditandai OFFLINE.
  - `mode`: `LIVE` (klik sungguhan) atau `DRY` (uji tanpa klik).
- `monitor.log`: log teknis lengkap (semua perubahan status).

Kalau `kamera-bermasalah.csv` sedang terbuka di Excel, Windows mengunci file itu. Script lalu menulis ke `kamera-bermasalah.cadangan.csv` supaya tidak ada data hilang. Lebih aman: **salin dulu** file CSV-nya, lalu buka salinannya.

## Halaman laporan (tahap 2)

Alamat dari jaringan yang sama: `http://<IP-PC>:3000/displaycostum.html` (contoh: `http://192.168.18.43:3000/displaycostum.html`).

- Wajib login dengan password yang diatur saat `INSTALL.bat`. Ganti password: klik ganda `GANTI-PASSWORD.bat`.
- Isi halaman: status kamera sekarang, ringkasan gangguan per lantai dan per kamera (24 jam / 7 hari / semua), riwayat gangguan lengkap dengan kode error, dan tombol **Unduh PDF**.
- Catatan uji (mode `DRY`) tidak ikut dihitung di laporan.
- 5 kali salah password dari satu alamat = diblokir 15 menit.
- **Lantai:** pemetaan kamera ke lantai ada di `kamera-lantai.json` (buka dengan Notepad). Format: `"Nama kamera persis": "Lantai 3"`. Kamera yang belum diisi muncul sebagai "Belum diisi". Saat ini baru Lantai 2 yang terisi (dari daftar kamera di portal), sisanya perlu dilengkapi.

### Lihat layar PC (hanya melihat)

Tombol **Lihat layar PC** di halaman laporan membuka siaran layar monitor PC ini (seluruh layar Windows, bukan hanya jendela Bardi). ffmpeg menangkap layar 15 gambar per detik (kursor mouse sengaja tidak ditampilkan karena menyebabkan kursor di PC berkedip), dan browser memutarnya dengan jeda sekitar 5-10 detik di belakang aslinya supaya lancar. Potongan video disimpan sementara di folder temp Windows (hanya beberapa segmen terakhir, dihapus otomatis) dan siaran mati sendiri sekitar 25 detik setelah tab ditutup. Hanya melihat: tidak bisa klik atau mengetik. Kalau Windows terkunci (Win+L) atau layar tidur, gambar hitam. Membuka halaman ini tercatat di `monitor.log`.

- ffmpeg dipasang oleh `INSTALL.bat` ke folder `ffmpeg\` (kalau gagal, jalankan `INSTALL.bat` lagi).
- Kalau ffmpeg bermasalah, halaman menyediakan tautan **Pakai mode foto** (foto layar berulang, `/layar-foto`).
- Kode: `live-stream.js` (siaran), `screen-capture.js` (mode foto), `vendor/hls.min.js` (pemutar, lisensi Apache-2.0).

### Akses dari internet (port forwarding)

1. Di router, teruskan **TCP port 3000** ke IP PC monitoring. Beri PC itu IP tetap (DHCP reservation) supaya aturannya tidak putus.
2. **Cek CGNAT:** lihat IP WAN di halaman admin router, lalu bandingkan dengan "IP publik terdeteksi" di bagian atas halaman laporan. Kalau **berbeda**, ISP memakai CGNAT dan port forwarding tidak akan berfungsi dari luar.
3. Buka dari luar: `http://<IP-publik>:3000/displaycostum.html`.

Peringatan: alamat `http://` tidak dienkripsi, jadi password bisa terlihat oleh pihak yang menyadap jaringan. Pakai password panjang dan unik. Enkripsi (HTTPS) butuh domain, dan belum dibuat.

## Pembaruan dari GitHub (tombol "Pembaruan")

Di halaman laporan ada tombol **Pembaruan**: cek versi terbaru di GitHub, lalu **Perbarui sekarang** mengunduh file kode terbaru, mencadangkan yang lama ke folder `backup/`, menggantinya, dan memulai ulang Bardi Monitor sendiri (sekitar 15 detik; login Bardi tetap tersimpan).

Pasang sekali (repo privat butuh token):
1. Di GitHub: Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token. Pilih **Only select repositories** (hanya repo ini), izin **Contents: Read-only**, dan masa berlaku (mis. 1 tahun).
2. Di PC monitoring, klik ganda **PASANG-TOKEN-UPDATE.bat**, tempel token (tidak terlihat di layar). Token disimpan di `update.json` (tidak ikut diunggah ke GitHub).

Aman: data lokal tidak pernah ditimpa (`config.json`, `profile/`, `kamera-lantai.json`, CSV, log, `ffmpeg/`, `node_modules/`, `update.json`). Pembaruan ditolak kalau ada file kode yang rusak sintaksnya atau `report-server.js` tidak bisa dimuat. Kalau versi baru bermasalah setelah terpasang: tutup Bardi Monitor, klik ganda **PULIHKAN-VERSI-LAMA.bat**, lalu buka lagi. Cadangan disimpan 5 terakhir.

Catatan: file yang dihapus dari repo tidak ikut terhapus di PC. Pembaruan ini hanya untuk versi Windows di folder ini; versi Mac belum punya.
