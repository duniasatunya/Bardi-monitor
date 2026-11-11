// Halaman "Kamera" (pengganti Kamera ONVIF; alamat tetap /onvif): kartu kamera per lantai, ringkasan beban, wizard tambah/ubah kamera, live view.
// Hanya tampilan. Endpoint lama: /api/onvif/cameras (3 dtk), save, delete, test, scan, sweep, discover, live/start|stop, diag, /onvif-live/<id>/rt.mp4.
// Skrip browser ditulis sebagai fungsi lalu toString (tidak boleh memakai variabel dari luar fungsinya).
'use strict';
const { ds } = require('./ui-kit');
const I = ds.icon;

const css = `
.sumg{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:var(--gap);margin-bottom:var(--gap)}
.gcard{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.gcard .gv{font-size:2.5rem;font-weight:700;line-height:1;margin-top:-52px}
.gcard .ring .fg{stroke:var(--brand-ink)}.gcard.hot .ring .fg{stroke:var(--warn)}.gcard.max .ring .fg{stroke:var(--bad)}
.gstats{display:flex;gap:24px;margin-top:12px;font-size:13px;color:var(--mut)}.gstats b{display:block;color:var(--tx);font-size:16px}
.cnts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.libw{margin:0 0 16px;padding:12px 16px;border-radius:16px;background:var(--warn-t);color:var(--warn-ink);font-weight:600}
.fgroup{margin:0 0 24px;border-radius:var(--r-card);transition:box-shadow .15s var(--e),background-color .15s var(--e)}
.fgroup.over{box-shadow:0 0 0 3px var(--brand-ink);background:var(--brand-t)}
.fgh{display:flex;align-items:center;gap:8px;margin:0 4px 12px;font-weight:700}
.fgh .n{color:var(--mut);font-weight:600;font-size:13px}
.cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--gap)}
.kc{position:relative;display:flex;flex-direction:column;gap:6px;padding:18px 20px}
.kc .kh{display:flex;align-items:center;gap:8px;min-width:0}
.kc .kh b{flex:1;min-width:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kc .km{font-size:13px;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kc .km b{color:var(--tx)}
.kc .ka{display:flex;gap:6px;margin-top:8px}
.act{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;color:var(--mut);font-size:12px;font-weight:600;cursor:pointer;padding:0;min-width:56px}
.act .ib{box-shadow:none;background:var(--surface-2)}
.act.pri .ib{background:var(--brand-ink);color:var(--on-brand)}
.act.dng .ib{background:var(--bad-t);color:var(--bad-ink)}
.act:hover .ib{filter:brightness(.97)}
.grip{position:absolute;right:12px;top:12px;width:40px;height:40px;border:0;background:none;color:var(--mut);display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none;border-radius:12px}
.grip:hover{background:var(--surface-2)}
.kc .kh{padding-right:36px}
.kc.dragging{opacity:.35}
.ghost{position:fixed;z-index:95;pointer-events:none;box-shadow:0 16px 40px rgba(0,0,0,.28);transform:rotate(1.5deg);opacity:.95}
.steps{display:flex;gap:8px;margin:0 0 16px;padding:0;list-style:none}
.steps li{flex:1;display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:var(--mut)}
.steps li i{display:block;height:6px;border-radius:999px;background:var(--surface-2)}
.steps li.on{color:var(--brand-ink)}.steps li.on i,.steps li.done i{background:var(--brand-ink)}
.wz{display:flex;flex-direction:column;gap:14px}
.wz h3{font-size:18px}
.wnav{display:flex;gap:10px;margin-top:8px}.wnav .btn{flex:1}
.radar{position:relative;width:132px;height:132px;margin:8px auto;border-radius:50%;background:var(--brand-t)}
.radar::before,.radar::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--brand-ink);opacity:0}
.radar.on::before{animation:rad 1.8s var(--e) infinite}.radar.on::after{animation:rad 1.8s var(--e) .9s infinite}
.radar .ic{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;color:var(--brand-ink)}
@keyframes rad{from{transform:scale(.4);opacity:.8}to{transform:scale(1.15);opacity:0}}
.dev{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:var(--surface-2)}
.dev .dn{flex:1;min-width:0}.dev .dn b{display:block}.dev .dn span{font-size:13px;color:var(--mut)}
.dev .btn{min-height:40px;padding:0 16px}
.chk{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.chk li{display:flex;align-items:center;gap:10px;font-weight:600}
.chk .st{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;background:var(--surface-2);color:var(--mut)}
.chk .ok{background:var(--ok-t);color:var(--ok-ink)}.chk .no{background:var(--bad-t);color:var(--bad-ink)}
.chk .st .ic{width:15px;height:15px}
.prof{display:flex;flex-direction:column;gap:6px;padding:10px 14px;border-radius:14px;background:var(--surface-2);font-size:14px}
.prof small{color:var(--mut)}
.tech{font-size:12px;color:var(--mut)}.tech code{word-break:break-all}
.pill.row2{height:auto;min-height:28px}
#shLv .panel{inset:16px;width:auto}
#shLv .sh-b{display:flex;flex-direction:column;gap:12px}
.lvc{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.lvc .fld{min-width:170px;flex:1}
.vbox{position:relative;flex:1;min-height:220px;background:#000;border-radius:20px;overflow:hidden}
.vbox video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#vdg{margin:0;white-space:pre-wrap;font-size:12px;max-height:110px;overflow:auto;background:var(--surface-2);border-radius:14px;padding:10px 12px}
#vst{margin:0;font-size:13px;color:var(--mut)}
.confirm{display:flex;flex-direction:column;gap:14px}
.confirm .btns{display:flex;gap:10px}.confirm .btns .btn{flex:1}
@media (max-width:899px){
  .sumg{grid-template-columns:minmax(0,1fr)}
  .cgrid{grid-template-columns:minmax(0,1fr)}
  #addb span{display:none}#addb{width:48px;padding:0}
  #shLv .panel{inset:auto 0 0 0;top:0;border-radius:0;max-height:none}
  .lvc .fld{min-width:calc(50% - 8px)}
}
`;

const body = `
<div class="libw" id="libw" hidden></div>
<section class="sumg" aria-label="Ringkasan">
<div class="card gcard" id="gcard"><h2>Beban rekaman</h2><div id="gauge"></div><div class="gv num" id="gval">-</div><span class="cap" id="gcap">Bitrate per kamera muncul setelah perekam kejadian berjalan beberapa menit.</span>
<div class="gstats"><span>Puncak gabungan<b class="num" id="gpk">-</b></span><span>Perkiraan 7 hari<b class="num" id="gtb">-</b></span></div></div>
<div class="card"><h2>Kamera ONVIF</h2><div class="cnts" id="cnts"></div><p class="cap" style="margin:16px 0 0">Kamera dicoba tersambung otomatis dan dicoba lagi sendiri kalau putus. Password hanya disimpan di PC ini dan tidak pernah ditampilkan lagi. Port 100 Mbps nyaman sampai sekitar 70-80 Mbps beban gabungan.</p></div>
</section>
<div id="groups" aria-live="polite"></div>
<div class="empty" id="empty" hidden>Belum ada kamera. Ketuk "Tambah kamera" untuk memulai.</div>`;

const stepsHtml = '<ol class="steps" id="steps"><li><i></i>1 Cari</li><li><i></i>2 Akun</li><li><i></i>3 Tes</li><li><i></i>4 Nama</li></ol>';
const sheets = `
<div class="sheet" id="shCam" role="dialog" aria-modal="true" aria-labelledby="camT" style="--w:420px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><button class="ib flat" type="button" id="wBackTop" aria-label="Langkah sebelumnya" hidden>${I('back')}</button><h2 id="camT">Tambah kamera</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b">${stepsHtml}<div class="wz" id="wz"></div></div></div></div>
<div class="sheet" id="shTest" role="dialog" aria-modal="true" aria-labelledby="testT" style="--w:480px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="testT">Hasil tes</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b"><div id="testBody"></div></div></div></div>
<div class="sheet" id="shDel" role="dialog" aria-modal="true" aria-labelledby="delT" style="--w:420px"><div class="scrim" data-close></div><div class="panel" tabindex="-1" style="top:auto;bottom:16px;max-height:none"><div class="grab"></div>
<div class="sh-h"><h2 id="delT">Hapus kamera?</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b"><div class="confirm"><p id="delP" style="margin:0"></p><div class="btns"><button class="btn" type="button" data-close>Batal</button><button class="btn bad" type="button" id="delGo">${I('trash', 's')}Hapus</button></div></div></div></div></div>
<div class="sheet" id="shLv" role="dialog" aria-modal="true" aria-labelledby="vtitle"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="vtitle">Live</h2><button class="btn" type="button" id="vclose" data-close>Tutup</button></div>
<div class="sh-b"><div class="lvc">
<div class="fld"><label for="vm">Mode</label><select class="inp" id="vm"><option value="rt">Real-time (cepat)</option><option value="hls">Stabil (jeda beberapa detik)</option></select></div>
<div class="fld"><label for="vq">Kualitas</label><select class="inp" id="vq"><option value="auto">Otomatis (layar penuh = besar)</option><option value="sub">Selalu hemat (kecil)</option><option value="main">Selalu kualitas tinggi</option></select></div>
<button class="btn" type="button" id="vsnd">Suara: mati</button><button class="btn" type="button" id="vdiag">${I('tool', 's')}Diagnosa</button></div>
<p id="vst"></p><pre id="vdg" hidden></pre>
<div class="vbox"><video id="vv" muted autoplay playsinline controls></video></div></div></div></div>
<script src="/vendor/hls.min.js"></script>`;

function kameraApp() {
  var $ = function (i) { return document.getElementById(i); };
  var esc = DS.esc, icon = DS.icon;
  async function api(u, body) {
    var o = body === undefined ? { cache: 'no-store' } : { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    var r = await fetch(u, o); if (r.status === 401) { location.href = '/login'; throw 0; } return r.json();
  }
  function ago(ts) { if (!ts) return '-'; var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); if (s < 60) return s + ' detik lalu'; if (s < 3600) return Math.round(s / 60) + ' menit lalu'; if (s < 86400) return Math.round(s / 3600) + ' jam lalu'; return Math.round(s / 86400) + ' hari lalu'; }
  function mainProf(c) { var best = null; (c.profiles || []).forEach(function (p) { if (!best || (p.width || 0) * (p.height || 0) > (best.width || 0) * (best.height || 0)) best = p; }); return best; }
  function profTxt(p) { if (!p) return '-'; var t = []; if (p.codec) t.push(p.codec); if (p.width && p.height) t.push(p.width + 'x' + p.height); if (p.fps) t.push(p.fps + ' fps'); return t.join(' · ') || '-'; }
  function num(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ','); }
  function stPill(c) { return c.status === 'online' ? DS.pill('ok', 'Tersambung') : c.status === 'offline' ? DS.pill('off', 'Putus') : c.status === 'auth' ? DS.pill('bad', 'Login salah') : c.status === 'lib' ? DS.pill('bad', 'Pustaka belum ada') : DS.pill('warn', 'Memeriksa...'); }
  var CAMS = [], RATE = {}, lastSig = '';
  function act(a, id, ic, label, cls) { return '<button class="act ' + (cls || '') + '" type="button" data-a="' + a + '" data-id="' + esc(id) + '" aria-label="' + label + '"><span class="ib">' + icon(ic) + '</span>' + label + '</button>'; }
  function cardHtml(c) {
    var p = mainProf(c), inf = c.info || {}, dev = [inf.manufacturer, inf.model].filter(Boolean).join(' '), r = RATE[c.id], rt = (r && r.avgMbps != null) ? ' · <b>' + num(r.avgMbps, 2) + ' Mbps</b>' : '';
    var l3 = c.status === 'online' ? 'Terakhir tersambung <span data-ago="' + (c.lastOkAt || 0) + '"></span>' : esc(c.error || ('coba lagi ' + (c.retryInSec == null ? '' : c.retryInSec + ' dtk')));
    return '<article class="card kc" data-id="' + esc(c.id) + '"><button class="grip" type="button" data-grip="' + esc(c.id) + '" aria-label="Seret untuk pindah lantai" title="Seret ke lantai lain">' + icon('layers') + '</button>'
      + '<div class="kh"><b title="' + esc(c.name) + '">' + esc(c.name) + '</b></div><div>' + stPill(c) + '</div>'
      + '<div class="km">' + esc(c.host) + ':' + c.port + (dev ? ' · ' + esc(dev) : '') + '</div><div class="km">' + esc(profTxt(p)) + rt + '</div><div class="km">' + l3 + '</div>'
      + '<div class="ka">' + (c.status === 'online' ? act('live', c.id, 'eye', 'Lihat', 'pri') : '') + act('test', c.id, 'wifi', 'Tes') + act('edit', c.id, 'edit', 'Ubah') + act('del', c.id, 'trash', 'Hapus', 'dng') + '</div></article>';
  }
  function tickAgo() { var es = document.querySelectorAll('[data-ago]'); for (var i = 0; i < es.length; i++) es[i].textContent = ago(Number(es[i].getAttribute('data-ago'))); }
  function floorsOf() { var by = {}, order = []; CAMS.forEach(function (c) { var f = (c.floor || '').trim(); if (!by[f]) { by[f] = []; order.push(f); } by[f].push(c); }); order.sort(function (a, b) { return (a === '') - (b === '') || a.localeCompare(b, 'id', { numeric: true }); }); return { by: by, order: order }; }
  function render() {
    var F = floorsOf(), h = '';
    F.order.forEach(function (f) { h += '<section class="fgroup" data-floor="' + esc(f) + '" aria-label="' + esc(f || 'Belum diisi') + '"><div class="fgh">' + icon('layers', 's') + '<span>' + esc(f || 'Lantai belum diisi') + '</span><span class="n">' + F.by[f].length + ' kamera</span></div><div class="cgrid">' + F.by[f].map(cardHtml).join('') + '</div></section>'; });
    if (h !== lastSig) { lastSig = h; $('groups').innerHTML = h; }
    tickAgo(); $('empty').hidden = !!CAMS.length;
    var sum = 0, n = 0, peak = 0, on = 0, off = 0, auth = 0, wait = 0;
    CAMS.forEach(function (c) { if (c.status === 'online') on++; else if (c.status === 'auth') auth++; else if (c.status === 'offline') off++; else wait++; var r = RATE[c.id]; if (c.status === 'online' && r && r.avgMbps != null) { sum += r.avgMbps; peak += (r.peakMbps || r.avgMbps); n++; } });
    $('cnts').innerHTML = DS.pill('ok', 'Tersambung ' + on) + DS.pill('off', 'Putus ' + off) + (auth ? DS.pill('bad', 'Login salah ' + auth) : '') + (wait ? DS.pill('warn', 'Memeriksa ' + wait) : '') + '<span class="pill">' + CAMS.length + ' kamera</span>';
    $('gauge').innerHTML = DS.gauge(sum / 100, { size: 220, stroke: 18 });
    var g = $('gcard'); g.className = 'card gcard' + (sum >= 80 ? ' max' : sum >= 60 ? ' hot' : '');
    if (n) { $('gval').textContent = num(sum, 1) + ' Mbps'; $('gcap').textContent = 'dari ' + n + ' kamera yang direkam sekarang'; $('gpk').textContent = '±' + num(peak, 1) + ' Mbps'; $('gtb').textContent = num(sum * 1e6 / 8 * 86400 * 7 / 1e12, 2) + ' TB'; }
    else { $('gval').textContent = '-'; $('gcap').textContent = 'Bitrate per kamera muncul setelah perekam kejadian berjalan beberapa menit.'; $('gpk').textContent = '-'; $('gtb').textContent = '-'; }
  }
  setInterval(tickAgo, 5000);
  var P = DS.poll({ name: 'onvifcams', url: '/api/onvif/cameras', ms: 3000, cache: true, onData: function (d) {
    CAMS = d.cameras || []; RATE = {}; (d.recorder || []).forEach(function (x) { if (x.rate) RATE[x.id] = x.rate; });
    var w = $('libw'); if (!d.libOk) { w.hidden = false; w.textContent = d.libMessage; } else w.hidden = true; render();
  } });
  function camOf(id) { return CAMS.filter(function (x) { return x.id === id; })[0]; }
  // ---- hasil tes dengan kalimat biasa ----
  function whyFail(e) {
    var t = String(e || '').toLowerCase();
    if (/login|auth|password|sandi|unauthor|not authorized|401|403|credential/.test(t)) return { step: 1, text: 'Kamera terjangkau, tetapi username atau password ditolak. Periksa lagi username dan password ONVIF di pengaturan kamera.' };
    if (/timeout|timed out|unreachable|ehost|enet|refused|menjawab|no route|tidak terjangkau|tidak bisa/.test(t)) return { step: 0, text: 'Kamera tidak menjawab di alamat dan port ini. Periksa IP, port, kabel atau Wi-Fi kamera, dan pastikan ONVIF sudah aktif di kamera.' };
    return { step: 0, text: 'Kamera belum bisa dihubungi. Periksa IP, port, username, dan password.' };
  }
  function stepLi(state, label) { return '<li><span class="st ' + state + '">' + icon(state === 'ok' ? 'check' : state === 'no' ? 'x' : 'clock') + '</span>' + label + '</li>'; }
  function resHtml(r) {
    if (!r.ok) { var w = whyFail((r.error || '') + ' ' + (r.detail || '')), s0 = w.step === 0 ? 'no' : 'ok', s1 = w.step === 1 ? 'no' : (w.step === 0 ? '' : 'ok');
      return '<div class="wz"><p style="margin:0">' + DS.pill('bad', 'Gagal tersambung') + '</p><ul class="chk">' + stepLi(s0, 'Alamat kamera terjangkau') + stepLi(s1, 'Login ke kamera') + stepLi('', 'Membaca profil video') + '</ul>'
        + '<p style="margin:0"><b>' + esc(w.text) + '</b></p><p class="tech">Pesan dari kamera: ' + esc(r.error || '-') + (r.detail ? '<br>Detail teknis: ' + esc(r.detail) : '') + '</p></div>'; }
    var i = r.info || {}, d = [i.manufacturer, i.model, i.firmware ? ('fw ' + i.firmware) : ''].filter(Boolean).join(' · ');
    var h = '<div class="wz"><p style="margin:0">' + DS.pill('ok', 'Tersambung') + ' <span class="cap">(' + (r.ms || 0) + ' ms)</span></p>' + (d ? '<p class="cap" style="margin:0">' + esc(d) + '</p>' : '')
      + '<ul class="chk">' + stepLi('ok', 'Alamat kamera terjangkau') + stepLi('ok', 'Login ke kamera berhasil') + stepLi((r.profiles || []).length ? 'ok' : 'no', 'Profil video terbaca (' + (r.profiles || []).length + ')') + '</ul>';
    (r.profiles || []).forEach(function (p) { h += '<div class="prof"><b>' + esc(p.name) + '</b><span>' + esc(profTxt(p)) + '</span></div>'; });
    if ((r.profiles || []).some(function (p) { return /265|hevc/i.test(p.codec || ''); })) h += '<div class="libw">Kamera ini mengirim H.265. Browser biasanya tidak bisa memutarnya langsung, jadi live view nanti perlu pengolahan tambahan.</div>';
    h += '<details class="tech"><summary>Detail teknis (alamat stream RTSP)</summary>' + (r.profiles || []).map(function (p) { return '<div><b>' + esc(p.name) + '</b>: <code>' + esc(p.rtsp || 'tidak ada') + '</code></div>'; }).join('') + '</details></div>';
    return h;
  }
  // ---- wizard 4 langkah ----
  var W = { step: 0, mode: 'sweep', edit: null, host: '', port: '80', user: '', pass: '', name: '', floor: '', res: null, found: '' };
  var TYPES = { onvif: 'ONVIF (cocok!)', web: 'Halaman web (bukan ONVIF)', rtsp: 'RTSP (stream video)', lain: 'Terbuka, jenis tidak dikenal' };
  function floorsList() { var s = {}; CAMS.forEach(function (c) { if (c.floor) s[c.floor] = 1; }); return Object.keys(s); }
  function devRow(ip, port, sub, label) { return '<div class="dev"><div class="dn"><b>' + esc(ip) + '</b><span>' + esc(sub) + '</span></div><button class="btn pri" type="button" data-use-ip="' + esc(ip) + '" data-use-port="' + esc(port) + '">' + label + '</button></div>'; }
  function wizDraw() {
    var lis = $('steps').children; for (var i = 0; i < lis.length; i++) lis[i].className = i === W.step ? 'on' : i < W.step ? 'done' : '';
    $('camT').textContent = W.edit ? 'Ubah kamera' : 'Tambah kamera'; $('wBackTop').hidden = W.step === 0 || (W.edit && W.step === 1);
    var h = '';
    if (W.step === 0) {
      h = '<h3>Cari kamera</h3><div class="seg" id="wseg" role="group" aria-label="Cara mencari"><button type="button" data-v="sweep">Pindai jaringan</button><button type="button" data-v="disc">Cari otomatis</button><button type="button" data-v="manual">Isi IP manual</button></div><div id="wfind"></div>'
        + '<div class="wnav"><button class="btn pri" type="button" id="wNext"' + (W.host ? '' : ' disabled') + '>Lanjut</button></div>';
    } else if (W.step === 1) {
      h = '<h3>Akun kamera</h3><p class="fhelp">Kamera: <b>' + esc(W.host || '-') + '</b>. Isi akun ONVIF yang dibuat di pengaturan kamera.</p>'
        + '<div class="fld"><label for="wh">IP kamera</label><input class="inp" id="wh" inputmode="decimal" placeholder="192.168.18.51" value="' + esc(W.host) + '"></div>'
        + '<div class="fld"><label for="wp">Port ONVIF</label><input class="inp" id="wp" inputmode="numeric" value="' + esc(W.port) + '"></div>'
        + '<div class="fld"><label for="wu">Username ONVIF</label><input class="inp" id="wu" autocomplete="off" value="' + esc(W.user) + '"></div>'
        + '<div class="fld"><label for="wpw">Password ONVIF</label><div class="inw"><input class="inp" id="wpw" type="password" autocomplete="new-password" placeholder="' + (W.edit ? 'kosongkan jika tidak diganti' : '') + '" value="' + esc(W.pass) + '"><button class="ib" type="button" id="weye" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>'
        + '<div class="wnav"><button class="btn" type="button" id="wBack">' + (W.edit ? 'Batal ubah' : 'Kembali') + '</button><button class="btn pri" type="button" id="wNext">Lanjut</button></div>';
    } else if (W.step === 2) {
      h = '<h3>Tes koneksi</h3><p class="fhelp">Mencoba tersambung ke ' + esc(W.host) + ':' + esc(W.port) + ' dengan akun tadi.</p><div id="wres">' + (W.res ? resHtml(W.res) : '') + '</div>'
        + '<button class="btn" type="button" id="wTest">' + icon('wifi', 's') + (W.res ? 'Tes lagi' : 'Tes koneksi') + '</button>'
        + '<div class="wnav"><button class="btn" type="button" id="wBack">Kembali</button><button class="btn pri" type="button" id="wNext">Lanjut</button></div>';
    } else {
      h = '<h3>Nama dan lantai</h3><div class="fld"><label for="wn">Nama kamera</label><input class="inp" id="wn" maxlength="60" placeholder="mis. Kamar Jakarta 1 (Anak baru)" value="' + esc(W.name) + '"></div>'
        + '<div class="fld"><label for="wf">Lantai (opsional)</label><input class="inp" id="wf" maxlength="30" list="floorsDl" placeholder="mis. Lantai 2" value="' + esc(W.floor) + '"><datalist id="floorsDl">' + floorsList().map(function (f) { return '<option value="' + esc(f) + '">'; }).join('') + '</datalist></div>'
        + '<button class="btn full" type="button" id="wPrev">' + icon('eye', 's') + 'Lihat kamera dulu (gambar kecil)</button><p class="fhelp">Supaya yakin ini kamera di ruangan yang benar sebelum diberi nama. Kamera disimpan dulu, namanya bisa diubah di sini.</p><p class="fmsg" id="wmsg" role="status"></p><div class="wnav"><button class="btn" type="button" id="wBack">Kembali</button><button class="btn pri" type="button" id="wSave">' + icon('check', 's') + 'Simpan</button></div>';
    }
    $('wz').innerHTML = h;
    if (W.step === 0) { var sg = DS.seg($('wseg'), W.mode, function (v) { W.mode = v; findDraw(); }); findDraw(); }
  }
  function findDraw() {
    var h = '';
    if (W.mode === 'sweep') h = '<div class="radar" id="radar">' + icon('radar') + '</div><p class="fhelp" style="text-align:center">Mengetuk semua alamat di jaringan satu per satu (sekitar 10-30 detik). Biasanya lebih lengkap daripada Cari otomatis.</p><button class="btn pri full" type="button" id="wGo">Mulai pindai</button>';
    else if (W.mode === 'disc') h = '<div class="radar" id="radar">' + icon('radar') + '</div><p class="fhelp" style="text-align:center">Menunggu kamera ONVIF menjawab di jaringan (5 detik).</p><button class="btn pri full" type="button" id="wGo">Cari kamera</button>';
    else h = '<div class="fld"><label for="wm">IP kamera</label><input class="inp" id="wm" inputmode="decimal" placeholder="192.168.18.51" value="' + esc(W.host) + '"></div><p class="fhelp">Tidak tahu port ONVIF-nya? Cek port IP ini untuk melihat port yang terbuka.</p><button class="btn full" type="button" id="wGo">Cek port IP ini</button>';
    h += '<div id="wout" style="display:flex;flex-direction:column;gap:10px;margin-top:12px">' + (W.found || '') + '</div>';
    $('wfind').innerHTML = h;
  }
  function useDev(ip, port) { W.host = ip; W.port = String(port || 80); W.found = ''; W.step = 1; wizDraw(); DS.toast('IP dan port terisi. Isi username dan password.'); }
  async function wizGo() {
    var b = $('wGo'), rad = $('radar'), out = $('wout'); b.className = 'btn pri full busy'; if (rad) rad.className = 'radar on'; out.innerHTML = '';
    var html = '';
    try {
      if (W.mode === 'sweep') {
        var r = await api('/api/onvif/sweep', {});
        if (!r.ok) html = '<p class="fmsg bad">Gagal. ' + esc(r.error || '') + '</p>';
        else { html = '<p style="margin:0"><b>Dipindai ' + r.scanned + ' alamat dalam ' + Math.round((r.ms || 0) / 1000) + ' detik.</b> ' + r.alive + ' perangkat menjawab, ' + r.devices.length + ' di antaranya ONVIF.</p>';
          r.devices.forEach(function (d) { html += devRow(d.ip, d.ports[0], 'Port ONVIF ' + d.ports.join(', ') + ' · ' + (d.registered ? 'sudah terdaftar' : 'belum terdaftar'), 'Pakai'); });
          html += '<p class="fhelp">Perangkat yang menjawab tapi bukan ONVIF: ' + r.others + ' (router, HP, komputer, dll). Kamera yang mati, atau yang memblokir semua port umum, tidak akan terlihat.</p>'; }
      } else if (W.mode === 'disc') {
        var r2 = await api('/api/onvif/discover', {});
        if (!r2.ok) html = '<p class="fmsg bad">Gagal. ' + esc(r2.error || '') + '</p>';
        else if (!r2.devices.length) html = '<p style="margin:0"><b>Tidak ada kamera yang menjawab.</b> ONVIF di kamera mungkin belum aktif, atau jaringan memblokir pencarian. Coba Pindai jaringan atau Isi IP manual.</p>';
        else { html = '<p style="margin:0"><b>Ditemukan ' + r2.devices.length + ' perangkat ONVIF.</b></p>'; r2.devices.forEach(function (d) { html += devRow(d.ip, (d.ports || [])[0] || 80, 'Port ' + ((d.ports || []).join(', ') || '-') + ' · ' + ([d.name, d.hardware].filter(Boolean).join(' / ') || '-'), 'Pakai'); }); }
      } else {
        var host = ($('wm').value || '').trim(); W.host = host; if (!host) { html = '<p class="fmsg bad">Isi dulu kolom IP kamera.</p>'; }
        else { var r3 = await api('/api/onvif/scan', { host: host });
          if (!r3.ok) html = '<p class="fmsg bad">Gagal. ' + esc(r3.error || '') + '</p>';
          else if (!r3.open.length) html = '<p style="margin:0"><b>Tidak ada port umum yang terbuka di ' + esc(r3.host) + '</b> (diperiksa ' + r3.scanned + ' port). Kamera mungkin mati, IP salah, atau ONVIF belum diaktifkan di kamera.</p>';
          else { html = '<p style="margin:0"><b>Port terbuka di ' + esc(r3.host) + '</b></p>'; var has = false; r3.open.forEach(function (o) { if (o.type === 'onvif') has = true; html += '<div class="dev"><div class="dn"><b>Port ' + o.port + '</b><span>' + esc(TYPES[o.type] || o.type) + '</span></div>' + (o.type === 'onvif' ? '<button class="btn pri" type="button" data-use-ip="' + esc(r3.host) + '" data-use-port="' + o.port + '">Pakai port ini</button>' : '') + '</div>'; });
            if (!has) html += '<p class="fhelp">Tidak ada port yang menjawab sebagai ONVIF. Kemungkinan ONVIF belum aktif di kamera, atau memakai port di luar daftar umum.</p>'; } }
      }
    } catch (e) { html = '<p class="fmsg bad">Gagal. Koneksi terputus.</p>'; }
    W.found = html; if ($('wout')) $('wout').innerHTML = html; if ($('wGo')) $('wGo').className = 'btn pri full'; if ($('radar')) $('radar').className = 'radar';
    if (W.mode === 'manual' && $('wGo')) $('wGo').className = 'btn full';
    var nx = $('wNext'); if (nx) nx.disabled = !W.host;
  }
  function readStep() {
    if (W.step === 0 && W.mode === 'manual' && $('wm')) { W.host = $('wm').value.trim(); }
    if (W.step === 1) { W.host = $('wh').value.trim(); W.port = $('wp').value.trim(); W.user = $('wu').value; W.pass = $('wpw').value; }
    if (W.step === 3) { W.name = $('wn').value; W.floor = $('wf').value; }
  }
  function vals() { return { id: W.edit || undefined, name: W.name, floor: W.floor, host: W.host, port: W.port, username: W.user, password: W.pass }; }
  $('wz').addEventListener('click', async function (e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.hasAttribute('data-use-ip')) { useDev(t.getAttribute('data-use-ip'), t.getAttribute('data-use-port')); return; }
    if (t.id === 'wGo') { wizGo(); return; }
    if (t.id === 'weye') { var i = $('wpw'); i.type = i.type === 'password' ? 'text' : 'password'; t.innerHTML = icon(i.type === 'password' ? 'eye' : 'eyeoff'); t.setAttribute('aria-label', i.type === 'password' ? 'Tampilkan password' : 'Sembunyikan password'); return; }
    if (t.id === 'wNext') { readStep(); if (W.step === 1 && !W.host) { DS.toast('Isi IP kamera dulu.', { bad: true }); return; } W.step++; if (W.step === 3 && !W.name && W.edit) { var cc = camOf(W.edit); W.name = cc ? cc.name : W.name; } wizDraw(); return; }
    if (t.id === 'wBack') { readStep(); if (W.edit && W.step === 1) { DS.closeSheet('shCam'); return; } W.step = Math.max(0, W.step - 1); wizDraw(); return; }
    if (t.id === 'wTest') { readStep(); t.className = 'btn busy'; try { W.res = await api('/api/onvif/test', vals()); } catch (er) { W.res = { ok: false, error: 'Koneksi ke PC pemantauan terputus.' }; } wizDraw(); P.now(); return; }
    if (t.id === 'wPrev') { readStep(); var nm = W.name.trim() || ('Kamera ' + W.host); t.className = 'btn full busy'; $('wmsg').className = 'fmsg'; $('wmsg').textContent = 'Menyimpan dan menyambungkan kamera...';
      try {
        var sv = await api('/api/onvif/save', { id: W.edit || undefined, name: nm, floor: W.floor, host: W.host, port: W.port, username: W.user, password: W.pass });
        if (!sv.ok) { t.className = 'btn full'; $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = sv.error || 'Gagal menyimpan'; return; }
        W.edit = sv.camera.id; var okc = false;
        for (var k = 0; k < 12 && !okc; k++) { var d = await api('/api/onvif/cameras'); var cc = (d.cameras || []).filter(function (x) { return x.id === W.edit; })[0]; if (cc && cc.status === 'online') okc = true; else if (cc && cc.status === 'auth') break; else await new Promise(function (r) { setTimeout(r, 1000); }); }
        t.className = 'btn full';
        if (!okc) { $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = 'Kamera belum tersambung. Kembali ke langkah Tes untuk memeriksa IP, port, dan akun.'; P.now(); return; }
        $('wmsg').textContent = ''; $('vq').value = 'sub'; P.now(); lvOpen(W.edit, nm);
      } catch (er) { t.className = 'btn full'; $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = 'Gagal (koneksi terputus?).'; }
      return; }
    if (t.id === 'wSave') { readStep(); if (!W.name.trim()) { $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = 'Isi nama kamera dulu.'; return; }
      t.className = 'btn pri busy'; $('wmsg').className = 'fmsg'; $('wmsg').textContent = 'Menyimpan...';
      try { var r = await api('/api/onvif/save', vals()); if (r.ok) { DS.closeSheet('shCam'); DS.toast('Tersimpan. Kamera dicoba tersambung otomatis.'); P.now(); } else { t.className = 'btn pri'; $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = r.error || 'Gagal menyimpan'; } }
      catch (er) { t.className = 'btn pri'; $('wmsg').className = 'fmsg bad'; $('wmsg').textContent = 'Gagal menyimpan (koneksi terputus?).'; } }
  });
  $('wz').addEventListener('input', function (e) { if (e.target.id === 'wm') { W.host = e.target.value.trim(); var nx = $('wNext'); if (nx) nx.disabled = !W.host; } });
  $('wBackTop').onclick = function () { readStep(); W.step = Math.max(0, W.step - 1); wizDraw(); };
  function openWiz(c) {
    W = { step: c ? 1 : 0, mode: 'sweep', edit: c ? c.id : null, host: c ? c.host : '', port: c ? String(c.port) : '80', user: c ? c.username : '', pass: '', name: c ? c.name : '', floor: c ? (c.floor || '') : '', res: null, found: '' };
    wizDraw(); DS.openSheet('shCam');
  }
  $('addb').onclick = function () { openWiz(null); };
  // ---- aksi kartu ----
  var delId = null;
  $('groups').addEventListener('click', async function (e) {
    var t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return; var a = t.getAttribute('data-a'), id = t.getAttribute('data-id'), c = camOf(id); if (!c) return;
    if (a === 'live') { $('vtitle').textContent = 'Live: ' + c.name; lvOpen(id, c.name); return; }
    if (a === 'edit') { openWiz(c); return; }
    if (a === 'del') { delId = id; $('delP').textContent = 'Hapus kamera "' + c.name + '" dari daftar?'; DS.openSheet('shDel'); return; }
    if (a === 'test') { t.disabled = true; var r2; try { r2 = await api('/api/onvif/test', { id: id }); } catch (er) { r2 = { ok: false, error: 'Koneksi ke PC pemantauan terputus.' }; } t.disabled = false;
      $('testT').textContent = 'Hasil tes: ' + c.name; $('testBody').innerHTML = resHtml(r2); DS.openSheet('shTest'); P.now(); }
  });
  $('delGo').onclick = async function () { var b = this; b.className = 'btn bad busy'; try { var r = await api('/api/onvif/delete', { id: delId }); b.className = 'btn bad'; DS.closeSheet('shDel'); if (r.ok) DS.toast('Kamera dihapus.'); else DS.toast(r.error || 'Gagal menghapus', { bad: true }); P.now(); } catch (e) { b.className = 'btn bad'; DS.toast('Gagal menghapus (koneksi terputus?).', { bad: true }); } };
  // ---- seret kartu ke lantai lain (memakai /api/onvif/save yang sudah ada; password dikosongkan = tidak berubah) ----
  var drag = null;
  $('groups').addEventListener('pointerdown', function (e) {
    var g = e.target.closest ? e.target.closest('[data-grip]') : null; if (!g || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault();
    var card = g.closest('.kc'), id = g.getAttribute('data-grip'), c = camOf(id); if (!c) return;
    drag = { id: id, c: c, card: card, x0: e.clientX, y0: e.clientY, on: false, ghost: null, target: null, pid: e.pointerId };
    try { g.setPointerCapture(e.pointerId); } catch (er) {}
  });
  function dragMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.on) { if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 8) return; drag.on = true; var r = drag.card.getBoundingClientRect(); var gh = drag.card.cloneNode(true); gh.className += ' ghost'; gh.style.width = r.width + 'px'; gh.style.left = r.left + 'px'; gh.style.top = r.top + 'px'; document.body.appendChild(gh); drag.ghost = gh; drag.ox = e.clientX - r.left; drag.oy = e.clientY - r.top; drag.card.className += ' dragging'; }
    drag.ghost.style.left = (e.clientX - drag.ox) + 'px'; drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
    var el = document.elementFromPoint(e.clientX, e.clientY), sec = el && el.closest ? el.closest('.fgroup') : null;
    var all = document.querySelectorAll('.fgroup'); for (var i = 0; i < all.length; i++) all[i].className = 'fgroup' + (all[i] === sec ? ' over' : '');
    drag.target = sec;
  }
  function dragEnd(e) {
    if (!drag || (e && e.pointerId !== drag.pid)) return; var d = drag; drag = null;
    var all = document.querySelectorAll('.fgroup'); for (var i = 0; i < all.length; i++) all[i].className = 'fgroup';
    if (d.ghost) { document.body.removeChild(d.ghost); d.card.className = d.card.className.replace(' dragging', ''); }
    if (!d.on || !d.target || e.type === 'pointercancel') return;
    var nf = d.target.getAttribute('data-floor'); if (nf === (d.c.floor || '').trim()) return;
    api('/api/onvif/save', { id: d.id, name: d.c.name, floor: nf, host: d.c.host, port: String(d.c.port), username: d.c.username, password: '' }).then(function (r) {
      if (r.ok) { DS.toast(d.c.name + ' dipindah ke ' + (nf || 'tanpa lantai')); P.now(); } else DS.toast(r.error || 'Gagal memindah', { bad: true });
    }).catch(function () { DS.toast('Gagal memindah (koneksi terputus?).', { bad: true }); });
  }
  document.addEventListener('pointermove', dragMove); document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd);
  // ---- live view (logika pemutar dipertahankan dari versi lama) ----
// ----- mode real-time: fMP4 mengalir lewat HTTP ke MediaSource -----
var RT={abort:null,sb:null,q:[],lagTimer:null,tok:0,tries:0,info:'',bytes:0,hist:[],stalls:0,audio:false,wantAudio:false,noAudioCam:false};
function curQ(){var q=$('vq').value;if(q==='auto')return document.fullscreenElement?'main':'sub';return q}
function hasAudio(b){for(var i=0;i<b.length-4;i++){if(b[i]===0x6d&&b[i+1]===0x70&&b[i+2]===0x34&&b[i+3]===0x61)return true}return false}
function snd(){return $('vm').value==='hls'?!$('vv').muted:RT.wantAudio}
function sndUi(){var b=$('vsnd');b.disabled=!!RT.noAudioCam;b.textContent=RT.noAudioCam?'Kamera tanpa suara':('Suara: '+(snd()?'hidup':'mati'))}
function hx(n){return (n<16?'0':'')+n.toString(16)}
function cat(a,b){var c=new Uint8Array(a.length+b.length);c.set(a,0);c.set(b,a.length);return c}
function u32(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0}
function typ(b,o){return String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3])}
function initEnd(b){var o=0;while(o+8<=b.length){var sz=u32(b,o);if(sz<8)return -1;if(typ(b,o+4)==='moov'){return o+sz<=b.length?o+sz:-1}o+=sz;if(o>b.length)return -1}return -1}
function avcCodec(b){for(var i=4;i<b.length-9;i++){if(b[i]===0x61&&b[i+1]===0x76&&b[i+2]===0x63&&b[i+3]===0x43){return 'avc1.'+hx(b[i+5])+hx(b[i+6])+hx(b[i+7])}}return null}
function rtStop(){RT.tok++;if(RT.abort){try{RT.abort.abort()}catch(e){}RT.abort=null}if(RT.lagTimer){clearInterval(RT.lagTimer);RT.lagTimer=null}RT.q=[];RT.sb=null;
  var v=$('vv');try{if(v.src){v.pause();var u=v.src;v.removeAttribute('src');v.load();if(u.indexOf('blob:')===0)URL.revokeObjectURL(u)}}catch(e){}}
function rtPump(){var sb=RT.sb;if(!sb||sb.updating||!RT.q.length)return;
  try{sb.appendBuffer(RT.q.shift())}catch(e){if(e&&e.name==='QuotaExceededError'){rtTrim(true)}else{throw e}}}
function rtTrim(force){var sb=RT.sb,v=$('vv');if(!sb||sb.updating||!sb.buffered.length)return;var st=sb.buffered.start(0);
  if(force||v.currentTime-st>6){try{sb.remove(st,Math.max(st,v.currentTime-2))}catch(e){}}}
function rtStart(tok){
  api('/api/onvif/live/stop',{id:LV.id}).catch(function(){}); // pastikan siaran mode Stabil tidak ikut jalan
  var ctrl=new AbortController();RT.abort=ctrl;var myTok=RT.tok;
  var q=curQ();var v=$('vv');v.muted=!RT.wantAudio;RT.t0=Date.now();RT.bytes=0;RT.hist=[];RT.stalls=0;
  (async function(){
    var r=await fetch('/onvif-live/'+LV.id+'/rt.mp4?a='+(RT.wantAudio?'1':'0')+'&q='+encodeURIComponent(q),{signal:ctrl.signal,cache:'no-store'});
    if(r.status===401){location.href='/login';return}
    if(!r.ok){var t=await r.text();throw new Error(t||('HTTP '+r.status))}
    var rd=r.body.getReader(),head=new Uint8Array(0),ready=false;
    for(;;){
      var x=await rd.read();if(x.done)break;if(myTok!==RT.tok||tok!==LV.tok)return;
      if(!ready){head=cat(head,x.value);var e=initEnd(head);if(e<0)continue;
        var codec=avcCodec(head.subarray(0,e));RT.audio=hasAudio(head.subarray(0,e));if(RT.wantAudio&&!RT.audio){RT.noAudioCam=true;RT.wantAudio=false;v.muted=true}RT.codec=codec;var mime='video/mp4; codecs="'+(codec||'avc1.42E01E')+(RT.audio?',mp4a.40.2':'')+'"';
        var MS=window.MediaSource||window.ManagedMediaSource;if(!MS||!MS.isTypeSupported(mime))throw new Error('Browser ini tidak mendukung mode real-time. Pakai mode Stabil.');
        var ms=new MS();if(!window.MediaSource)v.disableRemotePlayback=true;v.src=URL.createObjectURL(ms);
        await new Promise(function(res){ms.addEventListener('sourceopen',res,{once:true})});
        if(myTok!==RT.tok)return;
        var sb=ms.addSourceBuffer(mime);sb.mode='sequence';RT.sb=sb;
        sb.addEventListener('updateend',function(){rtPump();rtTrim(false)});
        sndUi();RT.q.push(head.subarray(0,e));if(head.length>e)RT.q.push(head.subarray(e));head=null;ready=true;RT.tries=0;rtPump();
        v.play().catch(function(){});
        RT.lagTimer=setInterval(function(){var vb=v.buffered;if(!vb.length)return;var end=vb.end(vb.length-1),lag=end-v.currentTime;
          if(v.paused&&!document.hidden)v.play().catch(function(){});
          if(lag>1.5){v.currentTime=end-0.3}else if(lag>0.8){v.playbackRate=1.1}else{v.playbackRate=1}
          var now=Date.now();RT.hist.push([now,RT.bytes]);while(RT.hist.length>1&&now-RT.hist[0][0]>5000)RT.hist.shift();var h0=RT.hist[0],mb=RT.hist.length>1?((RT.bytes-h0[1])*8/1e6)/((now-h0[0])/1000):0;
          lvSay('Live real-time: '+(LV.name||'')+' · '+(q==='main'?'kualitas tinggi':'hemat')+' · '+mb.toFixed(2)+' Mbps masuk · tersendat '+RT.stalls+'x · buffer '+Math.round(lag*1000)+' ms · '+(RT.audio?'suara hidup':'tanpa suara'))},500);
        continue}
      RT.bytes+=x.value.length;RT.q.push(x.value);if(RT.q.length>150)throw new Error('Pemutar tertinggal terlalu jauh');rtPump();
    }
    throw new Error('Siaran berakhir');
  })().catch(function(e){
    if(myTok!==RT.tok||tok!==LV.tok||(e&&e.name==='AbortError'))return;
    var life=Date.now()-(RT.t0||0);RT.quick=(life<4000)?(RT.quick||0)+1:0;var ve=$('vv').error;RT.tries++;var wait=Math.min(1500*RT.tries,10000);
    var em=String(e&&e.message?e.message:'galat').split(String.fromCharCode(10)).filter(function(x){return x.trim()}).pop()||'galat';if(em.length>90)em=em.slice(0,90)+'...';
    if(/Kamera tidak ditemukan/.test(em)){LV.id=null;rtStop();lvSay('Kamera ini sudah dihapus. Tutup panel ini.',true);return}
    var dg=' [codec '+(RT.codec||'?')+(ve?', video error '+ve.code+(ve.message?': '+ve.message:''):'')+']';
    if(RT.quick>=3){RT.quick=0;rtStop();$('vm').value='hls';lvStart();lvSay('Mode real-time gagal berulang untuk kamera ini'+dg+'. Otomatis pindah ke mode Stabil.',true);return}
    lvSay('Terputus: '+em+dg+'. Mencoba lagi '+Math.round(wait/1000)+' dtk...',true);
    rtStop();var t=LV.tok;setTimeout(function(){if(LV.id&&t===LV.tok){lvStart()}},wait)});
}
// ----- live view satu kamera -----
var LV={id:null,name:'',hls:null,tok:0,lastT:-1,stuck:0,timer:null};
function lvSay(t,bad){var e=$('vst');e.textContent=t;e.style.color=bad?'#d33a2c':''}
function lvDestroy(){rtStop();if(LV.hls){try{LV.hls.destroy()}catch(e){}LV.hls=null}var v=$('vv');try{v.pause();v.removeAttribute('src');v.load()}catch(e){}}
async function lvStart(){
  var tok=++LV.tok;lvDestroy();LV.lastT=-1;LV.stuck=0;lvSay('Menyambung ke kamera...');
  if($('vm').value==='rt'){rtStart(tok);return}
  var r;try{r=await api('/api/onvif/live/start',{id:LV.id,quality:curQ()})}catch(e){return}
  if(tok!==LV.tok)return;
  if(!r.ok){lvSay('Gagal: '+(r.error||'tidak diketahui'),true);if(/tidak ditemukan/i.test(r.error||'')){LV.id=null}return}
  var v=$('vv'),src=r.url;
  if(!DS.ios&&window.Hls&&Hls.isSupported()){
    var h=new Hls({liveSyncDuration:5,liveMaxLatencyDuration:15,maxBufferLength:20,lowLatencyMode:false,manifestLoadingMaxRetry:6,levelLoadingMaxRetry:6,fragLoadingMaxRetry:6});
    LV.hls=h;h.loadSource(src);h.attachMedia(v);
    h.on(Hls.Events.ERROR,function(e,d){if(!d.fatal)return;
      if(d.type===Hls.ErrorTypes.NETWORK_ERROR){lvSay('Jaringan/kamera terputus, mencoba lagi...',true);h.startLoad()}
      else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){h.recoverMediaError()}
      else{lvSay('Pemutar berhenti, memulai ulang...',true);setTimeout(function(){if(tok===LV.tok)lvStart()},2000)}});
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src}
  else{lvSay('Browser ini tidak bisa memutar siaran.',true);return}
  v.play().catch(function(){});
  sndUi();lvSay('Live: '+(r.profile||'')+' '+(r.info||'')+' (tertunda beberapa detik dari aslinya)')}
function lvOpen(id,name){LV.id=id;LV.name=name;RT.wantAudio=false;RT.noAudioCam=false;$('vv').muted=true;sndUi();$('vtitle').textContent='Live: '+name;DS.openSheet('shLv',{onClose:lvClose});lvStart();
  if(!LV.timer)LV.timer=setInterval(function(){ // pemulih: video diam terlalu lama -> mulai ulang
    if(!LV.id)return;var v=$('vv');if(v.paused&&!v.ended){v.play().catch(function(){})}
    if(Math.abs(v.currentTime-LV.lastT)<0.01){LV.stuck++;if(LV.stuck>=4){LV.stuck=0;lvStart()}}else{LV.stuck=0;LV.lastT=v.currentTime}},4000)}
function lvClose(){var id=LV.id;LV.id=null;LV.tok++;lvDestroy();if(id){api('/api/onvif/live/stop',{id:id}).catch(function(){})}}
  $('vclose').addEventListener('click', function () {});
  $('vdiag').onclick = async function () { if (!LV.id) return; var d = $('vdg'), b = this; d.hidden = false; d.textContent = 'Membaca stream kamera (sekitar 5 detik)...'; b.disabled = true;
    try { var r = await api('/api/onvif/diag', { id: LV.id, quality: curQ() }); var nl = String.fromCharCode(10); d.textContent = r.ok ? ('Profil: ' + r.profile + nl + r.lines.join(nl)) : ('Gagal: ' + r.error); } catch (e) { d.textContent = 'Gagal menjalankan diagnosa'; }
    b.disabled = false; };
  $('vq').onchange = function () { if (LV.id) lvStart(); };
  $('vsnd').onclick = function () { var v = $('vv');
    if ($('vm').value === 'hls') { v.muted = !v.muted; sndUi(); return; }
    RT.wantAudio = !RT.wantAudio; v.muted = !RT.wantAudio; sndUi(); if (LV.id) lvStart(); };
  $('vv').addEventListener('waiting', function () { if (LV.id && RT.lagTimer && $('vv').currentTime > 1) RT.stalls++; });
  $('vv').addEventListener('volumechange', function () { sndUi(); });
  document.addEventListener('fullscreenchange', function () { if (LV.id && $('vq').value === 'auto') { lvStart(); } });
  $('vm').onchange = function () { if (LV.id) lvStart(); };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && LV.id) { $('vv').play().catch(function () {}); } });
  window.addEventListener('pagehide', function () { if (LV.id) { try { navigator.sendBeacon('/api/onvif/live/stop', new Blob([JSON.stringify({ id: LV.id })], { type: 'application/json' })); } catch (e) {} } });
  if (DS.ios) $('vm').value = 'hls';
  DS.pullRefresh(function () { P.now(); return new Promise(function (r) { setTimeout(r, 800); }); });
  DS.initShell({});
  render();
}

module.exports = () => ds.page({
  title: 'Kamera', cur: 'cam', h1: 'Kamera', sub: 'Kamera ONVIF dan live view',
  actions: `<button class="btn pri" type="button" id="addb">${I('plus', 's')}<span>Tambah kamera</span></button>`,
  css, body, sheets, script: '(' + kameraApp.toString() + ')();',
});
