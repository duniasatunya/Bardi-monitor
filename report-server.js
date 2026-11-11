// Server laporan Bardi Monitor (tanpa paket tambahan, hanya modul bawaan Node.js)
// Halaman utama: http://<IP-PC>:<port>/displaycostum.html  (wajib login dengan password)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCapturer } = require('./screen-capture');
const { createLiveStream } = require('./live-stream');
const { createUpdater } = require('./updater');
const { createOnvifManager, scanPorts, sweep, discover, isPrivateIPv4 } = require('./onvif-cams');
const makeOnvifPage = require('./onvif-page');
const { createPtz } = require('./onvif-ptz');
const { attachRealtimeWs } = require('./onvif-ws');
const { createOnvifLive } = require('./onvif-live');
const { createIncidentRecorder } = require('./onvif-incident');
const UIKIT = require('./ui-kit');

// ---------- password & sesi ----------
function loadConfig(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')); } catch (_) { return null; }
}
function hashPassword(pw, saltHex) {
  return crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64).toString('hex');
}
function verifyPassword(cfg, pw) {
  const h = Buffer.from(hashPassword(pw, cfg.salt), 'hex');
  const e = Buffer.from(cfg.hash, 'hex');
  return h.length === e.length && crypto.timingSafeEqual(h, e);
}
const sign = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
function makeToken(secret, ttlMs) {
  const exp = String(Date.now() + ttlMs);
  return exp + '.' + sign(secret, exp);
}
function checkToken(secret, tok) {
  if (!tok || typeof tok !== 'string') return false;
  const [exp, mac] = tok.split('.');
  if (!exp || !mac || !/^\d+$/.test(exp)) return false;
  const good = sign(secret, exp);
  if (mac.length !== good.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return false;
  return Number(exp) > Date.now();
}
function getCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
}

// ---------- CSV ----------
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cur = '', inq = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inq) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inq = false; } else cur += ch;
    } else if (ch === '"') inq = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift() || [];
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
}
function loadEvents(csvFile) {
  const files = [csvFile, csvFile.replace(/\.csv$/, '.cadangan.csv')];
  let all = [];
  for (const f of files) { try { all = all.concat(parseCsv(fs.readFileSync(f, 'utf8'))); } catch (_) {} }
  return all
    .filter((e) => e.mode === 'LIVE' && e.waktu) // catatan uji (DRY) tidak ikut laporan
    .sort((a, b) => (a.waktu < b.waktu ? -1 : a.waktu > b.waktu ? 1 : 0));
}
function loadFloors(file) {
  // Pencocokan nama kamera tidak membedakan huruf besar/kecil dan spasi ganda.
  const norm = (k) => String(k).replace(/\s+/g, ' ').trim().toLowerCase();
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  const map = {};
  for (const k of Object.keys(raw)) map[norm(k)] = raw[k];
  return new Proxy({}, { get: (_, k) => (typeof k === 'string' ? map[norm(k)] : undefined) });
}
const normName = (k) => String(k).replace(/\s+/g, ' ').trim().toLowerCase();
// Daftar lengkap kamera dan lantainya dari kamera-lantai.json (termasuk kamera yang belum pernah bermasalah).
function loadFloorEntries(file) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
  return Object.keys(raw).filter((k) => typeof raw[k] === 'string' && raw[k].trim()).map((k) => [k.replace(/\s+/g, ' ').trim(), raw[k]]);
}
const emptyCam = (name, floor) => ({ name, floor, error: 0, retry: 0, reopen: 0, pulih: 0, offline: 0, codes: {}, lastCode: '', lastTime: '', downSec: 0, maxDown: 0 });
function buildSummary(events, floors, hours, entries) {
  const since = hours > 0 ? Date.now() - hours * 3600e3 : 0;
  const per = {};
  for (const e of events) {
    const t = new Date(e.waktu.replace(' ', 'T')).getTime();
    if (since && t < since) continue;
    const p = (per[e.kamera] = per[e.kamera] || emptyCam(e.kamera, ''));
    if (e.kejadian === 'ERROR') {
      p.error++; p.lastTime = e.waktu;
      if (e.kode_error) { p.codes[e.kode_error] = (p.codes[e.kode_error] || 0) + 1; p.lastCode = e.kode_error; }
    } else if (e.kejadian === 'RETRY') p.retry++;
    else if (e.kejadian === 'REOPEN') p.reopen++;
    else if (e.kejadian === 'PULIH') {
      p.pulih++;
      const d = parseInt(e.durasi_detik, 10) || 0; // lama kamera bermasalah sebelum pulih
      p.downSec += d; if (d > p.maxDown) p.maxDown = d;
    } else if (e.kejadian === 'OFFLINE') p.offline++;
  }
  const cams = Object.values(per).map((p) => ({ ...p, floor: floors[p.name] || 'Belum diisi' })).sort((a, b) => b.error - a.error);

  // Semua kamera per lantai: gabungan pemetaan lantai + kamera yang punya kejadian (yang belum dipetakan masuk "Belum diisi").
  const all = cams.slice();
  const have = new Set(all.map((c) => normName(c.name)));
  for (const [name, floor] of entries || []) if (!have.has(normName(name))) { all.push(emptyCam(name, floor)); have.add(normName(name)); }
  const nat = (a, b) => String(a).localeCompare(String(b), 'id', { numeric: true });
  const floorCams = {};
  for (const c of all) (floorCams[c.floor] = floorCams[c.floor] || []).push(c);
  for (const f of Object.keys(floorCams)) floorCams[f].sort((a, b) => b.error - a.error || nat(a.name, b.name));
  const floorsList = Object.keys(floorCams).map((f) => {
    const list = floorCams[f];
    return {
      floor: f, cameras: list.length,
      problemCams: list.filter((c) => c.error > 0 || c.offline > 0).length,
      error: list.reduce((n, c) => n + c.error, 0), offline: list.reduce((n, c) => n + c.offline, 0),
    };
  }).sort((a, b) => (a.floor === 'Belum diisi') - (b.floor === 'Belum diisi') || nat(a.floor, b.floor));
  return { cams, floors: floorsList, floorCams };
}

// ---------- HTML ----------
const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_LABEL = { PLAY: 'Normal', ERROR: 'Error', CONNECTING: 'Menyambung', FROZEN: 'Beku', ACTED: 'Dipulihkan...', INIT: 'Baru terlihat' };

const BASE_CSS = `
:root{--bg:#f5f6f8;--card:#fff;--tx:#1d2330;--mut:#6b7385;--bd:#e3e6ec;--ok:#1a8f4c;--bad:#d33a2c;--warn:#c27a00;--pri:#e8590c}
@media (prefers-color-scheme:dark){:root{--bg:#14171d;--card:#1c2029;--tx:#e8eaf0;--mut:#9aa2b3;--bd:#2b3140}}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--tx)}
`;

function loginPage(msg) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Masuk - Bardi Monitor</title><style>${BASE_CSS}
.box{max-width:340px;margin:12vh auto;padding:24px;background:var(--card);border:1px solid var(--bd);border-radius:12px}
h1{font-size:18px;margin:0 0 16px}input,button{width:100%;padding:10px 12px;font-size:15px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx)}
button{margin-top:12px;background:var(--pri);color:#fff;border:0;cursor:pointer}.err{color:var(--bad);margin:10px 0 0;font-size:14px}</style></head>
<body><form class="box" method="post" action="/login"><h1>Bardi Monitor - Laporan</h1>
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">Masuk</button>${msg ? `<p class="err">${esc(msg)}</p>` : ''}</form></body></html>`;
}

const LIVE_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Layar PC - Bardi Monitor</title><style>${BASE_CSS}
body{background:#000;color:#e8eaf0}
header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 12px;background:#111;font-size:14px;flex-wrap:wrap}
a{color:#e8eaf0}#st{color:#9aa2b3}#st.bad{color:#ff8a7a}
#box{display:flex;justify-content:center}video{max-width:100%;max-height:calc(100vh - 44px);background:#000;display:block}
</style></head><body>
<header><a href="/displaycostum.html">&larr; Kembali ke laporan</a><span id="st">menyiapkan siaran (sekitar 10 detik)...</span></header>
<div id="box"><video id="v" muted autoplay playsinline controls></video></div>
<script src="/vendor/hls.min.js"></script>
<script>
var v=document.getElementById('v'),st=document.getElementById('st'),hls=null;
function say(t,bad){st.textContent=t;st.className=bad?'bad':''}
function fail(t){say(t+' ',true);var a=document.createElement('a');a.href='/layar-foto';a.textContent='Pakai mode foto';st.appendChild(a)}
fetch('/api/live/start',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(d){
  if(!d.ok){return fail('Siaran gagal dimulai: '+(d.error||'tidak diketahui')+'.')}
  var src='/live/live.m3u8';
  if(window.Hls&&Hls.isSupported()){
    hls=new Hls({liveSyncDuration:6,liveMaxLatencyDuration:16,maxBufferLength:20,lowLatencyMode:false,manifestLoadingMaxRetry:6,levelLoadingMaxRetry:6,fragLoadingMaxRetry:6});
    hls.loadSource(src);hls.attachMedia(v);
    hls.on(Hls.Events.ERROR,function(e,data){
      if(!data.fatal)return;
      if(data.type===Hls.ErrorTypes.NETWORK_ERROR){say('Jaringan terputus, mencoba lagi...',true);hls.startLoad()}
      else if(data.type===Hls.ErrorTypes.MEDIA_ERROR){hls.recoverMediaError()}
      else{fail('Pemutar berhenti.')}
    });
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src}
  else{return fail('Browser ini tidak bisa memutar siaran.')}
  v.play().catch(function(){});
  say('Live (tertunda beberapa detik dari aslinya)');
}).catch(function(){fail('Tidak bisa menghubungi server.')});
document.addEventListener('visibilitychange',function(){if(!document.hidden){v.play().catch(function(){})}});
window.addEventListener('pagehide',function(){if(hls)hls.destroy()});
</script></body></html>`;

const PHOTO_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Layar PC (foto) - Bardi Monitor</title><style>${BASE_CSS}
body{background:#000;color:#e8eaf0}
header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 12px;background:#111;font-size:14px}
a{color:#e8eaf0}#st{color:#9aa2b3}#st.bad{color:#ff8a7a}
#box{display:flex;justify-content:center}img{max-width:100%;height:auto;display:block}
</style></head><body>
<header><a href="/displaycostum.html">&larr; Kembali ke laporan</a><span id="st">memuat...</span></header>
<div id="box"><img id="v" alt="Layar PC monitoring"></div>
<script>
var img=document.getElementById('v'),st=document.getElementById('st'),fails=0,okN=0,t0=Date.now(),busy=false;
function next(ms){setTimeout(tick,ms)}
function tick(){
  if(document.hidden){return next(1000)}
  if(busy)return; busy=true;
  var im=new Image();
  im.onload=function(){img.src=im.src;fails=0;okN++;busy=false;
    var s=(Date.now()-t0)/1000;st.className='';
    st.textContent='Live (sekitar '+(okN/s).toFixed(1)+' gambar/dtk) - '+new Date().toLocaleTimeString('id-ID');next(700)};
  im.onerror=function(){fails++;busy=false;st.className='bad';
    st.textContent=fails>=3?'Gagal mengambil layar. Mencoba lagi... (cek apakah Windows terkunci / script berjalan)':'Memuat...';
    next(Math.min(5000,1000*fails))};
  im.src='/api/screen.jpg?t='+Date.now();
}
tick();
</script></body></html>`;

// Halaman Beranda (dulu Laporan). Tampilan baru ada di beranda-page.js; versi lama tersimpan di report-server.js.bak-ui.
const MAIN_PAGE = require('./beranda-page')();

function printPage(data) {
  const { status, summary, events, now } = data;
  const rows = (arr) => arr.join('');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Bardi Monitor</title><style>
body{font:11px/1.35 Arial,sans-serif;color:#111;margin:0}h1{font-size:16px;margin:0 0 2px}h2{font-size:13px;margin:14px 0 4px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #ccc;padding:3px 5px;text-align:left}th{background:#eee}
.mut{color:#555}tr{page-break-inside:avoid}</style></head><body>
<h1>Laporan Bardi Monitor</h1><div class="mut">Dibuat: ${esc(now)} | Mode: ${esc(status.meta.mode)}</div>
<h2>Status kamera saat ini</h2><table><tr><th>Kamera</th><th>Lantai</th><th>Status</th><th>Kode error</th><th>Lama</th><th>Percobaan</th></tr>
${rows(status.cams.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.floor)}</td><td>${esc(STATUS_LABEL[c.status] || c.status)}${c.offline ? ' (offline)' : ''}</td><td>${esc(c.code || '-')}</td><td>${esc(Math.round(c.sinceSec / 60))} mnt</td><td>${c.attempts}</td></tr>`)) || '<tr><td colspan="6">Tidak ada data.</td></tr>'}</table>
<h2>Ringkasan per lantai (7 hari terakhir)</h2><table><tr><th>Lantai</th><th>Jumlah kamera</th><th>Kamera bermasalah</th><th>Error</th><th>Offline</th></tr>
${rows(summary.floors.map((f) => `<tr><td>${esc(f.floor)}</td><td>${f.cameras}</td><td>${f.problemCams}</td><td>${f.error}</td><td>${f.offline}</td></tr>`)) || '<tr><td colspan="5">Belum ada data lantai.</td></tr>'}</table>
${rows(summary.floors.map((f) => `<h2>Detail ${esc(f.floor)} (7 hari terakhir)</h2><table><tr><th>Kamera</th><th>Error</th><th>Kode (jumlah)</th><th>Retry</th><th>Reopen</th><th>Pulih</th><th>Offline</th><th>Total bermasalah</th><th>Terlama</th><th>Error terakhir</th></tr>
${rows(((summary.floorCams || {})[f.floor] || []).map((c) => `<tr><td>${esc(c.name)}</td><td>${c.error}</td><td>${esc(Object.entries(c.codes).map(([k, v]) => k + ' (' + v + ')').join(', ') || '-')}</td><td>${c.retry}</td><td>${c.reopen}</td><td>${c.pulih}</td><td>${c.offline}</td><td>${c.downSec ? Math.round(c.downSec / 60) + ' mnt' : '-'}</td><td>${c.maxDown ? Math.round(c.maxDown / 60) + ' mnt' : '-'}</td><td>${esc(c.lastTime || '-')}</td></tr>`))}</table>`))}
<h2>Ringkasan per kamera (7 hari terakhir)</h2><table><tr><th>Kamera</th><th>Lantai</th><th>Error</th><th>Kode (jumlah)</th><th>Retry</th><th>Reopen</th><th>Pulih</th><th>Offline</th></tr>
${rows(summary.cams.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.floor)}</td><td>${c.error}</td><td>${esc(Object.entries(c.codes).map(([k, v]) => k + ' (' + v + ')').join(', ') || '-')}</td><td>${c.retry}</td><td>${c.reopen}</td><td>${c.pulih}</td><td>${c.offline}</td></tr>`)) || '<tr><td colspan="8">Belum ada kejadian.</td></tr>'}</table>
<h2>Riwayat gangguan (200 terakhir)</h2><table><tr><th>Waktu</th><th>Kamera</th><th>Kejadian</th><th>Kode</th><th>Percobaan</th><th>Hasil</th></tr>
${rows(events.map((e) => `<tr><td>${esc(e.waktu)}</td><td>${esc(e.kamera)}</td><td>${esc(e.kejadian)}</td><td>${esc(e.kode_error || '-')}</td><td>${esc(e.percobaan)}</td><td>${esc(e.hasil)}</td></tr>`)) || '<tr><td colspan="6">Belum ada kejadian.</td></tr>'}</table>
</body></html>`;
}

// ---------- server ----------
function startReportServer(opts) {
  const { dir, csvFile, floorsFile, getState, log, port: portOverride } = opts;
  const cfg = loadConfig(dir);
  if (!cfg) { log('WARN', 'Server laporan TIDAK dijalankan: password belum diatur. Jalankan: node set-password.js'); return null; }
  const port = portOverride || cfg.port || 3000;
  const SESSION_MS = 12 * 3600 * 1000;
  const fails = new Map(); // ip -> {n, until}
  let publicIp = '';
  const startedAt = Date.now();
  const upd = createUpdater({ dir, log, apiBase: opts.updateApiBase });
  const onvif = createOnvifManager({ dir, log, probeFn: opts.onvifProbeFn, timing: opts.onvifTiming });
  onvif.start();
  const onvifLive = createOnvifLive({ log, rootDir: dir, ffmpegPath: opts.ffmpegPath, getCamera: (id) => onvif.liveInfo(id), tmpBase: opts.onvifLiveTmp, rtspTransport: opts.onvifRtspTransport });
  // Rekaman kejadian: buffer berputar tiap kamera ONVIF; saat kamera putus, 2 menit sebelum & sesudahnya disimpan jadi klip.
  const incident = createIncidentRecorder({ log, rootDir: dir, ffmpegPath: opts.ffmpegPath, listCams: () => onvif.list().map((c) => ({ id: c.id, name: c.name })), getCamera: (id) => onvif.liveInfo(id), outDir: opts.incidentDir, bufBase: opts.incidentBuf, timing: opts.incidentTiming, minFreeBytes: opts.incidentMinFree, retentionDays: opts.incidentDays || 7 });
  if (!opts.noIncident) incident.start();
  const INCIDENT_PAGE = require('./onvif-kejadian')(BASE_CSS);
  const { createClipStore, page: clipPage, MAX_ITEM_CHARS: CLIP_MAX } = require('./papan-klip');
  const CLIP_PAGE = clipPage(BASE_CSS);
  const clip = createClipStore({ dir, log, file: opts.clipFile });
  const readBigJson = (req, max) => new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (d) => { n += d.length; if (n > max) { req.destroy(); reject(new Error('terlalu besar')); } else chunks.push(d); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(new Error('JSON tidak valid')); } });
    req.on('error', reject);
  });
  const ONVIF_PAGE = makeOnvifPage(BASE_CSS);
  const MULTIVIEW_PAGE = require('./onvif-multiview')(BASE_CSS);
  const ptz = createPtz({ getTarget: (id) => onvif.secret(id), log, camClass: opts.onvifCamClass });
  let onvifTests = 0; // batasi tes bersamaan (cegah dipakai memindai jaringan)
  const readJson = (req) => new Promise((resolve, reject) => {
    let b = ''; req.on('data', (d) => { b += d; if (b.length > 8192) { req.destroy(); reject(new Error('terlalu besar')); } });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { reject(new Error('JSON tidak valid')); } });
    req.on('error', reject);
  });

  const fetchIp = () => {
    try {
      const r = https.get('https://api.ipify.org', { timeout: 5000 }, (res) => {
        let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => { if (/^[\d.:a-fA-F]{3,45}$/.test(b.trim())) publicIp = b.trim(); });
      });
      r.on('error', () => {}); r.on('timeout', () => r.destroy());
    } catch (_) {}
  };
  fetchIp(); setInterval(fetchIp, 10 * 60 * 1000).unref();

  const statusData = () => {
    const floors = loadFloors(floorsFile);
    const st = getState();
    const now = Date.now();
    // Hanya kamera yang sedang tampil di layar IPC Bardi. Kamera yang ditutup dibuang oleh monitor.js;
    // batas 180 dtk di sini hanya pengaman kalau monitor berhenti membaca layar.
    const cams = Object.values(st.cams).filter((c) => now - c.seen <= 180000).map((c) => ({
      name: c.name, floor: floors[c.name] || 'Belum diisi',
      status: c.status,
      code: c.code, sinceSec: Math.round((now - c.since) / 1000), attempts: c.attempts, offline: !!c.offline,
    })).sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));
    return { cams, meta: { mode: st.dry ? 'UJI (DRY-RUN)' : 'AKTIF', uptimeSec: Math.round((now - startedAt) / 1000), publicIp } };
  };

  const capturer = createCapturer({ log, spawnSpec: opts.screenSpawnSpec });
  const live = createLiveStream({ log, rootDir: dir, ffmpegPath: opts.ffmpegPath, inputArgs: opts.liveInputArgs });
  const viewSeen = new Map(); // ip -> waktu terakhir minta gambar (untuk catatan log)
  let pdfBusy = false;
  async function makePdf() {
    const { chromium } = require('playwright');
    const tok = makeToken(cfg.secret, 60000);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}/print?t=${encodeURIComponent(tok)}`, { waitUntil: 'load' });
      return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    } finally { await browser.close(); }
  }

  const send = (res, code, type, body, extra) => {
    res.writeHead(code, Object.assign({
      'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'self' 'unsafe-inline'; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'",
    }, extra || {}));
    res.end(body);
  };
  const json = (res, obj) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(obj));
  const redirect = (res, to, extra) => { res.writeHead(302, Object.assign({ Location: to, 'Cache-Control': 'no-store' }, extra || {})); res.end(); };

  const server = http.createServer(async (req, res) => {
    try {
      const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
      const url = new URL(req.url, 'http://x');
      const p = url.pathname;
      const authed = checkToken(cfg.secret, getCookie(req, 'bm_session'));
      // Berkas tetap untuk tampilan baru (font dan logo). Sebelum cek login supaya halaman login juga bisa memakainya.
      if (p === '/assets/fonts/PlusJakartaSans-latin.woff2' || p === '/assets/Logo.png') {
        try { return send(res, 200, p.endsWith('.woff2') ? 'font/woff2' : 'image/jpeg', fs.readFileSync(path.join(__dirname, p.slice(1))), { 'Cache-Control': 'public, max-age=604800' }); }
        catch (_) { return send(res, 404, 'text/plain; charset=utf-8', 'Tidak ditemukan'); }
      }

      if (p === '/login' && req.method === 'POST') {
        const f = fails.get(ip) || { n: 0, until: 0 };
        if (f.until > Date.now()) return send(res, 429, 'text/html; charset=utf-8', loginPage('Terlalu banyak percobaan. Coba lagi dalam beberapa menit.'));
        let body = '';
        req.on('data', (d) => { body += d; if (body.length > 1024) req.destroy(); });
        req.on('end', () => {
          const pw = new URLSearchParams(body).get('password') || '';
          if (verifyPassword(cfg, pw)) {
            fails.delete(ip);
            log('INFO', `Laporan: login berhasil dari ${ip}`);
            return redirect(res, '/displaycostum.html', { 'Set-Cookie': `bm_session=${encodeURIComponent(makeToken(cfg.secret, SESSION_MS))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}` });
          }
          f.n += 1;
          if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; log('WARN', `Laporan: 5 kali password salah dari ${ip}, diblokir 15 menit`); }
          fails.set(ip, f);
          setTimeout(() => send(res, 401, 'text/html; charset=utf-8', loginPage('Password salah.')), 600);
        });
        return;
      }
      if (p === '/login') return send(res, 200, 'text/html; charset=utf-8', loginPage(''));
      if (p === '/logout') return redirect(res, '/login', { 'Set-Cookie': 'bm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });

      if (p === '/print') { // hanya untuk pembuat PDF internal (token berumur 60 dtk)
        if (!checkToken(cfg.secret, url.searchParams.get('t')) || !/^(127\.0\.0\.1|::1)$/.test(ip)) return send(res, 403, 'text/plain', 'Forbidden');
        const floors = loadFloors(floorsFile); const events = loadEvents(csvFile);
        return send(res, 200, 'text/html; charset=utf-8', printPage({ status: statusData(), summary: buildSummary(events, floors, 168, loadFloorEntries(floorsFile)), events: events.slice(-200).reverse(), now: new Date().toLocaleString('id-ID') }));
      }

      if (!authed) {
        if (p.startsWith('/api/')) return send(res, 401, 'application/json', '{"error":"login"}');
        return redirect(res, '/login');
      }

      if (p === '/' ) return redirect(res, '/displaycostum.html');
      if (p === '/displaycostum.html') return send(res, 200, 'text/html; charset=utf-8', MAIN_PAGE);
      if (p === '/layar') return send(res, 200, 'text/html; charset=utf-8', LIVE_PAGE);
      if (p === '/layar-foto') return send(res, 200, 'text/html; charset=utf-8', PHOTO_PAGE);
      if (p === '/vendor/hls.min.js') {
        try { return send(res, 200, 'application/javascript; charset=utf-8', fs.readFileSync(path.join(__dirname, 'vendor', 'hls.min.js')), { 'Cache-Control': 'public, max-age=86400' }); }
        catch (_) { return send(res, 404, 'text/plain; charset=utf-8', 'hls.min.js tidak ada'); }
      }
      if (p === '/api/live/start') {
        const last = viewSeen.get(ip) || 0;
        if (Date.now() - last > 60000) log('INFO', `Lihat layar PC (siaran): dibuka dari ${ip}`);
        viewSeen.set(ip, Date.now());
        const r = await live.start();
        if (!r.ok) log('WARN', `Siaran layar gagal: ${r.error}`);
        return json(res, r.ok ? { ok: true } : { ok: false, error: /tidak ditemukan|ENOENT/.test(r.error || '') ? 'ffmpeg belum terpasang (jalankan INSTALL.bat lagi)' : r.error });
      }
      if (p.startsWith('/live/')) {
        const f = live.file(p.slice(6));
        if (!f) return send(res, 404, 'text/plain; charset=utf-8', 'Tidak ada');
        return send(res, 200, f.type, f.body);
      }
      if (p === '/api/screen.jpg') {
        const last = viewSeen.get(ip) || 0;
        if (Date.now() - last > 60000) log('INFO', `Lihat layar PC: dibuka dari ${ip}`);
        viewSeen.set(ip, Date.now());
        try {
          const img = await capturer.grab();
          return send(res, 200, 'image/jpeg', img);
        } catch (e) {
          log('WARN', `Lihat layar PC gagal: ${e.message}`);
          return send(res, 503, 'text/plain; charset=utf-8', 'Gagal mengambil layar: ' + e.message);
        }
      }
      if (p === '/api/status') return json(res, statusData());
      if (p === '/api/summary') return json(res, buildSummary(loadEvents(csvFile), loadFloors(floorsFile), Math.max(0, parseInt(url.searchParams.get('hours') || '24', 10) || 0), loadFloorEntries(floorsFile)));
      if (p === '/api/update/status') return json(res, upd.status());
      if (p === '/api/update/check' || p === '/api/update/apply') {
        if (req.method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', 'Gunakan POST');
        const origin = req.headers.origin;
        if (origin) { let okOrigin = false; try { okOrigin = new URL(origin).host === req.headers.host; } catch (_) {} if (!okOrigin) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden'); }
        if (p === '/api/update/check') return json(res, await upd.check());
        if (upd.isBusy()) return json(res, { ok: false, error: 'Pembaruan lain sedang berjalan' });
        log('INFO', `Pembaruan dari GitHub diminta dari ${ip}`);
        upd.apply(ip).then((r) => {
          if (!r.restart) return;
          if (opts.restart) setTimeout(() => opts.restart(), 1500);
          else upd.finish('Berhasil diperbarui. Tutup lalu buka lagi Bardi Monitor dari shortcut di Desktop.');
        }).catch(() => {});
        return json(res, { ok: true, started: true });
      }
      if (p === '/onvif') return send(res, 200, 'text/html; charset=utf-8', ONVIF_PAGE);
      if (p === '/multiview') return send(res, 200, 'text/html; charset=utf-8', MULTIVIEW_PAGE);
      if (p === '/klip') return send(res, 200, 'text/html; charset=utf-8', CLIP_PAGE);
      if (p === '/api/klip/list' || p === '/api/klip/add' || p === '/api/klip/get' || p === '/api/klip/delete') {
        if (req.method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', 'Gunakan POST');
        const origin = req.headers.origin;
        if (origin) { let okOrigin = false; try { okOrigin = new URL(origin).host === req.headers.host; } catch (_) {} if (!okOrigin) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden'); }
        if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, 'text/plain; charset=utf-8', 'Harus JSON');
        let body; try { body = await readBigJson(req, CLIP_MAX * 4 + 4096); } catch (e) { return json(res, { ok: false, error: 'Data terlalu besar atau tidak valid.' }); }
        if (p === '/api/klip/add') return json(res, clip.add(body.text));
        if (p === '/api/klip/get') return json(res, clip.get(body.id));
        if (p === '/api/klip/delete') return json(res, clip.remove(body.id));
        return json(res, clip.list({ q: body.q, offset: body.offset, limit: body.limit }));
      }
      if (p === '/kejadian') return send(res, 200, 'text/html; charset=utf-8', INCIDENT_PAGE);
      if (p === '/api/kejadian') return json(res, { ok: true, dir: incident.dir, recorder: incident.statusList(), days: incident.retentionDays, incidents: incident.incidents() });
      if (p.startsWith('/kejadian/f/')) { // /kejadian/f/<id8>/<tanggal_jam.mp4>: video klip (mendukung Range supaya bisa digeser)
        const m = /^\/kejadian\/f\/([0-9a-f]{8})\/([0-9_.\-a-z]+)$/.exec(p);
        const f = m && incident.fileFor(m[1], m[2]);
        if (!f) return send(res, 404, 'text/plain; charset=utf-8', 'Tidak ada');
        let start = 0, end = f.size - 1, code = 200;
        const rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
        if (rg && (rg[1] || rg[2])) {
          if (rg[1] === '') { start = Math.max(0, f.size - Number(rg[2])); } else { start = Number(rg[1]); if (rg[2]) end = Math.min(end, Number(rg[2])); }
          if (!(start <= end && start < f.size)) { res.writeHead(416, { 'Content-Range': 'bytes */' + f.size }); return res.end(); }
          code = 206;
        }
        const h = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff' }; // iPhone (Safari) bisa menolak memutar video yang berlabel no-store
        if (code === 206) h['Content-Range'] = `bytes ${start}-${end}/${f.size}`;
        res.writeHead(code, h);
        const st = fs.createReadStream(f.path, { start, end });
        st.on('error', () => { try { res.destroy(); } catch (_) {} });
        res.on('close', () => st.destroy());
        return st.pipe(res);
      }
      if (p.startsWith('/onvif-live/')) { // /onvif-live/<id>/<live.m3u8|segNNNNN.ts>
        const m = /^\/onvif-live\/([0-9a-f]{8})\/([A-Za-z0-9_.]+)$/.exec(p);
        if (m && m[2] === 'rt.mp4') return onvifLive.realtime(m[1], url.searchParams.get('q'), req, res, url.searchParams.get('a') !== '0', url.searchParams.get('s') === '1');
        const f = m && onvifLive.file(m[1], m[2]);
        if (!f) return send(res, 404, 'text/plain; charset=utf-8', 'Tidak ada');
        return send(res, 200, f.type, f.body);
      }
      if (p === '/api/onvif/cameras') return json(res, { libOk: onvif.libOk(), libMessage: onvif.libMessage(), cameras: onvif.list(), recorder: incident.statusList().map((r) => ({ id: r.id, rate: r.rate })) });
      if (p === '/api/onvif/save' || p === '/api/onvif/delete' || p === '/api/onvif/test' || p === '/api/onvif/scan' || p === '/api/onvif/sweep' || p === '/api/onvif/discover' || p === '/api/onvif/live/start' || p === '/api/onvif/live/stop' || p === '/api/onvif/diag' || p === '/api/onvif/ptz') {
        if (req.method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', 'Gunakan POST');
        const origin = req.headers.origin;
        if (origin) { let okOrigin = false; try { okOrigin = new URL(origin).host === req.headers.host; } catch (_) {} if (!okOrigin) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden'); }
        if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, 'text/plain; charset=utf-8', 'Harus JSON');
        let body; try { body = await readJson(req); } catch (e) { return json(res, { ok: false, error: 'Data tidak valid.' }); }
        if (p === '/api/onvif/save') return json(res, onvif.upsert(body));
        if (p === '/api/onvif/delete') return json(res, onvif.remove(body.id));
        if (p === '/api/onvif/ptz') { const id = String(body.id || ''); return json(res, body.action === 'stop' ? await ptz.stop(id) : await ptz.move(id, body)); }
        if (p === '/api/onvif/diag') return json(res, await onvifLive.diag(String(body.id || ''), body.quality));
        if (p === '/api/onvif/live/stop') { onvifLive.stop(String(body.id || ''), 'ditutup penonton'); return json(res, { ok: true }); }
        if (p === '/api/onvif/live/start') {
          const id = String(body.id || '');
          const r = await onvifLive.start(id, body.quality);
          if (!r.ok) log('WARN', `Live ONVIF ${id} gagal: ${String(r.error).slice(0, 200)}`);
          return json(res, r.ok ? { ok: true, url: `/onvif-live/${id}/live.m3u8`, profile: r.profile, info: r.info } : { ok: false, error: /tidak ditemukan|ENOENT/.test(r.error || '') && /ffmpeg/.test(r.error || '') ? 'ffmpeg belum terpasang (jalankan INSTALL.bat lagi)' : r.error });
        }
        if (onvifTests >= 3) return json(res, { ok: false, error: 'Terlalu banyak tes berjalan. Tunggu sebentar.' });
        onvifTests++;
        try {
          if (p === '/api/onvif/discover') return json(res, await (opts.onvifDiscoverFn || discover)());
          if (p === '/api/onvif/sweep') {
            const r = await (opts.onvifSweepFn || sweep)();
            if (r && r.ok) { const have = onvif.list(); r.devices.forEach((d) => { d.registered = have.some((c) => c.host === d.ip); }); }
            return json(res, r);
          }
          if (p === '/api/onvif/scan') {
            const host = String(body.host || '').trim();
            if (!isPrivateIPv4(host)) return json(res, { ok: false, error: 'IP harus alamat jaringan lokal, contoh 192.168.18.51.' });
            return json(res, await (opts.onvifScanFn || scanPorts)(host));
          }
          return json(res, await onvif.test(body));
        } finally { onvifTests--; }
      }
      if (p === '/api/stop') {
        if (req.method !== 'POST') return send(res, 405, 'text/plain; charset=utf-8', 'Gunakan POST');
        const origin = req.headers.origin;
        if (origin) { let okOrigin = false; try { okOrigin = new URL(origin).host === req.headers.host; } catch (_) {} if (!okOrigin) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden'); }
        if (!opts.stop) return json(res, { ok: false, error: 'Fitur berhenti tidak tersedia' });
        log('INFO', `Penghentian pemantauan diminta dari ${ip}`);
        setTimeout(() => opts.stop(), 800);
        return json(res, { ok: true });
      }
      if (p === '/api/events') {
        const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '200', 10) || 200));
        const cam = url.searchParams.get('camera');
        const hrs = Math.max(0, parseInt(url.searchParams.get('hours') || '0', 10) || 0);
        let ev = loadEvents(csvFile);
        if (cam) { const n = normName(cam); ev = ev.filter((e) => normName(e.kamera) === n); }
        if (hrs > 0) { const since = Date.now() - hrs * 3600e3; ev = ev.filter((e) => new Date(e.waktu.replace(' ', 'T')).getTime() >= since); }
        return json(res, { events: ev.slice(-limit).reverse() });
      }
      if (p === '/report.pdf') {
        if (pdfBusy) return send(res, 503, 'text/plain; charset=utf-8', 'PDF sedang dibuat, coba lagi sebentar.');
        pdfBusy = true;
        try {
          const buf = await makePdf();
          const d = new Date(); const z = (n) => String(n).padStart(2, '0');
          return send(res, 200, 'application/pdf', buf, { 'Content-Disposition': `attachment; filename="laporan-bardi-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.pdf"` });
        } finally { pdfBusy = false; }
      }
      return send(res, 404, 'text/plain; charset=utf-8', 'Tidak ditemukan');
    } catch (e) {
      log('WARN', `Server laporan error: ${e.message}`);
      try { send(res, 500, 'text/plain; charset=utf-8', 'Terjadi kesalahan'); } catch (_) {}
    }
  });
  server.on('error', (e) => log('WARN', `Server laporan gagal start di port ${port}: ${e.code || e.message}`));
  attachRealtimeWs(server, { authed: (req) => checkToken(cfg.secret, getCookie(req, 'bm_session')), onvifLive, log });
  server.listen(port, '0.0.0.0', () => log('INFO', `Laporan aktif: http://<IP-PC>:${port}/displaycostum.html (wajib password)`));
  return server;
}

module.exports = { startReportServer, hashPassword, parseCsv, buildSummary, loadEvents, loadFloorEntries };
