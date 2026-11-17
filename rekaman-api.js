// API halaman Rekaman (hanya membaca; semua di balik login yang sama dengan halaman lain).
//   GET /api/rekaman/ringkasan                       -> status perekam per kamera + penyimpanan
//   GET /api/rekaman/hari?id=<id8>&tgl=YYYY-MM-DD    -> potongan rekaman hari itu, kamera mati (tanda merah), daftar hari yang ada rekamannya
//   GET /rekaman/f/<id8>/<YYYY-MM-DD>/<HH-MM-SS>.mp4 -> satu potongan (+-10 menit) sebagai MP4 yang bisa digeser (Range). Dibuat dari berkas .ts
//        dengan ffmpeg SALINAN (tanpa mengubah kualitas), hasilnya disimpan sementara di folder sementara dan dibersihkan otomatis.
//        Kamera H.265 diubah ke H.264 supaya bisa diputar di browser (lebih lambat, memakai prosesor).
// Pemutaran memakai potongan utuh (bukan aliran) supaya menggeser, putar cepat, dan iPhone/Safari berjalan seperti video biasa.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ID_RE = /^[0-9a-f]{8}$/, DAY_RE = /^\d{4}-\d\d-\d\d$/, SEG_RE = /^\d\d-\d\d-\d\d$/;
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shiftDay = (tgl, n) => { const [y, m, d] = tgl.split('-').map(Number); return dayOf(new Date(y, m - 1, d + n, 12).getTime()); };
const dayStart = (tgl) => { const [y, m, d] = tgl.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };

function createRekamanApi({ rec, rootDir, ffmpegPath, log, cacheDir, cacheMaxBytes = 3 * 1024 * 1024 * 1024, copyTimeoutMs = 90000, hevcTimeoutMs = 480000 }) {
  const cache = cacheDir || path.join(os.tmpdir(), 'bardi-rekaman-cache');
  try { fs.rmSync(cache, { recursive: true, force: true }); } catch (_) {}
  try { fs.mkdirSync(cache, { recursive: true }); } catch (e) { log('ERROR', `Rekaman: gagal membuat folder sementara: ${e.message}`); }
  const findFfmpeg = () => { if (ffmpegPath) return ffmpegPath; const local = path.join(rootDir, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'); return fs.existsSync(local) ? local : 'ffmpeg'; };
  const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); };
  const json = (res, obj) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(obj));

  // ---------- Kamera mati (tanda merah): pasangkan "putus" dengan "tersambung" dari catatan rekaman ----------
  async function matiUntuk(id, tgl) {
    const evs = [];
    for (const d of [shiftDay(tgl, -1), tgl, shiftDay(tgl, 1)]) { try { for (const e of await rec.events(d)) evs.push(e); } catch (_) {} }
    evs.sort((a, b) => (a.t < b.t ? -1 : 1));
    const from = dayStart(tgl), to = from + 86400000, out = [], open = new Map(), lain = [];
    for (const e of evs) {
      if (e.id && e.id !== id) continue;
      const t = Date.parse(e.t);
      if (e.jenis === 'putus') { const it = { dari: Date.parse(e.sejak || e.t), sampai: null, alasan: e.alasan || '' }; open.set(e.id, it); out.push(it); }
      else if (e.jenis === 'tersambung' && open.has(e.id)) { open.get(e.id).sampai = t; open.delete(e.id); }
      else if (!e.id && /^(drive-hilang|drive-kembali|drive-cadangan|disk-penuh|disk-pulih|program-mulai|program-berhenti)$/.test(e.jenis) && t >= from && t < to) lain.push({ t, jenis: e.jenis });
    }
    const st = rec.statusList().find((s) => s.id === id);
    const sekarang = Date.now();
    const mati = out.filter((m) => m.dari < to && (m.sampai || sekarang) > from).map((m) => ({ dari: m.dari, sampai: m.sampai, alasan: m.alasan, berlangsung: !m.sampai && !!st && st.state !== 'merekam' }));
    return { mati, lain };
  }

  // ---------- Potongan -> MP4 ----------
  const jobs = new Map(); // kunci -> Promise<{file,size}>
  let copyRun = 0, tcRun = 0; const waitQ = [];
  const slot = (heavy) => new Promise((res) => { const go = () => { if (heavy ? tcRun < 1 : copyRun < 2) { if (heavy) tcRun++; else copyRun++; res(() => { if (heavy) tcRun--; else copyRun--; const n = waitQ.shift(); if (n) n(); }); } else waitQ.push(go); }; go(); });
  const codecCache = new Map(); // id -> {hevc, at}
  function probeHevc(file) {
    return new Promise((resolve) => {
      let err = ''; let p; try { p = spawn(findFfmpeg(), ['-hide_banner', '-i', file], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); } catch (_) { return resolve(false); }
      const to = setTimeout(() => { try { p.kill(); } catch (_) {} }, 15000);
      p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
      p.on('error', () => { clearTimeout(to); resolve(false); });
      p.on('exit', () => { clearTimeout(to); resolve(/Video:\s*(hevc|h265)/i.test(err)); });
    });
  }
  // Setiap proses ffmpeg punya batas waktu: kalau macet (misalnya hardisk USB tersendat) dihentikan paksa supaya antrean tidak ikut macet.
  function runFf(args, cwd, timeoutMs) {
    return new Promise((resolve) => {
      let err = '', done = false, timedOut = false, p;
      const fin = (r) => { if (done) return; done = true; clearTimeout(to); resolve(r); };
      try { p = spawn(findFfmpeg(), args, { cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { return resolve({ ok: false, err: e.message }); }
      const to = setTimeout(() => { timedOut = true; try { p.kill('SIGKILL'); } catch (_) {} setTimeout(() => fin({ ok: false, timedOut: true, err: 'melebihi batas waktu' }), 3000); }, timeoutMs || 120000);
      p.stderr.on('data', (d) => { err += d; if (err.length > 8000) err = err.slice(-4000); });
      p.on('error', (e) => fin({ ok: false, err: e.code === 'ENOENT' ? 'ffmpeg tidak ditemukan' : e.message }));
      p.on('exit', (c) => fin({ ok: c === 0 && !timedOut, timedOut, err: timedOut ? 'melebihi batas waktu' : err }));
    });
  }

  // ss = mulai dari detik ke-berapa di dalam potongan (0 = dari awal); hv = browser bisa memutar H.265 langsung.
  async function siapkan(id, tgl, nama, ss = 0, hv = false) {
    const src = await rec.segmentPath(id, tgl, nama);
    if (!src) return null;
    let st; try { st = await fs.promises.stat(src); } catch (_) { return null; }
    if (st.size < 1000) return null;
    ss = Math.max(0, Math.min(86400, Math.floor(Number(ss) || 0)));
    // codec kamera diperiksa dari isi berkas yang sebenarnya (bukan dari daftar ONVIF, yang bisa salah menulis H264)
    let c = codecCache.get(id); if (!c || Date.now() - c.at > 600000) { c = { hevc: await probeHevc(src), at: Date.now() }; codecCache.set(id, c); }
    const mode = c.hevc ? (hv ? 'h' : 't') : 'c'; // c = salin H.264, h = salin H.265 (browser memutar sendiri), t = ubah H.265 -> H.264
    const key = `${id}_${tgl}_${nama}_${st.size}_${ss}_${mode}`;
    const out = path.join(cache, key + '.mp4');
    try { const o = await fs.promises.stat(out); if (o.size > 0) { fs.promises.utimes(out, new Date(), new Date()).catch(() => {}); return { file: out, size: o.size }; } } catch (_) {}
    if (jobs.has(key)) return jobs.get(key);
    const job = (async () => {
      const release = await slot(mode === 't');
      try {
        const tmp = out + '.tmp.mp4';
        const args = ['-y', '-hide_banner', '-loglevel', 'error', ...(ss > 0 ? ['-ss', String(ss)] : []), '-i', src, '-map', '0:v:0', '-an',
          ...(mode === 't' ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p'] : mode === 'h' ? ['-c', 'copy', '-tag:v', 'hvc1'] : ['-c', 'copy']), '-movflags', '+faststart', '-f', 'mp4', tmp];
        const r = await runFf(args, cache, mode === 't' ? hevcTimeoutMs : copyTimeoutMs); // salin: 90 dtk; ubah H.265->H.264: 8 menit
        if (!r.ok) { log('WARN', `Rekaman: gagal menyiapkan ${id} ${tgl} ${nama} (mulai ${ss} dtk, mode ${mode})${r.timedOut ? ' (melebihi batas waktu, dihentikan)' : ''}: ${String(r.err).replace(/\/\/[^@\s\/]*@/g, '//***@').slice(-160)}`); try { fs.rmSync(tmp, { force: true }); } catch (_) {} return null; }
        fs.renameSync(tmp, out);
        const o = fs.statSync(out); trim();
        return { file: out, size: o.size };
      } finally { release(); }
    })();
    jobs.set(key, job);
    try { return await job; } finally { jobs.delete(key); }
  }
  function trim() { // jaga folder sementara tidak lebih dari batas: hapus yang paling lama dipakai
    try {
      const items = fs.readdirSync(cache).filter((n) => n.endsWith('.mp4') && !n.endsWith('.tmp.mp4')).map((n) => { const s = fs.statSync(path.join(cache, n)); return { n, size: s.size, t: s.mtimeMs }; }).sort((a, b) => a.t - b.t);
      let tot = items.reduce((a, b) => a + b.size, 0);
      for (const it of items) { if (tot <= cacheMaxBytes) break; try { fs.unlinkSync(path.join(cache, it.n)); tot -= it.size; } catch (_) {} }
    } catch (_) {}
  }

  function serveFile(req, res, f) {
    let start = 0, end = f.size - 1, code = 200;
    const rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (rg && (rg[1] || rg[2])) {
      if (rg[1] === '') start = Math.max(0, f.size - Number(rg[2])); else { start = Number(rg[1]); if (rg[2]) end = Math.min(end, Number(rg[2])); }
      if (!(start <= end && start < f.size)) { res.writeHead(416, { 'Content-Range': 'bytes */' + f.size }); return res.end(); }
      code = 206;
    }
    const h = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff' };
    if (code === 206) h['Content-Range'] = `bytes ${start}-${end}/${f.size}`;
    res.writeHead(code, h);
    const st = fs.createReadStream(f.file, { start, end });
    st.on('error', () => { try { res.destroy(); } catch (_) {} });
    res.on('close', () => st.destroy());
    st.pipe(res);
  }

  // ---------- Pintu masuk ----------
  async function handle(req, res, url, p) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    if (p === '/api/rekaman/ringkasan') { json(res, { ok: true, kamera: rec.statusList(), simpan: rec.storage(), sekarang: Date.now() }); return true; }
    if (p === '/api/rekaman/hari') {
      const id = url.searchParams.get('id'), tgl = url.searchParams.get('tgl');
      if (!ID_RE.test(String(id)) || !DAY_RE.test(String(tgl))) { json(res, { ok: false, error: 'Kamera atau tanggal tidak valid.' }); return true; }
      const [segs, hari, m] = await Promise.all([rec.segments(id, tgl), rec.hariAda(id), matiUntuk(id, tgl)]);
      json(res, { ok: true, id, tgl, sekarang: Date.now(), segDetik: rec.settings.segmenDetik,
        segmen: segs.map((s) => ({ f: s.file.replace('.ts', ''), m: s.startMs, a: s.endMs, u: s.size, b: s.berlangsung })), hari, mati: m.mati, lain: m.lain });
      return true;
    }
    const m = /^\/rekaman\/f\/([0-9a-f]{8})\/(\d{4}-\d\d-\d\d)\/(\d\d-\d\d-\d\d)\.mp4$/.exec(p);
    if (m) {
      if (!SEG_RE.test(m[3])) { send(res, 404, 'text/plain; charset=utf-8', 'Tidak ada'); return true; }
      const f = await siapkan(m[1], m[2], m[3] + '.ts', url.searchParams.get('ss'), url.searchParams.get('hv') === '1');
      if (!f) { send(res, 404, 'text/plain; charset=utf-8', 'Potongan tidak ada atau gagal disiapkan.'); return true; }
      serveFile(req, res, f); return true;
    }
    return false;
  }
  return { handle, siapkan, cache };
}

module.exports = { createRekamanApi };
