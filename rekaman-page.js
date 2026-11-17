// Halaman "Rekaman": putar ulang rekaman 24 jam per kamera + status perekam. Menggantikan halaman "Kejadian".
// Hanya tampilan. Data dari /api/rekaman/* dan video dari /rekaman/f/... (rekaman-api.js).
// Skrip browser ditulis sebagai fungsi lalu toString (tidak boleh memakai variabel dari luar fungsinya).
'use strict';
const { ds } = require('./ui-kit');
const I = ds.icon;

const css = `
.rk-tabs{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:var(--surface);box-shadow:var(--sh1);margin:0 0 14px}
.rk-tabs button{border:0;background:transparent;color:var(--mut);font:inherit;font-weight:700;font-size:14px;height:40px;padding:0 20px;border-radius:999px;cursor:pointer}
.rk-tabs button[aria-selected=true]{background:var(--brand-ink);color:var(--on-brand)}
.rk-pane[hidden]{display:none}
.rk{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,340px);gap:var(--gap);align-items:start}
.rk .main-c{min-width:0}
.rk .side-c{min-width:0;position:sticky;top:88px}
.rk-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}
.rk-bar .psel{flex:1 1 220px;min-width:180px;position:relative}
.rk-bar .psel select{width:100%;height:44px;border:0;border-radius:999px;background:var(--surface);color:var(--tx);box-shadow:var(--sh1);padding:0 40px 0 18px;font-weight:600;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer}
.rk-bar .psel::after{content:'';position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid var(--mut);border-bottom:2px solid var(--mut);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.rk-bar input[type=time]{height:44px;border:0;border-radius:999px;background:var(--surface);color:var(--tx);box-shadow:var(--sh1);padding:0 16px;font:inherit;font-weight:600}
.rk-bar .btn{height:44px;white-space:nowrap}
.rk-days{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;margin:0 0 4px;scrollbar-width:thin}
.rk-days button{flex:none;border:0;background:var(--surface);color:var(--tx);box-shadow:var(--sh1);border-radius:14px;padding:6px 12px;min-width:58px;font:inherit;cursor:pointer;text-align:center;line-height:1.25}
.rk-days button b{display:block;font-size:16px}
.rk-days button span{font-size:11px;color:var(--mut)}
.rk-days button.kosong{opacity:.45}
.rk-days button[aria-pressed=true]{background:var(--brand-ink);color:var(--on-brand)}
.rk-days button[aria-pressed=true] span{color:var(--on-brand)}
.pcard{padding:0;overflow:hidden}
.vbox{position:relative;aspect-ratio:16/9;background:#000;overflow:hidden}
.vbox video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.vbox .ph0{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#b4c0c9;padding:0 24px;pointer-events:none;font-size:15px;line-height:1.5}
.vbox .clk{display:none!important;position:absolute;left:10px;top:10px;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none}
.pinfo{padding:14px 16px 18px;display:flex;flex-direction:column;gap:12px}
.rk-ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rk-ctl .btn{min-height:40px;font-size:14px;padding:0 14px}
.rk-ctl .grow{flex:1}
.rk-ctl .spd button[aria-pressed=true]{background:var(--brand-ink);color:var(--on-brand)}
.tlw{position:relative}
.tl{position:relative;height:64px;cursor:ew-resize;border-radius:14px;background:repeating-linear-gradient(135deg,var(--surface-2) 0 6px,var(--line) 6px 8px);overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.tl .tk{position:absolute;bottom:0;width:1px;height:14px;background:var(--tx);opacity:.35;pointer-events:none}
.tl .tk.mj{height:100%;opacity:.5}
.dnav{display:none}
.dpill{display:inline-flex;align-items:center;gap:6px;padding:6px;border-radius:999px;background:var(--surface-2)}
.dpill b{min-width:96px;text-align:center;font-size:16px}
.dpill button{width:44px;height:44px;border:0;border-radius:50%;background:var(--surface);color:var(--tx);display:flex;align-items:center;justify-content:center;cursor:pointer}
.dpill button:disabled{opacity:.4}
.tl .sg{position:absolute;top:10px;bottom:10px;background:var(--ok);border-radius:3px;min-width:1px;pointer-events:none}
.tl .sg.b{background:var(--brand)}
.tl .mt{position:absolute;top:0;bottom:0;background:var(--bad-t);border-left:2px solid var(--bad);border-right:2px solid var(--bad);min-width:4px;pointer-events:none}
.tl .pos{position:absolute;top:0;bottom:0;width:3px;margin-left:-1px;background:var(--tx);pointer-events:none;box-shadow:0 0 0 1px var(--surface)}
.tl .now{position:absolute;top:0;bottom:0;width:2px;background:var(--brand-ink);opacity:.6;pointer-events:none}
.tlh{position:relative;height:18px;margin-top:4px;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums}
.tlh span{position:absolute;transform:translateX(-50%);white-space:nowrap}
.tlg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut)}
.tlg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px}
.cn{font-size:13px;color:var(--mut);margin:0}
.cn.warn{color:var(--warn-ink);font-weight:600}
.rk-side h3{font-size:15px;margin:0 0 8px}
.ev{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;color:var(--tx);font:inherit;padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer;min-width:0}
.ev:last-child{border-bottom:0}
.ev .en{flex:1;min-width:0}.ev .en b{display:block;font-size:14px}.ev .en span{font-size:12px;color:var(--mut)}
.ev i{width:10px;height:10px;border-radius:50%;flex:none}
.ev i.r{background:var(--bad)}.ev i.g{background:var(--off)}
.st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--gap)}
.rkc{padding:16px 18px;display:flex;flex-direction:column;gap:6px;min-width:0;border-left:6px solid var(--off)}
.rkc.hijau{border-left-color:var(--ok)}.rkc.kuning{border-left-color:var(--warn)}.rkc.merah{border-left-color:var(--bad)}
.rkc .h{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}.rkc .h .pill{max-width:100%;white-space:normal}
.rkc .h b{max-width:100%;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rkc .m{font-size:13px;color:var(--mut)}
.rkc .w{font-size:13px;color:var(--bad-ink);font-weight:600}
.rkc .btn{align-self:flex-start;min-height:38px;font-size:13px;padding:0 14px;margin-top:4px}
.sbar{height:12px;border-radius:999px;background:var(--surface-2);overflow:hidden;margin:8px 0}
.sbar i{display:block;height:100%;background:var(--brand-ink);border-radius:999px}
.sbar.hot i{background:var(--bad)}
@media (max-width:899px){
  .rk{grid-template-columns:minmax(0,1fr)}
  .rk-days{display:none}
  .rk-bar{gap:6px}
  .rk-bar input[type=time]{flex:1 1 120px;min-width:0;padding:0 10px}
  .rk-bar .btn{padding:0 14px}
  .pcard{background:transparent;box-shadow:none;margin:0 -16px;border-radius:0;overflow:visible;display:flex;flex-direction:column}
  .pcard .vbox{border-radius:0;order:0}
  .pinfo{display:contents}
  .dnav{display:block;order:1;padding:12px 16px 4px}
  .tlw{order:2;display:flex;flex-direction:column;background:var(--surface-2);padding:10px 0 0;margin-top:8px}
  .tlh{order:-1;height:22px;margin:0 0 4px;font-size:13px}
  .tl{height:84px;border-radius:0;background:transparent}
  .tl .sg{top:8px;bottom:8px}
  #zoom{order:3;flex-wrap:nowrap;overflow-x:auto;gap:8px;padding:10px 16px;background:var(--surface-2);scrollbar-width:none}
  #zoom .btn{flex:none;background:var(--surface);min-height:44px}
  #zoom .btn[aria-pressed=true]{background:var(--brand-ink);color:var(--on-brand)}
  #zoom .cn,#zoomIn,#zoomOut{display:none}
  #ctl{order:4;padding:12px 16px 0}
  .tlg{order:5;padding:0 16px}
  .pinfo .cn{order:6;padding:0 16px}
  .rk-side{padding:0}
  .rk .side-c{position:static}
  .rk-bar .psel{flex-basis:100%}
}

/* HP miring (landscape): video penuh layar, kontrol + garis waktu melayang di bawahnya */
@media (orientation:landscape) and (max-height:540px) and (hover:none){
  .pcard{position:fixed;left:0;top:0;right:0;bottom:0;margin:0;z-index:70;background:#000;display:block}
  .pcard .vbox{position:absolute;inset:0;aspect-ratio:auto;height:100%;order:0}
  .pinfo{display:flex;flex-direction:column;position:absolute;left:0;right:0;bottom:0;padding:0 max(8px,env(safe-area-inset-right)) 4px max(8px,env(safe-area-inset-left));background:linear-gradient(transparent,rgba(0,0,0,.62) 38%);color:#fff}
  .pinfo .dnav{display:flex;position:fixed;top:6px;left:50%;transform:translateX(-50%);padding:0;z-index:2}
  .dpill{padding:3px;background:rgba(255,255,255,.18)}
  .dpill b{min-width:84px;font-size:14px;color:#fff}
  .dpill button{width:30px;height:30px;background:rgba(255,255,255,.9)}
  #ctl{order:1;padding:0;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
  #ctl .btn{flex:none;min-height:30px;font-size:13px;padding:0 12px;background:rgba(255,255,255,.2);color:#fff;border:0}
  #ctl .btn.pri,#ctl .spd button[aria-pressed=true]{background:var(--brand-ink)}
  #ctl .grow{flex:1}
  .tlw{order:2;background:rgba(40,48,54,.55);margin-top:6px;padding-top:6px;border-radius:12px;overflow:hidden}
  .tlh{color:#fff;height:18px;font-size:12px;margin-bottom:2px}
  .tl{height:42px;background:transparent}
  .tl .sg{top:6px;bottom:6px}
  .tl .tk{background:#fff;opacity:.6}
  .tl .pos{background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)}
  #zoom{order:3;padding:4px 0 0;background:transparent;gap:6px}
  #zoom .btn{min-height:28px;font-size:12px;padding:0 10px;background:rgba(255,255,255,.2);color:#fff;border:0}
  #zoom .btn[aria-pressed=true]{background:var(--brand-ink)}
  .tlg{display:none}
  .pinfo .cn{position:absolute;left:12px;bottom:calc(100% + 6px);padding:0;color:#fff;text-shadow:0 1px 3px #000;font-size:12px}
  .pinfo .cn:not(#note){display:none}
  #note{bottom:calc(100% + 6px)}
}
`;

const body = `
<div class="rk-tabs" role="tablist"><button type="button" role="tab" id="tPlay" aria-selected="true">Putar ulang</button><button type="button" role="tab" id="tStat" aria-selected="false">Status perekam</button></div>
<section class="rk-pane" id="pPlay" aria-label="Putar ulang">
<div class="rk">
<div class="main-c">
<div class="rk-bar">
<div class="psel"><label class="sr" for="cam">Kamera</label><select id="cam"></select></div>
<label class="sr" for="tm">Jam</label><input type="time" id="tm" step="1">
<button class="btn" type="button" id="goTm">Pergi</button>
<button class="btn pri" type="button" id="goNow">${I('clock', 's')}Terbaru</button>
</div>
<div class="rk-days" id="days" role="group" aria-label="Pilih tanggal"></div>
<div class="card pcard">
<div class="vbox"><video id="v" playsinline preload="auto" muted></video><div class="clk" id="clk" hidden></div><div class="ph0" id="ph0">Pilih kamera dan tanggal, lalu klik garis waktu di bawah untuk mulai memutar.</div></div>
<div class="pinfo">
<div class="dnav" id="dnav"><div class="dpill"><button type="button" id="dPrev" aria-label="Hari sebelumnya">${I('back', 's')}</button><b id="dLbl">Hari ini</b><button type="button" id="dNext" aria-label="Hari berikutnya">${I('next', 's')}</button></div></div>
<div class="rk-ctl" id="ctl">
<button class="btn" type="button" data-j="-600" title="Mundur 10 menit">-10 mnt</button>
<button class="btn" type="button" data-j="-10" title="Mundur 10 detik">-10 dtk</button>
<button class="btn pri" type="button" id="pp" aria-label="Putar atau jeda">${I('play', 's')}<span id="ppT">Putar</span></button>
<button class="btn" type="button" data-j="10" title="Maju 10 detik">+10 dtk</button>
<button class="btn" type="button" data-j="600" title="Maju 10 menit">+10 mnt</button>
<span class="grow"></span>
<span class="rk-ctl spd" id="spd"><button class="btn" type="button" data-s="1" aria-pressed="true">1x</button><button class="btn" type="button" data-s="2" aria-pressed="false">2x</button><button class="btn" type="button" data-s="4" aria-pressed="false">4x</button><button class="btn" type="button" data-s="8" aria-pressed="false">8x</button></span>
</div>
<div class="tlw"><div class="tl" id="tl" role="slider" aria-label="Garis waktu"></div><div class="tlh" id="tlh"></div></div>
<div class="rk-ctl" id="zoom"><span class="cn" id="zinfo">Tampilan: Seluruh hari</span><button class="btn" type="button" id="zoomOut" aria-label="Perkecil" title="Perkecil">-</button><button class="btn" type="button" id="zoomIn" aria-label="Perbesar" title="Perbesar">+</button><button class="btn" type="button" data-m="1440" aria-pressed="true">24 jam</button><button class="btn" type="button" data-m="360">6 jam</button><button class="btn" type="button" data-m="60">1 jam</button><button class="btn" type="button" data-m="30">30 mnt</button><button class="btn" type="button" data-m="10">10 mnt</button><button class="btn" type="button" data-m="5">5 mnt</button><button class="btn" type="button" data-m="1">1 mnt</button></div>
<div class="tlg"><span><i style="background:var(--ok)"></i>Ada rekaman</span><span><i style="background:var(--brand)"></i>Sedang direkam</span><span><i style="background:var(--bad)"></i>Kamera mati (klik = ke saat kamera mati)</span><span><i style="background:var(--line)"></i>Tidak ada rekaman</span></div>
<p class="cn">Tarik garis hitam untuk mencari posisi. Tarik bagian lain garis waktu untuk menggeser tampilan. Ctrl + putar roda mouse = perbesar/perkecil; saat diperbesar, putar roda = geser kiri/kanan.</p><p class="cn" id="note"></p>
</div></div>
</div>
<aside class="side-c rk-side"><div class="card" style="padding:14px 16px"><h3>Kejadian hari ini</h3><div id="evs"></div></div></aside>
</div>
</section>
<section class="rk-pane" id="pStat" aria-label="Status perekam" hidden>
<div class="card" style="padding:16px 18px;margin:0 0 var(--gap)" id="stor"></div>
<div class="st-grid" id="stg"></div>
</section>`;

function rekamanApp() {
  var $ = function (i) { return document.getElementById(i); };
  var esc = DS.esc, icon = DS.icon;
  var S = { cams: [], simpan: null, cam: '', day: '', data: null, dayCache: {}, seg: null, vs: 0, ve: 0, w: 86400000, speed: 1, playing: false, want: null, loadedKey: '', posMs: null };
  var DAYN = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  function dstr(ms) { var d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function d0(t) { var a = t.split('-'); return new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2])).getTime(); }
  function hms(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); }
  function hm(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function dur(s) { s = Math.round(s || 0); if (s < 60) return s + ' dtk'; if (s < 3600) return Math.floor(s / 60) + ' mnt ' + (s % 60) + ' dtk'; return Math.floor(s / 3600) + ' jam ' + Math.floor(s % 3600 / 60) + ' mnt'; }
  function gb(b) { return b >= 1e12 ? (b / 1e12).toFixed(2).replace('.', ',') + ' TB' : (b / 1e9).toFixed(b >= 1e11 ? 0 : 1).replace('.', ',') + ' GB'; }
  function getJ(u) { return fetch(u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }); }
  function camName(id) { var n = id; S.cams.forEach(function (c) { if (c.id === id) n = c.name; }); return n; }

  // ---------- tab ----------
  function tab(w) {
    var pl = w === 'play';
    $('pPlay').hidden = !pl; $('pStat').hidden = pl;
    $('tPlay').setAttribute('aria-selected', pl ? 'true' : 'false'); $('tStat').setAttribute('aria-selected', pl ? 'false' : 'true');
    try { history.replaceState(null, '', pl ? '/rekaman' : '/rekaman#status'); } catch (e) {}
  }
  $('tPlay').onclick = function () { tab('play'); };
  $('tStat').onclick = function () { tab('stat'); };

  // ---------- data hari ----------
  function loadDay(id, tgl) {
    return getJ('/api/rekaman/hari?id=' + encodeURIComponent(id) + '&tgl=' + tgl).then(function (d) { if (d && d.ok) { S.dayCache[id + '|' + tgl] = d; } return d; });
  }
  function setDay(tgl, then) {
    if (!S.cam) return;
    S.day = tgl;
    loadDay(S.cam, tgl).then(function (d) {
      if (!d || !d.ok || S.day !== tgl) return;
      S.data = d; var a = d0(tgl); centerView();
      drawDays(); drawTl(); drawEvs(); if (then) then();
    });
  }
  function drawDays() {
    var d = S.data, list = (d && d.hari) || [], set = {}; list.forEach(function (x) { set[x] = 1; });
    var h = '', now = Date.now(), today = dstr(now);
    for (var i = 0; i < 21; i++) {
      var ms = now - i * 86400000, t = dstr(ms), dd = new Date(ms);
      h += '<button type="button" data-d="' + t + '" class="' + (set[t] ? '' : 'kosong') + '" aria-pressed="' + (t === S.day ? 'true' : 'false') + '"><b>' + dd.getDate() + '</b><span>' + (t === today ? 'Hari ini' : DAYN[dd.getDay()] + ' ' + MON[dd.getMonth()]) + '</span></button>';
    }
    if (S.lastDays !== h) { S.lastDays = h; $('days').innerHTML = h; }
    var yd = dstr(now - 86400000), dl = $('dLbl'); if (dl && S.day) { var dd2 = new Date(d0(S.day) + 43200000); dl.textContent = S.day === today ? 'Hari ini' : S.day === yd ? 'Kemarin' : DAYN[dd2.getDay()] + ', ' + dd2.getDate() + ' ' + MON[dd2.getMonth()]; $('dNext').disabled = S.day >= today; }
  }
  $('days').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (!b) return; setDay(b.getAttribute('data-d')); });

  $('dPrev').onclick = function () { if (S.day) setDay(dstr(d0(S.day) - 43200000)); };
  $('dNext').onclick = function () { if (S.day && S.day < dstr(Date.now())) setDay(dstr(d0(S.day) + 129600000)); };
  // ---------- garis waktu ----------
  var DAY = 86400000;
  function x2t(x) { var r = $('tl').getBoundingClientRect(); return S.vs + (x - r.left) / r.width * (S.ve - S.vs); }
  function pct(t) { return (t - S.vs) / (S.ve - S.vs) * 100; }
  var STEPS = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000, 900000, 1800000, 3600000, 7200000, 10800000, 21600000];
  function drawTl() {
    var d = S.data; if (!d) return;
    var h = '', vs = S.vs, ve = S.ve, w = ve - vs;
    d.segmen.forEach(function (s) { var a = Math.max(s.m, vs), b = Math.min(s.a, ve); if (b <= a) return; h += '<span class="sg' + (s.b ? ' b' : '') + '" style="left:' + pct(a) + '%;width:' + ((b - a) / w * 100) + '%"></span>'; });
    var sek = d.sekarang || Date.now();
    d.mati.forEach(function (m) { var a = Math.max(m.dari, vs), b = Math.min(m.sampai || sek, ve); if (b < a) return; h += '<span class="mt" style="left:' + pct(a) + '%;width:' + Math.max(0.3, (b - a) / w * 100) + '%" title="Kamera mati ' + hms(m.dari) + '"></span>'; });
    if (sek >= vs && sek <= ve) h += '<span class="now" style="left:' + pct(sek) + '%"></span>';
    h += '<span class="pos" id="pos" style="left:' + (S.posMs != null ? pct(S.posMs) : -5) + '%"></span>';
    var tstep0 = 0;
    $('tl').innerHTML = h;
    var step = STEPS[STEPS.length - 1]; for (var k = 0; k < STEPS.length; k++) { if (w / STEPS[k] <= 9) { step = STEPS[k]; break; } }
    var th = '', a0 = d0(S.day);
    for (var t = a0 + Math.floor((vs - a0) / step) * step; t <= ve; t += step) { if (t < vs) continue; th += '<span style="left:' + pct(t) + '%">' + (step < 60000 ? hms(t) : hm(t)) + '</span>'; }
    $('tlh').innerHTML = th;
    var tk = '', mn = step / 5, a1 = d0(S.day), n = 0;
    for (var u = a1 + Math.floor((vs - a1) / mn) * mn; u <= ve && n < 400; u += mn, n++) { if (u < vs) continue; var mj = Math.abs(((u - a1) % step)) < 1; tk += '<span class="tk' + (mj ? ' mj' : '') + '" style="left:' + pct(u) + '%"></span>'; }
    $('tl').insertAdjacentHTML('afterbegin', tk);
    var span = w >= DAY ? 'Seluruh hari' : dur(w / 1000);
    $('zinfo').textContent = 'Tampilan: ' + span;
    var all = $('zoom').querySelectorAll('[data-m]');
    for (var i = 0; i < all.length; i++) { var z = Number(all[i].getAttribute('data-m')) * 60000; if (!z) continue; all[i].setAttribute('aria-pressed', Math.abs(z - w) / z < 0.02 ? 'true' : 'false'); }
  }
  function movePos() { var p = $('pos'); if (p && S.posMs != null) p.style.left = pct(S.posMs) + '%'; }
  function clampView() { var a = d0(S.day), w = Math.max(30000, Math.min(DAY, S.ve - S.vs)); var s = Math.max(a, Math.min(a + DAY - w, S.vs)); S.vs = s; S.ve = s + w; S.w = w; }
  function zoomAt(f, t) { var w = S.ve - S.vs, nw = Math.max(30000, Math.min(DAY, w * f)), r = (t - S.vs) / w; S.vs = t - r * nw; S.ve = S.vs + nw; clampView(); }
  function centerView() {
    var a = d0(S.day), w = Math.min(S.w, DAY);
    if (w >= DAY) { S.vs = a; S.ve = a + DAY; S.w = DAY; return; }
    var c = S.posMs != null ? S.posMs : (S.data && S.data.segmen.length ? S.data.segmen[S.data.segmen.length - 1].a : a + DAY / 2);
    S.vs = c - w / 2; S.ve = S.vs + w; clampView();
  }
  function matiAt(t) { var d = S.data, r = null; if (!d) return null; d.mati.forEach(function (m) { if (t >= m.dari && t <= (m.sampai || d.sekarang)) r = m; }); return r; }
  // Dua gerakan terpisah di garis waktu:
  //  - tarik GARIS PENANDA (garis hitam posisi putar) = cari posisi video
  //  - tarik bagian lain garis waktu = geser tampilan timeline (kiri/kanan), penanda tidak ikut pindah
  //  - ketuk/klik tanpa menarik = pindahkan penanda ke situ dan putar
  var drag = null;
  function scrubTo(cx) {
    var t = Math.max(d0(S.day), Math.min(d0(S.day) + DAY - 1, x2t(cx))); S.posMs = t; $('clk').textContent = hms(t); movePos();
    if (S.seg && t >= S.seg.m && t < S.seg.a && V.readyState >= 1) { try { V.currentTime = (t - S.seg.m) / 1000; } catch (e) {} }
    return t;
  }
  var TL = $('tl');
  TL.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return; if (!S.data) return;
    var r = TL.getBoundingClientRect(), px = S.posMs != null ? r.left + (S.posMs - S.vs) / (S.ve - S.vs) * r.width : -999;
    drag = { id: e.pointerId, x0: e.clientX, vs0: S.vs, w: S.ve - S.vs, mode: Math.abs(e.clientX - px) <= 16 ? 'scrub' : 'pan', moved: false };
    try { TL.setPointerCapture(e.pointerId); } catch (x) {}
    if (drag.mode === 'scrub') { S.scrub = true; scrubTo(e.clientX); }
    e.preventDefault();
  });
  TL.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x0) > 4) drag.moved = true;
    if (drag.mode === 'scrub') { scrubTo(e.clientX); return; }
    if (!drag.moved || drag.w >= DAY) return;
    var r = TL.getBoundingClientRect(); S.vs = drag.vs0 - (e.clientX - drag.x0) / r.width * drag.w; S.ve = S.vs + drag.w; clampView(); S.free = true; drawTl();
  });
  function jumpTo(t) {
    var m = matiAt(t);
    if (m) { t = m.dari - 5000; note('Kamera mati mulai ' + hms(m.dari) + (m.sampai ? ', menyala lagi ' + hms(m.sampai) : ' (belum menyala)') + '. Ini 5 detik terakhir sebelum mati.', true); }
    gotoTime(t, true);
  }
  function endDrag(e, ok) {
    if (!drag) return; var d = drag; drag = null; S.scrub = false; if (!ok) return;
    if (d.mode === 'scrub') { jumpTo(scrubTo(e.clientX)); return; }
    if (!d.moved) jumpTo(Math.max(d0(S.day), Math.min(d0(S.day) + DAY - 1, x2t(e.clientX))));
  }
  TL.addEventListener('pointerup', function (e) { endDrag(e, true); });
  TL.addEventListener('pointercancel', function (e) { endDrag(e, false); });
  // Ctrl + roda mouse (atau cubit di trackpad) = perbesar/perkecil di sekitar kursor. Roda biasa saat diperbesar = geser kiri/kanan.
  TL.addEventListener('wheel', function (e) {
    if (!S.data) return; var w = S.ve - S.vs;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); var dy = Math.max(-80, Math.min(80, e.deltaY)); zoomAt(Math.exp(dy * 0.012), x2t(e.clientX)); S.free = true; drawTl(); return; }
    if (w >= DAY) return; e.preventDefault();
    var dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; var r = TL.getBoundingClientRect();
    S.vs += dx / r.width * w; S.ve = S.vs + w; clampView(); S.free = true; drawTl();
  }, { passive: false });
  $('zoom').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-m]') : null; if (!b) return; var z = Number(b.getAttribute('data-m'));
    S.w = z * 60000; S.free = false; centerView(); drawTl();
  });
  $('zoomIn').onclick = function () { var c = S.posMs != null ? S.posMs : (S.vs + S.ve) / 2; zoomAt(0.5, c); drawTl(); };
  $('zoomOut').onclick = function () { var c = S.posMs != null ? S.posMs : (S.vs + S.ve) / 2; zoomAt(2, c); drawTl(); };

  // ---------- kejadian hari itu ----------
  function gaps() {
    var d = S.data, out = []; if (!d) return out;
    var segs = d.segmen, a0 = d0(S.day), prevEnd = null;
    segs.forEach(function (s) {
      if (prevEnd != null && s.m - prevEnd > 15000) out.push({ dari: prevEnd, sampai: s.m });
      prevEnd = s.a;
    });
    return out.filter(function (g) { return !d.mati.some(function (m) { return m.dari < g.sampai && (m.sampai || d.sekarang) > g.dari; }); });
  }
  function drawEvs() {
    var d = S.data, h = ''; if (!d) { $('evs').innerHTML = ''; return; }
    var items = [];
    d.mati.forEach(function (m) { items.push({ t: m.dari, k: 'r', a: m.dari, b: m.sampai, s: m.berlangsung }); });
    gaps().forEach(function (g) { items.push({ t: g.dari, k: 'g', a: g.dari, b: g.sampai }); });
    items.sort(function (x, y) { return x.t - y.t; });
    items.forEach(function (x) {
      var t = x.k === 'r' ? 'Kamera mati' : 'Tidak ada rekaman', sub = hms(x.a) + ' - ' + (x.b ? hms(x.b) + ' (' + dur((x.b - x.a) / 1000) + ')' : 'masih berlangsung');
      h += '<button type="button" class="ev" data-t="' + (x.k === 'r' ? Math.max(0, x.a - 5000) : Math.max(0, x.a - 20000)) + '"><i class="' + x.k + '"></i><span class="en"><b>' + t + '</b><span>' + sub + '</span></span>' + icon('play', 's') + '</button>';
    });
    $('evs').innerHTML = h || '<p class="cn">Tidak ada kejadian pada hari ini.</p>';
  }
  $('evs').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.ev') : null; if (b) gotoTime(Number(b.getAttribute('data-t')), true); });

  // ---------- pemutar ----------
  var V = $('v');
  function segAt(t) { var d = S.data; if (!d) return null; var best = null; d.segmen.forEach(function (s) { if (t >= s.m && t < s.a + 1500) best = s; }); return best; }
  function segAfter(t) { var d = S.data, best = null; if (!d) return null; d.segmen.forEach(function (s) { if (s.m >= t && (!best || s.m < best.m)) best = s; }); return best; }
  function note(msg, warn) { var n = $('note'); n.textContent = msg || ''; n.className = 'cn' + (warn ? ' warn' : ''); }
  function loadSeg(s, offMs, autoplay) {
    var key = S.cam + '|' + S.day + '|' + s.f; S.seg = s; S.want = { off: Math.max(0, offMs), play: autoplay };
    $('ph0').style.display = 'none'; $('clk').hidden = false;
    if (S.loadedKey === key && V.readyState >= 1) { applyWant(); return; }
    S.loadedKey = key; note('Menyiapkan potongan ' + hm(s.m) + '... (pertama kali bisa beberapa detik)');
    S.failed = false; clearTimeout(S.loadTo); S.loadTo = setTimeout(function () { if (V.readyState < 1) loadFail(); }, 540000);
    V.src = '/rekaman/f/' + S.cam + '/' + S.day + '/' + s.f + '.mp4'; V.load();
  }
  function applyWant() {
    if (!S.want) return; var w = S.want; S.want = null;
    try { V.currentTime = Math.min(w.off / 1000, Math.max(0, (V.duration || 1e9) - 0.05)); } catch (e) {}
    V.playbackRate = S.speed;
    if (w.play) { var p = V.play(); if (p && p.catch) p.catch(function () { setPlay(false); note('Browser menahan putar otomatis. Tekan tombol Putar.', true); }); }
    note('');
  }
  V.addEventListener('loadedmetadata', applyWant);
  function loadFail() { clearTimeout(S.loadTo); if (S.seg) { S.failed = true; note('Gagal menyiapkan potongan ' + hm(S.seg.m) + '. Tekan Putar untuk coba lagi.', true); } }
  V.addEventListener('error', function () { if (V.getAttribute('src')) loadFail(); });
  V.addEventListener('loadedmetadata', function () { clearTimeout(S.loadTo); S.failed = false; });
  V.addEventListener('click', function () { if (!S.seg) return; if (V.paused) { var p = V.play(); if (p && p.catch) p.catch(function () {}); } else V.pause(); });
  function setPlay(on) { S.playing = on; $('ppT').textContent = on ? 'Jeda' : 'Putar'; }
  V.addEventListener('play', function () { setPlay(true); }); V.addEventListener('pause', function () { setPlay(false); });
  V.addEventListener('timeupdate', function () { if (!S.seg || S.scrub) return; S.posMs = S.seg.m + V.currentTime * 1000; $('clk').textContent = hms(S.posMs); movePos(); autoScroll(); });
  function autoScroll() { if (S.free || S.ve - S.vs >= DAY || S.posMs == null) return; if (S.posMs < S.vs || S.posMs > S.ve) { centerView(); drawTl(); } }
  V.addEventListener('ended', function () {
    var s = S.seg; if (!s) return;
    var nx = segAfter(s.m + 1000); // potongan berikutnya pada hari ini
    if (nx) { if (nx.m - s.a > 15000) note('Ada bolong rekaman ' + dur((nx.m - s.a) / 1000) + ' (' + hms(s.a) + ' - ' + hms(nx.m) + '). Lanjut ke potongan berikutnya.', true); loadSeg(nx, 0, true); return; }
    var tomorrow = dstr(d0(S.day) + 90000000);
    if (S.day < dstr(Date.now())) { setDay(tomorrow, function () { var f = S.data.segmen[0]; if (f) loadSeg(f, 0, true); else note('Akhir rekaman hari ini.'); }); }
    else note('Sudah sampai rekaman terbaru.');
  });
  function gotoTime(t, play) {
    if (!S.cam) return; var tg = dstr(t); S.free = false;
    var go = function () {
      var s = segAt(t);
      if (s) { posSet(t); loadSeg(s, t - s.m, play !== false); return; }
      var nx = segAfter(t);
      if (nx) { note('Tidak ada rekaman pada ' + hms(t) + '. Dilompatkan ke ' + hms(nx.m) + '.', true); posSet(nx.m); loadSeg(nx, 0, play !== false); }
      else note('Tidak ada rekaman pada jam itu.', true);
    };
    if (tg !== S.day) setDay(tg, go); else go();
  }
  function posSet(t) { S.posMs = t; $('clk').hidden = false; $('clk').textContent = hms(t); movePos(); }
  $('pp').onclick = function () { if (!S.seg) { gotoNow(); return; } if (S.failed) { S.loadedKey = ''; gotoTime(S.posMs != null ? S.posMs : S.seg.m, true); return; } if (V.paused) { var p = V.play(); if (p && p.catch) p.catch(function () {}); } else V.pause(); };
  $('ctl').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-j]') : null; if (!b) return; var base = S.posMs != null ? S.posMs : Date.now(); gotoTime(base + Number(b.getAttribute('data-j')) * 1000, !V.paused || S.playing); });
  $('spd').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (!b) return; S.speed = Number(b.getAttribute('data-s')); V.playbackRate = S.speed; var all = $('spd').querySelectorAll('button'); for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', all[i] === b ? 'true' : 'false'); });
  $('goTm').onclick = function () { var v = $('tm').value; if (!v) return; var a = v.split(':'); var t = d0(S.day || dstr(Date.now())) + (Number(a[0]) * 3600 + Number(a[1]) * 60 + Number(a[2] || 0)) * 1000; gotoTime(t, true); };
  function gotoNow() { // langsung ke rekaman paling baru dan putar; kalau hari ini belum ada, pakai hari terakhir yang ada rekamannya
    var cam = S.cam; if (!cam) return; var today = dstr(Date.now());
    loadDay(cam, today).then(function (d) {
      if (!d || !d.ok || S.cam !== cam) return;
      var tgt = d.segmen.length ? today : (d.hari && d.hari[0]);
      if (!tgt) { S.day = today; S.data = d; drawDays(); centerView(); drawTl(); drawEvs(); note('Belum ada rekaman untuk kamera ini.', true); return; }
      var run = function () { var sg = S.data.segmen; if (!sg.length) { note('Belum ada rekaman untuk kamera ini.', true); return; } var l = sg[sg.length - 1]; gotoTime(Math.max(l.m, l.a - 20000), true); };
      if (tgt === today) { S.day = today; S.data = d; drawDays(); centerView(); drawTl(); drawEvs(); run(); } else setDay(tgt, run);
    });
  }
  $('goNow').onclick = gotoNow;
  $('cam').onchange = function () { S.cam = this.value; S.seg = null; S.posMs = null; S.loadedKey = ''; try { V.pause(); V.removeAttribute('src'); V.load(); } catch (e) {} $('clk').hidden = true; $('ph0').style.display = ''; note(''); setPlay(false); try { localStorage.setItem('rk-cam', S.cam); } catch (e) {} gotoNow(); };

  // ---------- status ----------
  function drawStat() {
    var st = S.simpan, h = '';
    if (st) {
      var ok = st.siap, used = st.terpakaiBytes || 0, lim = st.batasBytes || st.kapasitasBytes || 1, p = Math.min(100, used / lim * 100);
      var mode = st.mode === 'cadangan' ? ' (drive cadangan)' : '';
      h = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-size:16px">Penyimpanan' + esc(mode) + '</b>' + DS.pill(ok ? (st.penuh ? 'warn' : (st.mode === 'cadangan' ? 'warn' : 'ok')) : 'bad', ok ? (st.penuh ? 'Hampir penuh' : (st.mode === 'cadangan' ? 'Cadangan' : 'Siap')) : 'Drive tidak ada') + '</div>';
      if (ok) {
        h += '<div class="sbar' + (p > 92 ? ' hot' : '') + '"><i style="width:' + p + '%"></i></div><p class="cn">Terpakai ' + gb(used) + ' dari batas ' + gb(lim) + ' · sisa di drive ' + gb(st.sisaBytes || 0) + (st.hardisk ? ' · ' + esc(st.hardisk.label || st.hardisk.mount) : '') + '</p>';
        if (st.rekamanTertua) h += '<p class="cn">Rekaman tertua: ' + esc(new Date(st.rekamanTertua).toLocaleString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) + ' · disimpan maksimal ' + st.hariMaks + ' hari, yang paling lama dihapus otomatis.</p>';
      } else h += '<p class="cn warn">Tidak ada hardisk rekaman yang terpasang, jadi tidak ada yang direkam. Pasang hardisknya, program akan melanjutkan sendiri.</p>';
    }
    $('stor').innerHTML = h || '<div class="skel" style="height:60px"></div>';
    var g = '';
    S.cams.forEach(function (c) {
      var w = c.warna === 'hijau' ? 'ok' : c.warna === 'kuning' ? 'warn' : 'bad';
      g += '<div class="card rkc ' + esc(c.warna) + '"><div class="h"><b>' + esc(c.name) + '</b>' + DS.pill(w, c.teks) + '</div>';
      var m = [];
      if (c.mbps != null && c.state === 'merekam') m.push(String(c.mbps.toFixed(2)).replace('.', ',') + ' Mbps');
      if (c.potonganTerakhir) m.push('potongan terakhir ' + String(c.potonganTerakhir).slice(11, 16));
      if (m.length) g += '<span class="m">' + esc(m.join(' · ')) + '</span>';
      if (c.alasan) g += '<span class="w">' + esc(c.alasan) + '</span>';
      var bh = c.bolongHariIni; g += '<span class="m">' + (bh && bh.kali ? 'Bolong hari ini: ' + bh.kali + ' kali, total ' + dur(bh.detik) : 'Tidak ada bolong hari ini') + '</span>';
      g += '<button class="btn" type="button" data-play="' + esc(c.id) + '">' + icon('play', 's') + 'Putar rekaman</button></div>';
    });
    var n = S.cams.length, okN = S.cams.filter(function (c) { return c.state === 'merekam'; }).length;
    $('tStat').textContent = 'Status perekam' + (n ? ' (' + okN + '/' + n + ')' : '');
    $('stg').innerHTML = g || '<div class="empty">Belum ada kamera terdaftar.</div>';
  }
  $('stg').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-play]') : null; if (!b) return; $('cam').value = b.getAttribute('data-play'); $('cam').onchange(); tab('play'); gotoNow(); });

  function fillCams() {
    var sel = $('cam'), o = '';
    S.cams.forEach(function (c) { o += '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; });
    if (sel.getAttribute('data-o') === o) return; sel.innerHTML = o; sel.setAttribute('data-o', o);
    var want = S.cam; if (!want) { try { want = localStorage.getItem('rk-cam') || ''; } catch (e) {} }
    var ok = S.cams.some(function (c) { return c.id === want; });
    sel.value = ok ? want : (S.cams[0] ? S.cams[0].id : '');
    if (sel.value !== S.cam) { S.cam = sel.value; if (S.cam) { if ($('pPlay').hidden) setDay(dstr(Date.now())); else gotoNow(); } }
  }
  var P = DS.poll({ name: 'rekaman', url: '/api/rekaman/ringkasan', ms: 5000, cache: false, onData: function (d) {
    if (!d || !d.ok) return; S.cams = d.kamera; S.simpan = d.simpan; fillCams(); drawStat();
    // hari ini: segarkan garis waktu (potongan baru) tanpa mengganggu pemutaran
    if (S.cam && S.day === dstr(Date.now()) && !S.refreshing) { S.refreshing = true; loadDay(S.cam, S.day).then(function (x) { S.refreshing = false; if (x && x.ok && S.day === x.tgl) { S.data = x; drawDays(); drawTl(); drawEvs(); } }, function () { S.refreshing = false; }); }
  } });
  DS.pullRefresh(function () { P.now(); return new Promise(function (r) { setTimeout(r, 800); }); });
  DS.initShell({ search: function (q) { if (!q) return []; var out = []; S.cams.forEach(function (c) { if (c.name.toLowerCase().indexOf(q) >= 0) out.push({ label: c.name, sub: 'Putar rekaman kamera ini', icon: 'history', go: function () { $('cam').value = c.id; $('cam').onchange(); tab('play'); gotoNow(); } }); }); return out; } });
  if (location.hash === '#status') tab('stat');
}

module.exports = () => ds.page({
  title: 'Rekaman', cur: 'kj', h1: 'Rekaman', sub: 'Putar ulang rekaman 24 jam dan status perekam',
  css, body, script: '(' + rekamanApp.toString() + ')();',
});
