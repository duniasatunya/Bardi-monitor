// Mengembalikan versi sebelum pembaruan terakhir (dari folder backup/). Berdiri sendiri, tidak memakai file lain
// supaya tetap jalan walaupun versi baru rusak.  Jalankan: node restore.js   (atau PULIHKAN-VERSI-LAMA.bat)
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const bdir = path.join(dir, 'backup');
let names = [];
try { names = fs.readdirSync(bdir).filter((n) => fs.existsSync(path.join(bdir, n, 'manifest.json'))).sort(); } catch (_) {}
if (!names.length) { console.log('Tidak ada cadangan di folder backup. Tidak ada yang dikembalikan.'); process.exit(0); }
const name = names[names.length - 1];
const bk = path.join(bdir, name);
const m = JSON.parse(fs.readFileSync(path.join(bk, 'manifest.json'), 'utf8'));
let n = 0;
for (const rel of m.replaced || []) {
  if (!rel || path.isAbsolute(rel) || rel.split('/').includes('..')) continue;
  const dst = path.join(dir, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(bk, 'files', rel), dst); n++;
}
for (const rel of m.added || []) {
  if (!rel || path.isAbsolute(rel) || rel.split('/').includes('..')) continue;
  try { fs.unlinkSync(path.join(dir, rel)); n++; } catch (_) {}
}
try { fs.unlinkSync(path.join(dir, 'version.json')); } catch (_) {}
console.log(`Selesai: ${n} file dikembalikan dari cadangan ${name}.`);
console.log('Tutup lalu buka lagi Bardi Monitor dari shortcut di Desktop.');
