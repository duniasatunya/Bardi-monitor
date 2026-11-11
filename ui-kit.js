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

module.exports = { css, js, header, LINKS };
