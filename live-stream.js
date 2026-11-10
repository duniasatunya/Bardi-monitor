// Siaran layar PC (HLS) untuk tombol "Lihat layar PC".
// ffmpeg menangkap layar terus-menerus, memotongnya jadi segmen video kecil di folder sementara,
// dan browser memutarnya dengan jeda beberapa detik di belakang aslinya (supaya lancar).
// Hanya hidup selama ada yang menonton; folder sementara dibersihkan saat berhenti.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function createLiveStream({ log, rootDir, ffmpegPath, inputArgs, fps = 15, width = 1280, idleMs = 25000 }) {
  const dir = path.join(os.tmpdir(), 'bardi-live');
  let proc = null, lastAccess = 0, idleTimer = null, startPromise = null, lastErr = '';

  const findFfmpeg = () => {
    if (ffmpegPath) return ffmpegPath;
    const local = path.join(rootDir, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(local)) return local;
    return 'ffmpeg'; // cari di PATH
  };
  const clean = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} };

  // Sisa ffmpeg dari script yang sebelumnya mati mendadak ikut dimatikan (hanya Windows).
  if (process.platform === 'win32') {
    try { spawnSync('taskkill', ['/F', '/IM', 'ffmpeg.exe'], { windowsHide: true, stdio: 'ignore' }); } catch (_) {}
  }
  clean();

  const stop = (why) => {
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
    if (proc) { const p = proc; proc = null; try { p.kill(); } catch (_) {} log('INFO', `Siaran layar PC dihentikan (${why})`); }
    startPromise = null;
    setTimeout(clean, 500).unref();
  };
  process.on('exit', () => { if (proc) { try { proc.kill(); } catch (_) {} } });

  const playlistReady = () => {
    try {
      const m = fs.readFileSync(path.join(dir, 'live.m3u8'), 'utf8');
      return (m.match(/\.ts/g) || []).length >= 2;
    } catch (_) { return false; }
  };

  function launch() {
    clean(); fs.mkdirSync(dir, { recursive: true });
    const input = inputArgs || ['-f', 'gdigrab', '-framerate', String(fps), '-draw_mouse', '0', '-i', 'desktop'];
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', ...input,
      '-vf', `scale=${width}:-2,format=yuv420p`, '-r', String(fps),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '30', '-g', String(fps * 2), '-sc_threshold', '0',
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_flags', 'delete_segments+independent_segments+omit_endlist',
      '-hls_segment_filename', path.join(dir, 'seg%05d.ts'), path.join(dir, 'live.m3u8')];
    lastErr = '';
    const p = spawn(findFfmpeg(), args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    proc = p;
    p.stderr.on('data', (d) => { lastErr = (lastErr + d).slice(-600); });
    p.on('error', (e) => { lastErr = e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message; if (proc === p) { proc = null; } });
    p.on('exit', (code) => {
      if (proc === p) { proc = null; log('WARN', `ffmpeg berhenti (kode ${code}): ${lastErr.trim().slice(0, 300)}`); }
    });
    lastAccess = Date.now();
    log('INFO', 'Siaran layar PC dimulai');
    idleTimer = setInterval(() => { if (Date.now() - lastAccess > idleMs) stop('tidak ada penonton'); }, 5000);
    idleTimer.unref();
  }

  // Mulai (kalau belum jalan) dan tunggu sampai ada segmen. Mengembalikan {ok, error}.
  function start() {
    lastAccess = Date.now();
    if (proc && playlistReady()) return Promise.resolve({ ok: true });
    if (startPromise) return startPromise;
    startPromise = new Promise((resolve) => {
      if (!proc) launch();
      const t0 = Date.now();
      const w = setInterval(() => {
        if (playlistReady()) { clearInterval(w); startPromise = null; resolve({ ok: true }); }
        else if (!proc) { clearInterval(w); startPromise = null; resolve({ ok: false, error: lastErr.trim() || 'ffmpeg berhenti' }); }
        else if (Date.now() - t0 > 25000) { clearInterval(w); startPromise = null; stop('timeout'); resolve({ ok: false, error: 'timeout menunggu video pertama' }); }
      }, 300);
    });
    return startPromise;
  }

  // Berkas yang boleh dibagikan: hanya live.m3u8 dan segXXXXX.ts di folder sementara.
  function file(name) {
    if (!/^(live\.m3u8|seg\d{5}\.ts)$/.test(name)) return null;
    lastAccess = Date.now();
    try {
      return { body: fs.readFileSync(path.join(dir, name)), type: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t' };
    } catch (_) { return null; }
  }

  return { start, file, stop };
}

module.exports = { createLiveStream };
