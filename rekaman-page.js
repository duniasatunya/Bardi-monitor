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

/* Tombol melayang di atas video */
.ov{position:absolute;inset:0;pointer-events:none;z-index:3;transition:opacity .25s}
.ov>*{pointer-events:auto}
.vbox.idle .ov>*{opacity:0;pointer-events:none}
.ov .ob{width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.ov .ob svg{width:22px;height:22px;display:block}
.ov .ob.on{background:var(--bad);color:#fff}
.ov .ob .a2{display:none}
.ov .ob.alt .a1{display:none}.ov .ob.alt .a2{display:block}
.ov .oleft{position:absolute;left:10px;bottom:10px;display:flex;gap:8px;align-items:center}
.ov .oright{position:absolute;right:10px;bottom:10px;display:flex;gap:8px}
.ov .chip{min-width:42px;width:auto;padding:0 12px;border-radius:999px;font:inherit;font-weight:800;font-size:14px}
.ov .big{position:absolute;left:50%;top:50%;width:72px;height:72px;margin:-36px 0 0 -36px;background:rgba(0,0,0,.42)}
.ov .big svg{width:34px;height:34px}
.ov .ovmsg{position:absolute;left:10px;top:10px;right:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#fff;font-size:13px;font-weight:700;text-shadow:0 1px 3px #000}
.ov .ovmsg[hidden]{display:none}
.ov .ovmsg span{background:rgba(0,0,0,.55);padding:5px 10px;border-radius:999px}
.ov .ovmsg button{border:0;border-radius:999px;height:32px;padding:0 14px;font:inherit;font-weight:800;font-size:13px;background:var(--brand-ink);color:var(--on-brand);cursor:pointer}
.ov .ovmsg button[hidden]{display:none}
.vbox:not(.has) .ov .big,.vbox:not(.has) .ov .oleft{display:none}
.rk-lock,.rk-lock body{overflow:hidden}
/* Layar penuh (tombol layar penuh, atau HP miring): video memenuhi layar, garis waktu melayang di bawah */
.pcard.fs{position:fixed;left:0;top:0;right:0;bottom:0;margin:0;z-index:120;background:#000;display:block;border-radius:0;box-shadow:none;overflow:hidden}
.pcard.fs .vbox{position:absolute;inset:0;aspect-ratio:auto;height:100%;order:0}
.pcard.fs .pinfo{display:flex;flex-direction:column;position:absolute;left:0;right:0;bottom:0;z-index:4;padding:0 max(8px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));background:linear-gradient(transparent,rgba(0,0,0,.62) 38%);color:#fff;gap:6px}
.pcard.fs .pinfo .dnav{display:flex;position:fixed;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:0;z-index:5}
.pcard.fs .dpill{padding:3px;background:rgba(255,255,255,.18)}
.pcard.fs .dpill b{min-width:84px;font-size:14px;color:#fff}
.pcard.fs .dpill button{width:30px;height:30px;background:rgba(255,255,255,.9)}
.pcard.fs #ctl{order:1;padding:0;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.pcard.fs #ctl .btn{flex:none;min-height:30px;font-size:13px;padding:0 12px;background:rgba(255,255,255,.2);color:#fff;border:0}
.pcard.fs #ctl .grow{flex:1}
.pcard.fs .tlw{order:2;background:rgba(40,48,54,.55);margin-top:0;padding-top:6px;border-radius:12px;overflow:hidden}
.pcard.fs .tlh{color:#fff;height:18px;font-size:12px;margin-bottom:2px;order:-1}
.pcard.fs .tl{height:42px;background:transparent}
.pcard.fs .tl .sg{top:6px;bottom:6px}
.pcard.fs .tl .tk{background:#fff;opacity:.6}
.pcard.fs .tl .pos{background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)}
.pcard.fs #zoom{order:3;padding:0;background:transparent;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.pcard.fs #zoom .btn{flex:none;min-height:28px;font-size:12px;padding:0 10px;background:rgba(255,255,255,.2);color:#fff;border:0}
.pcard.fs #zoom .btn[aria-pressed=true],.pcard.fs #ctl .btn.pri{background:var(--brand-ink)}
.pcard.fs #zoom .cn,.pcard.fs #zoomIn,.pcard.fs #zoomOut{display:none}
.pcard.fs .tlg{display:none}
.pcard.fs .pinfo .cn:not(#note){display:none}
.pcard.fs #note{position:absolute;left:12px;bottom:calc(100% + 54px);padding:0;color:#fff;text-shadow:0 1px 3px #000;font-size:12px}
.pcard.fs .ov .oleft,.pcard.fs .ov .oright{bottom:calc(var(--ph,120px) + 8px)}
.pcard.fs .ov .big{margin-top:-60px}
.pcard.auto #bFs{display:none}
`;


const SV = (d, x) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const OV = `<div class="ov" id="ov">
<div class="ovmsg" id="ovMsg" hidden><span id="ovMsgT"></span><button type="button" id="ovMsgB" hidden>Simpan</button></div>
<button class="ob big" type="button" id="bBig" aria-label="Putar atau jeda"><span class="a1">${SV('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>')}</span><span class="a2">${SV('<path d="M8 5v14M16 5v14" stroke-width="3.5"/>')}</span></button>
<div class="oleft">
<button class="ob" type="button" id="bRec" aria-label="Rekam klip" title="Rekam klip (tekan lagi untuk selesai)">${SV('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>')}</button>
<button class="ob" type="button" id="bShot" aria-label="Screenshot" title="Screenshot">${SV('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}</button>
<button class="ob" type="button" id="bMute" aria-label="Suara" title="Suara"><span class="a1">${SV('<path d="M4 10v4h4l5 4V6l-5 4z" fill="currentColor"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>')}</span><span class="a2">${SV('<path d="M4 10v4h4l5 4V6l-5 4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6"/>')}</span></button>
<button class="ob chip" type="button" id="bSpd" aria-label="Kecepatan" title="Kecepatan">1x</button>
</div>
<div class="oright"><button class="ob" type="button" id="bFs" aria-label="Layar penuh" title="Layar penuh"><span class="a1">${SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</span><span class="a2">${SV('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>')}</span></button></div>
</div>`;

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
<div class="card pcard" id="pcard">
<div class="vbox" id="vbox"><video id="v" playsinline preload="auto"></video><div class="clk" id="clk" hidden></div><div class="ph0" id="ph0">Pilih kamera dan tanggal, lalu klik garis waktu di bawah untuk mulai memutar.</div>${OV}</div>
<div class="pinfo">
<div class="dnav" id="dnav"><div class="dpill"><button type="button" id="dPrev" aria-label="Hari sebelumnya">${I('back', 's')}</button><b id="dLbl">Hari ini</b><button type="button" id="dNext" aria-label="Hari berikutnya">${I('next', 's')}</button></div></div>
<div class="rk-ctl" id="ctl">
<button class="btn" type="button" data-j="-600" title="Mundur 10 menit">-10 mnt</button>
<button class="btn" type="button" data-j="-10" title="Mundur 10 detik">-10 dtk</button>
<button class="btn" type="button" data-j="10" title="Maju 10 detik">+10 dtk</button>
<button class="btn" type="button" data-j="600" title="Maju 10 menit">+10 mnt</button>
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
  var S = { cams: [], simpan: null, cam: '', day: '', data: null, dayCache: {}, seg: null, vs: 0, ve: 0, w: 86400000, speed: 1, playing: false, want: null, fileBase: '', ssFile: 0, hv: null, posMs: null };
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
    if (S.seg && V.readyState >= 1) { var rel = (t - S.seg.m) / 1000 - S.ssFile; if (rel >= 0 && rel < (V.duration || 0) - 0.3) { try { V.currentTime = rel; } catch (e) {} } }
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
  // Apakah browser bisa memutar H.265 langsung? Kalau bisa, server cukup menyalin (cepat, tanpa beban CPU). Kalau tidak, server mengubahnya ke H.264.
  function hvOk() {
    if (S.hv != null) return S.hv; var ok = false;
    try { var c = V.canPlayType('video/mp4; codecs="hvc1.1.6.L153.B0"'); ok = c === 'probably' || c === 'maybe'; } catch (e) {}
    S.hv = ok ? 1 : 0; return S.hv;
  }
  // Hanya bagian dari titik yang diminta sampai akhir potongan yang disiapkan (bukan seluruh 10 menit), jadi mulai putar jauh lebih cepat.
  function loadSeg(s, offMs, autoplay) {
    S.seg = s; $('ph0').style.display = 'none'; $('clk').hidden = false; $('vbox').classList.add('has');
    var tot = Math.max(0, (s.a - s.m) / 1000 - 1), ss = Math.max(0, Math.min(tot, Math.floor(offMs / 1000))), hv = hvOk();
    var base = S.cam + '|' + S.day + '|' + s.f + '|' + hv;
    var within = S.fileBase === base && V.readyState >= 1 && offMs / 1000 >= S.ssFile && offMs / 1000 < S.ssFile + (V.duration || 0) - 0.3;
    if (within) { S.want = { off: offMs - S.ssFile * 1000, play: autoplay }; applyWant(); return; }
    S.fileBase = base; S.ssFile = ss; S.hvReq = hv; S.want = { off: Math.max(0, offMs - ss * 1000), play: autoplay };
    note('Menyiapkan potongan ' + hm(s.m) + '...');
    S.failed = false; clearTimeout(S.loadTo); S.loadTo = setTimeout(function () { if (V.readyState < 1) loadFail(); }, 540000);
    V.src = '/rekaman/f/' + S.cam + '/' + S.day + '/' + s.f + '.mp4?ss=' + ss + '&hv=' + hv; V.load();
  }
  function applyWant() {
    if (!S.want) return; var w = S.want; S.want = null;
    try { V.currentTime = Math.min(w.off / 1000, Math.max(0, (V.duration || 1e9) - 0.05)); } catch (e) {}
    V.playbackRate = S.speed;
    if (w.play) { var p = V.play(); if (p && p.catch) p.catch(function () {
      if (!V.muted) { V.muted = true; S.autoMuted = true; var p2 = V.play(); if (p2 && p2.catch) p2.catch(function () { setPlay(false); note('Browser menahan putar otomatis. Tekan tombol Putar.', true); }); note('Browser menahan suara otomatis. Ketuk di mana saja atau ikon speaker untuk menyalakan suara.', true); return; }
      setPlay(false); note('Browser menahan putar otomatis. Tekan tombol Putar.', true); }); }
    note('');
  }
  V.addEventListener('loadedmetadata', applyWant);
  function loadFail() { clearTimeout(S.loadTo); if (S.seg) { S.failed = true; note('Gagal menyiapkan potongan ' + hm(S.seg.m) + '. Tekan Putar untuk coba lagi.', true); } }
  V.addEventListener('error', function () {
    if (!V.getAttribute('src')) return;
    if (S.hvReq === 1 && S.seg && !S.hvTried) { // mungkin browser tidak sanggup memutar H.265: coba sekali dengan cara cadangan (diubah ke H.264)
      S.hvTried = true; S.hv = 0; var s0 = S.seg, off = S.posMs != null && S.posMs >= s0.m ? S.posMs - s0.m : S.ssFile * 1000;
      note('Browser ini belum bisa memutar H.265 langsung. Memakai cara cadangan (lebih lambat)...', true); S.fileBase = ''; loadSeg(s0, off, true); return;
    }
    loadFail();
  });
  V.addEventListener('loadedmetadata', function () { clearTimeout(S.loadTo); S.failed = false; });
  V.addEventListener('click', function () { if (!S.seg) return; if (S.wasIdle) { S.wasIdle = false; return; } if (V.paused) { var p = V.play(); if (p && p.catch) p.catch(function () {}); } else V.pause(); });
  function setPlay(on) { S.playing = on; $('bBig').classList.toggle('alt', on); $('vbox').classList.toggle('has', !!S.seg); wake(); }
  V.addEventListener('play', function () { setPlay(true); }); V.addEventListener('pause', function () { setPlay(false); });
  V.addEventListener('timeupdate', function () { if (!S.seg || S.scrub) return; S.posMs = S.seg.m + (S.ssFile + V.currentTime) * 1000; $('clk').textContent = hms(S.posMs); movePos(); autoScroll(); recTick(); });
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
  function togglePlay() { if (!S.seg) { gotoNow(); return; } if (S.failed) { S.fileBase = ''; gotoTime(S.posMs != null ? S.posMs : S.seg.m, true); return; } if (V.paused) { var p = V.play(); if (p && p.catch) p.catch(function () {}); } else V.pause(); }
  $('bBig').onclick = togglePlay;
  $('ctl').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-j]') : null; if (!b) return; var base = S.posMs != null ? S.posMs : Date.now(); gotoTime(base + Number(b.getAttribute('data-j')) * 1000, !V.paused || S.playing); });
  $('bSpd').onclick = function () { var L = [1, 2, 4, 8]; S.speed = L[(L.indexOf(S.speed) + 1) % 4]; V.playbackRate = S.speed; this.textContent = S.speed + 'x'; };
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
  $('cam').onchange = function () { recCancel(); S.cam = this.value; S.seg = null; S.posMs = null; S.fileBase = ''; S.hvTried = false; try { V.pause(); V.removeAttribute('src'); V.load(); } catch (e) {} $('clk').hidden = true; $('ph0').style.display = ''; $('vbox').classList.remove('has'); note(''); setPlay(false); try { localStorage.setItem('rk-cam', S.cam); } catch (e) {} gotoNow(); };


  // ---------- tombol melayang di atas video ----------
  function wake() { var b = $('vbox'); b.classList.remove('idle'); clearTimeout(S.idleTo); if (!V.paused && !S.rec && !S.pend) S.idleTo = setTimeout(function () { b.classList.add('idle'); }, 3000); }
  ['pointermove', 'pointerdown'].forEach(function (ev) { $('vbox').addEventListener(ev, wake); });
  $('vbox').addEventListener('pointerdown', function (e) { S.wasIdle = e.target === V && $('vbox').classList.contains('idle'); }, true);
  V.addEventListener('playing', wake); V.addEventListener('pause', wake);
  // suara: otomatis menyala; hanya mati kalau diklik
  function drawMute() { $('bMute').classList.toggle('alt', V.muted); }
  V.addEventListener('volumechange', drawMute);
  $('bMute').onclick = function () { V.muted = !V.muted; S.autoMuted = false; drawMute(); };
  document.addEventListener('pointerdown', function () { if (S.autoMuted && V.muted) { V.muted = false; S.autoMuted = false; drawMute(); note(''); } }, true);
  // simpan ke perangkat yang membuka halaman ini (bukan komputer perekam)
  function isTouch() { try { return matchMedia('(hover:none)').matches && (navigator.maxTouchPoints || 0) > 0; } catch (e) { return false; } }
  function dl(blob, name) { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 5000); }
  function saveFile(blob, name, type) { // 'ok' | 'batal' | 'tunggu' (perlu ketukan baru)
    var f = null; try { f = new File([blob], name, { type: type }); } catch (e) {}
    if (isTouch() && f && navigator.canShare && navigator.share) {
      var can = false; try { can = navigator.canShare({ files: [f] }); } catch (e) {}
      if (can) return navigator.share({ files: [f] }).then(function () { return 'ok'; }, function (e) { return e && e.name === 'AbortError' ? 'batal' : 'tunggu'; });
    }
    dl(blob, name); return Promise.resolve('ok');
  }
  function stamp(ms) { var d = new Date(ms); return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '_' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()); }
  function fname(ms, ext) { return (camName(S.cam).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'kamera') + '_' + stamp(ms) + '.' + ext; }
  function msg(t, btn) { var m = $('ovMsg'); m.hidden = !t; $('ovMsgT').textContent = t || ''; $('ovMsgB').hidden = !btn; wake(); }
  function deliver(blob, name, type, done) {
    saveFile(blob, name, type).then(function (r) {
      if (r === 'tunggu') { S.pend = { blob: blob, name: name, type: type }; msg('Sudah siap. Ketuk Simpan untuk menaruh ke galeri.', true); return; }
      S.pend = null; msg(r === 'ok' ? done : '');
      if (r === 'ok') setTimeout(function () { if (!S.rec && !S.pend) msg(''); }, 4000);
    });
  }
  $('ovMsgB').onclick = function () { var q = S.pend; if (!q) return; saveFile(q.blob, q.name, q.type).then(function (r) { if (r === 'tunggu') { msg('Gagal membuka menu simpan. Ketuk Simpan lagi.', true); return; } S.pend = null; msg(r === 'ok' ? 'Tersimpan.' : ''); setTimeout(function () { if (!S.pend && !S.rec) msg(''); }, 3000); }); };
  $('bShot').onclick = function () {
    if (!S.seg || !V.videoWidth) { note('Putar rekaman dulu sebelum screenshot.', true); return; }
    var c = document.createElement('canvas'); c.width = V.videoWidth; c.height = V.videoHeight; var t = S.posMs;
    try { c.getContext('2d').drawImage(V, 0, 0, c.width, c.height); } catch (e) { note('Screenshot gagal.', true); return; }
    c.toBlob(function (b) { if (!b) { note('Screenshot gagal.', true); return; } deliver(b, fname(t, 'jpg'), 'image/jpeg', 'Screenshot tersimpan.'); }, 'image/jpeg', 0.92);
  };
  // rekam klip: tekan sekali untuk mulai, tekan lagi untuk selesai. Klip dibuat di komputer perekam dari rekaman asli, lalu dikirim ke perangkat ini.
  function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + p2(s % 60); }
  function recTick() { if (S.rec && S.posMs != null) msg('Merekam klip ' + mmss((S.posMs - S.rec.from) / 1000)); }
  function recCancel() { if (!S.rec) return; S.rec = null; $('bRec').classList.remove('on'); msg(''); }
  $('bRec').onclick = function () {
    if (S.busyClip) return;
    if (!S.rec) { if (!S.seg || S.posMs == null) { note('Putar rekaman dulu, lalu tekan Rekam.', true); return; } S.rec = { from: S.posMs, cam: S.cam }; this.classList.add('on'); recTick(); return; }
    var r = S.rec, to = S.posMs; recCancel();
    if (to == null || to - r.from < 1000) { msg('Klip terlalu pendek.'); setTimeout(function () { if (!S.rec && !S.pend) msg(''); }, 3000); return; }
    S.busyClip = true; msg('Menyiapkan klip ' + mmss((to - r.from) / 1000) + '...');
    fetch('/rekaman/klip.mp4?id=' + r.cam + '&from=' + Math.round(r.from) + '&to=' + Math.round(to) + '&hv=' + hvOk(), { credentials: 'same-origin' })
      .then(function (x) { if (!x.ok) throw new Error('x'); return x.blob(); })
      .then(function (b) { S.busyClip = false; deliver(b, fname(r.from, 'mp4'), 'video/mp4', 'Klip tersimpan.'); })
      .catch(function () { S.busyClip = false; msg('Klip gagal dibuat. Coba lagi.'); setTimeout(function () { if (!S.rec && !S.pend) msg(''); }, 4000); });
  };
  // layar penuh: desktop pakai layar penuh asli browser (Esc untuk keluar); iPhone memakai tampilan penuh buatan sendiri. HP miring otomatis penuh.
  var PC = $('pcard'), mq = null; try { mq = matchMedia('(orientation:landscape) and (max-height:540px) and (hover:none)'); } catch (e) {}
  function measure() { PC.style.setProperty('--ph', PC.querySelector('.pinfo').offsetHeight + 'px'); }
  function applyFs() {
    var auto = !!(mq && mq.matches), on = !!S.fsMan || auto;
    PC.classList.toggle('auto', auto); PC.classList.toggle('fs', on);
    document.documentElement.classList.toggle('rk-lock', on);
    $('bFs').classList.toggle('alt', !!S.fsMan);
    if (on) { measure(); setTimeout(measure, 60); }
  }
  function fsOff() { S.fsMan = false; var de = document.fullscreenElement || document.webkitFullscreenElement; if (de) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} } applyFs(); }
  $('bFs').onclick = function () {
    if (S.fsMan) { fsOff(); return; }
    S.fsMan = true; applyFs();
    var rq = PC.requestFullscreen || PC.webkitRequestFullscreen;
    if (rq) { try { var pr = rq.call(PC); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
  };
  function fsChange() { if (S.fsMan && !(document.fullscreenElement || document.webkitFullscreenElement) && S.fsReal) { S.fsMan = false; applyFs(); } S.fsReal = !!(document.fullscreenElement || document.webkitFullscreenElement); }
  document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.fsMan) fsOff(); });
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', applyFs); else if (mq.addListener) mq.addListener(applyFs); }
  window.addEventListener('resize', function () { if (PC.classList.contains('fs')) measure(); });
  if (window.ResizeObserver) { try { new ResizeObserver(function () { if (PC.classList.contains('fs')) measure(); }).observe(PC.querySelector('.pinfo')); } catch (e) {} }
  applyFs(); drawMute();

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
