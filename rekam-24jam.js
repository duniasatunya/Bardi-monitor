// Perekam 24 jam: semua kamera ONVIF direkam terus-menerus (video disalin apa adanya, tanpa suara) ke hardisk, dipotong per 10 menit.
//
// Folder (ditentukan program, pengguna hanya memilih hardisk):
//   <hardisk>\BardiRekaman\penuh\<Nama kamera (id8)>\<tahun-bulan-tanggal>\<jam-menit-detik>.ts   (nama berkas = jam MULAI potongan)
//   <hardisk>\BardiRekaman\penuh\_log\<tahun-bulan-tanggal>.jsonl                                 (catatan kamera putus/tersambung, hardisk hilang, dll.)
//
// Aturan:
//  - Hanya hardisk yang dipilih di rekam-pengaturan.json (dikenali dari nomor seri volume, bukan huruf drive). Drive sistem (C:) TIDAK PERNAH dipakai.
//  - Rotasi: hapus potongan paling lama (berurutan menurut waktu, lintas semua kamera) bila umur > "hari" (20), pemakaian > batasTB (4,1 TB),
//    atau sisa ruang < sisaMinimumGB (50 GB). Pemakaian ikut turun-naik di angka batas, tidak reset ke nol.
//  - Hardisk utama hilang -> pindah ke hardisk lain (bukan drive sistem) sebagai "cadangan", batas pemakaian dibatasi persenCadangan% kapasitasnya.
//    Hardisk utama kembali -> pindah lagi. Tanpa hardisk sama sekali -> tidak merekam, status merah.
//  - Sisa ruang tidak bisa dipulihkan lagi (< sisaMinimumGB) -> berhenti merekam sampai ada ruang (status merah), supaya disk tidak penuh.
// Modul ini TIDAK membuka alamat web apa pun. Halaman/endpoint dipasang terpisah (butuh izin).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const GiB = 1073741824, TiB = GiB * 1024;
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const safeName = (s) => String(s || 'kamera').replace(/[\\/:*?"'<>|%\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 60) || 'kamera';
const ID_RE = /^[0-9a-f]{8}$/, SEG_RE = /^(\d\d)-(\d\d)-(\d\d)\.ts$/, DAY_RE = /^\d{4}-\d\d-\d\d$/;
const startOfSeg = (date, name) => { const m = SEG_RE.exec(name); const [y, mo, d] = date.split('-').map(Number); return new Date(y, mo - 1, d, +m[1], +m[2], +m[3]).getTime(); };
const tick = () => new Promise((r) => setImmediate(r));
const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('waktu habis (hardisk tidak menjawab)')), ms); Promise.resolve(p).then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });

const DEFAULTS = { aktif: true, penuh: { serial: null, label: '' }, klip: { serial: null, label: '' }, hari: 20, batasTB: 4.1, sisaMinimumGB: 50, persenCadangan: 80, segmenDetik: 600 };

function loadSettings(file, log) {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch (e) { if (e.code !== 'ENOENT') log('WARN', `Rekaman 24 jam: rekam-pengaturan.json tidak terbaca (${e.message}), memakai bawaan.`); }
  return Object.assign({}, DEFAULTS, s, { penuh: Object.assign({}, DEFAULTS.penuh, s.penuh), klip: Object.assign({}, DEFAULTS.klip, s.klip) });
}
function saveSettings(file, s) { try { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(s, null, 2)); fs.renameSync(tmp, file); } catch (_) {} }

// Daftar hardisk (Windows): huruf drive + nomor seri volume + nama. Mengembalikan null bila gagal dibaca (daftar lama dipertahankan).
function listDrivesWindows() {
  return new Promise((resolve) => {
    const cmd = 'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,VolumeName,VolumeSerialNumber | ConvertTo-Json -Compress';
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 20000 }, (err, out) => {
      if (err) return resolve(null);
      try {
        let j = JSON.parse(String(out).trim() || '[]'); if (!Array.isArray(j)) j = [j];
        const sys = String(process.env.SystemDrive || 'C:').toUpperCase();
        resolve(j.filter((d) => d && d.DeviceID).map((d) => ({ mount: d.DeviceID + '\\', serial: String(d.VolumeSerialNumber || '').trim(), label: d.VolumeName || '', system: String(d.DeviceID).toUpperCase() === sys })));
      } catch (_) { resolve(null); }
    });
  });
}

function createRecorder24({ log, rootDir, ffmpegPath, listCams, getCamera, settingsFile, driveProvider, timing, rtspTransport = 'tcp' }) {
  const T = Object.assign({ tickMs: 3000, reconcileMs: 10000, driveMs: 30000, rotateMs: 120000, stallSec: 20, lostSec: 60, authRetryMs: 600000, ioTimeoutMs: 8000 }, timing || {});
  const sFile = settingsFile || path.join(rootDir, 'rekam-pengaturan.json');
  const S = loadSettings(sFile, log);
  const provider = driveProvider || (process.platform === 'win32' ? listDrivesWindows : async () => []);
  const cams = new Map();
  let drives = [], drivesAt = 0, drivesBusy = false;
  let target = null; // { drive, mode: 'utama' | 'cadangan', mount }
  let diskFull = false, rotating = false, ready = false, stopped = false, forceDrives = false;
  let timers = [], pending = [], lastRotate = null, usage = { used: 0, free: null, oldest: null };
  const recentEvents = [];

  const findFfmpeg = () => { if (ffmpegPath) return ffmpegPath; const local = path.join(rootDir, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'); return fs.existsSync(local) ? local : 'ffmpeg'; };
  const scrubUrl = (t) => String(t || '').replace(/\/\/[^@\s\/]*@/g, '//***@');
  const baseOf = (mount) => path.join(mount, 'BardiRekaman', 'penuh');
  const statfs = async (p) => { const s = await withTimeout(fs.promises.statfs(p), T.ioTimeoutMs); return { size: Number(s.blocks) * Number(s.bsize), free: Number(s.bavail) * Number(s.bsize) }; };

  // ---------- Catatan kejadian (juga dasar tanda merah di garis waktu) ----------
  function logEvent(jenis, R, extra) {
    const ev = Object.assign({ t: new Date().toISOString(), jenis }, R ? { id: R.id, kamera: R.name } : {}, extra || {});
    recentEvents.push(ev); while (recentEvents.length > 300) recentEvents.shift();
    pending.push(ev); if (pending.length > 1000) pending.shift();
    flushEvents();
  }
  let flushing = false;
  async function flushEvents() {
    if (flushing || !target || !pending.length) return;
    flushing = true;
    try {
      const dir = path.join(baseOf(target.mount), '_log');
      await withTimeout(fs.promises.mkdir(dir, { recursive: true }), T.ioTimeoutMs);
      const byDay = new Map();
      for (const ev of pending) { const d = dayOf(Date.parse(ev.t)); (byDay.get(d) || byDay.set(d, []).get(d)).push(JSON.stringify(ev)); }
      for (const [d, lines] of byDay) await withTimeout(fs.promises.appendFile(path.join(dir, d + '.jsonl'), lines.join('\n') + '\n'), T.ioTimeoutMs);
      pending = [];
    } catch (_) { /* disimpan di memori, dicoba lagi nanti */ } finally { flushing = false; }
  }

  // ---------- Hardisk ----------
  async function refreshDrives() {
    if (drivesBusy) return; drivesBusy = true;
    try {
      const list = await provider();
      if (Array.isArray(list)) drives = list;
      drivesAt = Date.now(); forceDrives = false;
      await resolveTarget();
    } catch (e) { log('WARN', `Rekaman 24 jam: gagal membaca daftar hardisk: ${e.message}`); } finally { drivesBusy = false; }
  }
  async function usableDrives() {
    const out = [];
    for (const d of drives) {
      if (d.system) continue; // drive sistem tidak pernah dipakai
      try { const f = await statfs(d.mount); out.push(Object.assign({}, d, f)); } catch (_) { /* tidak terbaca = anggap hilang */ }
    }
    return out;
  }
  async function resolveTarget() {
    const ok = await usableDrives();
    if (!S.penuh.serial && ok.length) { // belum diatur: pilih hardisk non-sistem terbesar, lalu ingat nomor serinya
      const best = ok.slice().sort((a, b) => b.size - a.size)[0];
      S.penuh = { serial: best.serial, label: best.label }; saveSettings(sFile, S);
      log('INFO', `Rekaman 24 jam: hardisk rekaman belum diatur, memakai ${best.label || best.mount} (${best.mount}, ${(best.size / TiB).toFixed(2)} TB) dan mengingat nomor serinya.`);
    }
    let next = null;
    const want = S.penuh.serial ? ok.find((d) => d.serial === S.penuh.serial) : null;
    if (want) next = { drive: want, mode: 'utama', mount: want.mount };
    else { const alt = ok.filter((d) => d.free > 20 * GiB).sort((a, b) => b.free - a.free)[0]; if (alt) next = { drive: alt, mode: 'cadangan', mount: alt.mount }; }
    const was = target;
    if ((was && was.mount) === (next && next.mount) && (was && was.mode) === (next && next.mode)) { if (next) target.drive = next.drive; return; }
    target = next;
    if (!next) { log('ERROR', 'Rekaman 24 jam: tidak ada hardisk untuk merekam (drive sistem tidak dipakai). Rekaman berhenti.'); logEvent('drive-hilang', null, { alasan: 'tidak ada hardisk' }); }
    else if (next.mode === 'cadangan') { log('WARN', `Rekaman 24 jam: hardisk utama tidak terdeteksi. Merekam ke hardisk cadangan ${next.drive.label || next.mount} (${next.mount}); batas rotasi menyesuaikan kapasitasnya.`); logEvent('drive-cadangan', null, { drive: next.mount, label: next.drive.label || '' }); }
    else { log('INFO', `Rekaman 24 jam: merekam ke ${next.drive.label || next.mount} (${next.mount}).`); if (was) logEvent('drive-kembali', null, { drive: next.mount }); }
    for (const R of cams.values()) { R.since = Date.now(); R.lastDataAt = 0; R.lostLogged = false; if (R.proc) killFfmpeg(R); } // pindah tujuan: mulai ulang semua perekam (bukan salah kamera, jadi tidak dicatat sebagai kamera putus)
    diskFull = false;
  }

  // ---------- Per kamera ----------
  const mkCam = (c) => ({ id: c.id, name: c.name, rtsp: null, proc: null, killing: false, starting: false, busy: false, state: 'menyambung', hadData: false, lastDataAt: 0, since: Date.now(), startedAt: 0, nextTryAt: 0, fails: 0, authUntil: 0, err: '', lostLogged: false, lostAt: 0, sig: '', lastSize: 0, samples: [], gaps: [], gapDay: dayOf(Date.now()), camDir: null, outMount: null, lastSeg: null, noInfoLogged: false });

  function pickProfile(profiles) {
    const all = (profiles || []).filter((p) => p && p.rtsp);
    let list = all.filter((p) => !p.codec || /264/.test(p.codec));
    if (!list.length) list = all.filter((p) => /265|hevc/i.test(p.codec || ''));
    if (!list.length) return null;
    const px = (p) => (p.width || 0) * (p.height || 0);
    return list.slice().sort((a, b) => px(b) - px(a))[0];
  }
  async function camDirOf(base, id, name) {
    try { for (const e of await withTimeout(fs.promises.readdir(base, { withFileTypes: true }), T.ioTimeoutMs)) if (e.isDirectory() && e.name.endsWith(`(${id})`)) return path.join(base, e.name); } catch (_) {}
    return path.join(base, `${safeName(name)} (${id})`);
  }
  async function ensureDays(R) { // siapkan folder hari ini & besok (ffmpeg memberi nama berkas berdasarkan jam saat potongan dimulai)
    const now = Date.now();
    for (const d of [dayOf(now), dayOf(now + 86400000)]) { try { await withTimeout(fs.promises.mkdir(path.join(R.camDir, d), { recursive: true }), T.ioTimeoutMs); } catch (_) {} }
    R.daysAt = dayOf(now);
  }

  async function startFfmpeg(R) {
    if (!target) return false;
    const info = getCamera(R.id);
    const prof = info && pickProfile(info.profiles);
    if (prof) R.rtsp = prof.rtsp;
    if (!R.rtsp) { R.err = 'alamat video kamera belum diketahui'; return false; }
    if (!info || info.password == null) { R.err = 'password kamera belum terbaca'; return false; }
    let url; try { const u = new URL(R.rtsp); u.username = info.username; u.password = info.password; url = u.toString(); } catch (_) { R.err = 'alamat video tidak valid'; return false; }
    const base = baseOf(target.mount);
    R.camDir = await camDirOf(base, R.id, R.name);
    try { await ensureDays(R); } catch (_) {}
    const isRtsp = /^rtsp/i.test(url); // sumber selain RTSP (berkas) hanya dipakai untuk uji
    const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', ...(isRtsp ? ['-rtsp_transport', rtspTransport, '-fflags', '+genpts+discardcorrupt', '-use_wallclock_as_timestamps', '1'] : ['-re', '-stream_loop', '-1']),
      '-i', url, '-map', '0:v:0', '-c', 'copy', '-an', '-f', 'segment', '-segment_time', String(S.segmenDetik), '-segment_atclocktime', '1', '-reset_timestamps', '1', '-strftime', '1', '-strftime_mkdir', '1',
      path.join(R.camDir, '%Y-%m-%d', '%H-%M-%S.ts')];
    let p, err = '';
    try { p = spawn(findFfmpeg(), args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { R.err = e.message; return false; }
    R.proc = p; R.killing = false; R.startedAt = Date.now(); R.outMount = target.mount;
    p.stderr.on('data', (d) => { err += d; if (err.length > 4000) err = err.slice(-2000); });
    p.on('error', (e) => { R.err = e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message; if (R.proc === p) R.proc = null; });
    p.on('exit', () => {
      if (R.proc === p) R.proc = null;
      const e = scrubUrl(err).trim();
      if (e) R.err = e.split(/\r?\n/).slice(-2).join(' | ').slice(0, 200);
      if (/401|Unauthorized/i.test(e)) { R.state = 'login'; R.authUntil = Date.now() + T.authRetryMs; log('WARN', `Rekaman 24 jam ${R.name}: login kamera ditolak. Berhenti mencoba ${Math.round(T.authRetryMs / 60000)} menit supaya akun kamera tidak terkunci.`); }
      if (/No such file|Permission denied|Input\/output|I\/O error|device/i.test(e) && !R.killing) forceDrives = true; // kemungkinan hardisk lepas: cek ulang daftar hardisk segera
    });
    return true;
  }
  function killFfmpeg(R) { if (R.proc) { R.killing = true; try { R.proc.kill(); } catch (_) {} } }

  async function newestSeg(R) {
    if (!R.camDir) return null;
    const now = Date.now();
    for (const d of [dayOf(now), dayOf(now - 86400000)]) {
      let names; try { names = await withTimeout(fs.promises.readdir(path.join(R.camDir, d)), T.ioTimeoutMs); } catch (_) { continue; }
      names = names.filter((n) => SEG_RE.test(n)).sort(); if (!names.length) continue;
      const name = names[names.length - 1];
      try { const st = await withTimeout(fs.promises.stat(path.join(R.camDir, d, name)), T.ioTimeoutMs); return { date: d, name, size: st.size, mtimeMs: st.mtimeMs }; } catch (_) {}
    }
    return null;
  }
  const trimGaps = (R, now) => { const d = dayOf(now); if (R.gapDay !== d) { R.gapDay = d; R.gaps = []; } };

  async function tickCam(R) {
    if (R.busy) return; R.busy = true;
    try {
      const now = Date.now(); trimGaps(R, now);
      if (!target) { R.state = 'tanpa-drive'; R.lastDataAt = 0; R.lostLogged = false; killFfmpeg(R); return; }
      if (diskFull) { R.state = 'disk-penuh'; R.lastDataAt = 0; R.lostLogged = false; killFfmpeg(R); return; }
      if (R.proc && R.outMount && R.outMount !== target.mount) killFfmpeg(R);
      if (R.state === 'tanpa-drive' || R.state === 'disk-penuh') { R.state = 'menyambung'; R.since = now; }
      if (R.camDir && R.daysAt !== dayOf(now)) await ensureDays(R);
      // 1) ada data baru?
      const seg = await newestSeg(R);
      const sig = seg ? `${seg.date}/${seg.name}` : '';
      if (seg && R.proc && !R.killing && (sig !== R.sig || seg.size > R.lastSize)) {
        const delta = sig !== R.sig ? seg.size : seg.size - R.lastSize;
        R.samples.push({ t: now, b: Math.max(0, delta) }); while (R.samples.length && R.samples[0].t < now - 60000) R.samples.shift();
        R.sig = sig; R.lastSize = seg.size; R.lastSeg = seg; R.lastDataAt = now; R.err = '';
        if (!R.hadData) { R.hadData = true; logEvent('mulai-merekam', R); }
        if (R.lostLogged) { const down = Math.round((now - R.lostAt) / 1000); R.gaps.length && !R.gaps[R.gaps.length - 1].to && (R.gaps[R.gaps.length - 1].to = now); logEvent('tersambung', R, { putusDetik: down }); log('INFO', `Rekaman 24 jam ${R.name}: kamera kembali mengirim gambar (putus ${down} detik).`); R.lostLogged = false; }
        R.state = 'merekam';
      } else if (seg) { R.lastSeg = seg; if (sig !== R.sig) { R.sig = sig; R.lastSize = seg.size; } }
      // 2) macet atau putus?
      const ref = R.lastDataAt || R.since, silent = now - ref;
      if (R.proc && !R.killing && now - Math.max(R.lastDataAt, R.startedAt) > T.stallSec * 1000) killFfmpeg(R);
      if (R.state === 'merekam' && silent > T.stallSec * 1000) R.state = 'menyambung';
      if ((R.state === 'menyambung' || R.state === 'merekam') && silent > T.lostSec * 1000) {
        R.state = 'putus';
        if (R.hadData && !R.lostLogged) { R.lostLogged = true; R.lostAt = R.lastDataAt || R.since; R.gaps.push({ from: R.lostAt, to: null }); logEvent('putus', R, { sejak: new Date(R.lostAt).toISOString(), alasan: R.err || 'tidak ada gambar dari kamera' }); log('WARN', `Rekaman 24 jam ${R.name}: kamera berhenti mengirim gambar sejak ${new Date(R.lostAt).toLocaleTimeString('id-ID')}.`); }
      }
      // 3) (re)start ffmpeg
      if (!R.proc && !R.starting && now >= R.nextTryAt && now >= R.authUntil) {
        if (R.state === 'login') R.state = R.hadData ? 'putus' : 'menyambung';
        R.starting = true;
        let ok = false; try { ok = await startFfmpeg(R); } finally { R.starting = false; }
        R.fails = ok ? R.fails : R.fails + 1;
        const waits = [3000, 5000, 10000, 15000];
        R.nextTryAt = now + (ok ? 3000 : waits[Math.min(R.fails, waits.length - 1)]);
        if (!ok && !R.noInfoLogged) { R.noInfoLogged = true; log('WARN', `Rekaman 24 jam ${R.name}: belum bisa mulai (${R.err}).`); }
        if (ok) R.noInfoLogged = false;
      }
    } catch (e) { log('ERROR', `Rekaman 24 jam ${R.name}: ${e.message}`); } finally { R.busy = false; }
  }

  function reconcile() {
    let list = []; try { list = listCams() || []; } catch (_) { list = []; }
    const ids = new Set(); let n = 0;
    for (const c of list) {
      if (!c || !ID_RE.test(String(c.id))) continue;
      ids.add(c.id);
      let R = cams.get(c.id);
      if (!R) { R = mkCam(c); R.nextTryAt = Date.now() + 300 * (n++); cams.set(c.id, R); }
      R.name = c.name || R.name;
    }
    for (const [id, R] of cams) if (!ids.has(id)) { killFfmpeg(R); cams.delete(id); }
  }

  // ---------- Rotasi: hapus yang paling lama ----------
  const dayCache = new Map(); // folder hari (sudah lewat) -> { mtimeMs, bytes }
  async function dayBytes(dp, past) {
    let st; try { st = await withTimeout(fs.promises.stat(dp), T.ioTimeoutMs); } catch (_) { return 0; }
    const c = dayCache.get(dp);
    if (past && c && c.mtimeMs === st.mtimeMs) return c.bytes;
    let names = []; try { names = await withTimeout(fs.promises.readdir(dp), T.ioTimeoutMs); } catch (_) { return 0; }
    let bytes = 0;
    for (let i = 0; i < names.length; i += 40) {
      const part = await Promise.all(names.slice(i, i + 40).map((n) => fs.promises.stat(path.join(dp, n)).then((s) => s.size, () => 0)));
      for (const b of part) bytes += b;
    }
    dayCache.set(dp, { mtimeMs: st.mtimeMs, bytes });
    return bytes;
  }
  function limitsNow(fsInfo) {
    let maxBytes = S.batasTB * TiB;
    if (target && target.mode === 'cadangan' && fsInfo) maxBytes = Math.min(maxBytes, fsInfo.size * S.persenCadangan / 100);
    return { maxBytes, minFree: S.sisaMinimumGB * GiB, maxAgeMs: S.hari * 86400000 };
  }
  async function rotate() {
    if (rotating || !target) return; rotating = true;
    const base = baseOf(target.mount);
    try {
      let camDirs = []; try { camDirs = (await withTimeout(fs.promises.readdir(base, { withFileTypes: true }), T.ioTimeoutMs)).filter((e) => e.isDirectory() && /\([0-9a-f]{8}\)$/.test(e.name)).map((e) => e.name); } catch (_) { camDirs = []; }
      const days = []; const today = dayOf(Date.now());
      for (const c of camDirs) {
        let ds = []; try { ds = await withTimeout(fs.promises.readdir(path.join(base, c)), T.ioTimeoutMs); } catch (_) { continue; }
        for (const d of ds) if (DAY_RE.test(d)) days.push({ cam: c, date: d, path: path.join(base, c, d) });
      }
      let used = 0; for (const d of days) { d.bytes = await dayBytes(d.path, d.date < today); used += d.bytes; }
      let fsInfo = await statfs(base).catch(() => statfs(target.mount));
      let free = fsInfo.free;
      const L = limitsNow(fsInfo);
      const now = Date.now();
      const need = (startMs) => startMs < now - L.maxAgeMs || used > L.maxBytes || free < L.minFree;
      const dates = [...new Set(days.map((d) => d.date))].sort();
      let deleted = 0, freed = 0;
      outer: for (const date of dates) {
        const files = [];
        for (const d of days.filter((x) => x.date === date)) { let names = []; try { names = await fs.promises.readdir(d.path); } catch (_) {} for (const n of names) if (SEG_RE.test(n)) files.push({ p: path.join(d.path, n), n, d }); }
        files.sort((a, b) => (a.n < b.n ? -1 : a.n > b.n ? 1 : a.d.cam < b.d.cam ? -1 : 1)); // urut waktu, lintas semua kamera
        for (const f of files) {
          if (!need(startOfSeg(date, f.n))) break outer;
          let st; try { st = await fs.promises.stat(f.p); } catch (_) { continue; }
          if (now - st.mtimeMs < 120000) continue; // masih ditulis
          try { await fs.promises.unlink(f.p); used -= st.size; free += st.size; deleted++; freed += st.size; f.d.bytes -= st.size; } catch (_) {}
          if (deleted % 100 === 0) await tick();
        }
        for (const d of days.filter((x) => x.date === date && x.date < today)) { try { await fs.promises.rmdir(d.path); dayCache.delete(d.path); } catch (_) {} }
      }
      try { fsInfo = await statfs(target.mount); free = fsInfo.free; } catch (_) {}
      const oldest = dates.find((d) => days.some((x) => x.date === d && x.bytes > 0)) || null;
      usage = { used: Math.max(0, used), free, size: fsInfo.size, oldest, maxBytes: L.maxBytes, at: Date.now() };
      lastRotate = { at: Date.now(), deleted, freed };
      if (deleted) log('INFO', `Rekaman 24 jam: ${deleted} potongan terlama dihapus (${(freed / GiB).toFixed(1)} GB). Terpakai ${(used / TiB).toFixed(2)} TB, sisa ${(free / GiB).toFixed(0)} GB.`);
      const wasFull = diskFull;
      diskFull = free < L.minFree;
      if (diskFull && !wasFull) { log('ERROR', `Rekaman 24 jam: sisa ruang ${(free / GiB).toFixed(1)} GB (< ${S.sisaMinimumGB} GB) dan tidak ada lagi yang bisa dihapus. Rekaman dihentikan sampai ada ruang.`); logEvent('disk-penuh', null, { sisaGB: +(free / GiB).toFixed(1) }); }
      if (!diskFull && wasFull) { log('INFO', 'Rekaman 24 jam: ruang tersedia lagi, rekaman dilanjutkan.'); logEvent('disk-pulih', null); }
    } catch (e) { log('ERROR', `Rekaman 24 jam: rotasi gagal: ${e.message}`); } finally { rotating = false; }
  }

  // ---------- Untuk halaman / laporan ----------
  const WARNA = { merekam: 'hijau', menyambung: 'kuning', putus: 'merah', login: 'merah', 'tanpa-drive': 'merah', 'disk-penuh': 'merah' };
  function describe(R) {
    const cad = target && target.mode === 'cadangan';
    let warna = WARNA[R.state] || 'kuning', teks, alasan = '';
    switch (R.state) {
      case 'merekam': teks = cad ? 'Merekam ke drive cadangan' : 'Merekam'; if (cad) warna = 'kuning'; break;
      case 'menyambung': teks = 'Menyambung ulang'; break;
      case 'putus': teks = 'Tidak merekam, kamera tidak mengirim gambar'; alasan = R.err || ''; break;
      case 'login': teks = 'Tidak merekam, login kamera ditolak'; break;
      case 'tanpa-drive': teks = 'Tidak merekam, hardisk tidak terdeteksi'; break;
      case 'disk-penuh': teks = `Tidak merekam, sisa ruang kurang dari ${S.sisaMinimumGB} GB`; break;
      default: teks = R.state;
    }
    return { warna, teks, alasan };
  }
  function statusList() {
    const now = Date.now();
    return [...cams.values()].map((R) => {
      const d = describe(R); const win = R.samples.filter((s) => s.t > now - 60000); const bits = win.reduce((a, s) => a + s.b, 0) * 8;
      const gapsSec = R.gaps.reduce((a, g) => a + Math.round(((g.to || now) - g.from) / 1000), 0);
      return { id: R.id, name: R.name, state: R.state, warna: d.warna, teks: d.teks, alasan: d.alasan, lastDataAt: R.lastDataAt || null,
        mbps: R.state === 'merekam' && win.length > 1 ? +(bits / Math.max(1, (win[win.length - 1].t - win[0].t) / 1000 + T.tickMs / 1000) / 1e6).toFixed(2) : null,
        potonganTerakhir: R.lastSeg ? `${R.lastSeg.date} ${R.lastSeg.name.replace('.ts', '').replace(/-/g, ':')}` : null, bolongHariIni: { kali: R.gaps.length, detik: gapsSec } };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'id', { numeric: true }));
  }
  function storage() {
    return { aktif: S.aktif, siap: ready, mode: target ? target.mode : null, hardisk: target ? { mount: target.mount, label: target.drive.label || '', serial: target.drive.serial || '' } : null,
      terpakaiBytes: usage.used, sisaBytes: usage.free, kapasitasBytes: usage.size || null, batasBytes: usage.maxBytes || S.batasTB * TiB, rekamanTertua: usage.oldest, hariMaks: S.hari,
      sisaMinimumBytes: S.sisaMinimumGB * GiB, penuh: diskFull, rotasiTerakhir: lastRotate, suhu: null /* belum ada: butuh pembacaan S.M.A.R.T. */ };
  }
  const stampOf = (ms) => { const d = new Date(ms); return `${dayOf(ms)}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`; };
  function kejadianTerbaru() { // kamera putus/tersambung sejak program dinyalakan (dari catatan di memori); bentuknya mengikuti daftar Kejadian lama
    const open = new Map(), out = [];
    for (const ev of recentEvents) {
      if (ev.jenis === 'putus') { const it = { id: ev.id, stamp: stampOf(Date.parse(ev.sejak || ev.t)), name: ev.kamera, status: 'berlangsung', lostAt: ev.sejak || ev.t, recoveredAt: null, downSec: null, durationSec: 0, joins: [], hevc: false, hasFile: false, file: null, bersamaan: [], catatan: 'Rekaman 24 jam berjalan terus. Buka rekaman penuh pada jam ini; kamera sedang/sempat mati.' }; open.set(ev.id, it); out.push(it); }
      else if (ev.jenis === 'tersambung' && open.has(ev.id)) { const it = open.get(ev.id); it.recoveredAt = ev.t; it.downSec = ev.putusDetik; it.status = 'selesai'; open.delete(ev.id); }
    }
    return out.reverse();
  }
  async function segments(id, date) { // daftar potongan satu kamera pada satu hari (untuk garis waktu)
    if (!target || !ID_RE.test(String(id)) || !DAY_RE.test(String(date))) return [];
    const R = cams.get(id); const dir = R && R.camDir ? R.camDir : await camDirOf(baseOf(target.mount), id, '');
    const dp = path.join(dir, date); let names = []; try { names = await withTimeout(fs.promises.readdir(dp), T.ioTimeoutMs); } catch (_) { return []; }
    const res = [];
    for (const n of names.filter((x) => SEG_RE.test(x)).sort()) {
      try { const st = await fs.promises.stat(path.join(dp, n)); const startMs = startOfSeg(date, n); const open = Date.now() - st.mtimeMs < 30000; res.push({ file: n, startMs, endMs: Math.round(Math.min(st.mtimeMs, startMs + S.segmenDetik * 1000 + 5000)), size: st.size, berlangsung: open }); } catch (_) {}
    }
    return res;
  }
  async function camDirFor(id) { const R = cams.get(id); if (R && R.camDir) return R.camDir; return camDirOf(baseOf(target.mount), id, ''); }
  async function segmentPath(id, date, name) { // lokasi satu potongan (hanya setelah nama divalidasi); null bila tidak ada
    if (!target || !ID_RE.test(String(id)) || !DAY_RE.test(String(date)) || !/^\d\d-\d\d-\d\d\.ts$/.test(String(name))) return null;
    const f = path.join(await camDirFor(id), date, name);
    try { await withTimeout(fs.promises.stat(f), T.ioTimeoutMs); return f; } catch (_) { return null; }
  }
  async function hariAda(id) { // tanggal-tanggal yang punya rekaman (terbaru dulu, maksimal 31)
    if (!target || !ID_RE.test(String(id))) return [];
    const dir = await camDirFor(id); let ds = [];
    try { ds = (await withTimeout(fs.promises.readdir(dir), T.ioTimeoutMs)).filter((d) => DAY_RE.test(d)).sort().reverse().slice(0, 40); } catch (_) { return []; }
    const out = [];
    for (const d of ds) { try { if ((await withTimeout(fs.promises.readdir(path.join(dir, d)), T.ioTimeoutMs)).some((n) => SEG_RE.test(n))) out.push(d); } catch (_) {} if (out.length >= 31) break; }
    return out;
  }
  async function events(date) { // catatan kejadian satu hari (tanda merah)
    if (!target || !DAY_RE.test(String(date))) return [];
    try { const txt = await withTimeout(fs.promises.readFile(path.join(baseOf(target.mount), '_log', date + '.jsonl'), 'utf8'), T.ioTimeoutMs); return txt.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean); } catch (_) { return []; }
  }

  // ---------- Jalan ----------
  function start() {
    if (!S.aktif) { log('INFO', 'Rekaman 24 jam: dimatikan di rekam-pengaturan.json ("aktif": false).'); return; }
    process.once('exit', () => { for (const R of cams.values()) { try { if (R.proc) R.proc.kill(); } catch (_) {} } });
    refreshDrives().then(() => {
      if (stopped) return; ready = true;
      logEvent('program-mulai', null);
      reconcile();
      timers.push(setInterval(() => { if (stopped) return; if (forceDrives || Date.now() - drivesAt > T.driveMs) refreshDrives(); for (const R of cams.values()) tickCam(R); }, T.tickMs));
      timers.push(setInterval(() => { if (!stopped) reconcile(); }, T.reconcileMs));
      timers.push(setInterval(() => { if (!stopped) rotate(); }, T.rotateMs));
      for (const t of timers) t.unref && t.unref();
      rotate();
    });
  }
  function stop() { stopped = true; for (const t of timers) clearInterval(t); timers = []; if (ready) logEvent('program-berhenti', null); for (const R of cams.values()) killFfmpeg(R); }

  return { start, stop, statusList, storage, segments, segmentPath, hariAda, events, kejadianTerbaru, rotate, settings: S, _debug: { cams, get target() { return target; }, refreshDrives } };
}

module.exports = { createRecorder24, listDrivesWindows };
