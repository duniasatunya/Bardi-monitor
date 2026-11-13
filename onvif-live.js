// Live view kamera ONVIF (HLS). ffmpeg menarik RTSP dari kamera dan MENYALIN video H.264 apa adanya (tanpa
// diolah ulang, jadi ringan) ke potongan HLS kecil di folder sementara. Hanya hidup selama ada penonton,
// dan otomatis menyambung ulang kalau kamera putus atau video macet.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ID_RE = /^[0-9a-f]{8}$/;
const FILE_RE = /^(live\.m3u8|seg\d{5}\.ts)$/;

function createOnvifLive({ log, rootDir, ffmpegPath, getCamera, maxSessions = 4, maxRealtime = 40, idleMs = 25000, stallMs = 15000, tmpBase, rtspTransport = 'tcp', forceTc = false }) {
  const base = tmpBase || path.join(os.tmpdir(), 'bardi-onvif-live');
  const sessions = new Map(); // id -> sesi
  try { fs.rmSync(base, { recursive: true, force: true }); } catch (_) {}

  const findFfmpeg = () => {
    if (ffmpegPath) return ffmpegPath;
    const local = path.join(rootDir, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    return fs.existsSync(local) ? local : 'ffmpeg';
  };
  const scrub = (txt, secrets) => { let t = String(txt || ''); for (const x of secrets) if (x) { t = t.split(x).join('***'); t = t.split(encodeURIComponent(x)).join('***'); } return t; };

  // Pilih profil: 'sub' = resolusi terkecil (hemat), 'main' = terbesar.
  // Profil H.264 (atau yang tidak menyebut kodek) diutamakan karena bisa disalin tanpa diolah. Kalau kamera hanya punya
  // profil H.265, profil itu tetap dipakai dan videonya diubah ke H.264 di PC (lihat needTc).
  function pickProfile(cam, quality) {
    const all = (cam.profiles || []).filter((p) => p.rtsp);
    let list = all.filter((p) => !p.codec || /264/.test(p.codec));
    if (!list.length) list = all.filter((p) => /265|hevc/i.test(p.codec || ''));
    if (!list.length) return null;
    const px = (p) => (p.width || 0) * (p.height || 0);
    const sorted = list.slice().sort((a, b) => px(a) - px(b));
    return quality === 'main' ? sorted[sorted.length - 1] : sorted[0];
  }

  function rtspUrl(cam, prof) {
    const u = new URL(prof.rtsp);
    u.username = cam.username; u.password = cam.password; // setter ini otomatis meng-encode karakter khusus
    return u.toString();
  }

  // Beberapa kamera melaporkan "H264" lewat ONVIF padahal stream-nya H.265 (HEVC), yang tidak bisa diputar browser.
  // Kodek sebenarnya dibaca dari stream (ffmpeg), disimpan sementara; kalau H.265, video diubah ke H.264 (butuh CPU).
  const codecCache = new Map(); // "id|rtsp" -> { tc, t }
  const ckey = (id, prof) => `${id}|${prof.rtsp}`;
  const needTc = (id, prof) => { if (forceTc) return true; if (prof && /265|hevc/i.test(prof.codec || '')) return true; const c = codecCache.get(ckey(id, prof)); return !!(c && c.tc && Date.now() - c.t < 600000); };
  function ensureCodec(id, quality) {
    return new Promise((resolve) => {
      const cam = getCamera(id);
      const prof = cam && pickProfile(cam, quality === 'main' ? 'main' : 'sub');
      if (!cam || !prof || cam.password === null) return resolve();
      const c = codecCache.get(ckey(id, prof));
      if (c && Date.now() - c.t < 600000) return resolve();
      let done = false, err = '';
      const fin = (tc) => { if (done) return; done = true; clearTimeout(timer); try { p.kill(); } catch (_) {} if (tc !== null) codecCache.set(ckey(id, prof), { tc, t: Date.now() }); resolve(); };
      const p = spawn(findFfmpeg(), ['-hide_banner', '-nostdin', '-rtsp_transport', rtspTransport, '-i', rtspUrl(cam, prof)], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      const timer = setTimeout(() => fin(null), 12000);
      p.on('error', () => fin(null));
      p.stderr.on('data', (d) => { err = (err + d).slice(-4000); const m = /Stream #\d+:\d+[^\n]*?: Video: (\w+)/.exec(err); if (m) { const k = m[1].toLowerCase(); fin(k === 'hevc' || k === 'h265'); } });
      p.on('exit', () => fin(null));
    });
  }
  // Argumen video: salin langsung (H.264) atau ubah ke H.264 (H.265). Hemat: kualitas 'sub' diperkecil ke 360p, 'main' maksimal 1080p.
  const videoArgs = (tc, quality) => tc
    ? ['-vf', quality === 'main' ? 'scale=-2:min(1080\\,ih)' : 'scale=-2:360', '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '26', '-g', '30', '-bf', '0']
    : ['-c:v', 'copy'];

  const playlistInfo = (s) => {
    try {
      const f = path.join(s.dir, 'live.m3u8');
      const m = fs.readFileSync(f, 'utf8');
      return { segs: (m.match(/\.ts/g) || []).length, mtime: fs.statSync(f).mtimeMs };
    } catch (_) { return { segs: 0, mtime: 0 }; }
  };

  function launch(s) {
    try { fs.rmSync(s.dir, { recursive: true, force: true }); } catch (_) {}
    fs.mkdirSync(s.dir, { recursive: true });
    const cam = getCamera(s.id);
    const prof = cam && pickProfile(cam, s.quality);
    if (!cam || !prof || cam.password === null) { s.lastErr = !cam ? 'Kamera tidak ditemukan' : (cam.password === null ? 'Password tersimpan tidak terbaca' : (!(cam.profiles || []).length ? 'Kamera belum tersambung ONVIF (lihat statusnya di daftar)' : 'Kamera tidak punya profil video yang bisa dipakai (H.264 atau H.265)')); return false; }
    s.profName = prof.name; s.profInfo = `${prof.width || '?'}x${prof.height || '?'}`;
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin',
      '-rtsp_transport', rtspTransport, '-fflags', '+genpts+discardcorrupt', '-use_wallclock_as_timestamps', '1',
      '-i', rtspUrl(cam, prof), '-map', '0:v:0', ...videoArgs(needTc(s.id, prof), s.quality), '-map', '0:a:0?', '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '16000',
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_flags', 'delete_segments+independent_segments+omit_endlist',
      '-hls_segment_filename', path.join(s.dir, 'seg%05d.ts'), path.join(s.dir, 'live.m3u8')];
    s.lastErr = ''; s.secrets = [cam.password, cam.username];
    const p = spawn(findFfmpeg(), args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    s.proc = p; s.startedAt = Date.now();
    p.stderr.on('data', (d) => { s.lastErr = scrub((s.lastErr + d).slice(-600), s.secrets); });
    p.on('error', (e) => { s.lastErr = e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message; if (s.proc === p) s.proc = null; });
    p.on('exit', (code) => { if (s.proc === p) { s.proc = null; if (!s.stopping) log('WARN', `Live ${s.id}: ffmpeg berhenti (kode ${code}): ${String(s.lastErr).trim().slice(0, 200)}`); } });
    return true;
  }

  function supervise(s) {
    if (s.stopping) return;
    const now = Date.now();
    if (now - s.lastAccess > idleMs) return stop(s.id, 'tidak ada penonton');
    if (s.proc) {
      // macet: proses hidup tapi playlist tidak diperbarui
      const pl = playlistInfo(s);
      const ref = pl.mtime || s.startedAt;
      if (now - ref > stallMs + (pl.mtime ? 0 : 10000)) { s.lastErr = 'Video dari kamera macet'; log('WARN', `Live ${s.id}: video macet, menyambung ulang`); try { s.proc.kill(); } catch (_) {} }
      return;
    }
    // proses mati: coba lagi dengan jeda bertahap selama masih ada penonton
    if (now < s.retryAt) return;
    s.fails += 1; s.retryAt = now + Math.min(2000 * s.fails, 15000);
    if (!launch(s)) { /* alasan ada di lastErr; dicoba lagi nanti */ }
  }

  async function start(id, quality) {
    if (ID_RE.test(String(id)) && !sessions.has(id)) await ensureCodec(id, quality);
    return startNow(id, quality);
  }
  function startNow(id, quality) {
    if (!ID_RE.test(String(id))) return Promise.resolve({ ok: false, error: 'ID kamera tidak valid' });
    quality = quality === 'main' ? 'main' : 'sub';
    let s = sessions.get(id);
    if (s && s.quality !== quality) { stop(id, 'ganti kualitas'); s = null; }
    if (!s) {
      if (sessions.size >= maxSessions) return Promise.resolve({ ok: false, error: `Batas ${maxSessions} live view sekaligus. Tutup salah satu dulu.` });
      s = { id, quality, dir: path.join(base, id), proc: null, lastAccess: Date.now(), startedAt: 0, fails: 0, retryAt: 0, lastErr: '', stopping: false, timer: null, secrets: [], waiters: null };
      sessions.set(id, s);
      s.timer = setInterval(() => supervise(s), 3000); s.timer.unref();
      if (!launch(s)) { const e = s.lastErr; stop(id, 'gagal mulai'); return Promise.resolve({ ok: false, error: e }); }
    }
    s.lastAccess = Date.now();
    if (playlistInfo(s).segs >= 2) return Promise.resolve({ ok: true, profile: s.profName, info: s.profInfo });
    if (s.waiters) return s.waiters;
    s.waiters = new Promise((resolve) => {
      const t0 = Date.now();
      const w = setInterval(() => {
        const done = (r) => { clearInterval(w); s.waiters = null; resolve(r); };
        if (s.stopping) return done({ ok: false, error: 'Dihentikan' });
        if (playlistInfo(s).segs >= 2) return done({ ok: true, profile: s.profName, info: s.profInfo });
        if (!s.proc && s.fails >= 2) { const e = s.lastErr.trim() || 'ffmpeg berhenti'; stop(id, 'gagal tersambung'); return done({ ok: false, error: e }); }
        if (Date.now() - t0 > 30000) { const e = s.lastErr.trim() || 'Tidak ada video dari kamera dalam 30 detik'; stop(id, 'timeout'); return done({ ok: false, error: e }); }
        s.lastAccess = Date.now();
      }, 300);
    });
    return s.waiters;
  }

  function stop(id, why) {
    const s = sessions.get(id); if (!s) return;
    s.stopping = true; clearInterval(s.timer); sessions.delete(id);
    if (s.proc) { const p = s.proc; s.proc = null; try { p.kill(); } catch (_) {} }
    log('INFO', `Live ${id} dihentikan (${why || 'selesai'})`);
    setTimeout(() => { try { fs.rmSync(s.dir, { recursive: true, force: true }); } catch (_) {} }, 600).unref();
  }

  function file(id, name) {
    const s = sessions.get(id);
    if (!s || !FILE_RE.test(name)) return null;
    s.lastAccess = Date.now();
    try { return { body: fs.readFileSync(path.join(s.dir, name)), type: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t' }; } catch (_) { return null; }
  }

  // ---- Real-time (fMP4 mengalir lewat HTTP ke MediaSource di browser): tiap penonton punya ffmpeg sendiri ----
  let rtActive = 0;
  const rtFail = (res, code, msg) => { if (res.headersSent) { try { res.end(); } catch (_) {} return; } res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(msg); };
  async function realtime(id, quality, req, res, audio = true, small = false) {
    if (!ID_RE.test(String(id))) return rtFail(res, 400, 'ID kamera tidak valid');
    let gone0 = false; const g0 = () => { gone0 = true; }; req.on('close', g0);
    await ensureCodec(id, quality === 'main' ? 'main' : 'sub');
    req.removeListener('close', g0); if (gone0) return;
    if (rtActive >= maxRealtime) return rtFail(res, 429, `Batas ${maxRealtime} siaran real-time sekaligus tercapai.`);
    const cam = getCamera(id);
    const prof = cam && pickProfile(cam, quality === 'main' ? 'main' : 'sub');
    if (!cam || !prof || cam.password === null) return rtFail(res, 503, !cam ? 'Kamera tidak ditemukan' : (cam.password === null ? 'Password tersimpan tidak terbaca' : (!(cam.profiles || []).length ? 'Kamera belum tersambung ONVIF (lihat statusnya di daftar)' : 'Kamera tidak punya profil video yang bisa dipakai (H.264 atau H.265)')));
    const secrets = [cam.password, cam.username];
    // fMP4 dipecah per 100 ms supaya tidak menunggu satu GOP penuh. Frame non-keyframe di awal otomatis dibuang ffmpeg (stream copy).
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin',
      '-rtsp_transport', rtspTransport, '-fflags', 'nobuffer+genpts+discardcorrupt', '-flags', 'low_delay', '-use_wallclock_as_timestamps', '1',
      '-i', rtspUrl(cam, prof), '-map', '0:v:0', ...videoArgs(needTc(id, prof) || (small && quality !== 'main' && (prof.width || 0) > 800), quality === 'main' ? 'main' : 'sub'), ...(audio ? ['-map', '0:a:0?', '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-ar', '16000'] : ['-an']),
      '-f', 'mp4', '-movflags', 'empty_moov+default_base_moof', '-frag_duration', '100000', '-flush_packets', '1', 'pipe:1'];
    const p = spawn(findFfmpeg(), args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    rtActive++;
    let err = '', sent = false, closed = false, firstTimer = null;
    const finish = () => { if (closed) return; closed = true; rtActive--; if (firstTimer) clearTimeout(firstTimer); try { p.kill(); } catch (_) {} };
    firstTimer = setTimeout(() => { if (!sent) { const e = scrub(err.trim(), secrets) || 'Tidak ada video dari kamera dalam 25 detik'; finish(); rtFail(res, 504, e); } }, 25000);
    p.stderr.on('data', (d) => { err = (err + d).slice(-600); });
    p.on('error', (e) => { err = e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message; finish(); rtFail(res, 500, err); });
    p.stdout.on('data', (chunk) => {
      if (closed) return;
      if (!sent) { sent = true; clearTimeout(firstTimer); res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); log('INFO', `Live real-time ${id} dimulai (${prof.name} ${prof.width || '?'}x${prof.height || '?'})`); }
      if (res.writableLength > 4 * 1024 * 1024) { log('WARN', `Live real-time ${id}: penonton terlalu lambat, diputus`); finish(); try { res.destroy(); } catch (_) {} return; }
      res.write(chunk);
    });
    p.on('exit', (code) => {
      if (closed) return;
      const e = scrub(err.trim(), secrets);
      if (sent) log('WARN', `Live real-time ${id} berakhir (kode ${code}): ${e.slice(0, 160)}`);
      const was = sent; finish();
      if (was) { try { res.end(); } catch (_) {} } else rtFail(res, 502, e || 'ffmpeg berhenti');
    });
    const gone = () => { if (!closed) { finish(); log('INFO', `Live real-time ${id} dihentikan (penonton menutup)`); } };
    req.on('close', gone); res.on('close', gone);
  }
  const realtimeCount = () => rtActive;

  // Diagnosa: baca info stream kamera (codec, profil, level, galat decode) selama ~4 detik, tanpa menyimpan apa pun.
  function diag(id, quality) {
    return new Promise((resolve) => {
      if (!ID_RE.test(String(id))) return resolve({ ok: false, error: 'ID kamera tidak valid' });
      const cam = getCamera(id);
      const prof = cam && pickProfile(cam, quality === 'main' ? 'main' : 'sub');
      if (!cam || !prof || cam.password === null) return resolve({ ok: false, error: !cam ? 'Kamera tidak ditemukan' : 'Kamera belum siap (cek status di daftar)' });
      const secrets = [cam.password, cam.username];
      const p = spawn(findFfmpeg(), ['-hide_banner', '-nostdin', '-rtsp_transport', rtspTransport, '-i', rtspUrl(cam, prof), '-t', '4', '-f', 'null', '-'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => { err = (err + d).slice(-8000); });
      const timer = setTimeout(() => { try { p.kill(); } catch (_) {} }, 15000);
      p.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.code === 'ENOENT' ? 'ffmpeg belum terpasang' : e.message }); });
      p.on('exit', (code) => {
        clearTimeout(timer);
        const lines = scrub(err.replace(/\/\/[^@\s\/]*@/g, '//***@'), secrets.filter((x) => x && String(x).length >= 5)).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !/^(ffmpeg version|built with|configuration:|lib\w+ |frame=|Stream mapping|Stream #0:\d+ ->|Output #0|encoder|Metadata:|Press )/.test(x));
        resolve({ ok: true, profile: `${prof.name || ''} ${prof.width || ''}x${prof.height || ''}`.trim(), code, lines: lines.slice(-30).map((x) => x.slice(0, 220)) });
      });
    });
  }

  const status = () => [...sessions.values()].map((s) => ({ id: s.id, quality: s.quality, running: !!s.proc, fails: s.fails, error: s.lastErr.trim().slice(0, 150) }));
  const stopAll = () => { for (const id of [...sessions.keys()]) stop(id, 'program berhenti'); };
  process.on('exit', () => { for (const s of sessions.values()) { try { s.proc && s.proc.kill(); } catch (_) {} } });

  return { start, stop, file, status, stopAll, realtime, realtimeCount, diag };
}

module.exports = { createOnvifLive };
