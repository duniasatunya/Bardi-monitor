// Halaman Beranda (pengganti Laporan, alamat tetap /displaycostum.html). Hanya tampilan: memakai endpoint yang sudah ada:
// /api/status (2 dtk), /api/summary (10 dtk), /api/events (10 dtk; riwayat & grafik), /api/onvif/cameras (10 dtk).
// Skrip browser ditulis sebagai fungsi lalu toString (tidak boleh memakai variabel dari luar fungsinya).
'use strict';
const UIKIT = require('./ui-kit');
const { ds } = UIKIT;
const I = ds.icon;

const css = `
.filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 16px}
.fchip{display:none;align-items:center;gap:6px;height:32px;padding:0 6px 0 12px;border-radius:999px;background:var(--brand-t);color:var(--brand-ink);font-weight:600;font-size:13px;border:0;cursor:pointer}
.fchip.show{display:inline-flex}
/* hero */
.hero{overflow:hidden;display:flex;align-items:center;gap:24px;min-height:232px;background:var(--surface);transition:background-color .25s var(--e)}
.hero .blob{position:absolute;border-radius:50%;pointer-events:none;will-change:transform}
.hero .b1{width:340px;height:340px;right:-90px;top:-150px;background:radial-gradient(circle,var(--hb1) 0,transparent 68%)}
.hero .b2{width:260px;height:260px;left:-80px;bottom:-140px;background:radial-gradient(circle,var(--hb2) 0,transparent 68%)}
.hero.calm{--hb1:rgba(71,184,197,.32);--hb2:rgba(31,169,113,.22)}
.hero.alert{--hb1:rgba(242,169,0,.30);--hb2:rgba(242,169,0,.16)}
.hero.crit{--hb1:rgba(229,72,77,.24);--hb2:rgba(229,72,77,.14)}
.hero.crit .fg{stroke:var(--bad-ink)}.hero.alert .fg{stroke:var(--warn)}.hero.calm .fg{stroke:var(--ok)}
.hero>*:not(.blob){position:relative}
.hero .rw{position:relative;flex:none;width:168px;height:168px}
.hero .rw .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.hero .rw .c b{font-size:2.5rem;line-height:1;font-weight:700}
.hero .rw .c span{font-size:12px;color:var(--mut);margin-top:4px}
.hero .hx{min-width:0;flex:1}
.hero .state{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;letter-spacing:.02em;margin-bottom:8px}
.hero .big{font-size:1.75rem;font-weight:700;line-height:1.2;margin:0 0 12px}
.hero .pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.hero .clk{display:flex;align-items:baseline;gap:10px;color:var(--mut);font-size:13px}
.hero .clk b{font-size:1.25rem;color:var(--tx);font-weight:700}
/* KPI */
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gap)}
.kpi{position:relative;text-align:left;border:0;cursor:pointer;border-radius:var(--r-card);padding:20px 22px;min-height:108px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;color:var(--tx);box-shadow:var(--sh1);transition:transform .15s var(--e),box-shadow .15s var(--e)}
.kpi.ok{background:var(--ok-t)}.kpi.bad{background:var(--bad-t)}.kpi.warn{background:var(--warn-t)}.kpi.off{background:var(--off-t)}
.kpi .kh{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px}
.kpi .kh .ic{width:18px;height:18px}
.kpi.ok .kh{color:var(--ok-ink)}.kpi.bad .kh{color:var(--bad-ink)}.kpi.warn .kh{color:var(--warn-ink)}.kpi.off .kh{color:var(--off-ink)}
.kpi .kv{font-size:2.5rem;font-weight:700;line-height:1}
.kpi[aria-pressed=true]{box-shadow:inset 0 0 0 2.5px currentColor,var(--sh2)}
.kpi[aria-pressed=true].ok{color:var(--ok-ink)}.kpi[aria-pressed=true].bad{color:var(--bad-ink)}.kpi[aria-pressed=true].warn{color:var(--warn-ink)}.kpi[aria-pressed=true].off{color:var(--off-ink)}
.kpi[aria-pressed=true] .kv{color:var(--tx)}
.kpi .kf{position:absolute;top:16px;right:16px;font-size:11px;font-weight:700;display:none}
.kpi[aria-pressed=true] .kf{display:block}
/* strip bermasalah */
.pcard{width:252px;padding:16px;border-radius:20px;background:var(--surface-2);display:flex;flex-direction:column;gap:8px;border:0;text-align:left;cursor:pointer;color:inherit}
.pcard .n{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcard .m{font-size:13px;color:var(--mut);display:flex;gap:6px;flex-wrap:wrap}
/* kartu lantai */
.floors{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.fcard{border:0;text-align:left;cursor:pointer;color:inherit;background:var(--surface-2);border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:150px;transition:transform .15s var(--e)}
.fcard:hover{background:var(--line)}
.fcard .fh{display:flex;align-items:center;gap:8px}
.fcard .fh b{font-size:1.05rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fcard .fn{font-size:14px;color:var(--mut)}
.fcard .fn b{color:var(--tx);font-size:1.25rem}
.fcard .fs{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:12px;color:var(--mut);margin-top:auto}
.fcard .fs span{white-space:nowrap}
/* daftar per kamera */
.rk{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;width:100%;padding:12px 4px;border:0;border-bottom:1px solid var(--line);background:none;text-align:left;cursor:pointer;color:inherit}
.rk:last-child{border-bottom:0}
.rk .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rk .m{grid-column:1/-1;font-size:12px;color:var(--mut);display:flex;gap:4px 14px;flex-wrap:wrap}
.rk .m b{color:var(--tx);font-weight:600}
.rk .e{font-weight:700;font-size:1.1rem;text-align:right}
.rk .e small{display:block;font-size:11px;color:var(--mut);font-weight:600}
/* timeline */
.tlw{overflow-x:auto;scrollbar-width:thin;padding-bottom:4px}
.tl{min-width:640px;display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px 12px;align-items:center}
.tl .fl{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tl .tr{position:relative;height:32px;border-radius:999px;background:var(--surface-2)}
.tl .tp{position:absolute;top:4px;height:24px;border-radius:999px;border:0;padding:0 8px;font:700 11px/24px inherit;color:var(--bad-ink);background:var(--bad-t);cursor:pointer;min-width:22px;text-align:center;overflow:hidden;white-space:nowrap}
.tl .tp.h2{background:var(--bad);color:#fff}
.tl .ax{position:relative;height:16px;font-size:11px;color:var(--mut)}
.tl .ax span{position:absolute;transform:translateX(-50%)}
.tl .now{position:absolute;top:-2px;bottom:-2px;width:2px;right:0;background:var(--brand-ink);border-radius:2px}
.tbl{width:100%;border-collapse:collapse;font-size:14px}
.tbl th,.tbl td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl th{font-size:12px;color:var(--mut);font-weight:600}
/* semua kamera */
.cams{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.cc{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:18px;background:var(--surface-2);min-width:0}
.cc .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc .m{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cc .r{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
/* riwayat */
.feed{display:flex;flex-direction:column;gap:8px}
.fe{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:12px 14px;border-radius:18px;background:var(--surface-2)}
.fe .ic.l{grid-row:span 2;color:var(--mut)}
.fe .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fe .t{font-size:12px;color:var(--mut);text-align:right;white-space:nowrap}
.fe .m{font-size:12px;color:var(--mut)}
.fe .k{font-size:12px;font-weight:700}
.fe.ERROR .k,.fe.OFFLINE .k{color:var(--bad-ink)}.fe.PULIH .k{color:var(--ok-ink)}.fe.RETRY .k,.fe.REOPEN .k{color:var(--warn-ink)}
.more{display:flex;justify-content:center;margin-top:12px}
/* detail lantai */
.dl{display:flex;flex-direction:column;gap:8px}
.dli{padding:14px;border-radius:18px;background:var(--surface-2);display:flex;flex-direction:column;gap:8px}
.dli .h{display:flex;gap:8px;align-items:center}
.dli .h b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dli .s{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px 12px;font-size:12px;color:var(--mut)}
.dli .s b{display:block;color:var(--tx);font-size:13px}
.dli .btn{background:var(--surface);box-shadow:var(--sh1)}
.hist .fe{grid-template-columns:minmax(0,1fr) auto}
@media (min-width:900px) and (max-width:1279px){.hero{flex-direction:column;align-items:flex-start}.c5.hero,.c7.kpis{grid-column:span 12}.kpis{grid-template-columns:repeat(4,minmax(0,1fr))}#sumCard,#chartCard,#camCard,#feedCard{grid-column:span 12}}
@media (min-width:1700px){html{font-size:16px}.kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.kpi{min-height:232px}}
@media (max-width:899px){
  .hero{min-height:0;gap:16px;padding:20px}
  .hero .rw{width:112px;height:112px}.hero .rw .c b{font-size:1.75rem}
  .hero .big{font-size:1.2rem;margin-bottom:10px}
  .kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0}
  .kpi{flex-direction:row;align-items:center;justify-content:flex-start;min-height:56px;height:auto;padding:10px 14px;border-radius:20px;gap:10px}
  .kpi .kh{font-size:13px;min-width:0;line-height:1.2}.kpi .kh .ic{display:none}.kpi .kv{font-size:1.5rem;order:-1}.kpi .kf{display:none!important}
  .floors{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .fcard{padding:14px;min-height:0}
  .cams{grid-template-columns:minmax(0,1fr);gap:8px}
  .cc{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;padding:12px 14px}
  .cc .r{grid-row:span 2;grid-column:2;justify-content:flex-end}
  .cc .r .src{display:none}
  .card-h .cap.hm{display:none}
  .tl .tr{height:48px}.tl .tp{top:4px;height:40px;line-height:40px;min-width:40px;font-size:13px}
  .tl{gap:8px 10px;grid-template-columns:72px minmax(0,1fr)}
  #feedCard{order:7}#camCard{order:8}
  .tl{min-width:0}.tlw{overflow-x:visible}
  #strip{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;overflow:visible;scroll-snap-type:none;margin:0;padding:0}
  #strip>.pcard{width:auto;min-width:0}
  #strip>.pcard:nth-child(n+5){display:none}
}
`;

const body = `
<div class="filters"><div class="seg" id="srcSeg" role="group" aria-label="Sumber data"><button type="button" data-v="all">Semua sumber</button><button type="button" data-v="bardi">Portal Bardi</button><button type="button" data-v="onvif">ONVIF</button></div>
<button class="fchip" type="button" id="fchip" aria-label="Hapus filter"><span id="fchipT"></span>${I('x', 's')}</button></div>
<section class="grid" aria-label="Ringkasan">
<div class="card hero c5 calm" id="hero"><span class="blob b1" id="blob1"></span><span class="blob b2" id="blob2"></span>
<div class="rw" id="ringW"><div id="ring"></div><div class="c"><b class="num" id="pct">-</b><span>normal</span></div></div>
<div class="hx"><div class="state" id="hState" aria-live="polite"></div><p class="big"><span class="num" id="hOk">-</span> dari <span class="num" id="hTot">-</span> kamera normal</p>
<div class="pills" id="hPills"></div><div class="clk"><b class="num" id="clock">--:--</b><span id="hUpd">memuat data...</span></div></div></div>
<div class="c7 kpis" id="kpis" role="group" aria-label="Filter status">
<button class="kpi ok" type="button" data-k="ok" aria-pressed="false"><span class="kh">${I('ok')}Normal</span><span class="kv num" id="kOk">-</span><span class="kf">FILTER</span></button>
<button class="kpi bad" type="button" data-k="bad" aria-pressed="false"><span class="kh">${I('alert')}Bermasalah</span><span class="kv num" id="kBad">-</span><span class="kf">FILTER</span></button>
<button class="kpi warn" type="button" data-k="warn" aria-pressed="false"><span class="kh">${I('frozen')}Beku / Menyambung</span><span class="kv num" id="kWarn">-</span><span class="kf">FILTER</span></button>
<button class="kpi off" type="button" data-k="off" aria-pressed="false"><span class="kh">${I('off')}Offline</span><span class="kv num" id="kOff">-</span><span class="kf">FILTER</span></button>
</div>
<div class="card c12" id="stripCard" hidden><div class="card-h"><h2>Kamera bermasalah sekarang</h2><span class="cap hm">Paling lama bermasalah di kiri</span></div><div class="hscroll" id="strip"></div></div>
<div class="card c7" id="sumCard"><div class="card-h"><h2>Ringkasan gangguan</h2><span class="pill src">Portal Bardi</span></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 16px"><div class="seg" id="viewSeg" role="group" aria-label="Tampilan"><button type="button" data-v="f">Per lantai</button><button type="button" data-v="c">Per kamera</button></div>
<div class="seg" id="rangeSeg" role="group" aria-label="Rentang waktu"><button type="button" data-v="24">24 jam</button><button type="button" data-v="168">7 hari</button><button type="button" data-v="0">Semua</button></div></div>
<p class="cap" id="sumHint" style="margin:0 0 12px"></p><div id="sumHost"></div></div>
<div class="card c5" id="chartCard"><div class="card-h"><h2>Grafik gangguan</h2><div class="seg" id="chSeg" role="group" aria-label="Rentang grafik"><button type="button" data-v="24">24 jam</button><button type="button" data-v="168">7 hari</button></div></div>
<div id="chart"></div><p class="cap" id="chNote" style="margin:8px 0 0"></p></div>
<div class="card c12" id="tlCard"><div class="card-h"><h2>Garis waktu 24 jam</h2><span class="pill src">Portal Bardi</span><button class="btn" type="button" id="tlToggle" aria-pressed="false">${I('list', 's')}<span>Daftar</span></button></div>
<div id="tl"></div><p class="cap" id="tlNote" style="margin:8px 0 0"></p></div>
<div class="card c7" id="camCard"><div class="card-h"><h2>Status kamera sekarang</h2><div class="seg" id="badSeg" role="group" aria-label="Saring"><button type="button" data-v="all">Semua</button><button type="button" data-v="bad">Hanya bermasalah</button></div></div>
<p class="cap" id="camN" style="margin:-4px 0 12px"></p><div id="cams"></div><div class="more"><button class="btn" type="button" id="camMore" hidden></button></div></div>
<div class="card c5" id="feedCard"><div class="card-h"><h2>Riwayat gangguan</h2><span class="cap" id="evN"></span></div>
<div class="feed" id="feed" aria-live="off"></div><div class="more"><button class="btn" type="button" id="evMore" hidden>Tampilkan lebih banyak</button></div><div id="evSentinel" style="height:1px"></div></div>
</section>`;

const sheets = `
<div class="sheet" id="shFloor" role="dialog" aria-modal="true" aria-labelledby="flT" style="--w:640px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><button class="ib flat" type="button" data-back id="flBack" aria-label="Kembali">${I('back')}</button><h2 id="flT">Detail lantai</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b"><p class="cap" id="flN" style="margin:0 0 12px"></p><div id="flBody"></div></div></div></div>`;

function berandaApp() {
  var DS = window.DS, $ = DS.$, esc = DS.esc, icon = DS.icon;
  var LBL = { PLAY: 'Normal', ERROR: 'Error', CONNECTING: 'Menyambung', FROZEN: 'Beku', ACTED: 'Dipulihkan...', INIT: 'Baru terlihat', HIDE: 'Tidak tampil' };
  var KIND_TXT = { ok: 'Normal', bad: 'Bermasalah', warn: 'Beku / Menyambung', off: 'Offline' };
  var EVTXT = { ERROR: 'Error', RETRY: 'Coba ulang', REOPEN: 'Buka ulang', PULIH: 'Pulih', OFFLINE: 'Offline' };
  var EVIC = { ERROR: 'alert', RETRY: 'refresh', REOPEN: 'refresh', PULIH: 'ok', OFFLINE: 'off' };
  var S = { st: null, onv: null, sum: null, ev: [], tl: null, ch7: null, src: DS.store.get('h:src') || 'all', kf: null, onlyBad: false, view: 'f', range: '24', chr: '24', tlList: false, evN: 10, camAll: false, floor: null, seenStrip: {}, seenEv: null, upd: 0 };
  var nrm = function (s) { return String(s == null ? '' : s).split(' ').filter(Boolean).join(' ').toLowerCase(); };
  var codes = function (o) { var a = []; for (var k in (o || {})) a.push(k + ' (' + o[k] + ')'); return a.join(', ') || '-'; };
  var tparse = function (w) { return new Date(String(w).replace(' ', 'T')).getTime(); };

  // ---- gabungan kamera (Portal Bardi + ONVIF) dengan status seragam ----
  function bardiKind(c) {
    if (c.offline) return ['off', 'Offline'];
    if (c.status === 'PLAY') return ['ok', 'Normal'];
    if (c.status === 'ERROR') return ['bad', 'Error'];
    if (c.status === 'FROZEN') return ['frozen', 'Beku'];
    if (c.status === 'CONNECTING' || c.status === 'ACTED') return ['warn', LBL[c.status]];
    return ['idle', LBL[c.status] || c.status];
  }
  function onvKind(c) {
    if (c.status === 'online') return ['ok', 'Normal'];
    if (c.status === 'offline') return ['off', 'Offline'];
    if (c.status === 'auth') return ['bad', 'Login ditolak'];
    if (c.status === 'lib') return ['bad', 'Pustaka belum terpasang'];
    return ['warn', 'Memeriksa'];
  }
  function allCams() {
    var out = [];
    if (S.src !== 'onvif' && S.st) S.st.cams.forEach(function (c) { var k = bardiKind(c); out.push({ src: 'bardi', name: c.name, floor: c.floor, k: k[0], lbl: k[1], code: c.code, since: c.sinceSec, raw: c }); });
    if (S.src !== 'bardi' && S.onv) S.onv.forEach(function (c) { var k = onvKind(c); var t = k[0] === 'ok' ? null : (c.lastOkAt ? Math.round((Date.now() - c.lastOkAt) / 1000) : null);
      out.push({ src: 'onvif', name: c.name, floor: c.floor || 'Belum diisi', k: k[0], lbl: k[1], code: '', since: t, raw: c, err: c.error }); });
    return out;
  }
  var grp = function (k) { return k === 'frozen' ? 'warn' : k; };
  function pillOf(c) { return DS.pill(c.k, c.lbl); }
  function srcPill(c) { return S.src === 'all' ? '<span class="pill src">' + (c.src === 'onvif' ? 'ONVIF' : 'Bardi') + '</span>' : ''; }

  // ---- hero + KPI ----
  function drawTop() {
    var L = allCams(), n = { ok: 0, bad: 0, warn: 0, off: 0, idle: 0 };
    L.forEach(function (c) { n[grp(c.k)]++; });
    var tot = L.length - n.idle, pct = tot ? Math.round(n.ok / tot * 100) : 0;
    var state = n.bad + n.off > 0 ? 'crit' : n.warn > 0 ? 'alert' : 'calm';
    $('hero').className = 'card hero c5 ' + state;
    $('ring').innerHTML = DS.ring(tot ? n.ok / tot : 0, { size: DS.mobile() ? 112 : 168, stroke: DS.mobile() ? 11 : 14 });
    DS.count($('hOk'), n.ok); DS.count($('hTot'), tot); $('pct').textContent = tot ? pct + '%' : '-';
    var st = state === 'crit' ? ['bad', 'alert', 'Ada kamera bermasalah'] : state === 'alert' ? ['warn', 'wait', 'Ada kamera yang menyambung ulang'] : ['ok', 'ok', tot ? 'Semua kamera normal' : 'Belum ada kamera terpantau'];
    var hs = $('hState'), txt = st[2];
    if (hs.getAttribute('data-t') !== txt) { hs.setAttribute('data-t', txt); hs.innerHTML = '<span class="pill ' + st[0] + '">' + icon(st[1]) + esc(txt) + '</span>'; }
    $('hPills').innerHTML = DS.pill('bad', 'Error ' + n.bad) + DS.pill('frozen', 'Beku/menyambung ' + n.warn) + DS.pill('off', 'Offline ' + n.off);
    DS.count($('kOk'), n.ok); DS.count($('kBad'), n.bad); DS.count($('kWarn'), n.warn); DS.count($('kOff'), n.off);
  }
  // ---- strip kamera bermasalah ----
  function drawStrip() {
    var L = allCams().filter(function (c) { return c.k !== 'ok' && c.k !== 'idle' && (!S.kf || grp(c.k) === S.kf); });
    L.sort(function (a, b) { return (b.since || 0) - (a.since || 0); });
    $('stripCard').hidden = !L.length; if (!L.length) { $('strip').innerHTML = ''; return; }
    var seen = S.seenStrip, now = {};
    $('strip').innerHTML = L.map(function (c, i) { var key = c.src + '|' + c.name; now[key] = 1;
      return '<button class="pcard' + (seen[key] ? '' : ' slidein') + '" type="button" data-cam="' + esc(c.name) + '" data-src="' + c.src + '" style="animation-delay:' + Math.min(i, 10) * 30 + 'ms"><span class="n">' + esc(c.name) + '</span><span>' + pillOf(c) + '</span>'
        + '<span class="m"><span>' + esc(c.floor) + '</span>' + (c.code ? '<span>kode ' + esc(c.code) + '</span>' : '') + (c.since != null ? '<span>' + DS.dur(c.since) + '</span>' : '') + (c.src === 'onvif' ? '<span>ONVIF</span>' : '') + '</span></button>'; }).join('');
    S.seenStrip = now;
  }
  // ---- semua kamera ----
  function drawCams() {
    var L = allCams().filter(function (c) { if (S.onlyBad && (c.k === 'ok' || c.k === 'idle')) return false; if (S.kf && grp(c.k) !== S.kf) return false; return true; });
    var max = S.camAll ? L.length : 12;
    $('camN').textContent = L.length + ' kamera' + (S.kf ? ' (filter: ' + KIND_TXT[S.kf] + ')' : '') + (S.src === 'all' ? '' : S.src === 'bardi' ? ' dari Portal Bardi' : ' ONVIF');
    $('cams').innerHTML = L.length ? '<div class="cams">' + L.slice(0, max).map(function (c) {
      return '<div class="cc"><span class="n" title="' + esc(c.name) + '">' + esc(c.name) + '</span><span class="r">' + pillOf(c) + srcPill(c) + '</span><span class="m">' + esc(c.floor) + (c.code ? ' &middot; kode ' + esc(c.code) : '') + (c.since != null ? ' &middot; ' + DS.dur(c.since) : '') + '</span></div>'; }).join('') + '</div>'
      : '<div class="empty">' + (!(S.st || S.onv) ? 'Memuat...' : allCams().length ? 'Tidak ada kamera yang cocok dengan filter.' : 'Belum ada kamera terpantau. Kamera muncul di sini setelah tampil di portal Bardi atau didaftarkan di halaman Kamera.') + '</div>';
    var b = $('camMore'); b.hidden = L.length <= 12; b.textContent = S.camAll ? 'Tampilkan lebih sedikit' : 'Tampilkan semua (' + L.length + ')';
  }
  // ---- ringkasan (per lantai / per kamera) ----
  function floorsLive() {
    var by = {}; allCams().forEach(function (c) { (by[c.floor] = by[c.floor] || []).push(c); }); return by;
  }
  function drawSum() {
    var host = $('sumHost'); var setH = function (h) { if (host.__h === h) return; var first = !host.__h; host.__h = h; host.innerHTML = first ? h : h.replace(/ rise"/g, '"'); };
    if (!S.sum) { setH('<div class="floors">' + [1, 2, 3, 4].map(function () { return '<div class="fcard sk" style="height:150px"></div>'; }).join('') + '</div>'); return; }
    var rl = S.range === '24' ? '24 jam terakhir' : S.range === '168' ? '7 hari terakhir' : 'seluruh catatan';
    if (S.view === 'f') {
      var live = floorsLive(), names = {}, k;
      S.sum.floors.forEach(function (f) { names[f.floor] = f; }); for (k in live) if (!names[k]) names[k] = { floor: k, cameras: 0, problemCams: 0, error: 0, offline: 0 };
      var list = Object.keys(names).sort(function (a, b) { return (a === 'Belum diisi') - (b === 'Belum diisi') || a.localeCompare(b, 'id', { numeric: true }); });
      if (S.kf) list = list.filter(function (f) { return (live[f] || []).some(function (c) { return grp(c.k) === S.kf; }); });
      $('sumHint').textContent = 'Angka gangguan: ' + rl + '. Ketuk kartu lantai untuk detail tiap kamera.';
      setH(list.length ? '<div class="floors">' + list.map(function (f, i) {
        var L = live[f] || [], ok = L.filter(function (c) { return c.k === 'ok'; }).length, sf = names[f];
        var dots = DS.dots(L.map(function (c) { return { k: c.k === 'ok' ? '' : grp(c.k) === 'warn' ? 'warn' : c.k === 'idle' ? 'off' : c.k, label: c.name + ': ' + c.lbl }; }));
        return '<button class="fcard rise" type="button" data-fl="' + esc(f) + '" style="animation-delay:' + Math.min(i, 10) * 30 + 'ms"><span class="fh">' + icon('layers') + '<b>' + esc(f) + '</b>' + icon('next', 's') + '</span>'
          + '<span class="fn">' + (L.length ? '<b class="num">' + ok + '</b> dari <b class="num">' + L.length + '</b> normal' : 'Tidak ada kamera tampil') + '</span>' + (L.length ? dots : '')
          + '<span class="fs"><span>Error <b class="num">' + (sf.error || 0) + '</b></span><span>Offline <b class="num">' + (sf.offline || 0) + '</b></span><span>Bermasalah <b class="num">' + (sf.problemCams || 0) + '</b></span></span></button>'; }).join('') + '</div>'
        : '<div class="empty">' + (S.kf ? 'Tidak ada lantai dengan kamera ' + KIND_TXT[S.kf].toLowerCase() + '.' : 'Belum ada data lantai.') + '</div>');
    } else {
      $('sumHint').textContent = 'Paling sering error di atas (' + rl + '). Ketuk kamera untuk riwayatnya.';
      var cams = S.sum.cams;
      setH(cams.length ? '<div>' + cams.slice(0, 60).map(function (c) {
        return '<button class="rk" type="button" data-cam="' + esc(c.name) + '"><span class="n">' + esc(c.name) + '</span><span class="e num">' + c.error + '<small>error</small></span>'
          + '<span class="m"><span>' + esc(c.floor) + '</span><span>Kode <b>' + esc(codes(c.codes)) + '</b></span><span>Retry <b class="num">' + c.retry + '</b></span><span>Reopen <b class="num">' + c.reopen + '</b></span><span>Pulih <b class="num">' + c.pulih + '</b></span><span>Offline <b class="num">' + c.offline + '</b></span></span></button>'; }).join('') + '</div>'
        + (cams.length > 60 ? '<p class="cap">Menampilkan 60 dari ' + cams.length + ' kamera. Kamera lain bisa dicari lewat kolom cari (Ctrl+K).</p>' : '')
        : '<div class="empty">Belum ada gangguan pada periode ini.</div>');
    }
  }
  // ---- grafik & garis waktu (dari /api/events, maks. 1000 baris) ----
  function isG(e) { return e.kejadian === 'ERROR' || e.kejadian === 'OFFLINE'; }
  function cover(d, hours) { // jujur soal cakupan data
    var ev = (d && d.events) || []; if (ev.length < 1000) return null;
    var oldest = tparse(ev[ev.length - 1].waktu); return oldest > Date.now() - hours * 3600e3 + 3600e3 ? oldest : null;
  }
  var hh = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':00'; };
  var dd = function (t) { return new Date(t).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); };
  function drawChart() {
    var d = S.chr === '24' ? S.tl : S.ch7; if (!d) { $('chart').innerHTML = '<div class="sk" style="height:200px"></div>'; return; }
    var hours = S.chr === '24' ? 24 : 168, bucket = S.chr === '24' ? 1 : 6, n = hours / bucket, now = Date.now(), end = Math.ceil(now / 3600e3) * 3600e3, start = end - hours * 3600e3, pts = [], i;
    for (i = 0; i < n; i++) { var t = start + i * bucket * 3600e3; pts.push({ v: 0, x: bucket === 1 ? hh(t) : dd(t), t: bucket === 1 ? hh(t) + '-' + hh(t + 3600e3) : dd(t) + ' ' + hh(t) + '-' + hh(t + bucket * 3600e3) }); }
    d.events.forEach(function (e) { if (!isG(e)) return; var t = tparse(e.waktu); if (t < start || t >= end) return; pts[Math.floor((t - start) / (bucket * 3600e3))].v++; });
    var tot = pts.reduce(function (a, p) { return a + p.v; }, 0);
    DS.area($('chart'), pts, { label: 'Jumlah gangguan per ' + (bucket === 1 ? 'jam' : '6 jam'), unit: 'gangguan', h: DS.mobile() ? 220 : 200 });
    var c = cover(d, hours);
    $('chNote').textContent = tot + ' gangguan (error/offline) dari Portal Bardi, per ' + (bucket === 1 ? 'jam' : '6 jam') + '. Titik merah = jam tersibuk.' + (c ? ' Catatan: data hanya mencakup sejak ' + new Date(c).toLocaleString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ' (batas 1000 kejadian terakhir).' : '');
  }
  function drawTl() {
    var d = S.tl; if (!d) { $('tl').innerHTML = '<div class="sk" style="height:120px"></div>'; return; }
    var end = Math.ceil(Date.now() / 3600e3) * 3600e3, start = end - 24 * 3600e3, rows = {}, live = floorsLive(), fmap = {};
    allCams().forEach(function (c) { fmap[nrm(c.name)] = c.floor; });
    if (S.sum) S.sum.floors.forEach(function (f) { (S.sum.floorCams[f.floor] || []).forEach(function (c) { fmap[nrm(c.name)] = f.floor; }); });
    d.events.forEach(function (e) { if (!isG(e)) return; var t = tparse(e.waktu); if (t < start || t >= end) return; var f = fmap[nrm(e.kamera)] || 'Belum diisi'; var h = Math.floor((t - start) / 3600e3); (rows[f] = rows[f] || {})[h] = ((rows[f] || {})[h] || 0) + 1; });
    var floors = Object.keys(live).concat(Object.keys(rows)).filter(function (f, i, a) { return a.indexOf(f) === i; }).sort(function (a, b) { return (a === 'Belum diisi') - (b === 'Belum diisi') || a.localeCompare(b, 'id', { numeric: true }); });
    if (S.tlList) {
      var tr = []; floors.forEach(function (f) { var r = rows[f] || {}; for (var h in r) tr.push([Number(h), f, r[h]]); }); tr.sort(function (a, b) { return b[0] - a[0]; });
      $('tl').innerHTML = tr.length ? '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Jam</th><th>Lantai</th><th>Gangguan</th></tr></thead><tbody>' + tr.map(function (x) { var t = start + x[0] * 3600e3; return '<tr><td class="num">' + hh(t) + '-' + hh(t + 3600e3) + '</td><td>' + esc(x[1]) + '</td><td class="num">' + x[2] + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">Tidak ada gangguan dalam 24 jam terakhir.</div>';
    } else {
      var ax = '<span></span><div class="ax">' + [0, 6, 12, 18, 24].map(function (h) { return '<span style="left:' + (h / 24 * 100) + '%">' + hh(start + h * 3600e3) + '</span>'; }).join('') + '</div>';
      $('tl').innerHTML = floors.length ? '<div class="tlw"><div class="tl">' + floors.map(function (f) {
        var r = rows[f] || {}, segs = [], h = 0;
        while (h < 24) { if (!r[h]) { h++; continue; } var s = h, c = 0; while (h < 24 && r[h]) { c += r[h]; h++; } segs.push([s, h, c]); }
        return '<span class="fl" title="' + esc(f) + '">' + esc(f) + '</span><div class="tr">' + segs.map(function (g) {
          var t0 = start + g[0] * 3600e3, t1 = start + g[1] * 3600e3;
          return '<button class="tp' + (g[2] >= 5 ? ' h2' : '') + '" type="button" style="left:calc(' + (g[0] / 24 * 100) + '% + 2px);width:calc(' + ((g[1] - g[0]) / 24 * 100) + '% - 4px)" data-tl="' + esc(f) + '|' + t0 + '|' + t1 + '" aria-label="' + esc(f) + ' ' + hh(t0) + ' sampai ' + hh(t1) + ': ' + g[2] + ' gangguan">' + g[2] + '</button>'; }).join('') + '<span class="now" aria-hidden="true"></span></div>'; }).join('') + ax + '</div></div>'
        : '<div class="empty">Belum ada data.</div>';
    }
    var c = cover(d, 24);
    $('tlNote').textContent = 'Satu baris per lantai; angka = jumlah error/offline. Ketuk untuk melihat kejadiannya.' + (c ? ' Data hanya mencakup sejak ' + new Date(c).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' (batas 1000 kejadian).' : '');
  }
  // ---- riwayat gangguan (10 awal, +20, sampai 200) ----
  function feedItem(e, cls) {
    return '<div class="fe ' + esc(e.kejadian) + (cls || '') + '">' + icon(EVIC[e.kejadian] || 'clock', 'l') + '<span class="n" title="' + esc(e.kamera) + '">' + esc(e.kamera) + '</span><span class="t num">' + esc(String(e.waktu).slice(5, 16)) + '</span>'
      + '<span class="m"><span class="k">' + esc(EVTXT[e.kejadian] || e.kejadian) + '</span> &middot; kode ' + esc(e.kode_error || '-') + '</span></div>';
  }
  function drawFeed() {
    var E = S.ev, key = E.length ? E[0].waktu + E[0].kamera + E[0].kejadian : '';
    var fresh = 0; if (S.lastKey && key !== S.lastKey) { for (var i = 0; i < E.length && i < 10; i++) { if (E[i].waktu + E[i].kamera + E[i].kejadian === S.lastKey) break; fresh++; } }
    S.lastKey = key;
    $('feed').innerHTML = E.length ? E.slice(0, S.evN).map(function (e, i) { return feedItem(e, i < fresh ? ' drop' : ''); }).join('') : '<div class="empty">Belum ada kejadian.</div>';
    $('evN').textContent = E.length ? Math.min(S.evN, E.length) + ' dari ' + E.length + ' terakhir' : '';
    var b = $('evMore'); b.hidden = S.evN >= E.length; b.textContent = 'Tampilkan lebih banyak (' + Math.min(S.evN, E.length) + ' dari ' + E.length + ')';
    // lonceng: error baru sejak terakhir dilihat
    if (S.seenEv == null && E.length) { S.seenEv = DS.store.get('h:seenEv') || E[0].waktu; DS.store.set('h:seenEv', S.seenEv); }
    if (S.seenEv == null) return;
    var nb = E.filter(function (e) { return isG(e) && e.waktu > S.seenEv; }).length;
    $('bellN').textContent = nb > 99 ? '99+' : nb; $('bell').className = 'ib bellb' + (nb ? ' has' : ''); $('bell').setAttribute('aria-label', nb ? nb + ' gangguan baru' : 'Tidak ada gangguan baru');
  }
  // ---- detail lantai & riwayat kamera (sheet) ----
  function openFloor(name, from) {
    S.floor = name; S.camView = null; drawFloor(); $('flBack').style.visibility = 'hidden';
    DS.openSheet('shFloor', { from: from, onClose: function () { S.floor = null; } });
  }
  function drawFloor() {
    if (!S.floor || S.camView) return;
    var list = (S.sum && S.sum.floorCams[S.floor]) || [], live = {}, k;
    allCams().forEach(function (c) { live[nrm(c.name)] = c; });
    var extra = allCams().filter(function (c) { return c.floor === S.floor && !list.some(function (x) { return nrm(x.name) === nrm(c.name); }); });
    $('flT').textContent = 'Detail ' + S.floor;
    var bad = list.filter(function (c) { return c.error > 0 || c.offline > 0; }).length;
    var rl = S.range === '24' ? '24 jam terakhir' : S.range === '168' ? '7 hari terakhir' : 'seluruh catatan';
    $('flN').textContent = (list.length + extra.length) + ' kamera, ' + bad + ' pernah bermasalah (' + rl + '). Paling sering error di atas.';
    $('flBody').innerHTML = '<div class="dl">' + list.map(function (c) { var l = live[nrm(c.name)];
      return '<div class="dli"><div class="h"><b title="' + esc(c.name) + '">' + esc(c.name) + '</b>' + (l ? pillOf(l) : DS.pill('idle', 'Tidak tampil')) + '</div>'
        + '<div class="s"><span>Error<b class="num">' + c.error + '</b></span><span>Kode (jumlah)<b>' + esc(codes(c.codes)) + '</b></span><span>Pulih<b class="num">' + c.pulih + '</b></span><span>Offline<b class="num">' + c.offline + '</b></span>'
        + '<span>Total bermasalah<b>' + (c.downSec ? DS.dur(c.downSec) : '-') + '</b></span><span>Terlama<b>' + (c.maxDown ? DS.dur(c.maxDown) : '-') + '</b></span><span>Error terakhir<b>' + esc(c.lastTime || '-') + '</b></span></div>'
        + '<div><button class="btn" type="button" data-hist="' + esc(c.name) + '">' + icon('history', 's') + 'Riwayat</button></div></div>'; }).join('')
      + extra.map(function (c) { return '<div class="dli"><div class="h"><b>' + esc(c.name) + '</b>' + pillOf(c) + '<span class="pill src">ONVIF</span></div><div class="cap">' + esc(c.err || 'Kamera ONVIF: riwayat gangguannya ada di halaman Kejadian.') + '</div></div>'; }).join('') + '</div>'
      + (!list.length && !extra.length ? '<div class="empty">Tidak ada kamera.</div>' : '');
  }
  function openHist(name, inFloor, from) {
    S.camView = name; $('flT').textContent = 'Riwayat ' + name; $('flN').textContent = 'Maksimal 200 kejadian pada periode ini.';
    $('flBack').style.visibility = inFloor ? 'visible' : 'hidden';
    $('flBody').innerHTML = '<div class="feed">' + [1, 2, 3, 4].map(function () { return '<div class="sk" style="height:64px;border-radius:18px"></div>'; }).join('') + '</div>';
    if (!inFloor) { S.floor = null; DS.openSheet('shFloor', { from: from, onClose: function () { S.floor = null; S.camView = null; } }); }
    fetch('/api/events?limit=200&hours=' + S.range + '&camera=' + encodeURIComponent(name), { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { if (r.status === 401) { location.href = '/login'; throw 0; } return r.json(); }).then(function (d) {
      if (S.camView !== name) return; var E = d.events || [];
      $('flBody').innerHTML = E.length ? '<div class="feed hist">' + E.map(function (e) { return '<div class="fe ' + esc(e.kejadian) + '"><span class="n num">' + esc(e.waktu) + '</span><span class="k">' + esc(EVTXT[e.kejadian] || e.kejadian) + '</span><span class="m">Kode ' + esc(e.kode_error || '-') + ' &middot; percobaan ' + esc(e.percobaan || '-') + ' &middot; ' + esc(e.durasi_detik || 0) + ' dtk</span><span class="m" style="text-align:right">' + esc(e.hasil || '') + '</span></div>'; }).join('') + '</div>' : '<div class="empty">Tidak ada kejadian pada periode ini.</div>';
    }).catch(function () { if (S.camView === name) $('flBody').innerHTML = '<div class="empty">Gagal memuat riwayat. <button class="btn" type="button" data-hist="' + esc(name) + '">Coba lagi</button></div>'; });
  }
  $('shFloor').__back = function () { if (S.camView && S.floor) { S.camView = null; $('flBack').style.visibility = 'hidden'; drawFloor(); } };
  function openTl(f, t0, t1, from) {
    var d = S.tl; S.camView = 'tl'; S.floor = null; var fmap = {};
    allCams().forEach(function (c) { fmap[nrm(c.name)] = c.floor; }); if (S.sum) S.sum.floors.forEach(function (x) { (S.sum.floorCams[x.floor] || []).forEach(function (c) { fmap[nrm(c.name)] = x.floor; }); });
    var E = (d ? d.events : []).filter(function (e) { var t = tparse(e.waktu); return isG(e) && t >= t0 && t < t1 && (fmap[nrm(e.kamera)] || 'Belum diisi') === f; });
    $('flT').textContent = f + ', ' + hh(t0) + '-' + hh(t1); $('flN').textContent = E.length + ' gangguan'; $('flBack').style.visibility = 'hidden';
    $('flBody').innerHTML = '<div class="feed">' + E.map(function (e) { return feedItem(e, ''); }).join('') + '</div>';
    DS.openSheet('shFloor', { from: from, onClose: function () { S.camView = null; } });
  }
  // ---- klik ----
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var fl = t.closest('[data-fl]'); if (fl) return openFloor(fl.getAttribute('data-fl'), fl);
    var h = t.closest('[data-hist]'); if (h) return openHist(h.getAttribute('data-hist'), !!S.floor, null);
    var cm = t.closest('[data-cam]'); if (cm) { if (cm.getAttribute('data-src') === 'onvif') { location.href = '/onvif'; return; } return openHist(cm.getAttribute('data-cam'), false, cm); }
    var tl = t.closest('[data-tl]'); if (tl) { var p = tl.getAttribute('data-tl').split('|'); return openTl(p[0], Number(p[1]), Number(p[2]), tl); }
  });
  $('kpis').addEventListener('click', function (e) { var b = e.target.closest('.kpi'); if (!b) return; var k = b.getAttribute('data-k'); S.kf = S.kf === k ? null : k; paintKf(); drawAll(); });
  function paintKf() { var bs = $('kpis').querySelectorAll('.kpi'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-k') === S.kf ? 'true' : 'false');
    $('fchip').className = 'fchip' + (S.kf ? ' show' : ''); $('fchipT').textContent = S.kf ? 'Filter: ' + KIND_TXT[S.kf] : ''; }
  $('fchip').onclick = function () { S.kf = null; paintKf(); drawAll(); };
  DS.seg($('srcSeg'), S.src, function (v) { S.src = v; DS.store.set('h:src', v); drawAll(); });
  DS.seg($('viewSeg'), S.view, function (v) { S.view = v; drawSum(); });
  DS.seg($('rangeSeg'), S.range, function (v) { S.range = v; S.sum = null; drawSum(); pSum.now(); });
  DS.seg($('chSeg'), S.chr, function (v) { S.chr = v; drawChart(); if (v === '168') { if (!p7) p7 = DS.poll({ name: 'ch7', url: '/api/events?limit=1000&hours=168', ms: 60000, cache: true, onData: function (d) { S.ch7 = d; if (S.chr === '168') drawChart(); } }); else p7.now(); } });
  DS.seg($('badSeg'), 'all', function (v) { S.onlyBad = v === 'bad'; drawCams(); });
  $('tlToggle').onclick = function () { S.tlList = !S.tlList; this.setAttribute('aria-pressed', S.tlList ? 'true' : 'false'); this.querySelector('span').textContent = S.tlList ? 'Garis waktu' : 'Daftar'; this.querySelector('use').setAttribute('href', S.tlList ? '#i-chart' : '#i-list'); drawTl(); };
  $('camMore').onclick = function () { S.camAll = !S.camAll; drawCams(); };
  $('evMore').onclick = function () { S.evN = Math.min(200, S.evN + 20); drawFeed(); };
  if (window.IntersectionObserver) new IntersectionObserver(function (en) { if (en[0].isIntersecting && S.evN > 10 && S.evN < S.ev.length) { S.evN = Math.min(200, S.evN + 20); drawFeed(); } }).observe($('evSentinel'));
  $('bell').onclick = function () { if (S.ev[0]) { S.seenEv = S.ev[0].waktu; DS.store.set('h:seenEv', S.seenEv); } drawFeed(); $('feedCard').scrollIntoView({ behavior: DS.reduce() ? 'auto' : 'smooth', block: 'start' }); };

  function drawAll() { drawTop(); drawStrip(); drawSum(); drawCams(); drawTl(); drawFloor(); }
  // ---- jam & "diperbarui X lalu" ----
  function tick() {
    var d = new Date(); $('clock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    $('hUpd').textContent = S.upd ? 'diperbarui ' + DS.ago(Date.now() - S.upd) : 'memuat data...';
    if (S.st) { var m = S.st.meta; $('topsub').textContent = 'Mode ' + m.mode + ' · berjalan ' + DS.dur(m.uptimeSec) + ' · IP publik ' + (m.publicIp || 'belum diketahui'); }
  }
  setInterval(tick, 1000);
  // ---- pengambilan data (interval sama dengan versi lama; grafik/garis waktu 60 dtk) ----
  var p7 = null;
  var pSt = DS.poll({ name: 'status', url: '/api/status', ms: 2000, cache: true, onData: function (d, cachedAt) { S.st = d; S.upd = cachedAt || Date.now(); drawTop(); drawStrip(); drawCams(); if (S.view === 'f') drawSum(); drawFloor(); tick(); } });
  var pOnv = DS.poll({ name: 'onvif', url: '/api/onvif/cameras', ms: 10000, cache: true, onData: function (d) { S.onv = (d && d.cameras) || []; drawTop(); drawStrip(); drawCams(); if (S.view === 'f') drawSum(); } });
  var pSum = DS.poll({ name: 'summary', url: function () { return '/api/summary?hours=' + S.range; }, ms: 10000, onData: function (d) { S.sum = d; drawSum(); drawFloor(); drawTl(); } });
  var pEv = DS.poll({ name: 'events', url: '/api/events?limit=200', ms: 10000, cache: true, onData: function (d) { S.ev = d.events || []; drawFeed(); } });
  var pTl = DS.poll({ name: 'tl24', url: '/api/events?limit=1000&hours=24', ms: 60000, cache: true, onData: function (d) { S.tl = d; drawTl(); if (S.chr === '24') drawChart(); } });
  DS.pullRefresh(function () { [pSt, pOnv, pSum, pEv, pTl].forEach(function (p) { p.now(); }); if (p7) p7.now(); return new Promise(function (r) { setTimeout(r, 900); }); });
  // ---- cari (Ctrl+K): kamera & lantai ----
  DS.initShell({ search: function (q) {
    if (!q) return []; var out = [], seen = {};
    allCams().forEach(function (c) { if (nrm(c.name).indexOf(q) >= 0 && !seen[c.name]) { seen[c.name] = 1; out.push({ label: c.name, sub: c.floor + (c.src === 'onvif' ? ' · ONVIF' : ''), icon: 'cam', pill: pillOf(c), run: function () { if (c.src === 'onvif') location.href = '/onvif'; else openHist(c.name, false, null); } }); } });
    var fl = {}; allCams().forEach(function (c) { fl[c.floor] = 1; });
    Object.keys(fl).forEach(function (f) { if (nrm(f).indexOf(q) >= 0) out.push({ label: f, sub: 'Detail lantai', icon: 'layers', run: function () { openFloor(f, null); } }); });
    return out;
  } });
  // ---- parallax ringan di hero (hanya transform; mati bila "kurangi gerakan") ----
  if (!DS.reduce()) { var b1 = $('blob1'), b2 = $('blob2'), pend = false, mx = 0, my = 0;
    function par() { pend = false; var y = window.scrollY; b1.style.transform = 'translate(' + (mx * 14) + 'px,' + (y * 0.18 + my * 10) + 'px)'; b2.style.transform = 'translate(' + (-mx * 10) + 'px,' + (y * -0.1 - my * 8) + 'px)'; }
    window.addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(par); } }, { passive: true });
    $('hero').addEventListener('pointermove', function (e) { var r = this.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; if (!pend) { pend = true; requestAnimationFrame(par); } });
  }
  window.addEventListener('resize', function () { drawTop(); if (S.chr) drawChart(); });
  paintKf(); drawAll(); drawChart(); drawFeed(); tick();
}

module.exports = function berandaPage() {
  return ds.page({
    title: 'Beranda', cur: 'home', h1: 'Beranda', sub: 'Status semua kamera', bell: true,
    css, body, sheets, script: '(' + berandaApp.toString() + ')();',
  });
};
