// Kamera ONVIF: penyimpanan konfigurasi, tes koneksi, dan pengecekan berkala dengan coba-ulang otomatis.
// Tahap 1: daftar kamera + tes koneksi. Password kamera TIDAK PERNAH dikirim ke browser.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const http = require('http');
const os = require('os');

let Cam = null;
let Discovery = null;
let libError = null;
try { ({ Cam, Discovery } = require('onvif')); } catch (e) { libError = e; }

const LIB_MSG = 'Pustaka ONVIF belum terpasang di PC ini. Jalankan PASANG-PUSTAKA-ONVIF.bat sekali, lalu buka ulang Bardi Monitor.';
const BACKOFF_SEC = [5, 10, 15, 30, 60];   // jeda coba-ulang kalau kamera tidak menjawab
const ONLINE_RECHECK_MS = 60 * 1000;       // kamera yang sehat dicek ulang tiap 1 menit
const MAX_PARALLEL = 4;
const PROBE_TIMEOUT_MS = 8000;

// ---------- validasi ----------
function isPrivateIPv4(h) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(h || ''));
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n, i) => n > 255 || String(n) !== m[i + 1])) return false;
  return o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168);
}
function cleanInput(inp, { needPassword }) {
  const name = String((inp && inp.name) || '').trim().slice(0, 60);
  const floor = String((inp && inp.floor) || '').trim().slice(0, 30);
  const host = String((inp && inp.host) || '').trim();
  const port = parseInt((inp && inp.port) || '80', 10);
  const username = String((inp && inp.username) || '').trim().slice(0, 64);
  const password = String((inp && inp.password) == null ? '' : inp.password).slice(0, 128);
  const errs = [];
  if (!isPrivateIPv4(host)) errs.push('IP harus alamat jaringan lokal, contoh 192.168.18.51 (atau 10.x.x.x / 172.16-31.x.x).');
  if (!(port >= 1 && port <= 65535)) errs.push('Port harus angka 1 sampai 65535.');
  if (needPassword && !password) errs.push('Password ONVIF belum diisi.');
  if (!username) errs.push('Username ONVIF belum diisi.');
  return { v: { name, floor, host, port, username, password }, errs };
}

// ---------- penerjemah galat ke bahasa awam ----------
function mapError(err) {
  const raw = String((err && (err.message || err.code)) || err || 'galat tidak dikenal').slice(0, 200);
  const code = err && err.code;
  const low = raw.toLowerCase();
  if (code === 'ECONNREFUSED') return { kind: 'refused', error: 'Port ditolak. ONVIF di kamera mungkin belum aktif, atau port salah.', detail: raw };
  if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH' || code === 'ENOTFOUND') return { kind: 'unreachable', error: 'Kamera tidak terjangkau dari PC. IP salah, kamera mati, atau beda jaringan.', detail: raw };
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || /timeout|timed out/.test(low)) return { kind: 'timeout', error: 'Tidak ada jawaban dari kamera. IP/port salah, kamera offline, atau ONVIF tidak aktif.', detail: raw };
  if (/not ?authorized|unauthorized|401|authentication|sender not|wrong password|invalid (user|password)/.test(low)) return { kind: 'auth', error: 'Username atau password ONVIF salah.', detail: raw };
  if (code === 'ECONNRESET') return { kind: 'reset', error: 'Sambungan diputus kamera. Coba lagi; kalau terus begini, kamera mungkin membatasi sambungan.', detail: raw };
  if (/wrong onvif soap|non-whitespace|invalid xml|unexpected|text data outside|html/.test(low)) return { kind: 'notonvif', error: 'Alamat itu menjawab tapi bukan ONVIF. Kemungkinan port salah.', detail: raw };
  return { kind: 'other', error: 'Gagal tersambung: ' + raw, detail: raw };
}

const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const noCreds = (uri, host) => {
  try {
    const u = new URL(String(uri));
    u.username = ''; u.password = '';
    if (isPrivateIPv4(host) && u.hostname !== host) u.hostname = host; // IP yang dilaporkan kamera bisa usang; pakai IP yang Anda isi
    return u.toString();
  } catch (_) { return String(uri || ''); }
};

// ---------- tes koneksi satu kamera ----------
function probe({ host, port, username, password }, timeoutMs = PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (!Cam) return resolve({ ok: false, kind: 'lib', error: LIB_MSG, detail: libError && libError.message, ms: 0 });
    const t0 = Date.now();
    let done = false;
    const finish = (r) => { if (done) return; done = true; clearTimeout(hard); r.ms = Date.now() - t0; resolve(r); };
    const hard = setTimeout(() => finish({ ok: false, ...mapError({ code: 'ETIMEDOUT', message: 'timeout' }) }), timeoutMs + 6000);
    try {
      // eslint-disable-next-line no-new
      new Cam({ hostname: host, port, username, password, timeout: timeoutMs, preserveAddress: true }, function onConnect(err) {
        if (err) return finish({ ok: false, ...mapError(err) });
        const cam = this;
        const info = {};
        const rawProfiles = Array.isArray(cam.profiles) ? cam.profiles.slice(0, 4) : [];
        const profiles = rawProfiles.map((p) => {
          const enc = p.videoEncoderConfiguration || {};
          const rc = enc.rateControl || {};
          const res = enc.resolution || {};
          return {
            token: p.$ && p.$.token, name: p.name || (p.$ && p.$.token) || '',
            codec: enc.encoding || null, width: num(res.width), height: num(res.height),
            fps: num(rc.frameRateLimit != null ? rc.frameRateLimit : rc.frameRate),
            bitrateKbps: num(rc.bitrateLimit != null ? rc.bitrateLimit : rc.bitRate),
            rtsp: null,
          };
        });
        const steps = [];
        steps.push(new Promise((r) => cam.getDeviceInformation((e, d) => {
          if (!e && d) Object.assign(info, { manufacturer: d.manufacturer, model: d.model, firmware: d.firmwareVersion, serial: d.serialNumber });
          r();
        })));
        profiles.forEach((p) => steps.push(new Promise((r) => {
          if (!p.token) return r();
          cam.getStreamUri({ protocol: 'RTSP', profileToken: p.token }, (e, d) => { if (!e && d && d.uri) p.rtsp = noCreds(d.uri, host); r(); });
        })));
        Promise.all(steps).then(() => {
          if (!profiles.length) return finish({ ok: false, kind: 'noprofile', error: 'Tersambung ke ONVIF, tapi kamera tidak melaporkan profil video.', detail: '' });
          finish({ ok: true, info, profiles });
        });
      });
    } catch (e) { finish({ ok: false, ...mapError(e) }); }
  });
}


// ---------- alat bantu cari port ----------
// 1) Cek port umum pada SATU IP: port mana yang terbuka dan jenisnya (ONVIF / web / RTSP / lain).
const COMMON_PORTS = [80, 81, 82, 8080, 8081, 8000, 8001, 8088, 8090, 8899, 2020, 5000, 7001, 9000, 554, 8554, 10554, 6668];
const tcpOpen = (host, port, ms) => new Promise((resolve) => {
  const s = net.connect({ host, port }); let d = false;
  const f = (v) => { if (d) return; d = true; try { s.destroy(); } catch (_) {} resolve(v); };
  s.setTimeout(ms, () => f(false)); s.on('connect', () => f(true)); s.on('error', () => f(false));
});
const SOAP_TIME = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/></s:Body></s:Envelope>';
// Urutan penting: RTSP dicek dulu dengan sambungan mentah, karena pengurai HTTP Node ikut menerima balasan berawalan "RTSP/1.0".
function rtspProbe(host, port, ms) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }); let buf = ''; let done = false;
    const f = (v) => { if (done) return; done = true; try { s.destroy(); } catch (_) {} resolve(v); };
    s.setTimeout(ms, () => f(false));
    s.on('connect', () => s.write('OPTIONS rtsp://' + host + ':' + port + '/ RTSP/1.0\r\nCSeq: 1\r\n\r\n'));
    s.on('data', (d) => { buf += d.toString('latin1'); if (buf.length >= 8) f(/^RTSP\/1\./.test(buf)); });
    s.on('error', () => f(false)); s.on('close', () => f(/^RTSP\/1\./.test(buf)));
  });
}
// Satu permintaan HTTP kecil. Hasil: { status, body, headers } kalau ada balasan, 'timeout' kalau diam, 'error' kalau sambungan diputus/ditolak.
function httpReq(host, port, method, p, headers, body, ms, trace) {
  return new Promise((resolve) => {
    let done = false; const fin = (v) => { if (done) return; done = true; resolve(v); };
    const note = (t) => { if (trace) trace.push(method + ' ' + p + ' -> ' + t); };
    try {
      const h = Object.assign({}, headers || {});   // sengaja tanpa User-Agent/Connection tambahan: sebagian kamera memutus sambungan kalau ada header yang tidak biasa
      if (body) h['Content-Length'] = Buffer.byteLength(body);
      const req = http.request({ host, port, method, path: p, timeout: ms, headers: h, agent: false }, (res) => {
        let b = ''; res.on('data', (d) => { if (b.length < 4096) b += d.toString('latin1'); });
        res.on('end', () => { note(res.statusCode + ' ' + JSON.stringify({ ct: res.headers['content-type'], www: res.headers['www-authenticate'], server: res.headers.server }) + ' ' + JSON.stringify(b.slice(0, 300))); fin({ status: res.statusCode, body: b, headers: res.headers || {} }); });
        res.on('error', (e) => { note('balasan terputus ' + (e && e.code)); fin({ status: res.statusCode, body: b, headers: res.headers || {} }); });
      });
      req.on('timeout', () => { note('timeout'); req.destroy(); fin('timeout'); });
      req.on('error', (e) => { note('error ' + (e && (e.code || e.message))); fin('error'); });
      req.end(body || undefined);
    } catch (e) { note('error ' + (e && e.message)); fin('error'); }
  });
}
const ONVIF_BODY = /onvif\.org|SystemDateAndTime|soap-envelope|soap\+xml|<(s|soap|env|SOAP-ENV):Envelope/i;
const isOnvifReply = (r) => !!r && typeof r === 'object' && (ONVIF_BODY.test(r.body || '') || /soap/i.test(String((r.headers && r.headers['content-type']) || '')));
// Kamera berjenis "camapp" (Bardion) sering menutup sambungan atau membalas lain kalau permintaannya tidak persis,
// jadi kalau cara pertama gagal kita coba cara-cara lain yang masih aman (hanya membaca waktu kamera / membaca alamat).
async function httpProbe(host, port, ms, traceOut) {
  const trace = traceOut || [];
  const out = (v) => v;
  // Cara 1 meniru persis permintaan pustaka ONVIF yang terbukti berhasil ke kamera camapp (Content-Type dengan action + header charset).
  const first = await httpReq(host, port, 'POST', '/onvif/device_service',
    { 'Content-Type': 'application/soap+xml;charset=utf-8;action="http://www.onvif.org/ver10/device/wsdl/GetSystemDateAndTime"', charset: 'utf-8' }, SOAP_TIME, ms, trace);
  if (first === 'timeout') return out(null);            // diam total: tidak perlu coba cara lain
  if (isOnvifReply(first)) return 'onvif';
  // Cara 2: tanpa "action" (sebagian kamera tidak suka header itu).
  const second = await httpReq(host, port, 'POST', '/onvif/device_service',
    { 'Content-Type': 'application/soap+xml; charset=utf-8' }, SOAP_TIME, ms, trace);
  if (isOnvifReply(second)) return 'onvif';
  // Cara 3: baca alamat layanan ONVIF dengan GET. Balasan 400/401/405 di alamat ini (tapi bukan di halaman depan) khas perangkat ONVIF.
  const third = await httpReq(host, port, 'GET', '/onvif/device_service', null, null, ms, trace);
  if (isOnvifReply(third)) return 'onvif';
  if (third && typeof third === 'object' && [400, 401, 405, 415].includes(third.status)) {
    const root = await httpReq(host, port, 'GET', '/', null, null, ms, trace);
    if (!(root && typeof root === 'object' && root.status === third.status)) return 'onvif';
  }
  // Cara 4 (hanya untuk melihat): halaman depan, supaya catatan menunjukkan jenis perangkat.
  await httpReq(host, port, 'GET', '/', null, null, ms, trace);
  const any = [first, second, third].some((r) => r && typeof r === 'object');
  return out(any ? 'web' : null);
}
async function classifyPort(host, port, ms, traceOut) {
  if (await rtspProbe(host, port, ms)) return 'rtsp';
  return (await httpProbe(host, port, ms, traceOut)) || 'lain';
}
async function scanPorts(host, ports = COMMON_PORTS, ms = 1500) {
  const open = (await Promise.all(ports.map(async (p) => ((await tcpOpen(host, p, ms)) ? p : 0)))).filter(Boolean);
  const found = await Promise.all(open.map(async (p) => { const tr = []; const type = await classifyPort(host, p, 2500, tr); const o = { port: p, type }; if (type !== 'onvif' && type !== 'rtsp' && tr.length) o.detail = tr.join('\n'); return o; }));
  return { ok: true, host, scanned: ports.length, open: found.sort((a, b) => a.port - b.port) };
}

// 1b) Pindai jaringan (cepat, dua tahap) - pengganti pencarian "berteriak" yang sering tidak sampai lewat Wi-Fi/AP.
// Tahap 1: ketuk beberapa port umum di setiap alamat /24; perangkat yang menjawab (terbuka ATAU menolak) berarti hidup.
// Tahap 2: hanya di perangkat yang hidup, cek port umum lengkap dan kenali mana yang menjawab ONVIF.
const SWEEP_PORTS = [80, 8080, 8000, 8899, 2020, 5000, 8081, 81, 554];
const tcpState = (host, port, ms) => new Promise((resolve) => {
  const s = net.connect({ host, port }); let d = false;
  const f = (v) => { if (d) return; d = true; try { s.destroy(); } catch (_) {} resolve(v); };
  s.setTimeout(ms, () => f('timeout')); s.on('connect', () => f('open')); s.on('error', (e) => f(e && e.code === 'ECONNREFUSED' ? 'refused' : 'timeout'));
});
async function runPool(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  const worker = async () => { for (;;) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k], k); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
function localSubnets() {
  const bases = new Set(); const own = new Set(); const ni = os.networkInterfaces();
  for (const name of Object.keys(ni)) for (const a of ni[name] || []) {
    if (a.family !== 'IPv4' || a.internal || !isPrivateIPv4(a.address)) continue;
    own.add(a.address); bases.add(a.address.split('.').slice(0, 3).join('.'));
  }
  return { bases: [...bases], own };
}
async function sweep(opts = {}) {
  const t0 = Date.now();
  const ms1 = opts.stage1Ms || 700;
  let ips; let bases = []; let own = new Set();
  if (Array.isArray(opts.targets)) ips = opts.targets.slice();
  else {
    ({ bases, own } = localSubnets());
    if (!bases.length) return { ok: false, error: 'PC ini tidak terhubung ke jaringan lokal (192.168.x.x / 10.x.x.x).', devices: [] };
    ips = []; for (const b of bases) for (let n = 1; n <= 254; n++) ips.push(b + '.' + n);
    ips = ips.filter((x) => !own.has(x));
  }
  // Tahap 1
  const alive = [];
  await runPool(ips, 30, async (ip) => {
    const st = await Promise.all(SWEEP_PORTS.map((p) => tcpState(ip, p, ms1)));
    if (st.some((s) => s === 'open' || s === 'refused')) alive.push(ip);
  });
  alive.sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
  // Tahap 2
  const devices = []; let others = 0;
  await runPool(alive, 8, async (ip) => {
    let r; try { r = await scanPorts(ip, COMMON_PORTS, 1000); } catch (_) { r = null; }
    const open = (r && r.open) || [];
    const onvifPorts = open.filter((o) => o.type === 'onvif').map((o) => o.port);
    if (onvifPorts.length) devices.push({ ip, ports: onvifPorts, rtsp: open.filter((o) => o.type === 'rtsp').map((o) => o.port) });
    else others++;
  });
  devices.sort((a, b) => String(a.ip).localeCompare(String(b.ip), 'en', { numeric: true }));
  return { ok: true, subnets: bases.map((b) => b + '.0/24'), scanned: ips.length, alive: alive.length, others, devices, ms: Date.now() - t0 };
}

// 2) Discovery (WS-Discovery): kamera ONVIF yang aktif menjawab sendiri dan menyebut alamat/port-nya.
function parseDiscovered(data, rinfo) {
  try {
    const pm = (data && data.probeMatches && data.probeMatches.probeMatch) || {};
    const xaddrs = String(pm.XAddrs || '').split(/\s+/).filter(Boolean);
    const ports = [...new Set(xaddrs.map((u) => { try { const x = new URL(u); return parseInt(x.port || (x.protocol === 'https:' ? '443' : '80'), 10); } catch (_) { return 0; } }).filter(Boolean))];
    const scopes = Array.isArray(pm.scopes) ? pm.scopes.join(' ') : String(pm.scopes || '');
    const pick = (k) => { const m = new RegExp('onvif://www\\.onvif\\.org/' + k + '/(\\S+)', 'i').exec(scopes); try { return m ? decodeURIComponent(m[1]) : ''; } catch (_) { return m ? m[1] : ''; } };
    return { ip: rinfo && rinfo.address, ports, xaddrs, name: pick('name'), hardware: pick('hardware') };
  } catch (_) { return null; }
}
function discover(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!Discovery) return resolve({ ok: false, error: LIB_MSG, devices: [] });
    const ifaces = [];
    const ni = os.networkInterfaces();
    for (const name of Object.keys(ni)) if ((ni[name] || []).some((a) => a.family === 'IPv4' && !a.internal && isPrivateIPv4(a.address))) ifaces.push(name);
    if (!ifaces.length) return resolve({ ok: false, error: 'PC ini tidak terhubung ke jaringan lokal (192.168.x.x / 10.x.x.x).', devices: [], ifaces });
    const devices = new Map(); const errs = [];
    // Pustaka melempar galat kalau 'error' tidak ditangkap; pasang penangkap selama pencarian.
    const onDevice = (data, rinfo) => { const d = parseDiscovered(data, rinfo); if (d && d.ip && !devices.has(d.ip)) devices.set(d.ip, d); };
    const onError = (e) => { errs.push(String((e && e.message) || e).slice(0, 120)); };
    Discovery.on('device', onDevice); Discovery.on('error', onError);
    let left = ifaces.length;
    const end = () => {
      if (--left > 0) return;
      Discovery.removeListener('device', onDevice); Discovery.removeListener('error', onError);
      resolve({ ok: true, ifaces, devices: [...devices.values()].sort((a, b) => String(a.ip).localeCompare(String(b.ip), 'en', { numeric: true })), errors: errs.slice(0, 3) });
    };
    ifaces.forEach((name) => {
      try { Discovery.probe({ timeout: timeoutMs, resolve: false, device: name }, () => end()); } catch (e) { errs.push(e.message); end(); }
    });
  });
}

// ---------- penyimpanan (password disamarkan dengan AES-256-GCM, kunci di onvif.key) ----------
function createOnvifManager({ dir, log, probeFn, timing }) {
  const T = Object.assign({ backoffSec: BACKOFF_SEC, onlineRecheckMs: ONLINE_RECHECK_MS, tickMs: 2000 }, timing || {}); // probeFn & timing: hanya untuk uji
  const doProbe = probeFn || probe;
  const file = path.join(dir, 'onvif-kamera.json');
  const keyFile = path.join(dir, 'onvif.key');
  const write = (f, data, mode) => { const tmp = f + '.tmp'; fs.writeFileSync(tmp, data, mode ? { mode } : undefined); fs.renameSync(tmp, f); };

  let key;
  try { key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex'); } catch (_) { key = null; }
  if (!key || key.length !== 32) { key = crypto.randomBytes(32); try { write(keyFile, key.toString('hex'), 0o600); } catch (e) { log('WARN', `ONVIF: gagal menyimpan kunci: ${e.message}`); } }
  const enc = (pw) => {
    const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(String(pw), 'utf8'), c.final()]);
    return 'v1:' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
  };
  const dec = (s) => {
    try {
      const b = Buffer.from(String(s).replace(/^v1:/, ''), 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
      return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
    } catch (_) { return null; }
  };

  let cams = [];
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(j.cameras)) cams = j.cameras;
  } catch (e) {
    if (e.code !== 'ENOENT') {
      try { fs.renameSync(file, file + '.rusak-' + Date.now()); } catch (_) {}
      log('WARN', `ONVIF: ${path.basename(file)} tidak terbaca (${e.message}); dipindah ke cadangan dan dimulai kosong.`);
    }
  }
  const save = () => write(file, JSON.stringify({ version: 1, cameras: cams }, null, 2));

  const rt = new Map(); // id -> status waktu-jalan
  const rtOf = (id) => { if (!rt.has(id)) rt.set(id, { status: 'unknown', failStreak: 0, nextAt: 0, busy: false, lastOkAt: 0, lastErrorAt: 0, error: '', kind: '', info: null, profiles: [], ms: 0 }); return rt.get(id); };

  const pub = (c) => {
    const s = rtOf(c.id); const now = Date.now();
    return {
      id: c.id, name: c.name, floor: c.floor || '', host: c.host, port: c.port, username: c.username, hasPassword: !!c.passwordEnc,
      status: s.busy && s.status === 'unknown' ? 'checking' : s.status,
      lastOkAt: s.lastOkAt || null, lastErrorAt: s.lastErrorAt || null, error: s.error, kind: s.kind,
      failStreak: s.failStreak, retryInSec: s.status === 'offline' ? Math.max(0, Math.ceil((s.nextAt - now) / 1000)) : null,
      info: s.info, profiles: s.profiles, probeMs: s.ms,
    };
  };

  const apply = (c, r) => {
    const s = rtOf(c.id); const was = s.status; const now = Date.now();
    s.busy = false; s.ms = r.ms || 0;
    if (r.ok) {
      s.status = 'online'; s.failStreak = 0; s.error = ''; s.kind = ''; s.lastOkAt = now; s.info = r.info; s.profiles = r.profiles;
      s.nextAt = now + T.onlineRecheckMs;
      if (was !== 'online') log('INFO', `ONVIF ${c.name}: tersambung (${r.profiles.length} profil video)`);
    } else {
      s.failStreak += 1; s.error = r.error; s.kind = r.kind; s.lastErrorAt = now;
      if (r.kind === 'auth') {
        // Jangan dicoba terus: salah login berulang bisa mengunci akun ONVIF di kamera.
        s.status = 'auth'; s.nextAt = Infinity;
        if (was !== 'auth') log('WARN', `ONVIF ${c.name}: username/password salah. Berhenti mencoba sampai konfigurasinya diperbaiki.`);
      } else if (r.kind === 'lib') {
        s.status = 'lib'; s.nextAt = Infinity;
      } else {
        s.status = 'offline'; s.nextAt = now + T.backoffSec[Math.min(s.failStreak - 1, T.backoffSec.length - 1)] * 1000;
        if (was === 'online') log('WARN', `ONVIF ${c.name}: putus (${r.error}). Mencoba lagi otomatis.`);
        else if (was === 'unknown') log('INFO', `ONVIF ${c.name}: belum tersambung (${r.error})`);
      }
    }
  };

  const secretOf = (c) => dec(c.passwordEnc);
  const check = async (c) => {
    const s = rtOf(c.id); if (s.busy) return null;
    s.busy = true;
    const pw = secretOf(c);
    const r = pw === null ? { ok: false, kind: 'other', error: 'Password tersimpan tidak terbaca (kunci onvif.key berubah?). Isi ulang password.', ms: 0 } : await doProbe({ host: c.host, port: c.port, username: c.username, password: pw });
    apply(c, r);
    return r;
  };

  let timer = null; let running = 0;
  const tick = () => {
    const now = Date.now();
    for (const c of cams) {
      if (running >= MAX_PARALLEL) break;
      const s = rtOf(c.id);
      if (s.busy || now < s.nextAt) continue;
      running++;
      check(c).catch(() => {}).finally(() => { running--; });
    }
  };

  const nameTaken = (name, exceptId) => cams.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase());
  const hostTaken = (host, port, exceptId) => cams.some((c) => c.id !== exceptId && c.host === host && c.port === port);

  return {
    libOk: () => !!Cam, libMessage: () => (Cam ? '' : LIB_MSG),
    start() { if (!timer) { timer = setInterval(tick, T.tickMs); tick(); } },
    stop() { if (timer) clearInterval(timer); timer = null; },
    list() { return cams.map(pub).sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true })); },
    upsert(inp) {
      const id = inp && inp.id ? String(inp.id) : null;
      const cur = id ? cams.find((c) => c.id === id) : null;
      if (id && !cur) return { ok: false, error: 'Kamera tidak ditemukan.' };
      const { v, errs } = cleanInput(inp, { needPassword: !cur });
      if (!v.name) errs.push('Nama kamera belum diisi.');
      if (v.name && nameTaken(v.name, id)) errs.push('Nama kamera itu sudah dipakai.');
      if (!errs.length && hostTaken(v.host, v.port, id)) errs.push('IP dan port itu sudah terdaftar untuk kamera lain.');
      if (!errs.length && !cur && cams.length >= 64) errs.push('Batas 64 kamera tercapai.');
      if (errs.length) return { ok: false, error: errs.join(' ') };
      const rec = cur || { id: crypto.randomBytes(4).toString('hex') };
      Object.assign(rec, { name: v.name, floor: v.floor, host: v.host, port: v.port, username: v.username });
      if (v.password) rec.passwordEnc = enc(v.password);
      if (!cur) cams.push(rec);
      try { save(); } catch (e) { return { ok: false, error: 'Gagal menyimpan: ' + e.message }; }
      const s = rtOf(rec.id); s.nextAt = 0; s.failStreak = 0; if (s.status === 'auth' || s.status === 'lib') s.status = 'unknown';
      log('INFO', `ONVIF: kamera "${rec.name}" (${rec.host}:${rec.port}) ${cur ? 'diubah' : 'ditambahkan'}`);
      tick();
      return { ok: true, camera: pub(rec) };
    },
    remove(id) {
      const i = cams.findIndex((c) => c.id === String(id));
      if (i < 0) return { ok: false, error: 'Kamera tidak ditemukan.' };
      const [c] = cams.splice(i, 1); rt.delete(c.id);
      try { save(); } catch (e) { return { ok: false, error: 'Gagal menyimpan: ' + e.message }; }
      log('INFO', `ONVIF: kamera "${c.name}" dihapus`);
      return { ok: true };
    },
    // Tes: untuk kamera tersimpan (id) atau isian form yang belum disimpan.
    async test(inp) {
      // Tombol "Tes" di baris daftar mengirim {id} saja (uji data tersimpan). Form mengirim semua isian; kalau sedang
      // mengubah kamera dan password dikosongkan, pakai password tersimpan tapi tetap uji IP/port/user yang tampil di form.
      if (inp && inp.id && !inp.host) {
        const c = cams.find((x) => x.id === String(inp.id));
        if (!c) return { ok: false, error: 'Kamera tidak ditemukan.' };
        const s = rtOf(c.id); if (s.status === 'auth' || s.status === 'lib') { s.status = 'unknown'; s.failStreak = 0; }
        const r = await check(c);
        return r === null ? { ok: false, error: 'Tes untuk kamera ini sedang berjalan. Tunggu sebentar.' } : r;
      }
      let src = inp;
      if (inp && inp.id && !inp.password) {
        const c = cams.find((x) => x.id === String(inp.id));
        const pw = c ? secretOf(c) : null;
        if (pw) src = Object.assign({}, inp, { password: pw });
      }
      const { v, errs } = cleanInput(src, { needPassword: true });
      if (errs.length) return { ok: false, error: errs.join(' ') };
      return doProbe({ host: v.host, port: v.port, username: v.username, password: v.password });
    },
    // Untuk live view/rekaman: kredensial + profil terakhir yang dibaca dari kamera. Tidak pernah lewat API ke browser.
    liveInfo: (id) => { const c = cams.find((x) => x.id === String(id)); if (!c) return null; return { username: c.username, password: secretOf(c), profiles: rtOf(c.id).profiles || [], status: rtOf(c.id).status }; },
    secret: (id) => { const c = cams.find((x) => x.id === String(id)); return c ? { host: c.host, port: c.port, username: c.username, password: secretOf(c) } : null; }, // untuk tahap berikutnya (live view/rekaman); tidak pernah lewat API
  };
}

module.exports = { createOnvifManager, probe, isPrivateIPv4, mapError, noCreds, scanPorts, sweep, discover, parseDiscovered, classifyPort };
