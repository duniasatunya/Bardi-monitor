// Halaman "Kejadian" (rekaman saat kamera putus: 2 menit sebelum putus + 2 menit sesudah menyala) dan pemutarnya.
// Hanya tampilan. Data dari /api/kejadian (10 dtk, endpoint lama); klip dari /kejadian/f/... (endpoint lama).
// Skrip browser ditulis sebagai fungsi lalu toString (tidak boleh memakai variabel dari luar fungsinya).
'use strict';
const { ds } = require('./ui-kit');
const I = ds.icon;

const css = `
.kj{display:grid;grid-template-columns:minmax(340px,400px) minmax(0,1fr);gap:var(--gap);align-items:start}
.kj .lcol{min-width:0}
.kj .rcol{position:sticky;top:88px;min-width:0}
.fbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}
.psel{position:relative;flex:1;min-width:160px}
.psel select{width:100%;height:44px;border:0;border-radius:999px;background:var(--surface);box-shadow:var(--sh1);padding:0 40px 0 18px;font-weight:600;font-size:15px;appearance:none;-webkit-appearance:none;cursor:pointer}
.psel::after{content:'';position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid var(--mut);border-bottom:2px solid var(--mut);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.recb{height:44px;white-space:nowrap}
.day{position:sticky;top:64px;z-index:5;margin:16px 0 8px;padding:6px 4px;font-size:13px;font-weight:700;color:var(--mut);background:linear-gradient(var(--bg) 70%,transparent)}
.day:first-child{margin-top:0}
.ilist{display:flex;flex-direction:column;gap:10px}
.iw{position:relative;border-radius:var(--r-card)}
.iw.sw{background:var(--brand-ink)}
.iw::after{content:'Unduh';position:absolute;right:22px;top:50%;transform:translateY(-50%);color:var(--on-brand);font-weight:700;opacity:0}
.iw.sw::after{opacity:1}
.inc{position:relative;z-index:1;display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;border:0;background:var(--surface);color:var(--tx);border-radius:var(--r-card);padding:16px 18px;box-shadow:var(--sh1),var(--sh2);cursor:pointer;touch-action:pan-y;min-width:0}
.inc *{touch-action:pan-y}
.inc.moving{transition:none}
.inc:not(.moving){transition:transform .25s var(--e),box-shadow .15s var(--e)}
.inc[aria-pressed=true]{box-shadow:inset 0 0 0 2.5px var(--brand-ink),var(--sh2)}
.inc .ih{display:flex;align-items:center;gap:8px;min-width:0}
.inc .ih b{flex:1;min-width:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inc .im{font-size:13px;color:var(--mut)}
.inc .iw2{font-size:13px;color:var(--warn-ink);font-weight:600}
.inc .ia{display:flex;gap:8px;align-items:center;margin-top:4px}
.inc .ia .btn{min-height:40px;padding:0 16px;font-size:14px}
.pcard{padding:0;overflow:hidden}
.vbox{position:relative;aspect-ratio:16/9;background:#000;border-radius:var(--r-card) var(--r-card) 0 0;overflow:hidden}
.vbox video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
.vbox .ph0{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;color:#9aa6b0;padding:0 24px;pointer-events:none}
.pinfo{padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px}
.pinfo .pt{display:flex;align-items:center;gap:12px}
.pinfo .pt h2{flex:1;min-width:0;font-size:18px}
.tlk{position:relative;height:48px;border-radius:16px;background:var(--surface-2);cursor:pointer;overflow:hidden;touch-action:manipulation}
.tlk .pos{position:absolute;top:0;bottom:0;width:2px;background:var(--brand-ink);left:0;pointer-events:none}
.tlk .mk{position:absolute;top:6px;bottom:6px;width:6px;margin-left:-3px;border-radius:3px;background:var(--bad)}
.pj{display:flex;gap:8px;flex-wrap:wrap}
.pj .btn{min-height:40px;font-size:14px;padding:0 14px}
.cn{font-size:13px;color:var(--mut);margin:0}
.rrow{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--line)}
.rrow:last-child{border-bottom:0}
.rrow .rn{flex:1;min-width:0}.rrow .rn b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rrow .rn span{font-size:13px;color:var(--mut)}
#pbody.inpanel{display:block}
@media (max-width:899px){
  .kj{grid-template-columns:minmax(0,1fr)}
  .kj .rcol{display:none}
  .day{top:56px}
  .inc{padding:14px 16px}
  #shPlay .vbox{border-radius:20px}
  #shPlay .pinfo{padding:12px 0 8px}
}
@media (min-width:900px){#shPlay{display:none!important}}
`;

const body = `
<div class="kj">
<section class="lcol" aria-label="Daftar kejadian">
<div class="fbar"><div class="psel"><label class="sr" for="fcam">Filter kamera</label><select id="fcam"><option value="">Semua kamera</option></select></div><button class="btn recb" type="button" id="bst">${I('monitor', 's')}<span id="bstT">Status perekam</span></button></div>
<p class="cap" id="cnt" style="margin:0 4px 8px"></p>
<div id="list" aria-live="polite"></div>
<div style="margin-top:16px;text-align:center"><button class="btn" type="button" id="more" hidden>Tampilkan lebih banyak</button></div>
</section>
<aside class="rcol" aria-label="Pemutar"><div class="card pcard" id="pslot"><div id="pbody">
<div class="vbox"><video id="v" controls playsinline preload="metadata"></video><div class="ph0" id="ph0">Pilih kejadian di daftar, lalu tekan Putar.</div></div>
<div class="pinfo"><div class="pt"><h2 id="ptitle">Pemutar</h2><a class="btn pri" id="pdl" download hidden>${I('download', 's')}Unduh</a></div>
<div class="tlk" id="tl" hidden role="group" aria-label="Garis waktu klip"><span class="pos" id="tlpos"></span></div><div class="pj" id="pj"></div>
<p class="cn" id="psize"></p><p class="cn" id="pnote"></p></div></div></div></aside>
</div>`;

const sheets = `
<div class="sheet" id="shRec" role="dialog" aria-modal="true" aria-labelledby="recT" style="--w:480px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="recT">Status perekam</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b"><p class="cap" id="recInfo" style="margin:0 0 12px"></p><div id="recList"></div></div></div></div>
<div class="sheet" id="shPlay" role="dialog" aria-modal="true" aria-labelledby="playT" style="--w:760px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="playT">Pemutar</h2><button class="ib flat" type="button" data-close aria-label="Tutup pemutar">${I('x')}</button></div>
<div class="sh-b" id="playHost"></div></div></div>`;

function kejadianApp() {
  var $ = function (i) { return document.getElementById(i); };
  var esc = DS.esc, icon = DS.icon;
  var S = { d: { incidents: [], recorder: [], days: 7, dir: '' }, got: false, cam: '', cur: null, n: 30, last: '' };
  var STATE = { ok: 'Merekam', putus: 'Putus', mulai: 'Menyiapkan', login: 'Login ditolak' };
  var SKIND = { ok: 'ok', putus: 'bad', mulai: 'off', login: 'warn' };
  function dur(s) { s = Math.round(s || 0); var m = Math.floor(s / 60), x = s - m * 60; return m > 0 ? (m + ' mnt ' + x + ' dtk') : (x + ' dtk'); }
  function clk(s) { return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function tm(s) { return new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function dayOf(s) { return new Date(s).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function key(x) { return x.id + '|' + x.stamp; }
  function find(k) { var r = null; S.d.incidents.forEach(function (x) { if (key(x) === k) r = x; }); return r; }
  function urlOf(x) { return '/kejadian/f/' + x.id + '/' + x.file; }
  function statusPill(x) { return x.status === 'berlangsung' ? DS.pill('bad', 'Masih mati') : x.status === 'selesai' ? DS.pill('ok', 'Selesai') : DS.pill('warn', 'Tidak selesai'); }
  function filtered() { return S.d.incidents.filter(function (x) { return !S.cam || x.id === S.cam; }); }
  function card(x, i) {
    var t = 'Putus ' + clk(x.lostAt); if (x.recoveredAt) t += ' · hidup ' + tm(x.recoveredAt) + ' (mati ' + dur(x.downSec) + ')';
    var h = '<div class="iw" data-k="' + esc(key(x)) + '"><button class="inc" type="button" data-k="' + esc(key(x)) + '" aria-pressed="' + (S.cur === key(x) ? 'true' : 'false') + '">'
      + '<span class="ih"><b>' + esc(x.name) + '</b>' + statusPill(x) + '</span><span class="im">' + esc(t) + '</span>';
    if (x.hasFile) h += '<span class="im">Klip ' + esc(dur(x.durationSec)) + (x.joins && x.joins.length > 1 ? ' · terputus ' + x.joins.length + ' kali' : '') + '</span>';
    else if (x.catatan) h += '<span class="iw2">' + esc(x.catatan) + '</span>';
    if (x.bersamaan && x.bersamaan.length) h += '<span class="iw2" title="Kemungkinan masalah di titik bersama: listrik, switch, atau kabel">Bersamaan dengan: ' + esc(x.bersamaan.join(', ')) + '</span>';
    if (x.hasFile) h += '<span class="ia"><span class="btn pri" role="presentation">' + icon('play', 's') + 'Putar</span>' + '</span>';
    return h + '</button></div>';
  }
  function draw() {
    var L = filtered();
    $('cnt').textContent = L.length + ' kejadian' + (S.cam ? ' untuk kamera ini' : '');
    var h = '';
    if (!S.got) h = [1, 2, 3].map(function () { return '<div class="card sk" style="height:120px;margin-bottom:10px"></div>'; }).join('');
    else if (!L.length) h = '<div class="empty">Belum ada kejadian. Klip muncul di sini saat ada kamera yang putus.</div>';
    else { var day = '', open = false; L.slice(0, S.n).forEach(function (x, i) { var dd = dayOf(x.lostAt); if (dd !== day) { if (open) h += '</div>'; day = dd; h += '<h3 class="day">' + esc(dd) + '</h3><div class="ilist">'; open = true; } h += card(x, i); }); if (open) h += '</div>'; }
    if (h !== S.last) { S.last = h; $('list').innerHTML = h; }
    $('more').hidden = !(S.got && L.length > S.n);
  }
  function drawRec() {
    var R = S.d.recorder || [], n = R.length, ok = 0; R.forEach(function (r) { if (r.state === 'ok') ok++; });
    $('bstT').textContent = n ? ('Perekam ' + ok + '/' + n + ' aktif') : 'Status perekam';
    $('recInfo').textContent = 'Tiap kamera terdaftar direkam ke buffer sementara. Saat kamera berhenti mengirim gambar 60 detik, 2 menit sebelumnya disimpan; saat menyala lagi, 2 menit sesudahnya ditambahkan. Suara tidak direkam. Klip disimpan ' + S.d.days + ' hari, lebih lama dari itu dihapus otomatis.' + (S.d.dir ? ' Folder klip: ' + S.d.dir : '');
    $('recList').innerHTML = n ? R.map(function (r) {
      var t = STATE[r.state] || r.state, sub = [];
      if (r.state === 'putus' && r.sejak) sub.push('sejak ' + tm(r.sejak));
      if (r.state === 'ok' && r.rate && r.rate.avgMbps != null) sub.push('rata-rata ' + r.rate.avgMbps.toFixed(2).replace('.', ',') + ' Mbps');
      if (r.error) sub.push(r.error);
      return '<div class="rrow"><div class="rn"><b>' + esc(r.name) + '</b><span>' + esc(sub.join(' · ') || ' ') + '</span></div>' + DS.pill(SKIND[r.state] || 'off', t) + '</div>';
    }).join('') : '<div class="empty">Belum ada kamera terdaftar.</div>';
    var sel = $('fcam'), v = sel.value, seen = {}, opts = '<option value="">Semua kamera</option>';
    S.d.incidents.forEach(function (x) { if (!seen[x.id]) { seen[x.id] = 1; opts += '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; } });
    if (sel.getAttribute('data-o') !== opts) { sel.innerHTML = opts; sel.setAttribute('data-o', opts); sel.value = v; }
  }
  // ---- pemutar ----
  var inSheet = false;
  function play(k) {
    var x = find(k); if (!x || !x.file) return; S.cur = k; var url = urlOf(x);
    if (DS.mobile() && !inSheet) { $('playHost').appendChild($('pbody')); inSheet = true; $('playT').textContent = x.name; DS.openSheet('shPlay', { onClose: closePlayer }); }
    $('ph0').style.display = 'none'; $('ptitle').textContent = x.name + ' · putus ' + clk(x.lostAt);
    var v = $('v'); v.src = url; v.load(); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    var dl = $('pdl'); dl.hidden = false; dl.href = url; dl.setAttribute('download', x.stamp + '.mp4');
    var h = '', jh = '';
    (x.joins || []).forEach(function (j, i) {
      var pct = x.durationSec > 0 ? Math.min(100, j.atSec / x.durationSec * 100) : 0;
      h += '<span class="mk" style="left:' + pct + '%" title="Rekaman terputus di sini"></span>';
      jh += '<button class="btn" type="button" data-t="' + j.atSec + '">Titik putus ' + (i + 1) + ' (' + esc(dur(j.atSec)) + ', mati ' + esc(dur(j.gapSec)) + ')</button>';
    });
    $('tl').innerHTML = '<span class="pos" id="tlpos"></span>' + h; $('tl').hidden = false; $('tl').setAttribute('data-d', x.durationSec || 0); $('pj').innerHTML = jh;
    $('pnote').textContent = 'Garis merah = titik kamera putus. Sebelum garis: 2 menit terakhir sebelum putus; sesudahnya: rekaman setelah kamera menyala lagi.' + (x.hevc ? ' (Kamera H.265: diputar dari salinan H.264.)' : '');
    $('psize').textContent = '';
    fetch(url, { headers: { Range: 'bytes=0-0' }, credentials: 'same-origin', cache: 'no-store' }).then(function (r) { var cr = r.headers.get('Content-Range'), m = cr && /\/(\d+)$/.exec(cr); var n = m ? Number(m[1]) : Number(r.headers.get('Content-Length')); if (S.cur === k && n > 1) $('psize').textContent = 'Ukuran berkas: ' + (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(n / 1024) + ' KB'); try { r.body.cancel(); } catch (e) {} }).catch(function () {});
    S.last = ''; draw();
  }
  function closePlayer() { var v = $('v'); try { v.pause(); } catch (e) {} if (inSheet) { $('pslot').appendChild($('pbody')); inSheet = false; } }
  $('v').addEventListener('timeupdate', function () { var d = Number($('tl').getAttribute('data-d')) || 0, p = $('tlpos'); if (p && d > 0) p.style.left = Math.min(100, $('v').currentTime / d * 100) + '%'; });
  $('tl').addEventListener('click', function (e) { var d = Number(this.getAttribute('data-d')) || 0; if (!d) return; var r = this.getBoundingClientRect(); $('v').currentTime = Math.max(0, Math.min(d, (e.clientX - r.left) / r.width * d)); var q = $('v').play(); if (q && q.catch) q.catch(function () {}); });
  $('pj').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-t]') : null; if (!b) return; var v = $('v'); v.currentTime = Math.max(0, Number(b.getAttribute('data-t')) - 10); var q = v.play(); if (q && q.catch) q.catch(function () {}); });
  $('list').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.inc') : null; if (!b) return; if (b.getAttribute('data-swiped')) { b.removeAttribute('data-swiped'); return; } var x = find(b.getAttribute('data-k')); if (!x) return; if (!x.hasFile) { DS.toast(x.catatan || 'Kejadian ini tidak punya klip.'); return; } play(b.getAttribute('data-k')); });
  // ---- geser kartu ke kiri = Unduh (sentuhan) ----
  var sw = null;
  $('list').addEventListener('touchstart', function (e) { var n = e.target.closest ? e.target.closest('.inc') : null; if (!n || e.touches.length !== 1) { sw = null; return; } var x = find(n.getAttribute('data-k')); if (!x || !x.hasFile) { sw = null; return; } sw = { n: n, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false, x: x }; }, { passive: true });
  $('list').addEventListener('touchmove', function (e) {
    if (!sw) return; var dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
    if (!sw.on) { if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) { sw.on = true; sw.n.className += ' moving'; } else { if (Math.abs(dy) > 12) sw = null; return; } }
    if (e.cancelable) e.preventDefault(); sw.dx = Math.min(0, dx); sw.n.style.transform = 'translateX(' + sw.dx + 'px)'; sw.n.parentNode.className = 'iw' + (sw.dx < -8 ? ' sw' : '');
  }, { passive: false });
  function swReset(n) { n.className = n.className.replace(' moving', ''); n.style.transform = ''; n.parentNode.className = 'iw'; }
  $('list').addEventListener('touchend', function () { if (!sw) return; var n = sw.n, dx = sw.dx, on = sw.on, x = sw.x; sw = null; if (!on) return; swReset(n); n.setAttribute('data-swiped', '1'); setTimeout(function () { n.removeAttribute('data-swiped'); }, 400);
    if (dx < -90) { var a = document.createElement('a'); a.href = urlOf(x); a.setAttribute('download', x.stamp + '.mp4'); document.body.appendChild(a); a.click(); document.body.removeChild(a); DS.toast('Mengunduh klip ' + x.name + '...'); } });
  $('list').addEventListener('touchcancel', function () { if (sw) { swReset(sw.n); sw = null; } });
  $('fcam').onchange = function () { S.cam = this.value; S.n = 30; draw(); };
  $('more').onclick = function () { S.n += 30; draw(); };
  $('bst').onclick = function () { DS.openSheet('shRec'); };
  var P = DS.poll({ name: 'kejadian', url: '/api/kejadian', ms: 10000, cache: true, onData: function (d) { if (!d || !d.ok) return; S.d = d; S.got = true; drawRec(); draw(); } });
  DS.pullRefresh(function () { P.now(); return new Promise(function (r) { setTimeout(r, 800); }); });
  DS.initShell({ search: function (q) { if (!q) return []; var out = [], seen = {}; S.d.incidents.forEach(function (x) { if (!seen[x.id] && x.name.toLowerCase().indexOf(q) >= 0) { seen[x.id] = 1; out.push({ label: x.name, sub: 'Filter kejadian kamera ini', icon: 'cam', run: function () { $('fcam').value = x.id; S.cam = x.id; S.n = 30; draw(); } }); } }); return out; } });
  draw();
}

module.exports = () => ds.page({
  title: 'Kejadian', cur: 'kj', h1: 'Kejadian', sub: 'Rekaman saat kamera putus',
  css, body, sheets, script: '(' + kejadianApp.toString() + ')();',
});
