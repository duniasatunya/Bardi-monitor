// Kerangka tampilan bersama untuk halaman Laporan, ONVIF, Rekaman kejadian, dan Papan klip.
// Tujuan: tiap halaman muat satu layar (tanpa gulir panjang), daftar jadi kartu/baris rapat dengan penggeser halaman,
// tombol menu tertata. Halaman Multiview tidak memakai berkas ini.
// Catatan: skrip browser di bawah ditulis sebagai fungsi biasa lalu diubah jadi teks (toString), jadi tidak ada masalah backtick/backslash.
'use strict';

const LINKS = [
  ['report', '/displaycostum.html', 'Laporan'],
  ['onvif', '/onvif', 'Kamera ONVIF'],
  ['mv', '/multiview', 'Multiview'],
  ['kj', '/kejadian', 'Rekaman kejadian'],
  ['klip', '/klip', 'Papan klip'],
];

const css = `
html,body{height:100%}
body{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden;font-size:14px;-webkit-text-size-adjust:100%}
@media (max-height:380px){body{height:auto;overflow:auto}}
.top{flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--card);border-bottom:1px solid var(--bd);position:relative;z-index:30}
.top h1{font-size:16px;margin:0;white-space:nowrap}
.top .sp{flex:1}
.top .sub{color:var(--mut);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.nav{display:flex;gap:4px;margin-left:8px}
.btn,.top a.btn,.top summary.btn{font:inherit;font-size:13px;line-height:1.2;padding:6px 11px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;list-style:none}
summary.btn::-webkit-details-marker{display:none}
.btn:disabled{opacity:.5;cursor:default}
.btn.pri,.pri-b{background:var(--pri);border-color:var(--pri);color:#fff}
.btn.danger,.danger{color:#b42318;border-color:#b42318}
.btn.cur{background:rgba(232,89,12,.12);border-color:var(--pri);color:var(--pri);font-weight:600}
.btn.sm{padding:3px 8px;font-size:12px;border-radius:7px}
details.menu{position:relative}
details.menu .pop{position:absolute;right:0;top:calc(100% + 6px);background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:210px;box-shadow:0 8px 28px rgba(0,0,0,.22);z-index:40}
details.menu .pop .btn{justify-content:flex-start}
.navm{display:none;flex-direction:column;gap:6px;padding-bottom:6px;border-bottom:1px solid var(--bd)}
.shell{flex:1;min-height:0;display:grid;gap:10px;padding:10px 12px;padding-bottom:max(10px,env(safe-area-inset-bottom))}
.panel{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px 12px}
.ph{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.ph h2{font-size:14px;margin:0;flex:1;min-width:90px}
.pbody{flex:1;min-height:0;position:relative;overflow:hidden}
.pbody.scroll{overflow:auto}
.pg{flex:none;display:none;align-items:center;justify-content:center;gap:10px;padding-top:6px;font-size:12px;color:var(--mut)}
.pg button{font:inherit;font-size:13px;padding:3px 12px;border-radius:7px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer}
.pg button:disabled{opacity:.4;cursor:default}
.tiles{display:grid;gap:var(--g,8px);grid-template-columns:repeat(var(--cols,1),minmax(0,1fr));align-content:start}
.tile{height:var(--th,64px);border:1px solid var(--bd);border-radius:10px;padding:6px 9px;overflow:hidden;display:flex;flex-direction:column;gap:3px;background:var(--bg);min-width:0}
.tile .tn{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .tm{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tile .ta{display:flex;gap:5px;margin-top:auto}
.mut,.small{color:var(--mut);font-size:12px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
table.t{width:100%;border-collapse:collapse;font-size:13px}
table.t.fx{table-layout:fixed}
.t th,.t td{padding:0 8px;height:var(--rh,32px);border-bottom:1px solid var(--bd);text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}
.t th{color:var(--mut);font-weight:600;height:30px}
.t tr.clk{cursor:pointer}.t tr.clk:hover td{background:rgba(232,89,12,.08)}
.b{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:600;color:#fff;background:var(--mut)}
.b.PLAY,.b.on{background:var(--ok)}.b.ERROR,.b.OFFLINE,.b.off{background:var(--bad)}.b.CONNECTING,.b.FROZEN,.b.ACTED,.b.wait{background:var(--warn)}.b.INIT,.b.HIDE,.b.idle{background:var(--mut)}
.seg{display:inline-flex;border:1px solid var(--bd);border-radius:8px;overflow:hidden}
.seg button{border:0;border-radius:0;font:inherit;font-size:12px;padding:5px 10px;background:var(--card);color:var(--tx);cursor:pointer}
.seg button.on{background:var(--pri);color:#fff}
input,select,textarea{font:inherit;font-size:14px;padding:6px 9px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);min-width:0}
select{background:var(--card)}
label{display:block;font-size:11px;color:var(--mut);margin-bottom:2px}
.tabs{display:none;flex:none;gap:6px;padding:8px 12px 0}
.tabs button{flex:1;font:inherit;font-size:13px;padding:7px 6px;border-radius:9px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer}
.tabs button.on{background:var(--pri);border-color:var(--pri);color:#fff;font-weight:600}
.modal{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:60;padding:10px}
.modal.show{display:flex}
.modal .box{background:var(--card);border:1px solid var(--bd);border-radius:12px;max-width:1100px;width:100%;max-height:100%;display:flex;flex-direction:column;padding:12px;min-height:0;overflow:hidden}
.modal .box.full{height:100%}
.modal .box .mb{flex:1;min-height:0;overflow:auto}
.warnbox{background:#fff4e5;color:#7a4b00;border:1px solid #f0c27a;border-radius:8px;padding:6px 10px;margin:0 0 8px;font-size:12px}
.res{margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--bd);font-size:13px}.res.ok{border-color:var(--ok)}.res.bad{border-color:var(--bad)}
.kpi{display:flex;gap:6px;flex-wrap:wrap}
.kpi span{font-size:12px;padding:2px 9px;border-radius:99px;border:1px solid var(--bd);background:var(--bg);white-space:nowrap}
.kpi b{font-size:13px}
code{font-family:ui-monospace,Consolas,monospace;font-size:12px}
@media (max-width:820px){
  .nav{display:none}.navm{display:flex}
  .top{padding:6px 10px}.top h1{font-size:15px}.top .sub{display:none}
  .shell{padding:6px 8px;gap:6px;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important}
  .shell>.panel{display:none;padding:8px 10px}
  .shell>.panel.tabon{display:flex}
  .tabs{display:flex}
  .hm{display:none!important}
  input,select,textarea{font-size:16px}
}
@media (max-width:820px) and (max-height:560px){.tabs{padding-top:4px}.shell{padding-top:4px}}
`;

function header(title, cur, opt) {
  opt = opt || {};
  const link = (l, m) => `<a class="btn${l[0] === cur ? ' cur' : ''}" href="${l[1]}">${l[2]}</a>`;
  const nav = LINKS.map(link).join('');
  const navm = LINKS.map(link).join('') + '<a class="btn" href="/layar" target="_blank" rel="noopener">Lihat layar PC</a>';
  return `<header class="top"><h1>${title}</h1><nav class="nav">${nav}<a class="btn" href="/layar" target="_blank" rel="noopener">Layar PC</a></nav><span class="sp"></span><span class="sub" id="upd"></span>${opt.actions || ''}`
    + `<details class="menu" id="menu"><summary class="btn">Menu</summary><div class="pop"><div class="navm">${navm}</div>${opt.menu || ''}<a class="btn" href="/logout">Keluar</a></div></details></header>`;
}

function uiKit() {
  var UI = window.UI = {};
  var ua = navigator.userAgent || '';
  UI.ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  UI.fit = function (host, o) {
    var W = host.clientWidth, H = host.clientHeight, g = o.gap == null ? 8 : o.gap;
    var cols = o.tw ? Math.max(1, Math.floor((W + g) / (o.tw + g))) : 1;
    var rows = Math.max(1, Math.floor((H - (o.headH || 0) + g) / (o.th + g)));
    return { cols: cols, rows: rows, size: cols * rows };
  };
  UI.ctl = function (ctl, page, pages, total, label, go) {
    if (pages <= 1) { ctl.style.display = 'none'; ctl.innerHTML = ''; return; }
    ctl.style.display = 'flex';
    ctl.innerHTML = '<button type="button" data-d="-1"' + (page <= 0 ? ' disabled' : '') + '>&lsaquo; Sebelumnya</button><span>Halaman ' + (page + 1) + ' dari ' + pages + ' &middot; ' + total + ' ' + UI.esc(label || 'item') + '</span><button type="button" data-d="1"' + (page >= pages - 1 ? ' disabled' : '') + '>Berikutnya &rsaquo;</button>';
    ctl.onclick = function (e) { var b = e.target; if (!b || !b.getAttribute) return; var d = b.getAttribute('data-d'); if (d) go(Number(d)); };
  };
  // Daftar berhalaman yang jumlah itemnya menyesuaikan tinggi/lebar kotak (mode 'tiles' = kartu, 'rows' = baris tabel).
  UI.paged = function (host, ctl, o) {
    var P = { items: [], page: 0, o: o };
    P.draw = function () {
      var rows = o.mode === 'rows';
      var f = UI.fit(host, rows ? { th: o.th || 32, gap: 0, headH: 30 } : { tw: o.tw, th: o.th, gap: o.gap == null ? 8 : o.gap });
      var n = P.items.length, pages = Math.max(1, Math.ceil(n / f.size));
      if (P.page >= pages) P.page = pages - 1; if (P.page < 0) P.page = 0;
      if (!n) { host.__h = null; host.innerHTML = o.empty || ''; ctl.style.display = 'none'; return; }
      var sl = P.items.slice(P.page * f.size, (P.page + 1) * f.size), h;
      if (rows) h = '<table class="t" style="--rh:' + (o.th || 32) + 'px"><thead>' + o.head + '</thead><tbody>' + sl.map(function (x, i) { return o.render(x, P.page * f.size + i); }).join('') + '</tbody></table>';
      else h = '<div class="tiles" style="--cols:' + f.cols + ';--th:' + o.th + 'px;--g:' + (o.gap == null ? 8 : o.gap) + 'px">' + sl.map(function (x, i) { return o.render(x, P.page * f.size + i); }).join('') + '</div>';
      if (host.__h !== h) { host.__h = h; host.innerHTML = h; }
      UI.ctl(ctl, P.page, pages, n, o.label, function (d) { P.page += d; P.draw(); });
    };
    P.set = function (items) { P.items = items || []; P.draw(); };
    var tm = null;
    function later() { clearTimeout(tm); tm = setTimeout(function () { P.draw(); }, 60); }
    if (window.ResizeObserver) { try { new ResizeObserver(later).observe(host); } catch (e) { window.addEventListener('resize', later); } } else window.addEventListener('resize', later);
    return P;
  };
  // Salin ke clipboard. Harus dipanggil langsung saat tombol disentuh (iPhone menolak salin setelah menunggu data dari server).
  UI.copy = function (t, cb) {
    var ok = false;
    try {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', '');
      a.style.cssText = 'position:fixed;left:0;top:0;width:2em;height:2em;padding:0;border:0;opacity:0;font-size:16px';
      document.body.appendChild(a);
      if (UI.ios) { var r = document.createRange(); r.selectNodeContents(a); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); a.setSelectionRange(0, t.length); } else { a.select(); }
      ok = document.execCommand('copy');
      document.body.removeChild(a);
    } catch (e) { ok = false; }
    if (ok) { if (cb) cb(true); return; }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(function () { if (cb) cb(true); }, function () { if (cb) cb(false); }); return; }
    if (cb) cb(false);
  };
  UI.show = function (id) { var e = document.getElementById(id); if (e) e.className = (e.className.replace(' show', '') + ' show'); };
  UI.hide = function (id) { var e = document.getElementById(id); if (e) e.className = e.className.replace(' show', ''); };
  // Tab untuk layar HP: tiap tombol .tabs button[data-p] menampilkan satu panel
  UI.tabs = function (first) {
    var bs = document.querySelectorAll('.tabs button'), ps = document.querySelectorAll('.shell>.panel');
    function pick(id) {
      for (var i = 0; i < bs.length; i++) bs[i].className = bs[i].getAttribute('data-p') === id ? 'on' : '';
      for (var j = 0; j < ps.length; j++) ps[j].className = ps[j].className.replace(' tabon', '') + (ps[j].id === id ? ' tabon' : '');
      window.dispatchEvent(new Event('resize'));
    }
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { pick(this.getAttribute('data-p')); };
    UI.pickTab = pick;
    pick(first);
  };
  document.addEventListener('click', function (e) { var m = document.getElementById('menu'); if (m && m.open && !m.contains(e.target)) m.open = false; });
}

const js = '(' + uiKit.toString() + ')();';


// =====================================================================================================
// DESIGN SYSTEM BARU (redesain UI/UX). Dipakai halaman yang sudah dimigrasi (mulai dari Beranda).
// Halaman lama tetap memakai css/js/header di atas sampai dimigrasi; alias --card/--bd/--pri tetap disediakan.
// Aturan: tanpa framework, tanpa CDN, tanpa font/ikon eksternal. Skrip browser ditulis sebagai fungsi lalu toString,
// jadi fungsi-fungsi itu tidak boleh memakai variabel dari luar fungsinya.
// =====================================================================================================

// Font Plus Jakarta Sans ada di assets/fonts/, tapi server belum punya rute untuk menyajikannya (lihat PERUBAHAN.md).
// Setelah rute /assets/fonts/ ada, ubah jadi true. Selama false dipakai font sistem (tanpa permintaan yang gagal).
const FONT_ROUTE_READY = true;

const NAV = [
  ['home', '/displaycostum.html', 'Beranda', 'home'],
  ['live', '/multiview', 'Live', 'live'],
  ['kj', '/kejadian', 'Kejadian', 'history'],
  ['cam', '/onvif', 'Kamera', 'cam'],
];

// Ikon garis 24px, stroke 1.75 (sprite SVG inline).
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8 6 8 6a14 14 0 0 1-3.2 3.9M6.6 7.6A14 14 0 0 0 4 12s3 6 8 6a9 9 0 0 0 3.4-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="m12 12 6-6"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.7-.7-2.5z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  live: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>',
  cam: '<path d="M4 6h11l4 4-4 4H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><path d="M8 14v4H4"/><circle cx="8" cy="10" r="1.2"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  clip: '<rect x="5.5" y="4.5" width="13" height="16.5" rx="2.5"/><path d="M9 4.5h6v3H9z"/><path d="M9 12h6M9 16h4"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16v4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 8-4 4 4 4"/><path d="M6 12h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  alert: '<path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 10v4M12 17.5h.01"/>',
  frozen: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  wait: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7.5V12l3 2"/>',
  off: '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 4.2-2.4M19 12.5a10 10 0 0 0-3.6-2.1"/><path d="M12 20h.01"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  update: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
};
const sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + Object.keys(ICONS).map((k) => `<symbol id="i-${k}" viewBox="0 0 24 24">${ICONS[k]}</symbol>`).join('') + '</defs></svg>';
const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const dsCss = `
${FONT_ROUTE_READY ? "@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url('/assets/fonts/PlusJakartaSans-latin.woff2') format('woff2')}" : ''}
:root{
--bg:#F3F6F8;--bg-2:#E8F5F7;--surface:#FFFFFF;--surface-2:#F7F9FA;--line:#E3E9ED;--tx:#13202A;--mut:#5B6B78;
--brand:#47B8C5;--brand-ink:#0F7C8A;--on-brand:#FFFFFF;
--ok:#1FA971;--warn:#F2A900;--bad:#E5484D;--off:#8A97A3;
--ok-ink:#12704A;--warn-ink:#7A5200;--bad-ink:#B42328;--off-ink:#4E5C67;--src-ink:#0B6A76;
--dot-ok:#178A5B;--dot-warn:#A87300;--dot-bad:#D23B40;--dot-off:#6E7C88;
--ok-t:rgba(31,169,113,.13);--warn-t:rgba(242,169,0,.16);--bad-t:rgba(229,72,77,.12);--off-t:rgba(138,151,163,.16);--brand-t:rgba(71,184,197,.14);
--glass:rgba(255,255,255,.62);--scrim:rgba(13,20,24,.42);
--sh1:0 1px 2px rgba(19,32,42,.04);--sh2:0 8px 24px rgba(19,32,42,.06);
--r-card:28px;--r-tile:20px;--r-in:14px;--gap:16px;--tap:40px;
--e:cubic-bezier(.2,.8,.2,1);--e-sheet:cubic-bezier(.32,.72,0,1);
--card:var(--surface);--bd:var(--line);--pri:var(--brand-ink);
color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
--bg:#0D1418;--bg-2:#0F1B20;--surface:#151E24;--surface-2:#1B262D;--line:#26333B;--tx:#E8F0F4;--mut:#94A5B1;
--brand:#5CCBD8;--brand-ink:#5CCBD8;--on-brand:#06272C;
--ok:#34D399;--warn:#FBBF24;--bad:#F87171;--off:#6B7A86;
--ok-ink:#34D399;--warn-ink:#FBBF24;--bad-ink:#F87171;--off-ink:#A3B1BC;--src-ink:#5CCBD8;--dot-ok:#34D399;--dot-warn:#FBBF24;--dot-bad:#F87171;--dot-off:#8A99A5;
--ok-t:rgba(52,211,153,.14);--warn-t:rgba(251,191,36,.14);--bad-t:rgba(248,113,113,.15);--off-t:rgba(107,122,134,.22);--brand-t:rgba(92,203,216,.13);
--glass:rgba(21,30,36,.66);--scrim:rgba(0,0,0,.55);--sh1:0 1px 2px rgba(0,0,0,.25);--sh2:0 8px 24px rgba(0,0,0,.28);color-scheme:dark}}
:root[data-theme=dark]{
--bg:#0D1418;--bg-2:#0F1B20;--surface:#151E24;--surface-2:#1B262D;--line:#26333B;--tx:#E8F0F4;--mut:#94A5B1;
--brand:#5CCBD8;--brand-ink:#5CCBD8;--on-brand:#06272C;
--ok:#34D399;--warn:#FBBF24;--bad:#F87171;--off:#6B7A86;
--ok-ink:#34D399;--warn-ink:#FBBF24;--bad-ink:#F87171;--off-ink:#A3B1BC;--src-ink:#5CCBD8;--dot-ok:#34D399;--dot-warn:#FBBF24;--dot-bad:#F87171;--dot-off:#8A99A5;
--ok-t:rgba(52,211,153,.14);--warn-t:rgba(251,191,36,.14);--bad-t:rgba(248,113,113,.15);--off-t:rgba(107,122,134,.22);--brand-t:rgba(92,203,216,.13);
--glass:rgba(21,30,36,.66);--scrim:rgba(0,0,0,.55);--sh1:0 1px 2px rgba(0,0,0,.25);--sh2:0 8px 24px rgba(0,0,0,.28);color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{font-size:15px;-webkit-text-size-adjust:100%;scroll-padding-top:88px}
body.ds{margin:0;min-height:100vh;min-height:100dvh;color:var(--tx);background:var(--bg);background-image:radial-gradient(1200px 600px at 85% -10%,var(--bg-2),transparent 70%);background-attachment:fixed;
font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:1rem;line-height:1.5;-webkit-tap-highlight-color:transparent}
.ds h1,.ds h2,.ds h3{margin:0;font-weight:700;letter-spacing:-.01em}
.ds h1{font-size:1.75rem;line-height:1.2}.ds h2{font-size:1.15rem}.ds h3{font-size:1rem}
.ds button,.ds input,.ds select,.ds textarea{font:inherit;color:inherit}
.ds a{color:var(--brand-ink)}
.num{font-variant-numeric:tabular-nums}
.mut{color:var(--mut)}.cap{font-size:12px;color:var(--mut)}
.ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.ic.s{width:16px;height:16px}.ic.l{width:24px;height:24px}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
:focus-visible{outline:3px solid var(--brand-ink);outline-offset:2px;border-radius:12px}

/* ---- kerangka: sidebar (desktop), bar tab bawah (HP), bar atas ---- */
.side{position:fixed;left:16px;top:16px;bottom:16px;width:96px;z-index:40;background:var(--surface);border-radius:32px;box-shadow:var(--sh1),var(--sh2);display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 0;overflow-y:auto;scrollbar-width:none}
.side .logo img{width:100%;height:100%;object-fit:cover;border-radius:20px;display:block}
.side .logo{width:64px;height:64px;border-radius:20px;overflow:hidden;background:var(--brand-ink);color:var(--on-brand);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;letter-spacing:.06em;margin-bottom:12px;text-decoration:none;flex:none}
.nb{position:relative;width:80px;height:72px;flex:none;gap:4px;flex-direction:column;border-radius:22px;border:0;background:transparent;color:var(--mut);display:flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;transition:background-color .15s var(--e),color .15s var(--e),transform .15s var(--e)}
.nb:hover{background:var(--surface-2);color:var(--tx)}
.nb[aria-current=page]{background:var(--brand-ink);color:var(--on-brand)}
.nb .ic{width:28px;height:28px}
.nb .lbl{font-size:12px;font-weight:600;line-height:1;white-space:nowrap}
.side .sp{flex:1}
.tabsb{display:none}
.main{margin-left:136px;padding:0 32px 40px 0}
.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;padding:16px 0 12px;transition:transform .25s var(--e)}
.topbar::before{content:'';position:absolute;inset:0 -32px 0 -24px;background:var(--glass);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);opacity:0;transition:opacity .25s var(--e);z-index:-1;border-radius:0 0 24px 24px}
.topbar.stuck::before{opacity:1}
.topbar .tt{min-width:0;flex:1}
.topbar .tt h1{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar .tt .cap{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmdk{display:flex;align-items:center;gap:8px;height:40px;min-width:220px;padding:0 14px;border-radius:999px;border:0;background:var(--surface);box-shadow:var(--sh1);color:var(--mut);cursor:pointer;font-size:14px}
.cmdk kbd{margin-left:auto;font:600 11px/1 inherit;padding:4px 6px;border-radius:6px;background:var(--surface-2);color:var(--mut)}
.conn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;background:var(--surface);box-shadow:var(--sh1);font-size:13px;font-weight:600;white-space:nowrap}
.conn i{width:8px;height:8px;border-radius:50%;background:var(--ok)}
.conn.weak i{background:var(--warn)}.conn.off i{background:var(--bad)}
.conn.ok{color:var(--ok-ink)}.conn.weak{color:var(--warn-ink)}.conn.off{color:var(--bad-ink)}
.bellb{position:relative}
.bellb b{position:absolute;top:4px;right:4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--bad-ink);color:var(--surface);font-size:11px;line-height:18px;text-align:center;display:none}
.bellb.has b{display:block}
.stale{display:none;align-items:center;gap:10px;margin:0 0 16px;padding:12px 16px;border-radius:16px;background:var(--warn-t);color:var(--warn-ink);font-weight:600;font-size:14px}
.stale.show{display:flex}

/* ---- tombol ---- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--tap);padding:0 18px;border-radius:999px;border:0;background:var(--surface-2);color:var(--tx);font-weight:600;font-size:14px;cursor:pointer;text-decoration:none;white-space:nowrap;transition:transform .15s var(--e),background-color .15s var(--e),opacity .15s var(--e)}
.btn:hover{background:var(--line)}
.btn:active,.ib:active,.nb:active,.press:active{transform:scale(.97)}
.btn.pri{background:var(--brand-ink);color:var(--on-brand)}.btn.pri:hover{opacity:.92}
.btn.bad{background:var(--bad-t);color:var(--bad-ink)}
.btn.ghost{background:transparent}.btn.ghost:hover{background:var(--surface-2)}
.btn.glass{background:rgba(19,32,42,.55);color:#fff}
.btn[disabled],.ib[disabled]{opacity:.45;cursor:default;transform:none}
.btn.busy{pointer-events:none;opacity:.8}
.btn.busy::before{content:'';width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .7s linear infinite}
.btn.full{width:100%}
.ib{width:var(--tap);height:var(--tap);border-radius:50%;border:0;background:var(--surface);box-shadow:var(--sh1);color:var(--tx);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none;transition:transform .15s var(--e),background-color .15s var(--e)}
.ib:hover{background:var(--surface-2)}
.ib.flat{box-shadow:none;background:transparent}
@keyframes spin{to{transform:rotate(360deg)}}

/* ---- segmented pill ---- */
.seg{display:inline-flex;gap:2px;padding:4px;border-radius:999px;background:var(--surface-2);max-width:100%;overflow-x:auto;scrollbar-width:none}
.seg::-webkit-scrollbar{display:none}
.seg button{min-height:32px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--mut);font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;transition:background-color .15s var(--e),color .15s var(--e)}
.seg button[aria-pressed=true]{background:var(--surface);color:var(--tx);box-shadow:var(--sh1),0 2px 8px rgba(19,32,42,.06)}

/* ---- pil status: ikon + kata + warna ---- */
.pill{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px 0 9px;border-radius:999px;font-weight:600;font-size:13px;white-space:nowrap;background:var(--surface-2);color:var(--tx)}
.pill .ic{width:15px;height:15px}
.pill.ok{background:var(--ok-t);color:var(--ok-ink)}.pill.warn{background:var(--warn-t);color:var(--warn-ink)}
.pill.bad{background:var(--bad-t);color:var(--bad-ink)}.pill.off{background:var(--off-t);color:var(--off-ink)}
.pill.src{background:var(--brand-t);color:var(--src-ink);height:24px;font-size:12px;padding:0 10px}
.pill.live{background:var(--ok-t);color:var(--ok-ink)}
.pulse{position:relative;width:8px;height:8px;border-radius:50%;background:currentColor;flex:none}
.pulse::after{content:'';position:absolute;inset:0;border-radius:50%;background:currentColor;animation:pulse 1.6s var(--e) infinite}
@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}

/* ---- kartu & grid ---- */
.card{position:relative;background:var(--surface);border-radius:var(--r-card);padding:24px;box-shadow:var(--sh1),var(--sh2);min-width:0}
.card-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.card-h h2{flex:1;min-width:140px}
.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--gap)}
.c12{grid-column:span 12}.c7{grid-column:span 7}.c5{grid-column:span 5}.c6{grid-column:span 6}.c4{grid-column:span 4}.c8{grid-column:span 8}
.hscroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:2px;margin:-2px}
.hscroll::-webkit-scrollbar{display:none}
.hscroll>*{scroll-snap-align:start;flex:none}

/* ---- sheet (HP: dari bawah) & laci (desktop: dari kanan) ---- */
.sheet{position:fixed;inset:0;z-index:70;display:none}
.sheet.open{display:block}
.sheet .scrim{position:absolute;inset:0;background:var(--scrim);opacity:0;transition:opacity .4s var(--e)}
.sheet.in .scrim{opacity:1}
.sheet .panel{position:absolute;top:16px;right:16px;bottom:16px;width:min(var(--w,480px),calc(100vw - 32px));background:var(--surface);border-radius:var(--r-card);box-shadow:var(--sh2),0 24px 64px rgba(0,0,0,.18);display:flex;flex-direction:column;transform:translateX(calc(100% + 24px));transition:transform .4s var(--e-sheet);outline:none}
.sheet.in .panel{transform:none}
.sheet .sh-h{display:flex;align-items:center;gap:8px;padding:20px 20px 12px}
.sheet .sh-h h2{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sheet .sh-b{flex:1;min-height:0;overflow:auto;padding:4px 20px 24px;overscroll-behavior:contain}
.sheet .grab{display:none}

/* ---- toast ---- */
.toasts{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:min(560px,calc(100vw - 32px))}
.toast{pointer-events:auto;display:flex;align-items:center;gap:12px;min-height:48px;padding:8px 8px 8px 18px;border-radius:999px;background:var(--tx);color:var(--surface);font-weight:600;font-size:14px;box-shadow:var(--sh2);transform:translateY(16px);opacity:0;transition:transform .25s var(--e),opacity .25s var(--e)}
.toast.in{transform:none;opacity:1}
.toast span{flex:1}
.toast .btn{min-height:36px;background:rgba(255,255,255,.14);color:inherit}
.toast.bad{background:var(--bad-ink);color:#fff}

/* ---- skeleton ---- */
.sk{position:relative;overflow:hidden;background:var(--surface-2);border-radius:12px;color:transparent!important}
.sk::after{content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:sk 1.4s infinite}
@keyframes sk{to{transform:translateX(100%)}}

/* ---- cincin, meteran, titik ---- */
.ring{display:block}.ring .tr{stroke:var(--line)}.ring .fg{stroke:var(--brand-ink);stroke-linecap:round}
.dots{display:flex;flex-wrap:wrap;gap:6px}
.dot{width:12px;height:12px;border-radius:50%;background:var(--dot-ok);flex:none}
.dot.warn{background:var(--dot-warn);border-radius:3px;transform:rotate(45deg) scale(.85)}
.dot.bad{background:var(--dot-bad);border-radius:3px}
.dot.off{background:transparent;box-shadow:inset 0 0 0 2.5px var(--dot-off)}

/* ---- grafik ---- */
.chart{position:relative}
.chart svg{display:block;width:100%;height:auto;overflow:visible}
.chart .gl{stroke:var(--line);stroke-width:1}
.chart .ln{fill:none;stroke:var(--brand-ink);stroke-width:2.25;stroke-linejoin:round;stroke-linecap:round}
.chart .ax{fill:var(--mut);font-size:11px}
.chart .pk{fill:var(--bad)}
.chart .hl{stroke:var(--mut);stroke-dasharray:3 3}
.tip{position:absolute;pointer-events:none;z-index:5;padding:8px 12px;border-radius:12px;background:var(--tx);color:var(--surface);font-size:12px;font-weight:600;white-space:nowrap;transform:translate(-50%,calc(-100% - 10px));opacity:0;transition:opacity .15s var(--e)}
.tip.show{opacity:1}

/* ---- geser untuk konfirmasi ---- */
.stc{position:relative;height:56px;border-radius:999px;background:var(--bad-t);color:var(--bad-ink);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
.stc .kn{position:absolute;left:4px;top:4px;width:48px;height:48px;border-radius:50%;background:var(--bad-ink);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;transition:transform .25s var(--e)}
.stc.drag .kn{transition:none}
.stc .tx{padding-left:40px;transition:opacity .15s}
.stc.done{background:var(--bad-ink);color:#fff}

/* ---- daftar baris di dalam sheet / kartu ---- */
.rows{display:flex;flex-direction:column}
.rowi{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 4px;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;background:none;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;cursor:pointer}
.rowi:last-child{border-bottom:0}
.rowi .ic.l{color:var(--mut)}
.rowi .grow{flex:1;min-width:0;display:flex;flex-direction:column}
.ds a.rowi{color:var(--tx)}
.rowi:hover{background:var(--surface-2)}
.rowi .t1{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rowi .t2{font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.secl{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:20px 0 8px}
.empty{padding:24px 8px;text-align:center;color:var(--mut)}

/* ---- tarik untuk memuat ulang (HP) ---- */
.ptr{position:fixed;left:50%;top:8px;z-index:35;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:var(--surface);box-shadow:var(--sh2);display:flex;align-items:center;justify-content:center;color:var(--brand-ink);transform:translateY(-64px);opacity:0}
.ptr.spin .ic{animation:spin .8s linear infinite}

/* ---- muncul berurutan ---- */
.rise{animation:rise .25s var(--e) both}
@keyframes rise{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
.drop{animation:drop .25s var(--e) both}
@keyframes drop{from{transform:translateY(-12px);opacity:0}to{transform:none;opacity:1}}
.slidein{animation:slidein .25s var(--e) both}
@keyframes slidein{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
html.hid *,html.hid *::before,html.hid *::after{animation-play-state:paused!important}

/* ---- isian formulir ---- */
.fld{display:flex;flex-direction:column;gap:6px;min-width:0}
.fld>label{font-size:13px;font-weight:600;color:var(--mut);margin:0}
.inp{width:100%;box-sizing:border-box;height:48px;padding:0 16px;border:0;border-radius:14px;background:var(--surface-2);color:var(--tx);font-size:16px;min-width:0}
textarea.inp{height:auto;padding:14px 16px;resize:none;line-height:1.45}
select.inp{appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--mut) 50%),linear-gradient(135deg,var(--mut) 50%,transparent 50%);background-position:calc(100% - 22px) 52%,calc(100% - 16px) 52%;background-size:6px 6px;background-repeat:no-repeat;padding-right:40px}
.inp::placeholder{color:var(--mut);opacity:.8}
.inp:focus-visible{outline:3px solid var(--brand-ink);outline-offset:1px}
.inw{position:relative;display:flex}.inw .inp{padding-right:52px}
.inw .ib{position:absolute;right:4px;top:4px;width:40px;height:40px;box-shadow:none;background:transparent}
.fhelp{font-size:13px;color:var(--mut);margin:0}
.fmsg{font-size:14px;min-height:20px;margin:0}.fmsg.bad{color:var(--bad-ink)}.fmsg.ok{color:var(--ok-ink)}

/* ---- HP & tablet ---- */
@media (max-width:899px){
  html{font-size:16px;scroll-padding-top:72px}
  :root{--r-card:24px;--gap:12px;--tap:48px}
  .side{display:none}
  .tabsb{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;height:calc(64px + env(safe-area-inset-bottom));padding:0 4px env(safe-area-inset-bottom);background:var(--surface);box-shadow:0 -1px 0 var(--line),0 -8px 24px rgba(19,32,42,.06)}
  .tabsb a,.tabsb button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:0;background:none;color:var(--mut);font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;min-width:0}
  .tabsb .ib2{width:56px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;transition:background-color .15s var(--e)}
  .tabsb [aria-current=page]{color:var(--brand-ink)}
  .tabsb [aria-current=page] .ib2{background:var(--brand-t)}
  .main{margin-left:0;padding:0 16px calc(88px + env(safe-area-inset-bottom))}
  .topbar{padding:12px 0 10px;gap:8px}
  .topbar::before{inset:0 -16px}
  .topbar.away{transform:translateY(-110%)}
  .topbar .tt h1{font-size:1.3rem}
  .cmdk{min-width:0;width:48px;height:48px;padding:0;justify-content:center}
  .cmdk .t,.cmdk kbd{display:none}
  .conn{height:32px;padding:0 10px;font-size:12px}
  .conn .t{display:none}
  .card{padding:16px}
  .grid{grid-template-columns:minmax(0,1fr)}
  .grid>*{grid-column:1/-1}
  .sheet .panel{top:auto;left:0;right:0;bottom:0;width:auto;max-height:92vh;max-height:92dvh;border-radius:24px 24px 0 0;transform:translateY(100%);padding-bottom:env(safe-area-inset-bottom)}
  .sheet.in .panel{transform:none}
  .sheet .grab{display:block;width:40px;height:5px;border-radius:999px;background:var(--line);margin:8px auto 0;flex:none}
  .sheet .sh-h{padding:12px 16px 8px}
  .sheet .sh-b{padding:4px 16px 24px}
  .toasts{bottom:calc(80px + env(safe-area-inset-bottom))}
  .seg button{min-height:40px}
  .ds input,.ds select,.ds textarea{font-size:16px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.1ms!important;scroll-behavior:auto!important}}
`;

// Kerangka halaman baru: sidebar + bar tab bawah + bar atas + panel "Lainnya".
function shell(o) {
  o = o || {};
  const nav = NAV.map((n) => `<a class="nb" href="${n[1]}"${n[0] === o.cur ? ' aria-current="page"' : ''}>${icon(n[3])}<span class="lbl">${n[2]}</span><span class="sr">${n[2]}</span></a>`).join('');
  const tabs = NAV.map((n) => `<a href="${n[1]}"${n[0] === o.cur ? ' aria-current="page"' : ''}><span class="ib2">${icon(n[3])}</span>${n[2]}</a>`).join('');
  return `<nav class="side" aria-label="Menu utama"><a class="logo" href="/displaycostum.html" aria-label="Bardi Monitor, ke Beranda"><img src="/assets/Logo.png" alt="BARDI" width="64" height="64"></a>${nav}<span class="sp"></span>`
    + `<button class="nb" type="button" data-more aria-haspopup="dialog">${icon('more')}<span class="lbl">Lainnya</span><span class="sr">Lainnya</span></button></nav>`
    + `<nav class="tabsb" aria-label="Menu utama">${tabs}<button type="button" data-more aria-haspopup="dialog"><span class="ib2">${icon('more')}</span>Lainnya</button></nav>`;
}
function topbar(o) {
  o = o || {};
  return `<header class="topbar" id="topbar"><div class="tt"><h1>${o.title || ''}</h1>${o.sub ? `<span class="cap" id="topsub">${o.sub}</span>` : '<span class="cap" id="topsub"></span>'}</div>`
    + `<button class="cmdk" type="button" id="cmdk" aria-label="Cari atau buka perintah (Ctrl+K)">${icon('search', 's')}<span class="t">Cari kamera atau menu</span><kbd>Ctrl K</kbd></button>`
    + (o.bell ? `<button class="ib bellb" type="button" id="bell" aria-label="Gangguan baru">${icon('bell')}<b class="num" id="bellN">0</b></button>` : '')
    + `<button class="ib" type="button" id="themeb" aria-label="Ganti tema">${icon('auto')}</button>${o.actions || ''}</header>`
    + `<div class="stale" id="stale" role="status">${icon('off')}<span id="staleT"></span></div>`;
}
// Panel Lainnya + panel Pembaruan + panel Cari (dipakai bersama semua halaman baru).
const commonSheets = `
<div class="sheet" id="shMore" role="dialog" aria-modal="true" aria-labelledby="shMoreT" style="--w:420px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="shMoreT">Lainnya</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${icon('x')}</button></div>
<div class="sh-b"><div class="rows">
<a class="rowi" href="/klip">${icon('clip', 'l')}<span class="grow"><span class="t1">Papan klip</span><span class="t2">Titip teks dan catatan</span></span>${icon('next', 's')}</a>
<a class="rowi" href="/layar" target="_blank" rel="noopener">${icon('monitor', 'l')}<span class="grow"><span class="t1">Lihat layar PC</span><span class="t2">Buka di tab baru (hanya melihat)</span></span>${icon('next', 's')}</a>
<button class="rowi" type="button" id="moreUpd">${icon('update', 'l')}<span class="grow"><span class="t1">Pembaruan</span><span class="t2" id="moreUpdV">Cek versi terbaru dari GitHub</span></span>${icon('next', 's')}</button>
<a class="rowi" href="/report.pdf" id="morePdf">${icon('file', 'l')}<span class="grow"><span class="t1">Unduh PDF</span><span class="t2">Laporan 7 hari terakhir</span></span>${icon('download', 's')}</a>
<a class="rowi" href="/logout">${icon('logout', 'l')}<span class="grow"><span class="t1">Keluar</span></span></a>
</div>
<p class="secl">Tema</p><div class="seg" role="group" aria-label="Tema" id="themeSeg"><button type="button" data-th="auto">Otomatis</button><button type="button" data-th="light">Terang</button><button type="button" data-th="dark">Gelap</button></div>
<p class="secl">Hentikan pemantauan</p><p class="cap" style="margin:0 0 10px">Program dan pengawas di PC akan MATI dan tidak menyala lagi sampai dijalankan manual atau PC dihidupkan ulang.</p>
<div class="stc" id="stopSlide" role="slider" aria-label="Geser ke kanan untuk menghentikan pemantauan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><span class="kn">${icon('power')}</span><span class="tx">Geser untuk menghentikan</span></div>
<p class="cap" id="stopMsg" role="status" style="margin:10px 0 0"></p>
</div></div></div>
<div class="sheet" id="shUpd" role="dialog" aria-modal="true" aria-labelledby="shUpdT" style="--w:480px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><button class="ib flat" type="button" data-back aria-label="Kembali">${icon('back')}</button><h2 id="shUpdT">Pembaruan dari GitHub</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${icon('x')}</button></div>
<div class="sh-b"><p class="cap" id="upv"></p><p id="upm" role="status" style="font-weight:600"></p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="upchk">${icon('refresh', 's')}Cek pembaruan</button><button class="btn pri" type="button" id="upgo" style="display:none">${icon('update', 's')}Perbarui sekarang</button></div>
<p class="cap" style="margin-top:16px">Saat diperbarui, Bardi Monitor menutup dan membuka ulang sendiri (sekitar 15 detik). Login Bardi, password, dan data kamera tidak berubah.</p></div></div></div>
<div class="sheet" id="shCmd" role="dialog" aria-modal="true" aria-label="Cari" style="--w:560px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><label class="sr" for="cmdq">Cari</label><input id="cmdq" type="search" autocomplete="off" placeholder="Cari kamera, lantai, atau menu" style="flex:1;min-width:0;height:48px;border:0;border-radius:999px;padding:0 18px;background:var(--surface-2)"><button class="ib flat" type="button" data-close aria-label="Tutup">${icon('x')}</button></div>
<div class="sh-b"><div class="rows" id="cmdl"></div></div></div></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<div class="ptr" id="ptr" aria-hidden="true">${icon('refresh')}</div>`;

// ---------------- skrip browser design system (window.DS, plus window.UI untuk kompatibilitas) ----------------
function dsKit() {
  var DS = window.DS = {};
  var $ = function (id) { return document.getElementById(id); };
  DS.$ = $;
  var ua = navigator.userAgent || '';
  DS.ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  DS.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  DS.icon = function (n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  DS.reduce = function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  DS.mobile = function () { try { return window.matchMedia('(max-width: 899px)').matches; } catch (e) { return false; } };
  // penyimpanan browser: selalu try/catch (bisa diblokir / kosong)
  DS.store = {
    get: function (k) { try { var v = localStorage.getItem('bm:' + k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('bm:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  // waktu relatif
  DS.ago = function (ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 10) return 'baru saja'; if (s < 60) return s + ' detik lalu';
    var m = Math.floor(s / 60); if (m < 60) return m + ' menit lalu';
    var h = Math.floor(m / 60); if (h < 24) return h + ' jam ' + (m % 60) + ' menit lalu';
    return Math.floor(h / 24) + ' hari lalu';
  };
  DS.dur = function (s) { s = Math.max(0, Math.round(s || 0)); if (s < 60) return s + ' dtk'; if (s < 3600) return Math.floor(s / 60) + ' mnt'; return Math.floor(s / 3600) + ' jam ' + Math.floor(s % 3600 / 60) + ' mnt'; };

  // ---- status: ikon + kata + warna ----
  var ST = {
    ok: ['ok', 'ok', 'Normal'], warn: ['warn', 'wait', 'Menyambung'], frozen: ['warn', 'frozen', 'Beku'],
    bad: ['bad', 'alert', 'Error'], off: ['off', 'off', 'Offline'], idle: ['off', 'clock', 'Tidak tampil']
  };
  DS.pill = function (kind, text) { var s = ST[kind] || ST.idle; return '<span class="pill ' + s[0] + '">' + DS.icon(s[1]) + DS.esc(text || s[2]) + '</span>'; };
  DS.livePill = function (text) { return '<span class="pill live"><span class="pulse"></span>' + DS.esc(text || 'Live') + '</span>'; };

  // ---- angka menghitung (400 ms) ----
  DS.count = function (el, to) {
    if (!el) return; to = Number(to) || 0;
    var from = Number(el.getAttribute('data-v')); el.setAttribute('data-v', to);
    if (isNaN(from) || from === to || DS.reduce() || document.hidden) { el.textContent = to; return; }
    var t0 = 0;
    function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 400); var e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  };

  // ---- cincin progres (SVG) ----
  DS.ring = function (frac, o) {
    o = o || {}; var size = o.size || 160, sw = o.stroke || 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
    frac = Math.max(0, Math.min(1, frac || 0));
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">'
      + '<circle class="tr" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + sw + '"/>'
      + (frac <= 0 ? '' : '<circle class="fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + sw + '" stroke-dasharray="' + (c * frac).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"' + (o.color ? ' style="stroke:' + o.color + '"' : '') + '/>') + '</svg>';
  };
  // ---- meteran setengah lingkaran ----
  DS.gauge = function (frac, o) {
    o = o || {}; var w = o.size || 200, sw = o.stroke || 16, r = (w - sw) / 2, cx = w / 2, cy = w / 2, len = Math.PI * r;
    frac = Math.max(0, Math.min(1, frac || 0));
    var d = 'M ' + (cx - r) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
    return '<svg class="ring" width="' + w + '" height="' + (w / 2 + sw / 2) + '" viewBox="0 0 ' + w + ' ' + (w / 2 + sw / 2) + '" aria-hidden="true"><path class="tr" d="' + d + '" fill="none" stroke-width="' + sw + '" stroke-linecap="round"/>'
      + '<path class="fg" d="' + d + '" fill="none" stroke-width="' + sw + '" stroke-dasharray="' + (len * frac).toFixed(1) + ' ' + len.toFixed(1) + '"/></svg>';
  };
  // ---- titik per kamera (bentuk berbeda per status, bukan hanya warna) ----
  DS.dots = function (list) {
    return '<div class="dots">' + list.map(function (x) { return '<span class="dot ' + x.k + '" role="img" aria-label="' + DS.esc(x.label) + '" title="' + DS.esc(x.label) + '"></span>'; }).join('') + '</div>';
  };

  // ---- grafik area (SVG) dengan tooltip saat disorot / ditahan ----
  DS.area = function (host, pts, o) {
    o = o || {}; var W = 600, H = o.h || 200, pl = 28, pr = 8, pt = 12, pb = 26;
    if (!pts.length) { host.innerHTML = '<div class="empty">' + DS.esc(o.empty || 'Belum ada data.') + '</div>'; return; }
    var max = Math.max(1, Math.max.apply(null, pts.map(function (p) { return p.v; })));
    var nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
    var X = function (i) { return pl + (W - pl - pr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)); };
    var Y = function (v) { return pt + (H - pt - pb) * (1 - v / nice); };
    var line = '', i;
    for (i = 0; i < pts.length; i++) {
      if (i === 0) { line = 'M' + X(0).toFixed(1) + ' ' + Y(pts[0].v).toFixed(1); continue; }
      var x0 = X(i - 1), y0 = Y(pts[i - 1].v), x1 = X(i), y1 = Y(pts[i].v), mx = (x0 + x1) / 2;
      line += ' C' + mx.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    var area = line + ' L' + X(pts.length - 1).toFixed(1) + ' ' + Y(0) + ' L' + X(0).toFixed(1) + ' ' + Y(0) + ' Z';
    var gid = 'g' + Math.random().toString(36).slice(2, 7), grid = '', k;
    for (k = 0; k <= 4; k++) { var gy = Y(nice * k / 4); grid += '<line class="gl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '"/>' + (k % 2 === 0 ? '<text class="ax" x="' + (pl - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + Math.round(nice * k / 4) + '</text>' : ''); }
    var lab = '', step = Math.max(1, Math.ceil(pts.length / 6));
    for (i = 0; i < pts.length; i += step) lab += '<text class="ax" x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + DS.esc(pts[i].x) + '</text>';
    var pk = 0; for (i = 1; i < pts.length; i++) if (pts[i].v > pts[pk].v) pk = i;
    var last = pts.length - 1;
    host.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + DS.esc(o.label || 'Grafik') + '"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".35"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>'
      + grid + '<path d="' + area + '" fill="url(#' + gid + ')"/><path class="ln" d="' + line + '"/>'
      + (pts[pk].v > 0 ? '<circle class="pk" cx="' + X(pk) + '" cy="' + Y(pts[pk].v) + '" r="4.5"/>' : '')
      + '<circle cx="' + X(last) + '" cy="' + Y(pts[last].v) + '" r="5.5" fill="var(--surface)" stroke="var(--brand-ink)" stroke-width="2.5"/>'
      + lab + '<line class="hl" id="' + gid + 'h" x1="0" x2="0" y1="' + pt + '" y2="' + Y(0) + '" style="display:none"/></svg><div class="tip"></div></div>';
    var svg = host.querySelector('svg'), tip = host.querySelector('.tip'), hl = host.querySelector('.hl');
    function at(ev) {
      var r = svg.getBoundingClientRect(); var x = (ev.clientX - r.left) / r.width * W;
      var j = Math.round((x - pl) / ((W - pl - pr) / Math.max(1, pts.length - 1))); j = Math.max(0, Math.min(pts.length - 1, j));
      hl.setAttribute('x1', X(j)); hl.setAttribute('x2', X(j)); hl.style.display = '';
      tip.textContent = (pts[j].t || pts[j].x) + ': ' + pts[j].v + ' ' + (o.unit || '');
      tip.style.left = (X(j) / W * r.width) + 'px'; tip.style.top = (Y(pts[j].v) / H * r.height) + 'px'; tip.className = 'tip show';
    }
    function off() { tip.className = 'tip'; hl.style.display = 'none'; }
    svg.addEventListener('pointermove', at); svg.addEventListener('pointerdown', at); svg.addEventListener('pointerleave', off); svg.addEventListener('pointercancel', off);
  };

  // ---- toast (bisa dengan Urungkan) ----
  DS.toast = function (msg, o) {
    o = o || {}; var box = $('toasts'); if (!box) return;
    var t = document.createElement('div'); t.className = 'toast' + (o.bad ? ' bad' : ''); t.setAttribute('role', 'status');
    t.innerHTML = '<span></span>'; t.firstChild.textContent = msg;
    var done = false;
    function close() { if (done) return; done = true; t.className = t.className.replace(' in', ''); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260); }
    if (o.action) { var b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = o.action; b.onclick = function () { if (o.onAction) o.onAction(); close(); }; t.appendChild(b); }
    box.appendChild(t); requestAnimationFrame(function () { t.className += ' in'; });
    setTimeout(close, o.ms || (o.action ? 5000 : 2600));
    return close;
  };

  // ---- sheet / laci: fokus terkunci, Esc, tombol Kembali browser, tarik ke bawah (HP) ----
  var stack = [];
  DS.openSheet = function (id, o) {
    o = o || {}; var s = $(id); if (!s || s.className.indexOf(' open') >= 0) return;
    var panel = s.querySelector('.panel'); s.__ret = document.activeElement; s.__onclose = o.onClose || null;
    s.className += ' open'; stack.push(id);
    try { history.pushState({ sheet: id }, ''); s.__hist = true; } catch (e) { s.__hist = false; }
    // FLIP: panel tumbuh dari kartu asalnya (400 ms) bila diberi o.from
    if (o.from && !DS.reduce()) {
      var a = o.from.getBoundingClientRect();
      panel.style.transition = 'none'; s.className += ' in';
      var b = panel.getBoundingClientRect();
      panel.style.transformOrigin = '0 0';
      panel.style.transform = 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
      panel.style.opacity = '.4';
      panel.getBoundingClientRect();
      panel.style.transition = 'transform .4s var(--e),opacity .4s var(--e)'; panel.style.transform = 'none'; panel.style.opacity = '1';
      s.__from = o.from;
      setTimeout(function () { panel.style.transition = ''; panel.style.transform = ''; panel.style.opacity = ''; panel.style.transformOrigin = ''; }, 420);
    } else { s.__from = null; requestAnimationFrame(function () { requestAnimationFrame(function () { s.className += ' in'; }); }); }
    setTimeout(function () { var f = s.querySelector('[autofocus]') || panel; try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    document.documentElement.style.overflow = 'hidden';
  };
  DS.closeSheet = function (id, fromHist) {
    var s = $(id); if (!s || s.className.indexOf(' open') < 0) return;
    stack = stack.filter(function (x) { return x !== id; });
    var panel = s.querySelector('.panel');
    if (s.__from && !DS.reduce() && document.body.contains(s.__from)) {
      var a = s.__from.getBoundingClientRect(), b = panel.getBoundingClientRect();
      panel.style.transformOrigin = '0 0'; panel.style.transition = 'transform .3s var(--e),opacity .3s var(--e)';
      panel.style.transform = 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')'; panel.style.opacity = '0';
    }
    s.className = s.className.replace(' in', '');
    setTimeout(function () { s.className = s.className.replace(' open', ''); panel.style.transform = ''; panel.style.opacity = ''; panel.style.transition = ''; panel.style.transformOrigin = ''; panel.style.translate = ''; }, 400);
    if (!stack.length) document.documentElement.style.overflow = '';
    if (s.__ret && s.__ret.focus) try { s.__ret.focus({ preventScroll: true }); } catch (e) {}
    if (s.__onclose) s.__onclose();
    if (!fromHist && s.__hist) { s.__hist = false; try { history.back(); } catch (e) {} }
  };
  window.addEventListener('popstate', function () { var top = stack[stack.length - 1]; if (top) { var s = $(top); if (s) s.__hist = false; DS.closeSheet(top, true); } });
  document.addEventListener('keydown', function (e) {
    var top = stack[stack.length - 1]; if (!top) return; var s = $(top);
    if (e.key === 'Escape') { e.preventDefault(); DS.closeSheet(top); return; }
    if (e.key === 'Tab') { // kunci fokus
      var f = s.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target; while (t && t !== document && !(t.hasAttribute && (t.hasAttribute('data-close') || t.hasAttribute('data-back')))) t = t.parentNode;
    if (!t || t === document) return; var s = t; while (s && !(s.className && String(s.className).indexOf('sheet') === 0)) s = s.parentNode;
    if (s && s.id) { if (t.hasAttribute('data-back') && s.__back) s.__back(); else DS.closeSheet(s.id); }
  });
  // tarik ke bawah untuk menutup sheet (HP)
  document.addEventListener('pointerdown', function (e) {
    if (!DS.mobile()) return; var top = stack[stack.length - 1]; if (!top) return; var s = $(top), panel = s.querySelector('.panel');
    if (!panel.contains(e.target)) return; var body = s.querySelector('.sh-b');
    var onHead = !body || !body.contains(e.target) || body.scrollTop <= 0;
    if (!onHead || e.target.closest && e.target.closest('input,textarea,select,.stc,.chart,.hscroll')) return;
    var y0 = e.clientY, dy = 0, moved = false;
    function mv(ev) { dy = Math.max(0, ev.clientY - y0); if (dy > 6) { moved = true; panel.style.transition = 'none'; panel.style.transform = 'translateY(' + dy + 'px)'; } }
    function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
      panel.style.transition = ''; if (moved && dy > 110) { panel.style.transform = ''; DS.closeSheet(top); } else panel.style.transform = ''; }
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  });

  // ---- geser untuk konfirmasi ----
  DS.slide = function (el, onDone) {
    var kn = el.querySelector('.kn'), tx = el.querySelector('.tx');
    function maxX() { return el.clientWidth - kn.offsetWidth - 8; }
    function set(x) { kn.style.transform = 'translateX(' + x + 'px)'; tx.style.opacity = String(1 - x / maxX()); el.setAttribute('aria-valuenow', Math.round(x / maxX() * 100)); }
    function finish() { el.className += ' done'; set(maxX()); tx.style.opacity = '1'; tx.textContent = 'Memproses...'; onDone(function reset(msg) { el.className = el.className.replace(' done', ''); tx.textContent = msg || 'Geser untuk menghentikan'; set(0); }); }
    kn.addEventListener('pointerdown', function (e) {
      if (el.className.indexOf('done') >= 0) return; e.preventDefault(); var x0 = e.clientX, x = 0; el.className += ' drag';
      try { kn.setPointerCapture(e.pointerId); } catch (er) {}
      function mv(ev) { x = Math.max(0, Math.min(maxX(), ev.clientX - x0)); set(x); }
      function up() { kn.removeEventListener('pointermove', mv); kn.removeEventListener('pointerup', up); kn.removeEventListener('pointercancel', up); el.className = el.className.replace(' drag', '');
        if (x >= maxX() - 4) finish(); else set(0); }
      kn.addEventListener('pointermove', mv); kn.addEventListener('pointerup', up); kn.addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && el.className.indexOf('done') < 0) { e.preventDefault(); finish(); } });
  };

  // ---- tarik ke bawah untuk memuat ulang (HP) ----
  DS.pullRefresh = function (cb) {
    var ptr = $('ptr'); if (!ptr) return; var y0 = null, dy = 0, busy = false;
    document.addEventListener('touchstart', function (e) { if (busy || window.scrollY > 0 || stack.length || e.touches.length !== 1) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy <= 0) return; var d = Math.min(96, dy * 0.5); ptr.style.transform = 'translateY(' + (d - 56) + 'px) rotate(' + d * 3 + 'deg)'; ptr.style.opacity = String(Math.min(1, d / 64)); }, { passive: true });
    document.addEventListener('touchend', function () {
      if (y0 == null) return; y0 = null;
      if (dy * 0.5 > 64) { busy = true; ptr.className = 'ptr spin'; ptr.style.transform = 'translateY(16px)'; Promise.resolve(cb()).then(done, done); } else done();
      function done() { busy = false; ptr.className = 'ptr'; ptr.style.transform = ''; ptr.style.opacity = ''; }
    });
  };

  // ---- pengambil data: interval normal saat sehat, mundur 5/10/20/30 dtk saat gagal, berhenti saat tab tersembunyi ----
  var CONN = { last: Date.now(), slow: false, fails: 0, srcs: {} };
  function paintConn() {
    var el = $('conn'); var anyFail = false, anySlow = false, k;
    for (k in CONN.srcs) { if (CONN.srcs[k].fail) anyFail = true; if (CONN.srcs[k].slow) anySlow = true; }
    var cls = anyFail ? 'off' : anySlow ? 'weak' : 'ok', txt = anyFail ? 'Terputus' : anySlow ? 'Sinyal lemah' : 'Terhubung';
    if (el) { el.className = 'conn ' + cls; el.querySelector('.t').textContent = txt; el.title = txt; }
    var st = $('stale');
    if (st) { if (anyFail && CONN.okAt) { $('staleT').textContent = 'Terputus dari PC pemantauan. Menampilkan data ' + DS.ago(Date.now() - CONN.okAt) + '.'; st.className = 'stale show'; } else st.className = 'stale'; }
  }
  setInterval(paintConn, 5000);
  DS.connOkAt = function (t) { if (t && (!CONN.okAt || t > CONN.okAt)) CONN.okAt = t; };
  var POLLS = [];
  window.addEventListener('online', function () { POLLS.forEach(function (q) { if (q.fails) q.now(); }); });
  DS.poll = function (o) {
    // o: {name, url (string|fungsi), ms, onData(d, fromCache), cache(true), backoff}
    var P = { timer: null, fails: 0, busy: false, stopped: false };
    CONN.srcs[o.name] = { fail: false, slow: false };
    var BACK = [5000, 10000, 20000, 30000];
    if (o.cache) { var c = DS.store.get('c:' + o.name); if (c && c.d) { DS.connOkAt(c.t); o.onData(c.d, c.t); } }
    function sched(ms) { clearTimeout(P.timer); if (!P.stopped) P.timer = setTimeout(run, ms); }
    function run() {
      if (document.hidden) { P.paused = true; return; }
      if (P.busy) return sched(o.ms); P.busy = true; var t0 = Date.now();
      var url = typeof o.url === 'function' ? o.url() : o.url;
      var ctrl = window.AbortController ? new AbortController() : null; var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
        if (r.status === 401) { location.href = '/login'; throw new Error('login'); }
        if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
      }).then(function (d) {
        clearTimeout(to); P.busy = false; P.fails = 0; var ms = Date.now() - t0;
        CONN.srcs[o.name] = { fail: false, slow: ms > 3000 }; DS.connOkAt(Date.now()); paintConn();
        if (o.cache) DS.store.set('c:' + o.name, { t: Date.now(), d: d });
        POLLS.forEach(function (q) { if (q !== P && q.fails && !q.busy) q.now(); }); // satu sumber pulih: yang lain langsung dicoba lagi
        o.onData(d, 0); sched(o.ms);
      }).catch(function () {
        clearTimeout(to); P.busy = false; CONN.srcs[o.name] = { fail: true, slow: false }; paintConn();
        sched(BACK[Math.min(P.fails, BACK.length - 1)]); P.fails++;
      });
    }
    P.now = function () { sched(0); };
    P.stop = function () { P.stopped = true; clearTimeout(P.timer); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden && P.paused) { P.paused = false; sched(0); } });
    POLLS.push(P);
    sched(0);
    return P;
  };
  document.addEventListener('visibilitychange', function () { document.documentElement.className = document.documentElement.className.replace(' hid', '') + (document.hidden ? ' hid' : ''); });

  // ---- tema: Otomatis / Terang / Gelap (disimpan di browser) ----
  DS.theme = function (v) {
    if (v) DS.store.set('theme', v); v = DS.store.get('theme') || 'auto';
    if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v);
    var b = $('themeb'); if (b) { b.innerHTML = DS.icon(v === 'dark' ? 'moon' : v === 'light' ? 'sun' : 'auto'); b.setAttribute('aria-label', 'Tema: ' + (v === 'dark' ? 'Gelap' : v === 'light' ? 'Terang' : 'Otomatis') + '. Ketuk untuk mengganti'); }
    var sg = $('themeSeg'); if (sg) { var bs = sg.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-th') === v ? 'true' : 'false'); }
    return v;
  };
  DS.theme();

  // ---- segmented: data-v pada tombol; panggil cb(nilai) ----
  DS.seg = function (el, val, cb) {
    var bs = el.querySelectorAll('button');
    function paint(v) { for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-v') === v ? 'true' : 'false'); }
    paint(val);
    el.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (!b || !el.contains(b)) return; var v = b.getAttribute('data-v'); paint(v); cb(v); });
    return { set: paint };
  };

  // ---- kerangka: Lainnya, Pembaruan, Hentikan, Cari, bar atas mengecil saat gulir ----
  DS.initShell = function (o) {
    o = o || {};
    var mores = document.querySelectorAll('[data-more]');
    for (var i = 0; i < mores.length; i++) mores[i].addEventListener('click', function () { DS.openSheet('shMore'); });
    var tb = $('themeb'); if (tb) tb.onclick = function () { var v = DS.store.get('theme') || 'auto'; var nx = v === 'auto' ? 'light' : v === 'light' ? 'dark' : 'auto'; DS.theme(nx); DS.toast('Tema: ' + (nx === 'auto' ? 'Otomatis' : nx === 'light' ? 'Terang' : 'Gelap')); };
    var sg = $('themeSeg'); if (sg) sg.onclick = function (e) { var b = e.target.closest ? e.target.closest('button') : null; if (b) DS.theme(b.getAttribute('data-th')); };
    // Pembaruan (logika sama dengan versi lama)
    function api(u, post) { return fetch(u, { method: post ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin' }).then(function (r) { if (r.status === 401) { location.href = '/login'; throw new Error('login'); } return r.json(); }); }
    function drawUp(d) {
      $('moreUpdV').textContent = d.current ? 'Terpasang: ' + d.current.short : 'Cek versi terbaru dari GitHub';
      $('upv').textContent = (d.current ? 'Terpasang: ' + d.current.short + (d.current.message ? ' - ' + d.current.message : '') : 'Terpasang: belum tercatat (pemasangan manual)') + ' | Repo: ' + d.repo + (d.hasToken ? '' : ' | Token belum dipasang (perlu untuk repo privat: PASANG-TOKEN-UPDATE.bat)');
      var busy = ['checking', 'downloading', 'installing', 'restarting'].indexOf(d.state) >= 0, m = 'Ketuk "Cek pembaruan".';
      if (d.state === 'error') m = 'Gagal: ' + d.error; else if (busy || d.state === 'done') m = d.message;
      else if (d.latest) m = d.upToDate ? 'Sudah versi terbaru (' + d.latest.short + ').' : 'Ada versi baru: ' + d.latest.short + (d.latest.message ? ' - ' + d.latest.message : '');
      $('upm').textContent = m; $('upchk').disabled = busy; $('upchk').className = 'btn' + (d.state === 'checking' ? ' busy' : '');
      $('upgo').style.display = (d.latest && !d.upToDate && !busy && d.state !== 'done') ? '' : 'none';
    }
    function upStatus() { api('/api/update/status').then(drawUp).catch(function () {}); }
    function waitBack() { var down = false, t0 = Date.now(); var iv = setInterval(function () {
      fetch('/api/status', { cache: 'no-store' }).then(function (r) { if (r.ok && down) { clearInterval(iv); location.reload(); } }).catch(function () { down = true; });
      if (Date.now() - t0 > 120000) { clearInterval(iv); $('upm').textContent = 'Belum kembali setelah 2 menit. Buka Bardi Monitor dari shortcut di Desktop.'; } }, 1500); }
    function upPoll() { api('/api/update/status').then(function (d) { drawUp(d); if (['checking', 'downloading', 'installing'].indexOf(d.state) >= 0) setTimeout(upPoll, 1000); else if (d.state === 'restarting') waitBack(); }).catch(function () {}); }
    $('moreUpd').onclick = function () { DS.closeSheet('shMore'); setTimeout(function () { DS.openSheet('shUpd'); upStatus(); }, 50); };
    $('shUpd').__back = function () { DS.closeSheet('shUpd'); setTimeout(function () { DS.openSheet('shMore'); }, 50); };
    $('upchk').onclick = function () { $('upm').textContent = 'Memeriksa GitHub...'; $('upchk').className = 'btn busy'; api('/api/update/check', true).then(drawUp).catch(function () { $('upchk').className = 'btn'; $('upm').textContent = 'Gagal memeriksa. Coba lagi.'; }); };
    $('upgo').onclick = function () {
      var b = $('upgo'); if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.lastChild.textContent = 'Ketuk lagi untuk memperbarui'; setTimeout(function () { b.removeAttribute('data-sure'); b.lastChild.textContent = 'Perbarui sekarang'; }, 4000); return; }
      b.className = 'btn pri busy'; api('/api/update/apply', true).then(function (r) { b.className = 'btn pri'; if (r.ok) upPoll(); else $('upm').textContent = r.error || 'Gagal memulai pembaruan'; }).catch(function () { b.className = 'btn pri'; $('upm').textContent = 'Gagal memulai pembaruan. Coba lagi.'; });
    };
    api('/api/update/status').then(function (d) { $('moreUpdV').textContent = d.current ? 'Terpasang: ' + d.current.short : 'Cek versi terbaru dari GitHub'; }).catch(function () {});
    // Hentikan pemantauan (geser untuk konfirmasi)
    DS.slide($('stopSlide'), function (reset) {
      fetch('/api/stop', { method: 'POST', cache: 'no-store', credentials: 'same-origin' }).then(function (r) { if (r.status === 401) { location.href = '/login'; throw new Error('login'); } return r.json(); }).then(function (r) {
        if (r.ok) { $('stopMsg').textContent = 'Pemantauan dihentikan. Untuk menyalakan lagi, buka shortcut Bardi Monitor di PC.'; $('stopSlide').querySelector('.tx').textContent = 'Dihentikan'; }
        else { $('stopMsg').textContent = r.error || 'Gagal menghentikan'; reset('Coba lagi'); }
      }).catch(function () { $('stopMsg').textContent = 'Gagal menghubungi PC. Coba lagi.'; reset('Coba lagi'); });
    });
    // Cari / perintah (Ctrl+K)
    var base = [['Beranda', '/displaycostum.html', 'home'], ['Live (Multiview)', '/multiview', 'live'], ['Rekaman kejadian', '/kejadian', 'history'], ['Kamera ONVIF', '/onvif', 'cam'], ['Papan klip', '/klip', 'clip'], ['Lihat layar PC', '/layar', 'monitor'], ['Unduh PDF', '/report.pdf', 'file'], ['Keluar', '/logout', 'logout']];
    function drawCmd() {
      var q = $('cmdq').value.trim().toLowerCase(), h = '', n = 0;
      var extra = (o.search ? o.search(q) : []) || [];
      extra.slice(0, 30).forEach(function (x, i) { n++; h += '<button class="rowi" type="button" data-x="' + i + '">' + DS.icon(x.icon || 'cam', 'l') + '<span class="grow"><span class="t1">' + DS.esc(x.label) + '</span><span class="t2">' + DS.esc(x.sub || '') + '</span></span>' + (x.pill || '') + '</button>'; });
      var nav = base.filter(function (b) { return !q || b[0].toLowerCase().indexOf(q) >= 0; });
      if (nav.length) h += '<p class="secl">Menu</p>' + nav.map(function (b) { n++; return '<a class="rowi" href="' + b[1] + '"' + (b[1] === '/layar' ? ' target="_blank" rel="noopener"' : '') + '>' + DS.icon(b[2], 'l') + '<span class="grow"><span class="t1">' + DS.esc(b[0]) + '</span></span></a>'; }).join('');
      $('cmdl').innerHTML = n ? h : '<div class="empty">Tidak ada yang cocok.</div>';
      $('cmdl').__extra = extra;
    }
    $('cmdq').addEventListener('input', drawCmd);
    $('cmdl').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-x]') : null; if (!b) return; var x = $('cmdl').__extra[Number(b.getAttribute('data-x'))]; DS.closeSheet('shCmd'); if (x && x.run) setTimeout(x.run, 60); });
    $('cmdq').addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = $('cmdl').querySelector('.rowi'); if (f) f.click(); } });
    function openCmd() { $('cmdq').value = ''; drawCmd(); DS.openSheet('shCmd'); setTimeout(function () { $('cmdq').focus(); }, 80); }
    $('cmdk').onclick = openCmd;
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (!stack.length) openCmd(); } });
    // bar atas: berkaca saat digulir; di HP mengecil saat gulir turun, muncul saat gulir naik
    var top = $('topbar'), lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () { if (ticking) return; ticking = true; requestAnimationFrame(function () {
      var y = window.scrollY; top.className = 'topbar' + (y > 8 ? ' stuck' : '') + (DS.mobile() && y > lastY && y > 120 ? ' away' : ''); lastY = y; ticking = false; }); }, { passive: true });
  };

  // ---- kompatibilitas dengan kit lama (UI.copy wajib dipanggil langsung di penangan sentuhan, kendala iPhone) ----
  var UI = window.UI = window.UI || {};
  UI.ios = DS.ios; UI.esc = DS.esc;
  UI.copy = function (t, cb) {
    var ok = false;
    try {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', '');
      a.style.cssText = 'position:fixed;left:0;top:0;width:2em;height:2em;padding:0;border:0;opacity:0;font-size:16px';
      document.body.appendChild(a);
      if (UI.ios) { var r = document.createRange(); r.selectNodeContents(a); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); a.setSelectionRange(0, t.length); } else { a.select(); }
      ok = document.execCommand('copy');
      document.body.removeChild(a);
    } catch (e) { ok = false; }
    if (ok) { if (cb) cb(true); return; }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(function () { if (cb) cb(true); }, function () { if (cb) cb(false); }); return; }
    if (cb) cb(false);
  };
  DS.copy = UI.copy;
}
const dsJs = '(' + dsKit.toString() + ')();';

// Satu dokumen HTML lengkap untuk halaman baru.
function page(o) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`
    + `<meta name="theme-color" content="#F3F6F8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0D1418" media="(prefers-color-scheme: dark)">`
    + `<title>${o.title} - Bardi Monitor</title><style>${dsCss}${o.css || ''}</style>`
    + `<script>try{var t=JSON.parse(localStorage.getItem('bm:theme')||'null');if(t&&t!=='auto')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script></head>`
    + `<body class="ds">${sprite}${shell({ cur: o.cur })}<main class="main" id="main">${topbar({ title: o.h1 || o.title, sub: o.sub, bell: o.bell, actions: o.actions })}${o.body || ''}</main>${o.sheets || ''}${commonSheets}`
    + `<script>${dsJs}</script><script>${o.script || ''}</script></body></html>`;
}

const ds = { css: dsCss, js: dsJs, page, shell, topbar, icon, sprite, ICONS, NAV, commonSheets, FONT_ROUTE_READY };

module.exports = { css, js, header, LINKS, ds };
