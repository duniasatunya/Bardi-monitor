// Mengatur password halaman laporan. Jalankan: node set-password.js
// Password disimpan sebagai hash (scrypt) di config.json, bukan teks biasa.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('./report-server');

const file = path.join(__dirname, 'config.json');

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
        if (c === '\u0003') process.exit(1); // Ctrl+C
        if (c === '\u007f' || c === '\b') { buf = buf.slice(0, -1); continue; }
        buf += c;
        if (!hidden) process.stdout.write(c);
      }
    };
    stdin.on('data', onData);
  });
}

(async () => {
  let old = {};
  try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  console.log('Atur password untuk halaman laporan (minimal 8 karakter). Ketikan tidak akan terlihat.');
  for (let tries = 0; tries < 3; tries++) {
    const a = await ask('Password baru   : ', true);
    if (a.length < 8) { console.log('Terlalu pendek, minimal 8 karakter.'); continue; }
    const b = await ask('Ulangi password : ', true);
    if (a !== b) { console.log('Dua isian tidak sama, coba lagi.'); continue; }
    const salt = crypto.randomBytes(16).toString('hex');
    const cfg = {
      port: old.port || 3000,
      salt,
      hash: hashPassword(a, salt),
      secret: old.secret || crypto.randomBytes(32).toString('hex'),
    };
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
    console.log('Password tersimpan.');
    process.exit(0);
  }
  console.log('Gagal mengatur password. Jalankan lagi: node set-password.js');
  process.exit(1);
})();
