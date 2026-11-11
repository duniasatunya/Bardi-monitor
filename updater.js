// Pembaruan dari GitHub untuk Bardi Monitor (hanya modul bawaan Node.js; butuh perintah `tar`, bawaan Windows 10+ dan macOS).
//
// Alur "Perbarui":
//   1. tanya GitHub commit terbaru di cabang utama
//   2. unduh isi repo (tarball) ke folder sementara, ekstrak
//   3. periksa: file wajib ada, semua .js lolos `node --check`, report-server.js bisa dimuat
//   4. cadangkan file lama ke backup/<waktu>/, lalu salin file baru
//   5. kalau package.json berubah: npm install (gagal = kembalikan file lama)
//   6. catat versi di version.json; pemanggil lalu memulai ulang program
//
// Data dan rahasia lokal TIDAK PERNAH ditimpa (lihat PROTECTED).
// Token GitHub (repo privat) dibaca dari update.json; token tidak pernah dikirim ke halaman web atau ditulis di log.
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_REPO = 'duniasatunya/Bardi-monitor';
const MAX_DOWNLOAD = 60 * 1024 * 1024;   // batas unduhan 60 MB
const KEEP_BACKUPS = 5;

const PROTECTED_TOP = new Set([
  'config.json', 'update.json', 'version.json', 'profile', 'node_modules', 'ffmpeg', 'runtime', 'backup',
  'kamera-lantai.json', 'onvif-kamera.json', 'onvif.key', 'clipboard.json', '.git', 'Bardi Monitor.app',
]);
function isProtected(rel) {
  const r = rel.replace(/\\/g, '/');
  const top = r.split('/')[0];
  if (PROTECTED_TOP.has(top)) return true;
  if (/\.(log|csv)$/i.test(r)) return true;
  if (r === 'assets/logo.png' || r === 'assets/bardi.ico') return true;
  return false;
}

const pad = (n) => String(n).padStart(2, '0');
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };

function createUpdater({ dir, log, apiBase }) {
  const base = (apiBase || 'https://api.github.com').replace(/\/$/, '');
  const testMode = !!apiBase; // apiBase hanya dipakai untuk pengujian (server palsu di 127.0.0.1)
  const settingsFile = path.join(dir, 'update.json');
  const versionFile = path.join(dir, 'version.json');
  const S = { state: 'idle', message: '', latest: null, checkedAt: 0, error: '' };
  let busy = false;

  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return null; } };
  const settings = () => {
    const s = readJson(settingsFile) || {};
    return { repo: /^[\w.-]+\/[\w.-]+$/.test(s.repo || '') ? s.repo : DEFAULT_REPO, token: typeof s.token === 'string' ? s.token.trim() : '', branch: s.branch || '' };
  };
  const current = () => readJson(versionFile);

  // ---------- HTTP ke GitHub ----------
  const hostOk = (h) => testMode ? /^(127\.0\.0\.1|localhost)$/.test(h) : (h === 'api.github.com' || h === 'codeload.github.com' || h.endsWith('.githubusercontent.com'));
  function get(url, { token, accept, toFile, redirects = 4 } = {}) {
    return new Promise((resolve, reject) => {
      let u; try { u = new URL(url); } catch (e) { return reject(new Error('Alamat tidak valid')); }
      if (!(u.protocol === 'https:' || (testMode && u.protocol === 'http:')) || !hostOk(u.hostname)) return reject(new Error('Alamat unduhan ditolak (bukan GitHub)'));
      const headers = { 'User-Agent': 'bardi-monitor-updater', Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      if (token) headers.Authorization = 'Bearer ' + token; // hanya dikirim ke host yang diminta langsung, tidak ke tujuan redirect
      const lib = u.protocol === 'http:' ? http : https;
      const req = lib.get(u, { headers, timeout: 20000 }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (redirects <= 0) return reject(new Error('Terlalu banyak pengalihan'));
          let next; try { next = new URL(res.headers.location, u).toString(); } catch (e) { return reject(new Error('Pengalihan tidak valid')); }
          return get(next, { accept, toFile, redirects: redirects - 1 }).then(resolve, reject); // tanpa token
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let b = ''; res.on('data', (d) => { if (b.length < 2000) b += d; });
          return res.on('end', () => reject(httpError(res.statusCode, b, res.headers)));
        }
        if (toFile) {
          const out = fs.createWriteStream(toFile); let n = 0;
          res.on('data', (d) => { n += d.length; if (n > MAX_DOWNLOAD) { req.destroy(new Error('Unduhan terlalu besar')); } });
          res.pipe(out);
          out.on('finish', () => resolve({ bytes: n }));
          out.on('error', reject); res.on('error', reject);
        } else {
          let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; if (b.length > 2e6) req.destroy(new Error('Balasan terlalu besar')); });
          res.on('end', () => { try { resolve(JSON.parse(b)); } catch (_) { reject(new Error('Balasan GitHub tidak bisa dibaca')); } });
        }
      });
      req.on('timeout', () => req.destroy(new Error('GitHub tidak merespons (timeout)')));
      req.on('error', reject);
    });
  }
  function httpError(code, body, headers) {
    if (code === 401) return new Error('Token GitHub ditolak atau sudah kedaluwarsa. Pasang token baru: jalankan PASANG-TOKEN-UPDATE.bat');
    if (code === 403 && /rate limit/i.test(body)) return new Error('Batas permintaan GitHub tercapai, coba lagi beberapa menit lagi');
    if (code === 403) return new Error('Akses ke repo ditolak (token tidak punya izin membaca repo ini)');
    if (code === 404) return new Error('Repo tidak ditemukan, atau repo privat dan token belum dipasang/tidak punya akses. Jalankan PASANG-TOKEN-UPDATE.bat');
    return new Error('GitHub membalas kode ' + code);
  }

  async function latestCommit() {
    const { repo, token, branch } = settings();
    let br = branch;
    if (!br) { const info = await get(`${base}/repos/${repo}`, { token }); br = info.default_branch || 'main'; }
    const c = await get(`${base}/repos/${repo}/commits/${encodeURIComponent(br)}`, { token });
    if (!c || !/^[0-9a-f]{40}$/.test(c.sha || '')) throw new Error('Balasan GitHub tidak lengkap');
    return { sha: c.sha, branch: br, message: String((c.commit && c.commit.message) || '').split('\n')[0].slice(0, 200), date: (c.commit && c.commit.committer && c.commit.committer.date) || '' };
  }

  // ---------- status & cek ----------
  function status() {
    const cur = current();
    const { repo, token } = settings();
    return {
      repo, hasToken: !!token, state: S.state, message: S.message, error: S.error,
      current: cur ? { sha: cur.sha, short: String(cur.sha).slice(0, 7), message: cur.message || '', date: cur.date || '', updatedAt: cur.updatedAt || '' } : null,
      latest: S.latest ? { sha: S.latest.sha, short: S.latest.sha.slice(0, 7), message: S.latest.message, date: S.latest.date } : null,
      upToDate: !!(cur && S.latest && cur.sha === S.latest.sha),
      checkedAt: S.checkedAt,
    };
  }
  async function check() {
    if (busy) return status();
    busy = true; S.state = 'checking'; S.error = ''; S.message = 'Memeriksa GitHub...';
    try {
      S.latest = await latestCommit(); S.checkedAt = Date.now(); S.state = 'idle'; S.message = '';
    } catch (e) { S.state = 'error'; S.error = e.message; S.message = ''; log('WARN', `Cek pembaruan gagal: ${e.message}`); }
    finally { busy = false; }
    return status();
  }

  // ---------- berkas ----------
  function walk(root) {
    const out = [];
    (function rec(d) {
      for (const name of fs.readdirSync(d)) {
        const full = path.join(d, name); const st = fs.lstatSync(full);
        if (st.isSymbolicLink()) continue;
        if (st.isDirectory()) rec(full); else if (st.isFile()) out.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    })(root);
    return out;
  }
  const safeRel = (rel) => rel && !path.isAbsolute(rel) && !rel.split('/').some((p) => p === '..' || p === '');
  const rmrf = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {} };

  function pruneBackups() {
    const bdir = path.join(dir, 'backup');
    try {
      const all = fs.readdirSync(bdir).filter((n) => fs.statSync(path.join(bdir, n)).isDirectory()).sort();
      for (const n of all.slice(0, Math.max(0, all.length - KEEP_BACKUPS))) rmrf(path.join(bdir, n));
    } catch (_) {}
  }
  function restoreFrom(backupDir, manifest) {
    for (const rel of manifest.replaced) {
      try { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.copyFileSync(path.join(backupDir, 'files', rel), path.join(dir, rel)); } catch (_) {}
    }
    for (const rel of manifest.added) { try { fs.unlinkSync(path.join(dir, rel)); } catch (_) {} }
  }

  // ---------- perbarui ----------
  // Mengembalikan {ok, from, to, restart}. Tidak memulai ulang sendiri.
  async function apply(who) {
    if (busy) throw new Error('Pembaruan lain sedang berjalan');
    busy = true; S.error = '';
    const tmp = path.join(os.tmpdir(), 'bardi-update-' + Date.now());
    let backupDir = null, manifest = null;
    try {
      S.state = 'downloading'; S.message = 'Memeriksa versi terbaru...';
      const { repo, token } = settings();
      const latest = await latestCommit(); S.latest = latest; S.checkedAt = Date.now();
      const cur = current();
      S.message = 'Mengunduh ' + latest.sha.slice(0, 7) + '...';
      fs.mkdirSync(tmp, { recursive: true });
      const tgz = path.join(tmp, 'src.tar.gz'); const ex = path.join(tmp, 'src'); fs.mkdirSync(ex);
      await get(`${base}/repos/${repo}/tarball/${latest.sha}`, { token, accept: 'application/vnd.github+json', toFile: tgz });

      S.state = 'installing'; S.message = 'Memeriksa isi pembaruan...';
      const t = spawnSync('tar', ['-xzf', tgz, '-C', ex, '--strip-components=1'], { windowsHide: true, timeout: 120000 });
      if (t.error || t.status !== 0) throw new Error('Gagal mengekstrak unduhan (perintah tar): ' + ((t.error && t.error.message) || String(t.stderr || '').slice(0, 200)));
      const files = walk(ex).filter(safeRel);
      for (const must of ['monitor.js', 'report-server.js', 'package.json', 'updater.js']) if (!files.includes(must)) throw new Error(`Pembaruan ditolak: file wajib "${must}" tidak ada di repo`);
      for (const f of files.filter((x) => x.endsWith('.js') && !x.startsWith('vendor/'))) {
        const r = spawnSync(process.execPath, ['--check', path.join(ex, f)], { windowsHide: true, timeout: 30000 });
        if (r.status !== 0) throw new Error(`Pembaruan ditolak: ${f} berisi kesalahan sintaks`);
      }
      const smoke = spawnSync(process.execPath, ['-e', "require('./report-server');require('./updater')"], { cwd: ex, windowsHide: true, timeout: 30000 });
      if (smoke.status !== 0) throw new Error('Pembaruan ditolak: report-server.js tidak bisa dimuat (' + String(smoke.stderr || '').split('\n').find((l) => l.trim()) + ')');

      const toCopy = files.filter((f) => !isProtected(f));
      const replaced = [], added = [];
      for (const f of toCopy) {
        const dst = path.join(dir, f);
        if (fs.existsSync(dst)) { if (!fs.readFileSync(dst).equals(fs.readFileSync(path.join(ex, f)))) replaced.push(f); } else added.push(f);
      }
      const changed = replaced.concat(added);
      if (!changed.length) {
        // isi sama persis dengan yang terpasang; cukup catat versinya
        fs.writeFileSync(versionFile, JSON.stringify({ sha: latest.sha, message: latest.message, date: latest.date, updatedAt: new Date().toISOString() }, null, 2));
        S.state = 'idle'; S.message = 'Sudah terbaru.';
        log('INFO', `Pembaruan: isi file sudah sama dengan ${latest.sha.slice(0, 7)}, tidak ada yang diganti`);
        return { ok: true, from: cur && cur.sha, to: latest.sha, restart: false, changed: 0 };
      }

      S.message = 'Mencadangkan versi lama...';
      backupDir = path.join(dir, 'backup', stamp() + '-' + String((cur && cur.sha) || 'awal').slice(0, 7));
      for (const f of replaced) { const d = path.join(backupDir, 'files', f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(path.join(dir, f), d); }
      manifest = { replaced, added, from: (cur && cur.sha) || null, to: latest.sha, at: new Date().toISOString() };
      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      S.message = 'Mengganti file...';
      const oldPkg = (() => { try { return fs.readFileSync(path.join(dir, 'package.json'), 'utf8'); } catch (_) { return ''; } })();
      for (const f of changed) { const dst = path.join(dir, f); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(ex, f), dst); }

      if (changed.includes('package.json') && oldPkg !== fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) {
        S.message = 'Memasang paket baru (npm install)...';
        const n = spawnSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: dir, shell: true, windowsHide: true, timeout: 5 * 60 * 1000 });
        if (n.status !== 0) { restoreFrom(backupDir, manifest); throw new Error('npm install gagal, versi lama dikembalikan'); }
      }

      fs.writeFileSync(versionFile, JSON.stringify({ sha: latest.sha, message: latest.message, date: latest.date, updatedAt: new Date().toISOString() }, null, 2));
      pruneBackups();
      log('UPDATE', `Diperbarui ${cur && cur.sha ? String(cur.sha).slice(0, 7) : '(awal)'} -> ${latest.sha.slice(0, 7)} (${changed.length} file${added.length ? ', ' + added.length + ' baru' : ''}) diminta dari ${who || '?'}`);
      S.state = 'restarting'; S.message = 'Berhasil. Memulai ulang...';
      return { ok: true, from: cur && cur.sha, to: latest.sha, restart: true, changed: changed.length };
    } catch (e) {
      S.state = 'error'; S.error = e.message; S.message = '';
      log('WARN', `Pembaruan gagal: ${e.message}`);
      throw e;
    } finally {
      rmrf(tmp); busy = false;
    }
  }
  const finish = (msg) => { S.state = 'done'; S.message = msg; };

  return { status, check, apply, finish, isBusy: () => busy };
}

module.exports = { createUpdater, isProtected, DEFAULT_REPO };
