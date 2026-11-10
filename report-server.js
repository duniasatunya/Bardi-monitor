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

const MAIN_PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laporan Bardi Monitor</title><style>${BASE_CSS}
header{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--bd);position:sticky;top:0}
h1{font-size:17px;margin:0}h2{font-size:15px;margin:0 0 10px}main{max-width:1100px;margin:0 auto;padding:12px 16px 40px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px;margin:12px 0;overflow-x:auto}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mut{color:var(--mut);font-size:13px}
a.btn,button,select{font:inherit;padding:7px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer;text-decoration:none}
a.btn.pri{background:var(--pri);border-color:var(--pri);color:#fff}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--bd);white-space:nowrap}th{color:var(--mut);font-weight:600}
.b{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;font-weight:600;color:#fff}
.PLAY{background:var(--ok)}.ERROR,.OFFLINE{background:var(--bad)}.CONNECTING,.FROZEN,.ACTED{background:var(--warn)}.INIT,.HIDE{background:var(--mut)}
.tot{display:flex;flex-wrap:wrap;gap:16px}.tot div{min-width:90px}.tot b{display:block;font-size:22px}
button:disabled{opacity:.5;cursor:default}.pri-b{background:var(--pri);border-color:var(--pri);color:#fff}
tr.clk{cursor:pointer}tr.clk:hover td{background:rgba(232,89,12,.08)}tr.sel td{background:rgba(232,89,12,.16)}
.lnk{color:var(--pri);cursor:pointer;text-decoration:underline;background:none;border:0;padding:0;font:inherit}
.det{border:2px solid var(--pri);border-radius:10px;padding:12px;margin:14px 0 4px;overflow-x:auto}.det h3{margin:0 0 8px;font-size:15px}
.det th,.det td{white-space:normal;padding:6px 5px;font-size:13px}
</style></head><body>
<header><h1>Laporan Bardi Monitor</h1><div class="row"><span class="mut" id="upd">memuat...</span>
<button id="upb">Pembaruan</button><a class="btn" href="/layar" target="_blank" rel="noopener">Lihat layar PC</a><a class="btn pri" href="/report.pdf">Unduh PDF</a><a class="btn" href="/logout">Keluar</a></div></header>
<main>
<div class="card" id="upc" style="display:none"><div class="row" style="justify-content:space-between"><h2>Pembaruan dari GitHub</h2><button id="upx">Tutup</button></div>
<p class="mut" id="upv"></p><p id="upm"></p>
<div class="row"><button id="upchk">Cek pembaruan</button><button id="upgo" class="pri-b" style="display:none">Perbarui sekarang</button></div>
<p class="mut">Saat diperbarui, Bardi Monitor menutup dan membuka ulang sendiri (sekitar 15 detik). Login Bardi, password, dan data kamera tidak berubah.</p></div>
<div class="card"><div class="tot" id="tot"></div><p class="mut" id="meta"></p></div>
<div class="card"><div class="row" style="justify-content:space-between"><h2>Status kamera sekarang</h2>
<select id="filt"><option value="all">Semua</option><option value="bad">Hanya bermasalah</option></select></div>
<table><thead><tr><th>Kamera</th><th>Lantai</th><th>Status</th><th>Kode error terakhir</th><th>Lama di status ini</th><th>Percobaan</th></tr></thead><tbody id="st"></tbody></table>
<p class="mut">Daftar ini sama dengan kamera yang sedang tampil di layar IPC Bardi. Kamera yang ditutup di Bardi akan hilang dari daftar dalam sekitar 10-15 detik, dan muncul lagi kalau dibuka.</p></div>
<div class="card"><div class="row" style="justify-content:space-between"><h2>Ringkasan gangguan</h2>
<select id="per"><option value="24">24 jam terakhir</option><option value="168">7 hari terakhir</option><option value="0">Semua</option></select></div>
<h3 style="font-size:14px;margin:8px 0">Per lantai <span class="mut">(klik baris lantai untuk melihat detail tiap kamera)</span></h3><table><thead><tr><th>Lantai</th><th>Jumlah kamera</th><th>Kamera bermasalah</th><th>Kejadian error</th><th>Kali ditandai offline</th><th></th></tr></thead><tbody id="fl"></tbody></table>
<div id="fd"></div>
<h3 style="font-size:14px;margin:14px 0 8px">Per kamera (paling sering bermasalah di atas)</h3>
<table><thead><tr><th>Kamera</th><th>Lantai</th><th>Error</th><th>Kode (jumlah)</th><th>Retry</th><th>Reopen</th><th>Pulih</th><th>Offline</th></tr></thead><tbody id="cm"></tbody></table></div>
<div class="card"><h2>Riwayat gangguan (200 terakhir)</h2>
<table><thead><tr><th>Waktu</th><th>Kamera</th><th>Kejadian</th><th>Kode</th><th>Percobaan</th><th>Detik</th><th>Hasil</th></tr></thead><tbody id="ev"></tbody></table></div>
</main>
<script>
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LBL={PLAY:'Normal',ERROR:'Error',CONNECTING:'Menyambung',FROZEN:'Beku',ACTED:'Dipulihkan...',INIT:'Baru terlihat',HIDE:'Tidak tampil'};
async function api(u){const r=await fetch(u,{cache:'no-store'});if(r.status===401){location.href='/login';throw 0}return r.json()}
const dur=s=>s<60?s+' dtk':s<3600?Math.floor(s/60)+' mnt':Math.floor(s/3600)+' jam '+Math.floor(s%3600/60)+' mnt';
let ST=null,SUM=null,SELF=null,SELC=null;
const nrm=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();
const codes=o=>Object.entries(o||{}).map(([k,v])=>k+' ('+v+')').join(', ')||'-';
function drawStatus(){ if(!ST)return; const bad=$('filt').value==='bad';
  const cams=ST.cams.filter(c=>!bad||['ERROR','FROZEN','CONNECTING','ACTED'].includes(c.status)||c.offline);
  $('st').innerHTML=cams.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.floor)+'</td><td><span class="b '+esc(c.status)+'">'+esc(LBL[c.status]||c.status)+'</span>'+(c.offline?' <span class="b OFFLINE">Offline</span>':'')+'</td><td>'+esc(c.code||'-')+'</td><td>'+dur(c.sinceSec)+'</td><td>'+c.attempts+'</td></tr>').join('')||'<tr><td colspan="6" class="mut">Tidak ada data.</td></tr>';
  const n=s=>ST.cams.filter(c=>s.includes(c.status)).length;
  $('tot').innerHTML='<div><b>'+ST.cams.length+'</b>Kamera dipantau</div><div><b style="color:var(--ok)">'+n(['PLAY'])+'</b>Normal</div><div><b style="color:var(--bad)">'+n(['ERROR'])+'</b>Error</div><div><b style="color:var(--warn)">'+n(['FROZEN','CONNECTING','ACTED'])+'</b>Beku / menyambung</div>';
  $('meta').textContent='Mode: '+ST.meta.mode+' | Berjalan: '+dur(ST.meta.uptimeSec)+' | IP publik terdeteksi: '+(ST.meta.publicIp||'belum diketahui');
  if(SELF)drawFloor();
}
function drawFloor(){
  if(!SUM||!SELF){$('fd').innerHTML='';return}
  const list=(SUM.floorCams||{})[SELF];
  if(!list){$('fd').innerHTML='';SELF=null;return}
  const live={};(ST?ST.cams:[]).forEach(c=>{live[nrm(c.name)]=c});
  const per=$('per').options[$('per').selectedIndex].text;
  const rows=list.map(c=>{const l=live[nrm(c.name)];
    const st=l?'<span class="b '+esc(l.status)+'">'+esc(LBL[l.status]||l.status)+'</span>'+(l.offline?' <span class="b OFFLINE">Offline</span>':''):'<span class="mut">Tidak tampil</span>';
    return '<tr><td><b>'+esc(c.name)+'</b></td><td>'+st+'</td><td>'+c.error+'</td><td>'+esc(codes(c.codes))+'</td><td>'+c.retry+'</td><td>'+c.reopen+'</td><td>'+c.pulih+'</td><td>'+c.offline+'</td><td>'+(c.downSec?dur(c.downSec):'-')+'</td><td>'+(c.maxDown?dur(c.maxDown):'-')+'</td><td>'+esc(c.lastTime||'-')+'</td><td><button class="lnk" data-cam="'+esc(c.name)+'">Riwayat</button></td></tr>'}).join('');
  const bad=list.filter(c=>c.error>0||c.offline>0).length;
  $('fd').innerHTML='<div class="det"><div class="row" style="justify-content:space-between"><h3>Detail '+esc(SELF)+' ('+esc(per)+')</h3><button id="fdx">Tutup</button></div>'
   +'<p class="mut">'+list.length+' kamera, '+bad+' pernah bermasalah pada periode ini. Urut: paling sering error di atas. "Total bermasalah" = jumlah lama kamera bermasalah sebelum pulih; "Terlama" = satu gangguan terlama yang sudah pulih.</p>'
   +'<table><thead><tr><th>Kamera</th><th>Status sekarang</th><th>Error</th><th>Kode (jumlah)</th><th>Retry</th><th>Reopen</th><th>Pulih</th><th>Offline</th><th>Total bermasalah</th><th>Terlama</th><th>Error terakhir</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><div id="fcam"></div></div>';
  $('fdx').onclick=()=>{SELF=null;SELC=null;$('fd').innerHTML='';drawSumFloors()};
  document.querySelectorAll('#fd button[data-cam]').forEach(b=>{b.onclick=()=>{SELC=b.getAttribute('data-cam');loadCam()}});
  if(SELC)loadCam();
}
async function loadCam(){
  if(!SELC)return;
  const d=await api('/api/events?limit=200&hours='+$('per').value+'&camera='+encodeURIComponent(SELC));
  const el=$('fcam');if(!el)return;
  el.innerHTML='<h3 style="margin:12px 0 6px">Riwayat '+esc(SELC)+' <span class="mut">(maks. 200 terbaru pada periode ini)</span></h3><table><thead><tr><th>Waktu</th><th>Kejadian</th><th>Kode</th><th>Percobaan</th><th>Detik</th><th>Hasil</th></tr></thead><tbody>'
   +(d.events.map(e=>'<tr><td>'+esc(e.waktu)+'</td><td>'+esc(e.kejadian)+'</td><td>'+esc(e.kode_error||'-')+'</td><td>'+esc(e.percobaan)+'</td><td>'+esc(e.durasi_detik)+'</td><td>'+esc(e.hasil)+'</td></tr>').join('')||'<tr><td colspan="6" class="mut">Tidak ada kejadian pada periode ini.</td></tr>')+'</tbody></table>';
}
function drawSumFloors(){
  if(!SUM)return;
  $('fl').innerHTML=SUM.floors.map(f=>'<tr class="clk'+(f.floor===SELF?' sel':'')+'" data-fl="'+esc(f.floor)+'"><td><b>'+esc(f.floor)+'</b></td><td>'+f.cameras+'</td><td>'+f.problemCams+'</td><td>'+f.error+'</td><td>'+f.offline+'</td><td><span class="lnk">Lihat detail</span></td></tr>').join('')||'<tr><td colspan="6" class="mut">Belum ada data lantai. Isi kamera-lantai.json.</td></tr>';
  document.querySelectorAll('#fl tr[data-fl]').forEach(r=>{r.onclick=()=>{SELF=r.getAttribute('data-fl');SELC=null;drawSumFloors();drawFloor();$('fd').scrollIntoView({behavior:'smooth',block:'nearest'})}});
}
async function loadStatus(){try{ST=await api('/api/status');drawStatus();$('upd').textContent='Diperbarui '+new Date().toLocaleTimeString('id-ID')}catch(e){$('upd').textContent='Gagal memuat status'}}
async function loadSummary(){const d=await api('/api/summary?hours='+$('per').value);
  SUM=d;drawSumFloors();if(SELF)drawFloor();
  $('cm').innerHTML=d.cams.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.floor)+'</td><td>'+c.error+'</td><td>'+esc(Object.entries(c.codes).map(([k,v])=>k+' ('+v+')').join(', ')||'-')+'</td><td>'+c.retry+'</td><td>'+c.reopen+'</td><td>'+c.pulih+'</td><td>'+c.offline+'</td></tr>').join('')||'<tr><td colspan="8" class="mut">Belum ada kejadian pada periode ini.</td></tr>';}
async function loadEvents(){const d=await api('/api/events?limit=200');
  $('ev').innerHTML=d.events.map(e=>'<tr><td>'+esc(e.waktu)+'</td><td>'+esc(e.kamera)+'</td><td>'+esc(e.kejadian)+'</td><td>'+esc(e.kode_error||'-')+'</td><td>'+esc(e.percobaan)+'</td><td>'+esc(e.durasi_detik)+'</td><td>'+esc(e.hasil)+'</td></tr>').join('')||'<tr><td colspan="7" class="mut">Belum ada kejadian.</td></tr>';}
const post=async u=>{const r=await fetch(u,{method:'POST',cache:'no-store'});if(r.status===401){location.href='/login';throw 0}return r.json()};
function drawUp(d){
  $('upb').textContent='Pembaruan'+(d.current?' ('+d.current.short+')':'');
  $('upv').textContent=(d.current?'Terpasang: '+d.current.short+(d.current.message?' - '+d.current.message:''):'Terpasang: belum tercatat (pemasangan manual)')+' | Repo: '+d.repo+(d.hasToken?'':' | Token belum dipasang (perlu untuk repo privat: PASANG-TOKEN-UPDATE.bat)');
  const busy=['checking','downloading','installing','restarting'].includes(d.state);
  let m='Klik "Cek pembaruan".';
  if(d.state==='error')m='Gagal: '+d.error;
  else if(busy||d.state==='done')m=d.message;
  else if(d.latest)m=d.upToDate?'Sudah versi terbaru ('+d.latest.short+').':'Ada versi baru: '+d.latest.short+(d.latest.message?' - '+d.latest.message:'');
  $('upm').textContent=m;
  $('upchk').disabled=busy;
  $('upgo').style.display=(d.latest&&!d.upToDate&&!busy&&d.state!=='done')?'':'none';
}
async function upStatus(){try{drawUp(await api('/api/update/status'))}catch(e){}}
function waitBack(){let down=false;const t0=Date.now();const iv=setInterval(async()=>{
  try{const r=await fetch('/api/status',{cache:'no-store'});if(r.ok&&down){clearInterval(iv);location.reload()}}catch(e){down=true}
  if(Date.now()-t0>120000){clearInterval(iv);$('upm').textContent='Belum kembali setelah 2 menit. Buka Bardi Monitor dari shortcut di Desktop.'}},1500)}
async function upPoll(){try{const d=await api('/api/update/status');drawUp(d);
  if(['checking','downloading','installing'].includes(d.state))setTimeout(upPoll,1000);else if(d.state==='restarting')waitBack()}catch(e){}}
$('upb').onclick=()=>{$('upc').style.display='';upStatus()};
$('upx').onclick=()=>{$('upc').style.display='none'};
$('upchk').onclick=async()=>{$('upm').textContent='Memeriksa GitHub...';try{drawUp(await post('/api/update/check'))}catch(e){}};
$('upgo').onclick=async()=>{if(!confirm('Perbarui sekarang? Bardi Monitor akan menutup dan membuka ulang sendiri (sekitar 15 detik).'))return;
  const r=await post('/api/update/apply');if(r.ok)upPoll();else $('upm').textContent=r.error||'Gagal memulai pembaruan'};
upStatus();
$('filt').onchange=drawStatus;$('per').onchange=loadSummary;
loadStatus();loadSummary();loadEvents();
setInterval(loadStatus,2000);setInterval(()=>{loadSummary();loadEvents()},10000);
</script></body></html>`;

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
  server.listen(port, '0.0.0.0', () => log('INFO', `Laporan aktif: http://<IP-PC>:${port}/displaycostum.html (wajib password)`));
  return server;
}

module.exports = { startReportServer, hashPassword, parseCsv, buildSummary, loadEvents, loadFloorEntries };
