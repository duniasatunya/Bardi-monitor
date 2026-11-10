// Rekaman kejadian: tiap kamera ONVIF disalin terus-menerus ke buffer berputar (beberapa menit terakhir) di folder sementara.
// Saat kamera berhenti mengirim gambar selama "lostSec" detik, buffer 2 menit sebelum putus disimpan jadi klip.
// Saat kamera menyala lagi, 2 menit sesudahnya ditambahkan ke klip yang sama (putus berulang digabung jadi satu kejadian).
// Klip disimpan selama retentionDays (bawaan 7 hari), lalu dihapus otomatis. Folder: <outDir>/<Nama kamera (id8)>/<tahun-bulan-tanggal_jam-menit-detik>.mp4 (+ .json berisi catatan).
// Video disalin apa adanya (tanpa mengubah kualitas). Suara tidak ikut direkam. Kamera H.265 dibuatkan salinan H.264 (.web.mp4)
// khusus untuk diputar di browser.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const pad = (n) => String(n).padStart(2, '0');
const stampOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`; };
const safeName = (s) => String(s || 'kamera').replace(/[\\/:*?"'<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 60) || 'kamera';
const ID_RE = /^[0-9a-f]{8}$/;
const FILE_RE = /^\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d(\.web)?\.mp4$/;
const SEG_RE = /^r(\d+)_(\d+)\.ts$/;

function createIncidentRecorder({ log, rootDir, ffmpegPath, listCams, getCamera, outDir, bufBase, timing, minFreeBytes = 5 * 1024 * 1024 * 1024, rtspTransport = 'tcp', retentionDays = 7 }) {
  const T = Object.assign({ segSec: 5, beforeSec: 120, afterSec: 120, lostSec: 60, stallSec: 20, keepSec: 330, tickMs: 2000, reconcileMs: 10000, authRetryMs: 600000, purgeMs: 3600000 }, timing || {});
  const out = outDir || path.join(rootDir, 'rekaman-kejadian');
  const buf = bufBase || path.join(os.tmpdir(), 'bardi-incident-buffer');
  const cacheFile = path.join(rootDir, 'incident-cache.json');
  const cams = new Map(); // id -> R
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {}; } catch (_) { cache = {}; }
  const recentLost = []; // { id, name, at } untuk mencatat kamera lain yang putus bersamaan
  let timer = null, recTimer = null, purgeTimer = null, stopped = false, lastDiskWarn = 0;

  try { fs.rmSync(buf, { recursive: true, force: true }); } catch (_) {}
  try { fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(buf, { recursive: true }); } catch (e) { log('ERROR', `Rekaman kejadian: gagal membuat folder: ${e.message}`); }

  const findFfmpeg = () => {
    if (ffmpegPath) return ffmpegPath;
    const local = path.join(rootDir, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    return fs.existsSync(local) ? local : 'ffmpeg';
  };
  const scrubUrl = (t) => String(t || '').replace(/\/\/[^@\s\/]*@/g, '//***@');
  const saveCache = () => { try { const tmp = cacheFile + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(cache)); fs.renameSync(tmp, cacheFile); } catch (_) {} };
  const writeJson = (f, obj) => { const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj, null, 1)); fs.renameSync(tmp, f); };

  // ---- Penanda pekerjaan berat (penyatuan klip & konversi H.265) dibatasi supaya tidak membebani PC ----
  const makeQueue = (limit) => {
    const q = []; let run = 0;
    const next = () => { while (run < limit && q.length) { const t = q.shift(); run++; Promise.resolve().then(t.fn).then(t.res, t.rej).finally(() => { run--; next(); }); } };
    return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
  };
  const concatQ = makeQueue(2), transQ = makeQueue(1);

  function runFfmpeg(args, cwd) {
    return new Promise((resolve) => {
      let err = '';
      let p;
      try { p = spawn(findFfmpeg(), args, { cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { return resolve({ ok: false, err: e.message }); }
      p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
      p.on('error', (e) => resolve({ ok: false, err: e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message }));
      p.on('exit', (code) => resolve({ ok: code === 0, err }));
    });
  }

  // ---- Folder kamera: nama kamera + (id8). Kalau kamera diganti namanya, folder lama tetap dipakai. ----
  function camDirOf(id, name) {
    try {
      for (const e of fs.readdirSync(out, { withFileTypes: true })) if (e.isDirectory() && e.name.endsWith(`(${id})`)) return path.join(out, e.name);
    } catch (_) {}
    const d = path.join(out, `${safeName(name)} (${id})`);
    try { fs.mkdirSync(d, { recursive: true }); } catch (_) {}
    return d;
  }

  // ---- Buffer per kamera ----
  function listSegs(dir) {
    let names = []; try { names = fs.readdirSync(dir); } catch (_) { return []; }
    const res = [];
    for (const n of names) {
      const m = SEG_RE.exec(n); if (!m) continue;
      let st; try { st = fs.statSync(path.join(dir, n)); } catch (_) { continue; }
      res.push({ name: n, run: +m[1], idx: +m[2], endMs: st.mtimeMs, size: st.size });
    }
    res.sort((a, b) => a.run - b.run || a.idx - b.idx);
    return res;
  }
  function durations(dir) { // dari daftar segmen ffmpeg (csv): nama,awal,akhir
    const map = new Map();
    let names = []; try { names = fs.readdirSync(dir); } catch (_) { return map; }
    for (const n of names) {
      if (!/^r\d+\.csv$/.test(n)) continue;
      let txt = ''; try { txt = fs.readFileSync(path.join(dir, n), 'utf8'); } catch (_) {}
      for (const line of txt.split(/\r?\n/)) { const c = line.split(','); if (c.length >= 3) { const d = parseFloat(c[2]) - parseFloat(c[1]); if (d > 0 && d < 600) map.set(c[0], d); } }
    }
    return map;
  }

  function pickProfile(profiles) {
    const list = (profiles || []).filter((p) => p && p.rtsp && (!p.codec || /264/.test(p.codec)));
    if (!list.length) return null;
    const px = (p) => (p.width || 0) * (p.height || 0);
    return list.slice().sort((a, b) => px(b) - px(a))[0]; // kualitas tertinggi
  }

  const mkCam = (c) => ({ id: c.id, name: c.name, rtsp: null, proc: null, run: 0, dir: path.join(buf, c.id), state: 'mulai', hadData: false, lastDataAt: 0, sig: '', err: '', nextTryAt: 0, fails: 0, authUntil: 0, inc: null, killing: false, startedAt: 0, lastClean: 0, noInfoLogged: false });

  function startFfmpeg(R) {
    const info = getCamera(R.id);
    let url = null;
    const prof = info && pickProfile(info.profiles);
    if (prof) { R.rtsp = prof.rtsp; if (cache[R.id] !== prof.rtsp) { cache[R.id] = prof.rtsp; saveCache(); } } else if (!R.rtsp && cache[R.id]) R.rtsp = cache[R.id];
    if (!R.rtsp) { R.err = 'alamat video kamera belum diketahui'; return false; }
    if (!info || info.password == null) { R.err = 'password kamera belum terbaca'; return false; }
    try { const u = new URL(R.rtsp); u.username = info.username; u.password = info.password; url = u.toString(); } catch (_) { R.err = 'alamat video tidak valid'; return false; }
    try { fs.mkdirSync(R.dir, { recursive: true }); } catch (_) {}
    R.run += 1;
    const n = R.run;
    const isRtsp = /^rtsp/i.test(url); // sumber selain RTSP (berkas) hanya dipakai untuk uji
    const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', ...(isRtsp ? ['-rtsp_transport', rtspTransport, '-fflags', '+genpts+discardcorrupt', '-use_wallclock_as_timestamps', '1'] : ['-re']),
      '-i', url, '-map', '0:v:0', '-c', 'copy', '-an', '-f', 'segment', '-segment_time', String(T.segSec), '-segment_format', 'mpegts', '-reset_timestamps', '1',
      '-segment_list', path.join(R.dir, `r${n}.csv`), '-segment_list_type', 'csv', path.join(R.dir, `r${n}_%05d.ts`)];
    let p, err = '';
    try { p = spawn(findFfmpeg(), args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { R.err = e.message; return false; }
    R.proc = p; R.killing = false; R.startedAt = Date.now();
    p.stderr.on('data', (d) => { err += d; if (err.length > 4000) err = err.slice(-2000); });
    p.on('error', (e) => { R.err = e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message; if (R.proc === p) R.proc = null; });
    p.on('exit', () => {
      if (R.proc === p) R.proc = null;
      try { // percobaan yang tidak menghasilkan data: hapus sisa berkas kosongnya
        const mine = listSegs(R.dir).filter((x) => x.run === n);
        if (!mine.some((x) => x.size > 0)) { for (const x of mine) fs.unlinkSync(path.join(R.dir, x.name)); fs.unlinkSync(path.join(R.dir, `r${n}.csv`)); }
      } catch (_) {}
      const e = scrubUrl(err).trim();
      if (e) R.err = e.split(/\r?\n/).slice(-2).join(' | ').slice(0, 200);
      if (/401|Unauthorized/i.test(e)) { R.state = R.state === 'putus' ? 'putus' : 'login'; R.authUntil = Date.now() + T.authRetryMs; log('WARN', `Rekaman kejadian ${R.name}: login kamera ditolak. Berhenti mencoba ${Math.round(T.authRetryMs / 60000)} menit supaya akun kamera tidak terkunci.`); }
    });
    return true;
  }
  function killFfmpeg(R) { if (R.proc) { R.killing = true; try { R.proc.kill(); } catch (_) {} } }

  // ---- Penyalinan potongan buffer ke folder kerja kejadian ----
  async function copyWindow(R, inc, kind, fromMs, toMs) {
    const segs = listSegs(R.dir).filter((s) => s.endMs > fromMs && s.endMs <= toMs);
    const dur = durations(R.dir);
    const part = { kind, from: fromMs, to: toMs, items: [] };
    const pn = inc.parts.length + 1;
    for (const s of segs) {
      const dst = `p${pn}_${s.name}`;
      try { await fs.promises.copyFile(path.join(R.dir, s.name), path.join(inc.workDir, dst)); part.items.push({ file: dst, dur: dur.get(s.name) || T.segSec }); } catch (_) {}
    }
    inc.parts.push(part);
    return part;
  }

  // ---- Menyatukan klip + catatan ----
  function metaOf(inc, status, extra) {
    let off = 0; const joins = [];
    inc.parts.forEach((p, i) => {
      if (i > 0) joins.push({ atSec: Math.round(off), gapSec: Math.max(0, Math.round((p.from - inc.parts[i - 1].to) / 1000)) });
      off += p.items.reduce((a, b) => a + b.dur, 0);
    });
    return Object.assign({
      versi: 1, camId: inc.camId, camName: inc.camName, status,
      lostAt: new Date(inc.lostAt).toISOString(), recoveredAt: inc.recoveredAt ? new Date(inc.recoveredAt).toISOString() : null,
      downSec: inc.recoveredAt ? Math.round((inc.recoveredAt - inc.lostAt) / 1000) : null,
      durationSec: Math.round(off), joins, hevc: !!inc.hevc, file: `${inc.stamp}.mp4`, webFile: inc.webFile || null, bersamaan: inc.bersamaan || [],
    }, extra || {});
  }

  async function render(inc, final) {
    if (inc.skip) return;
    const items = []; inc.parts.forEach((p) => p.items.forEach((i) => items.push(i)));
    if (!items.length) { try { writeJson(path.join(inc.camDir, `${inc.stamp}.json`), metaOf(inc, final ? 'selesai' : 'berlangsung', { catatan: 'Tidak ada rekaman 2 menit terakhir yang tersimpan di buffer (kamera baru tersambung atau program baru dinyalakan).', file: null })); } catch (_) {} return; }
    const list = path.join(inc.workDir, `list${final ? 'F' : 'P'}.txt`);
    fs.writeFileSync(list, items.map((i) => `file '${i.file}'`).join('\n') + '\n');
    const mp4 = path.join(inc.camDir, `${inc.stamp}.mp4`), tmp = path.join(inc.workDir, 'out.mp4');
    const r = await concatQ(() => runFfmpeg(['-y', '-hide_banner', '-f', 'concat', '-safe', '0', '-i', path.basename(list), '-c', 'copy', '-movflags', '+faststart', 'out.mp4'], inc.workDir));
    if (!r.ok) { log('ERROR', `Rekaman kejadian ${inc.camName}: gagal menyatukan klip: ${scrubUrl(r.err).slice(-200)}`); return; }
    inc.hevc = /Video:\s*(hevc|h265)/i.test(r.err) || inc.hevc;
    try { fs.renameSync(tmp, mp4); } catch (e) { try { fs.copyFileSync(tmp, mp4); } catch (e2) { log('ERROR', `Rekaman kejadian ${inc.camName}: gagal menyimpan klip: ${e2.message}`); return; } }
  }

  // Salinan H.264 untuk kamera H.265 (browser umumnya tidak bisa memutar H.265).
  async function makeWeb(inc) {
    const src = path.join(inc.camDir, `${inc.stamp}.mp4`), web = path.join(inc.camDir, `${inc.stamp}.web.mp4`), tmp = path.join(inc.camDir, `${inc.stamp}.web.tmp.mp4`);
    const r = await transQ(() => runFfmpeg(['-y', '-hide_banner', '-i', src, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', tmp], inc.camDir));
    if (!r.ok) { log('ERROR', `Rekaman kejadian ${inc.camName}: gagal membuat salinan H.264: ${scrubUrl(r.err).slice(-160)}`); try { fs.rmSync(tmp, { force: true }); } catch (_) {} return false; }
    try { fs.renameSync(tmp, web); inc.webFile = `${inc.stamp}.web.mp4`; return true; } catch (_) { return false; }
  }

  async function publish(inc, final) {
    try {
      await render(inc, final);
      const mp4 = path.join(inc.camDir, `${inc.stamp}.mp4`);
      if (inc.hevc && fs.existsSync(mp4)) await makeWeb(inc);
      if (final) {
        inc.bersamaan = recentLost.filter((x) => x.id !== inc.camId && Math.abs(x.at - inc.lostAt) <= 45000).map((x) => x.name);
      }
      const status = final ? 'selesai' : 'berlangsung';
      writeJson(path.join(inc.camDir, `${inc.stamp}.json`), metaOf(inc, status, fs.existsSync(mp4) ? {} : { file: null }));
      if (final) { try { fs.rmSync(inc.workDir, { recursive: true, force: true }); } catch (_) {} log('INFO', `Rekaman kejadian ${inc.camName}: klip tersimpan (${inc.stamp}, ${metaOf(inc, status).durationSec} detik).`); }
    } catch (e) { log('ERROR', `Rekaman kejadian ${inc.camName}: ${e.message}`); }
  }

  // Penyimpanan klip per kejadian dijalankan berurutan (folder kerja yang sama).
  const schedule = (inc, final) => { inc.chain = (inc.chain || Promise.resolve()).then(() => publish(inc, final)); return inc.chain; };

  const diskOk = () => {
    try { const s = fs.statfsSync(out); const free = Number(s.bavail) * Number(s.bsize); if (free < minFreeBytes) { if (Date.now() - lastDiskWarn > 3600000) { lastDiskWarn = Date.now(); log('ERROR', `Rekaman kejadian: sisa ruang disk tinggal ${(free / 1073741824).toFixed(1)} GB, klip baru tidak disimpan. Kosongkan disk.`); } return false; } } catch (_) {}
    return true;
  };

  // ---- Mesin keadaan per kamera ----
  async function beginLost(R, now) {
    const lostAt = R.lastDataAt;
    R.state = 'putus';
    recentLost.push({ id: R.id, name: R.name, at: lostAt }); while (recentLost.length > 200) recentLost.shift();
    let inc = R.inc;
    if (inc && !inc.final) { // putus lagi sebelum 2 menit sesudah menyala selesai: gabung ke kejadian yang sama
      const aft = inc.openAfter; inc.openAfter = null;
      if (aft) await copyWindow(R, inc, 'sesudah', aft, lostAt + (T.stallSec + T.segSec) * 1000);
      inc.recoveredAt = null; inc.again = (inc.again || 0) + 1;
      log('WARN', `Rekaman kejadian ${R.name}: putus lagi sebelum 2 menit sesudah menyala selesai; digabung ke kejadian yang sama.`);
      R.err = '';
      schedule(inc, false);
      return;
    }
    const camDir = camDirOf(R.id, R.name);
    const stamp = stampOf(lostAt);
    inc = { camId: R.id, camName: R.name, camDir, stamp, lostAt, recoveredAt: null, workDir: path.join(camDir, `_proses_${stamp}`), parts: [], final: false, skip: false, openAfter: null };
    try { fs.mkdirSync(inc.workDir, { recursive: true }); } catch (_) {}
    R.inc = inc;
    log('WARN', `Rekaman kejadian ${R.name}: kamera berhenti mengirim gambar sejak ${stampOf(lostAt)}. Menyimpan ${Math.round(T.beforeSec / 60 * 10) / 10} menit sebelum putus.`);
    if (!diskOk()) { inc.skip = true; return; }
    await copyWindow(R, inc, 'sebelum', lostAt - T.beforeSec * 1000, lostAt + (T.stallSec + T.segSec) * 1000);
    schedule(inc, false);
  }

  function recovered(R, now) {
    R.state = 'ok';
    const inc = R.inc;
    if (inc && !inc.final) {
      inc.recoveredAt = now; inc.openAfter = now - T.segSec * 1000; inc.afterUntil = now + T.afterSec * 1000;
      log('INFO', `Rekaman kejadian ${R.name}: kamera kembali menyala. Merekam ${Math.round(T.afterSec / 60 * 10) / 10} menit sesudahnya.`);
    }
  }

  async function finishIfDue(R, now) {
    const inc = R.inc;
    if (!inc || inc.final || R.state !== 'ok' || !inc.openAfter || now < inc.afterUntil + (T.segSec + 2) * 1000) return;
    inc.final = true; R.inc = null;
    if (inc.skip) { try { fs.rmSync(inc.workDir, { recursive: true, force: true }); } catch (_) {} return; }
    await copyWindow(R, inc, 'sesudah', inc.openAfter, inc.afterUntil);
    inc.openAfter = null;
    schedule(inc, true);
  }

  function clean(R, now) {
    if (now - R.lastClean < 30000) return; R.lastClean = now;
    const segs = listSegs(R.dir); const newest = segs.length ? segs[segs.length - 1].name : '';
    for (const s of segs) if (s.name !== newest && s.endMs < now - T.keepSec * 1000) { try { fs.unlinkSync(path.join(R.dir, s.name)); } catch (_) {} }
  }

  function tickCam(R) {
    const now = Date.now();
    // 1) apakah ada data baru? (ukuran berkas terbaru bertambah)
    const segs = listSegs(R.dir).filter((x) => x.size > 0); const last = segs[segs.length - 1];
    const sig = last ? `${last.name}:${last.size}` : '';
    if (sig && sig !== R.sig && R.proc && !R.killing) { R.sig = sig; R.lastDataAt = now; if (!R.hadData) { R.hadData = true; R.state = 'ok'; log('INFO', `Rekaman kejadian ${R.name}: buffer berjalan.`); } else if (R.state === 'putus' || R.state === 'mulai') recovered(R, now); }
    else if (sig !== R.sig) R.sig = sig;
    // 2) macet atau putus?
    if (R.hadData) {
      const age = now - R.lastDataAt;
      if (R.proc && !R.killing && now - Math.max(R.lastDataAt, R.startedAt) > T.stallSec * 1000) killFfmpeg(R); // macet: tidak ada data sejak ffmpeg dimulai/data terakhir
      if ((R.state === 'ok') && age > T.lostSec * 1000) beginLost(R, now).catch((e) => log('ERROR', `Rekaman kejadian ${R.name}: ${e.message}`));
    }
    // 3) (re)start ffmpeg
    if (!R.proc && now >= R.nextTryAt && now >= R.authUntil) {
      if (R.state === 'login') R.state = R.hadData ? 'putus' : 'mulai';
      const ok = startFfmpeg(R);
      R.fails = ok ? R.fails : R.fails + 1;
      const waits = [3000, 5000, 10000, 15000];
      R.nextTryAt = now + (ok ? 3000 : waits[Math.min(R.fails, waits.length - 1)]);
      if (!ok && !R.noInfoLogged) { R.noInfoLogged = true; log('WARN', `Rekaman kejadian ${R.name}: belum bisa mulai (${R.err}).`); }
      if (ok) R.noInfoLogged = false;
    }
    finishIfDue(R, now).catch((e) => log('ERROR', `Rekaman kejadian ${R.name}: ${e.message}`));
    clean(R, now);
  }

  function reconcile() {
    let list = []; try { list = listCams() || []; } catch (_) { list = []; }
    const ids = new Set();
    let n = 0;
    for (const c of list) {
      if (!c || !ID_RE.test(String(c.id))) continue;
      ids.add(c.id);
      let R = cams.get(c.id);
      if (!R) { R = mkCam(c); R.nextTryAt = Date.now() + 300 * (n++); cams.set(c.id, R); }
      R.name = c.name || R.name;
    }
    for (const [id, R] of cams) if (!ids.has(id)) { killFfmpeg(R); cams.delete(id); try { fs.rmSync(R.dir, { recursive: true, force: true }); } catch (_) {} }
  }

  // ---- Hapus klip yang lebih tua dari retentionDays (dihitung dari waktu kamera putus). Kejadian yang masih berlangsung tidak disentuh. ----
  function purgeOld() {
    if (!(retentionDays > 0)) return 0;
    const limit = Date.now() - retentionDays * 86400000;
    let removed = 0, dirs = [];
    try { dirs = fs.readdirSync(out, { withFileTypes: true }).filter((e) => e.isDirectory() && /\([0-9a-f]{8}\)$/.test(e.name)); } catch (_) { return 0; }
    for (const d of dirs) {
      const dp = path.join(out, d.name);
      let names = []; try { names = fs.readdirSync(dp); } catch (_) { continue; }
      for (const n of names) {
        const m = /^(\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d)\.json$/.exec(n); if (!m) continue;
        try {
          const j = JSON.parse(fs.readFileSync(path.join(dp, n), 'utf8'));
          if (!j || j.status === 'berlangsung' || !j.lostAt) continue;
          if (new Date(j.lostAt).getTime() >= limit) continue;
          for (const ext of ['.mp4', '.web.mp4', '.web.tmp.mp4', '.json']) { try { fs.unlinkSync(path.join(dp, m[1] + ext)); } catch (_) {} }
          removed++;
        } catch (_) {}
      }
    }
    if (removed) { listCache.at = 0; log('INFO', `Rekaman kejadian: ${removed} klip lebih tua dari ${retentionDays} hari dihapus otomatis.`); }
    return removed;
  }

  // ---- Pemulihan saat program dinyalakan: kejadian yang belum selesai ditandai ----
  function recoverOnStart() {
    let dirs = []; try { dirs = fs.readdirSync(out, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch (_) { return; }
    for (const d of dirs) {
      const dp = path.join(out, d.name);
      let names = []; try { names = fs.readdirSync(dp); } catch (_) { continue; }
      for (const n of names) {
        if (n.startsWith('_proses_')) { try { fs.rmSync(path.join(dp, n), { recursive: true, force: true }); } catch (_) {} continue; }
        if (!/\.json$/.test(n)) continue;
        try {
          const f = path.join(dp, n); const m = JSON.parse(fs.readFileSync(f, 'utf8'));
          if (m && m.status === 'berlangsung') { m.status = 'tidak-selesai'; m.catatan = (m.catatan ? m.catatan + ' ' : '') + 'Program Bardi Monitor berhenti/dimatikan sebelum kamera kembali menyala, jadi rekaman sesudah menyala tidak ada.'; writeJson(f, m); }
        } catch (_) {}
      }
    }
  }

  // ---- Untuk halaman ----
  let listCache = { at: 0, v: [] };
  function incidents() {
    if (Date.now() - listCache.at < 3000) return listCache.v;
    const res = [];
    let dirs = []; try { dirs = fs.readdirSync(out, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch (_) {}
    for (const d of dirs) {
      const m = /\(([0-9a-f]{8})\)$/.exec(d.name); if (!m) continue;
      let names = []; try { names = fs.readdirSync(path.join(out, d.name)); } catch (_) { continue; }
      for (const n of names) {
        if (!/^\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d\.json$/.test(n)) continue;
        try {
          const j = JSON.parse(fs.readFileSync(path.join(out, d.name, n), 'utf8'));
          if (!j || !j.lostAt) continue;
          const stamp = n.replace(/\.json$/, '');
          res.push({ id: m[1], stamp, name: j.camName || d.name, status: j.status, lostAt: j.lostAt, recoveredAt: j.recoveredAt, downSec: j.downSec, durationSec: j.durationSec, joins: j.joins || [], hevc: !!j.hevc, hasFile: !!j.file, file: j.file ? (j.webFile || j.file) : null, bersamaan: j.bersamaan || [], catatan: j.catatan || '' });
        } catch (_) {}
      }
    }
    res.sort((a, b) => (a.lostAt < b.lostAt ? 1 : -1));
    listCache = { at: Date.now(), v: res };
    return res;
  }
  function statusList() {
    return [...cams.values()].map((R) => ({ id: R.id, name: R.name, state: R.state, lastDataAt: R.lastDataAt || null, sejak: R.inc ? R.inc.lostAt : null, error: R.state === 'ok' ? '' : (R.err || '') }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'id', { numeric: true }));
  }
  function fileFor(id8, name) {
    if (!ID_RE.test(String(id8)) || !FILE_RE.test(String(name))) return null;
    let dirs = []; try { dirs = fs.readdirSync(out, { withFileTypes: true }); } catch (_) { return null; }
    const d = dirs.find((e) => e.isDirectory() && e.name.endsWith(`(${id8})`));
    if (!d) return null;
    const f = path.join(out, d.name, name);
    try { const st = fs.statSync(f); if (!st.isFile()) return null; return { path: f, size: st.size }; } catch (_) { return null; }
  }

  function start() {
    recoverOnStart();
    purgeOld();
    reconcile();
    timer = setInterval(() => { if (stopped) return; for (const R of cams.values()) { try { tickCam(R); } catch (e) { log('ERROR', `Rekaman kejadian ${R.name}: ${e.message}`); } } }, T.tickMs);
    recTimer = setInterval(() => { if (!stopped) reconcile(); }, T.reconcileMs);
    purgeTimer = setInterval(() => { if (!stopped) purgeOld(); }, T.purgeMs); purgeTimer.unref && purgeTimer.unref();
    timer.unref && timer.unref(); recTimer.unref && recTimer.unref();
    process.once('exit', () => { for (const R of cams.values()) { try { if (R.proc) R.proc.kill(); } catch (_) {} } }); // jangan tinggalkan ffmpeg yatim
    log('INFO', `Rekaman kejadian aktif. Klip disimpan di: ${out}`);
  }
  function stop() { stopped = true; clearInterval(timer); clearInterval(recTimer); clearInterval(purgeTimer); for (const R of cams.values()) killFfmpeg(R); }

  return { start, stop, incidents, statusList, fileFor, purgeOld, retentionDays, dir: out };
}

module.exports = { createIncidentRecorder };
