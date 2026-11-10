// Memasang token GitHub (read-only) supaya tombol "Perbarui" bisa membaca repo PRIVAT.
// Jalankan: node set-update-token.js   (atau klik ganda PASANG-TOKEN-UPDATE.bat)
// Token disimpan di update.json di folder ini (tidak ikut diunggah ke GitHub) dan tidak ditampilkan di layar.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { DEFAULT_REPO } = require('./updater');

const file = path.join(__dirname, 'update.json');

function ask(prompt, hidden) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let buf = '';
    if (hidden && stdin.isTTY) stdin.setRawMode(true);
    stdin.resume(); stdin.setEncoding('utf8');
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          if (hidden && stdin.isTTY) stdin.setRawMode(false);
          stdin.removeListener('data', onData); stdin.pause();
          process.stdout.write('\n'); return resolve(buf);
        }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f' || c === '\b') { buf = buf.slice(0, -1); continue; }
        buf += c;
        if (!hidden) process.stdout.write(c);
      }
    };
    stdin.on('data', onData);
  });
}

function checkToken(repo, token) {
  return new Promise((resolve) => {
    const req = https.get(`https://api.github.com/repos/${repo}`, {
      headers: { 'User-Agent': 'bardi-monitor-updater', Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token }, timeout: 15000,
    }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on('timeout', () => req.destroy()); req.on('error', () => resolve(0));
  });
}

(async () => {
  let old = {};
  try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  const repo = /^[\w.-]+\/[\w.-]+$/.test(old.repo || '') ? old.repo : DEFAULT_REPO;
  console.log('Repo pembaruan: ' + repo);
  console.log('Tempel token GitHub (read-only) lalu tekan Enter. Ketikan tidak akan terlihat.');
  const token = (await ask('Token: ', true)).trim();
  if (!token) { console.log('Kosong, tidak ada yang diubah.'); return; }
  console.log('Memeriksa token ke GitHub...');
  const code = await checkToken(repo, token);
  if (code === 200) console.log('Token OK: repo bisa dibaca.');
  else if (code === 401) { console.log('GAGAL: token ditolak (salah atau kedaluwarsa). Tidak disimpan.'); return; }
  else if (code === 404) { console.log('GAGAL: repo tidak terlihat oleh token ini. Pastikan token diberi akses ke repo ' + repo + '. Tidak disimpan.'); return; }
  else { console.log('Tidak bisa memastikan token (kode ' + code + ', mungkin internet bermasalah). Tidak disimpan. Coba lagi.'); return; }
  fs.writeFileSync(file, JSON.stringify({ repo, token }, null, 2));
  console.log('Tersimpan di update.json. Tombol "Perbarui" di halaman laporan sekarang bisa memakainya.');
})();
