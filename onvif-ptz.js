// Kontrol PTZ (geser/zoom) lewat ONVIF untuk halaman Multiview.
// Sambungan ke kamera disimpan sementara (10 menit) supaya tombol terasa cepat. Gerakan berhenti otomatis kalau tidak diperbarui
// (pengaman jika tombol dilepas tapi perintah berhenti tidak sampai).
'use strict';
let Cam = null;
try { ({ Cam } = require('onvif')); } catch (_) { Cam = null; }

const clamp = (n) => { n = Number(n); if (!isFinite(n)) return 0; return Math.max(-1, Math.min(1, n)); };
const ID_RE = /^[0-9a-f]{8}$/;
const XY_GENERIC = 'http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace';
const Z_GENERIC = 'http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace';
const SPACE_ERR = /space|invalid|argument|InvalidArgVal/i;

// Beberapa kamera menolak gerakan tanpa menyebut "space" (jenis satuan kecepatan) dan menjawab "Invalid space".
// Daftar space yang didukung dibaca dari kamera (GetNodes); kalau gagal dipakai nama standar ONVIF, terakhir tanpa space.
function discover(cam) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 3000);
    try {
      cam.getNodes((err, nodes, xml) => {
        if (done) return; done = true; clearTimeout(t);
        if (err || !xml) return resolve(null);
        const x = String(xml);
        const xy = /ContinuousPanTiltVelocitySpace[^>]*>\s*<[^>]*URI[^>]*>\s*([^<\s]+)/i.exec(x);
        const z = /ContinuousZoomVelocitySpace[^>]*>\s*<[^>]*URI[^>]*>\s*([^<\s]+)/i.exec(x);
        resolve({ xy: xy && xy[1], zoom: z && z[1] });
      });
    } catch (_) { if (!done) { done = true; clearTimeout(t); resolve(null); } }
  });
}


function createPtz({ getTarget, log, camClass, connectTimeout = 6000, idleMs = 600000, safetyMs = 2500 }) {
  const CamC = camClass || Cam;
  const conns = new Map(); // id -> { key, promise, t }
  const variants = new Map(); // id|key -> { list, vi }
  const timers = new Map(); // id -> timeout pengaman

  function connect(id) {
    const tg = getTarget(id);
    if (!tg || tg.password == null) return Promise.reject(new Error(!tg ? 'Kamera tidak ditemukan' : 'Password tersimpan tidak terbaca'));
    const key = `${tg.host}:${tg.port}:${tg.username}`;
    const cur = conns.get(id);
    if (cur && cur.key === key && Date.now() - cur.t < idleMs) { cur.t = Date.now(); return cur.promise; }
    if (!CamC) return Promise.reject(new Error('Pustaka ONVIF belum terpasang'));
    const promise = new Promise((resolve, reject) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; reject(new Error('Kamera tidak menjawab')); } }, connectTimeout + 4000);
      try {
        // eslint-disable-next-line no-new
        new CamC({ hostname: tg.host, port: tg.port, username: tg.username, password: tg.password, timeout: connectTimeout, preserveAddress: true }, function onConnect(err) {
          if (done) return; done = true; clearTimeout(t);
          if (err) return reject(new Error(err.message || 'Gagal tersambung'));
          if (!(this.uri && this.uri.ptz)) return reject(Object.assign(new Error('Kamera ini tidak melaporkan fitur PTZ (geser/zoom)'), { noPtz: true }));
          try {
            const pr = (this.profiles || []).map((x) => `${(x.$ && x.$.token) || '?'}${x.PTZConfiguration ? '(PTZ)' : ''}`).join(',');
            if (log) log('INFO', `PTZ ${id}: tersambung ONVIF; profil aktif=${this.activeSource && this.activeSource.profileToken}; profil=[${pr}]; alamat PTZ=${this.uri.ptz && (this.uri.ptz.href || this.uri.ptz.path)}`);
          } catch (_) {}
          resolve(this);
        });
      } catch (e) { if (!done) { done = true; clearTimeout(t); reject(e); } }
    });
    const ent = { key, promise, t: Date.now() };
    conns.set(id, ent);
    promise.catch(() => { if (conns.get(id) === ent) conns.delete(id); });
    return promise;
  }

  const call = (cam, fn, opt) => new Promise((resolve, reject) => { cam[fn](opt, (err) => (err ? reject(err) : resolve())); });

  async function stop(id) {
    if (!ID_RE.test(String(id))) return { ok: false, error: 'ID kamera tidak valid' };
    if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
    try { const cam = await connect(id); await call(cam, 'stop', { panTilt: true, zoom: true }); return { ok: true }; }
    catch (e) { conns.delete(id); return { ok: false, error: String(e.message || e).slice(0, 160) }; }
  }

  async function variantsOf(id, cam) {
    const tg = getTarget(id); const key = id + '|' + (tg ? `${tg.host}:${tg.port}` : '');
    let v = variants.get(key);
    if (!v) {
      const d = await discover(cam); const list = [];
      if (log) log('INFO', `PTZ ${id}: satuan kecepatan dari kamera: ${d ? JSON.stringify(d) : 'tidak terbaca (GetNodes gagal)'}`);
      if (d && (d.xy || d.zoom)) list.push({ xyspace: d.xy || XY_GENERIC, zoomspace: d.zoom || Z_GENERIC });
      if (!list.length || list[0].xyspace !== XY_GENERIC || list[0].zoomspace !== Z_GENERIC) list.push({ xyspace: XY_GENERIC, zoomspace: Z_GENERIC });
      list.push({});
      v = { list, vi: 0 }; variants.set(key, v);
    }
    return v;
  }

  // Pemeriksaan sekali per kamera untuk log: konfigurasi PTZ yang ada di kamera dan posisi sebelum/sesudah gerak.
  const probed = new Set();
  const statusOf = (cam) => new Promise((resolve) => {
    const t = setTimeout(() => resolve('tidak menjawab'), 2500);
    try { cam.getStatus({}, (err, st) => { clearTimeout(t); resolve(err ? 'galat: ' + String(err.message).slice(0, 80) : JSON.stringify(st && (st.position || st)).slice(0, 200)); }); } catch (e) { clearTimeout(t); resolve('galat: ' + e.message); }
  });
  async function probeBefore(id, cam) {
    if (!log || probed.has(id)) return false;
    probed.add(id);
    await new Promise((resolve) => {
      const t = setTimeout(() => { log('INFO', `PTZ ${id}: GetConfigurations tidak menjawab`); resolve(); }, 3000);
      try { cam.getConfigurations((err, cfg) => { clearTimeout(t); log('INFO', `PTZ ${id}: konfigurasi PTZ di kamera: ` + (err ? 'galat ' + String(err.message).slice(0, 100) : Object.keys(cfg || {}).join(',') || '(kosong)')); resolve(); }); } catch (e) { clearTimeout(t); resolve(); }
    });
    log('INFO', `PTZ ${id}: posisi sebelum gerak: ${await statusOf(cam)}`);
    return true;
  }

  async function move(id, p) {
    if (!ID_RE.test(String(id))) return { ok: false, error: 'ID kamera tidak valid' };
    const x = clamp(p && p.x), y = clamp(p && p.y), zoom = clamp(p && p.zoom);
    if (!x && !y && !zoom) return stop(id);
    try {
      const cam = await connect(id);
      const v = await variantsOf(id, cam);
      const first = await probeBefore(id, cam);
      let lastErr = null, okv = false;
      for (let k = v.vi; k < v.list.length; k++) {
        const opt = Object.assign({ x, y, zoom }, v.list[k]);
        if (zoom && !x && !y) opt.onlySendZoom = true; else if ((x || y) && !zoom) opt.onlySendPanTilt = true;
        try { await call(cam, 'continuousMove', opt); v.vi = k; okv = true; break; }
        catch (e) { lastErr = e; if (log) log('WARN', `PTZ ${id}: cara ${k + 1}/${v.list.length} ditolak: ${String(e && e.message).slice(0, 200)}`); if (!SPACE_ERR.test(String(e && e.message))) break; }
      }
      if (!okv) throw lastErr || new Error('PTZ gagal');
      if (first) { if (log) log('INFO', `PTZ ${id}: perintah gerak DITERIMA kamera (cara ${v.vi + 1}, x=${x} y=${y} zoom=${zoom}, profil=${cam.activeSource && cam.activeSource.profileToken})`); setTimeout(async () => { log('INFO', `PTZ ${id}: posisi sesudah gerak: ${await statusOf(cam)}`); }, 900).unref(); }
      if (timers.has(id)) clearTimeout(timers.get(id));
      const t = setTimeout(() => { timers.delete(id); stop(id).catch(() => {}); }, safetyMs); t.unref();
      timers.set(id, t);
      return { ok: true };
    } catch (e) {
      conns.delete(id);
      if (log) log('WARN', `PTZ ${id}: gagal: ${String(e && e.message).slice(0, 200)}`);
      return { ok: false, noPtz: !!e.noPtz, error: String(e.message || e).slice(0, 160) };
    }
  }

  return { move, stop, stopAll: () => { for (const id of [...timers.keys()]) stop(id).catch(() => {}); } };
}

module.exports = { createPtz };
