// Papan Klip: tempat menitip teks di halaman laporan. Setiap tempelan (Ctrl+V) langsung tersimpan otomatis.
// Tidak ada batas jumlah catatan. Data disimpan di clipboard.json (milik PC ini, tidak ikut GitHub/pembaruan).
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_ITEM_CHARS = 2000000;   // batas satu catatan (bukan batas jumlah catatan)
const PREVIEW_CHARS = 3000;       // daftar hanya mengirim cuplikan; teks utuh diambil saat Salin/Tampilkan semua
const PAGE_SIZE = 100;

function createClipStore({ dir, log, file }) {
  const f = file || path.join(dir, 'clipboard.json');
  let items = [];   // terbaru di indeks 0
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Array.isArray(j.items)) items = j.items.filter((x) => x && typeof x.id === 'string' && typeof x.text === 'string');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      try { fs.renameSync(f, f + '.rusak-' + Date.now()); } catch (_) {}
      log('WARN', 'Papan klip: clipboard.json tidak terbaca (' + e.message + '); dipindah ke cadangan dan dimulai kosong.');
    }
  }
  let saving = false; let again = false;
  function persist() {
    if (saving) { again = true; return; }
    saving = true;
    const body = JSON.stringify({ version: 1, items });
    const tmp = f + '.tmp';
    fs.writeFile(tmp, body, (err) => {
      if (err) { saving = false; log('WARN', 'Papan klip: gagal menyimpan: ' + err.message); return; }
      fs.rename(tmp, f, (err2) => {
        saving = false;
        if (err2) log('WARN', 'Papan klip: gagal menyimpan: ' + err2.message);
        if (again) { again = false; persist(); }
      });
    });
  }
  const view = (x) => ({ id: x.id, at: x.at, len: x.text.length, cut: x.text.length > PREVIEW_CHARS, text: x.text.length > PREVIEW_CHARS ? x.text.slice(0, PREVIEW_CHARS) : x.text });
  return {
    file: f,
    add(text) {
      text = String(text == null ? '' : text);
      if (!text.trim()) return { ok: false, error: 'Teksnya kosong.' };
      if (text.length > MAX_ITEM_CHARS) return { ok: false, error: 'Satu catatan maksimal ' + MAX_ITEM_CHARS.toLocaleString('en') + ' karakter.' };
      const now = Date.now();
      if (items[0] && items[0].text === text && now - items[0].at < 10000) return { ok: true, duplicate: true, item: view(items[0]) };
      const it = { id: crypto.randomBytes(6).toString('hex'), at: now, text };
      items.unshift(it); persist();
      return { ok: true, item: view(it) };
    },
    list({ q, offset, limit } = {}) {
      const needle = String(q || '').trim().toLowerCase();
      const src = needle ? items.filter((x) => x.text.toLowerCase().includes(needle)) : items;
      const off = Math.max(0, parseInt(offset, 10) || 0);
      const lim = Math.min(PAGE_SIZE, Math.max(1, parseInt(limit, 10) || PAGE_SIZE));
      return { ok: true, all: items.length, total: src.length, offset: off, items: src.slice(off, off + lim).map(view) };
    },
    get(id) { const x = items.find((y) => y.id === String(id)); return x ? { ok: true, text: x.text } : { ok: false, error: 'Catatan tidak ditemukan.' }; },
    remove(id) {
      const i = items.findIndex((y) => y.id === String(id));
      if (i < 0) return { ok: false, error: 'Catatan tidak ditemukan.' };
      items.splice(i, 1); persist(); return { ok: true };
    },
    count: () => items.length,
    flush: () => new Promise((r) => { const t = setInterval(() => { if (!saving && !again) { clearInterval(t); r(); } }, 20); }),
  };
}

const { ds } = require('./ui-kit');
const I = ds.icon;

const css = `
.kl{display:flex;flex-direction:column;gap:16px;padding-bottom:16px}
.qpill{display:flex;align-items:center;gap:10px;height:52px;padding:0 18px;border-radius:999px;background:var(--surface);box-shadow:var(--sh1)}
.qpill input{flex:1;min-width:0;height:100%;border:0;background:transparent;font-size:16px;outline:0}
.qpill .cap{white-space:nowrap}
.qpill:focus-within{box-shadow:0 0 0 3px var(--brand-ink)}
.klist{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--gap);align-items:start}
.nw{position:relative;border-radius:var(--r-card)}
.nw.sw{background:var(--bad-ink)}
.nw::after{content:'Hapus';position:absolute;right:22px;top:50%;transform:translateY(-50%);color:#fff;font-weight:700;opacity:0;transition:opacity .15s}
.nw.sw::after{opacity:1}
.nw::after{z-index:0}.note{z-index:1}
.note{position:relative;background:var(--surface);border-radius:var(--r-card);padding:18px 20px 12px;box-shadow:var(--sh1),var(--sh2);touch-action:pan-y;display:flex;flex-direction:column;gap:10px;min-width:0}
.note,.note *{touch-action:pan-y}
.note.moving{transition:none}
.note:not(.moving){transition:transform .25s var(--e)}
.note .nh{display:flex;align-items:center;gap:8px;color:var(--mut);font-size:12px}
.ntext{display:block;width:100%;text-align:left;border:0;background:var(--surface-2);border-radius:16px;padding:12px 14px;cursor:pointer;color:var(--tx)}
.ntext pre{margin:0;white-space:pre-wrap;word-break:break-word;font:14px/1.5 ui-monospace,Consolas,monospace;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.note.open .ntext pre{display:block;max-height:60vh;overflow:auto;-webkit-line-clamp:unset}
.ntext:active{transform:scale(.99)}
.nf{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nf .grow{flex:1}
.nf .btn{min-height:40px;padding:0 14px;font-size:14px}
.nf .ib{width:40px;height:40px;box-shadow:none;background:transparent}
.nf .ib.bad{color:var(--bad-ink)}
.comp{position:sticky;bottom:16px;z-index:20;display:flex;gap:10px;align-items:flex-end;padding:12px;border-radius:28px;background:var(--glass);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--sh2),0 12px 32px rgba(19,32,42,.08)}
.comp textarea{flex:1;min-height:48px;max-height:168px;background:var(--surface)}
.comp .btn{height:48px;flex:none}
.chint{margin:0 0 4px 4px}
@media (max-width:899px){.klist{grid-template-columns:minmax(0,1fr)}.comp{bottom:calc(76px + env(safe-area-inset-bottom));border-radius:24px;padding:10px}.comp .btn span{display:none}.comp .btn{width:48px;padding:0}}
`;

const body = `
<section class="kl" aria-label="Catatan">
<div class="qpill">${I('search', 's')}<label class="sr" for="q">Cari di semua catatan</label><input id="q" type="search" autocomplete="off" placeholder="Cari di semua catatan"><span class="cap" id="cnt"></span></div>
<div class="klist" id="list" aria-live="polite"></div>
<button class="btn" type="button" id="more" hidden>Tampilkan lebih banyak</button>
<div><p class="cap chint">Tempel dengan Ctrl+V (atau tahan lalu Tempel di HP) di mana saja di halaman ini: setiap tempelan langsung tersimpan jadi satu catatan. Ketuk catatan untuk menyalinnya. Di HP, geser catatan ke kiri untuk menghapus.</p>
<div class="comp"><label class="sr" for="box">Tulis atau tempel catatan</label><textarea class="inp" id="box" rows="1" placeholder="Tempel di sini, atau ketik lalu tekan Simpan"></textarea><button class="btn" type="button" id="pastb" aria-label="Tempel dari salinan terakhir">${I('copy')}<span>Tempel</span></button><button class="btn pri" type="button" id="save" aria-label="Simpan ketikan">${I('check')}<span>Simpan</span></button></div></div>
</section>`;

function klipApp() {
  var $ = function (i) { return document.getElementById(i); };
  var esc = DS.esc, icon = DS.icon;
  var S = { items: [], total: 0, all: 0, q: '', loading: false, full: {}, pend: {}, pageSize: 30, got: false };
  function clk(s) { return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function api(p, b, keep) {
    return fetch(p, { method: 'POST', credentials: 'same-origin', keepalive: !!keep, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) })
      .then(function (r) { if (r.status === 401) { location.href = '/login'; throw new Error('login'); } return r.json(); });
  }
  function visible() { return S.items.filter(function (x) { return !S.pend[x.id]; }); }
  function card(x, i, fresh) {
    return '<div class="nw" data-id="' + esc(x.id) + '"><article class="note' + (fresh ? ' rise' : '') + '" data-id="' + esc(x.id) + '" style="' + (fresh ? 'animation-delay:' + Math.min(i, 10) * 30 + 'ms' : '') + '">'
      + '<div class="nh">' + icon('clock', 's') + '<span>' + esc(clk(x.at)) + ' · ' + x.len.toLocaleString('id-ID') + ' karakter</span></div>'
      + '<button class="ntext" type="button" data-a="copy" aria-label="Salin catatan ini"><pre>' + esc(x.text) + (x.cut ? '...' : '') + '</pre></button>'
      + '<div class="nf"><button class="btn" type="button" data-a="more" hidden>Selengkapnya</button><span class="grow"></span>'
      + '<button class="btn pri" type="button" data-a="copy">' + icon('copy', 's') + 'Salin</button>'
      + '<button class="ib bad" type="button" data-a="del" aria-label="Hapus catatan">' + icon('trash') + '</button></div></article></div>';
  }
  function measure() {
    var ns = $('list').querySelectorAll('.note:not(.sk)');
    for (var i = 0; i < ns.length; i++) { var n = ns[i], pre = n.querySelector('pre'), b = n.querySelector('[data-a=more]'), id = n.getAttribute('data-id'), x = null;
      S.items.forEach(function (y) { if (y.id === id) x = y; });
      if (n.className.indexOf(' open') >= 0) { b.hidden = false; b.textContent = 'Lebih sedikit'; continue; }
      b.hidden = !(x && x.cut) && !(pre.scrollHeight > pre.clientHeight + 1); b.textContent = 'Selengkapnya'; }
  }
  var lastH = '';
  function draw(fresh) {
    var L = visible();
    $('cnt').textContent = (S.q ? S.total + ' cocok dari ' : '') + S.all + ' catatan';
    var h;
    if (!S.got) h = [1, 2, 3].map(function () { return '<div class="note sk" style="height:150px"></div>'; }).join('');
    else if (!L.length) h = '<div class="empty" style="grid-column:1/-1">' + (S.q ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan. Tempel sesuatu dengan Ctrl+V.') + '</div>';
    else h = L.map(function (x, i) { return card(x, i, fresh); }).join('');
    var key = h.replace(/ rise"/g, '"').replace(/ style="animation-delay:[0-9]+ms"/g, ' style=""');
    if (key !== lastH) { lastH = key; var open = {}; var ns = $('list').querySelectorAll('.note.open'); for (var k = 0; k < ns.length; k++) open[ns[k].getAttribute('data-id')] = 1;
      $('list').innerHTML = h; for (var id in open) { var el = $('list').querySelector('.note[data-id="' + id + '"]'); if (el) { el.className += ' open'; var pr = el.querySelector('pre'); if (S.full[id] != null) pr.textContent = S.full[id]; } } measure(); }
    $('more').hidden = !(S.got && S.items.length < S.total);
  }
  function save(first) { try { DS.store.set('klip:first', { q: S.q, items: S.items.slice(0, 30), total: S.total, all: S.all }); } catch (e) {} }
  function load(reset) {
    if (S.loading) return Promise.resolve(); S.loading = true;
    var off = reset ? 0 : S.items.length, lim = reset ? Math.max(S.pageSize, S.items.length) : S.pageSize; if (lim > 100) lim = 100;
    return api('/api/klip/list', { q: S.q, offset: off, limit: lim }).then(function (r) {
      S.loading = false; if (!r || !r.ok) return;
      if (reset) S.items = r.items; else { var have = {}; S.items.forEach(function (x) { have[x.id] = 1; }); r.items.forEach(function (x) { if (!have[x.id]) S.items.push(x); }); }
      S.total = r.total; S.all = r.all; S.got = true; if (!S.q && reset) save(); draw(false);
    }).catch(function () { S.loading = false; if (!S.got) { draw(); } DS.toast('Tidak bisa memuat catatan. Periksa koneksi, lalu tarik ke bawah.', { bad: true }); });
  }
  // ---- simpan ----
  var queue = Promise.resolve();
  function saveText(t) {
    if (!t || !t.trim()) { DS.toast('Teksnya kosong.', { bad: true }); return; }
    var b = $('save'); b.className = 'btn pri busy';
    queue = queue.then(function () { return api('/api/klip/add', { text: t }); }).then(function (r) {
      b.className = 'btn pri';
      if (r && r.ok) { DS.toast(r.duplicate ? 'Sama dengan catatan terakhir, tidak disimpan dua kali.' : 'Tersimpan.'); $('box').value = ''; grow(); S.fresh = true; return load(true); }
      DS.toast((r && r.error) || 'Gagal menyimpan.', { bad: true });
    }).catch(function () { b.className = 'btn pri'; DS.toast('Gagal menyimpan (koneksi terputus?).', { bad: true }); });
  }
  function grow() { var t = $('box'); t.style.height = 'auto'; t.style.height = Math.min(168, t.scrollHeight) + 'px'; }
  $('box').addEventListener('input', grow);
  $('save').onclick = function () { saveText($('box').value); };
  // Tempel: iPhone menanyakan izin lewat gelembung "Tempel" bawaan; bila tidak bisa, kolom tulis difokuskan supaya bisa tekan lama lalu Tempel
  $('pastb').onclick = function () {
    var box = $('box');
    function fallback() { box.focus(); DS.toast('Tekan lama di kolom tulis, lalu pilih Tempel.'); }
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
      navigator.clipboard.readText().then(function (t) { if (t) { box.value = (box.value ? box.value + '\n' : '') + t; grow(); box.focus(); } else fallback(); }, fallback);
    } else fallback();
  };
  document.addEventListener('paste', function (e) {
    var t = e.target; if (t && (t.id === 'q' || t.id === 'box')) return;
    var txt = e.clipboardData && e.clipboardData.getData('text'); if (txt == null) return;
    e.preventDefault(); saveText(txt);
  });
  var timer = null;
  $('q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { S.q = $('q').value.trim(); S.fresh = true; load(true); }, 250); });
  $('more').onclick = function () { load(false); };
  if (window.IntersectionObserver) { new IntersectionObserver(function (es) { if (es[0].isIntersecting && !$('more').hidden && !S.loading) load(false); }, { rootMargin: '200px' }).observe($('more')); }
  // ---- salin: teks yang sudah ada disalin langsung saat disentuh (syarat iPhone) ----
  function find(id) { var x = null; S.items.forEach(function (y) { if (y.id === id) x = y; }); return x; }
  function expand(el, x) {
    el.className += ' open'; var pre = el.querySelector('pre'); if (S.full[x.id] != null) pre.textContent = S.full[x.id]; measure();
  }
  function doCopy(el, x) {
    function pick() { // cadangan: kolom teks biasa; tekan lama di dalamnya lalu pilih "Salin" (selalu memunculkan gelembung di iPhone)
      var show = function (full) { $('cpbox').value = full; DS.openSheet('shCp'); setTimeout(function () { var b = $('cpbox'); b.focus(); b.setSelectionRange(0, b.value.length); }, 350); };
      if (!x.cut || S.full[x.id] != null) { show(S.full[x.id] != null ? S.full[x.id] : x.text); return; }
      api('/api/klip/get', { id: x.id }).then(function (r) { if (r && r.ok) { S.full[x.id] = r.text; show(r.text); } else DS.toast('Gagal mengambil teks.', { bad: true }); }).catch(function () { DS.toast('Gagal mengambil teks.', { bad: true }); });
    }
    var done = function (ok) { if (ok) DS.toast('Disalin', DS.ios ? { action: 'Tidak bisa ditempel?', onAction: pick, ms: 6000 } : {}); else DS.toast('Gagal menyalin. Buka "Selengkapnya", lalu tekan Salin lagi.', { bad: true }); };
    if (!x.cut) { DS.copy(x.text, done); return; }
    if (S.full[x.id] != null) { DS.copy(S.full[x.id], done); return; }
    api('/api/klip/get', { id: x.id }).then(function (r) {
      if (!r.ok) { DS.toast(r.error || 'Gagal.', { bad: true }); return; }
      S.full[x.id] = r.text;
      DS.copy(r.text, function (ok) { if (ok) DS.toast('Disalin'); else { expand(el, x); DS.toast('Teks panjang dibuka. Tekan Salin sekali lagi.'); } });
    }).catch(function () { DS.toast('Gagal mengambil teks.', { bad: true }); });
  }
  // ---- hapus dengan Urungkan 5 detik (dihapus di server setelah 5 detik; Urungkan membatalkan) ----
  function commit(id) { var p = S.pend[id]; if (!p) return; clearTimeout(p.t); delete S.pend[id];
    api('/api/klip/delete', { id: id }).then(function (r) { if (r && r.ok) { S.items = S.items.filter(function (y) { return y.id !== id; }); S.total = Math.max(0, S.total - 1); S.all = Math.max(0, S.all - 1); draw(false); } else { DS.toast((r && r.error) || 'Gagal menghapus.', { bad: true }); draw(false); } }).catch(function () { DS.toast('Gagal menghapus (koneksi terputus?).', { bad: true }); draw(false); });
  }
  function del(id) {
    if (S.pend[id]) return; S.pend[id] = { t: setTimeout(function () { commit(id); }, 5200) }; draw(false);
    DS.toast('Catatan dihapus', { action: 'Urungkan', onAction: function () { var p = S.pend[id]; if (p) { clearTimeout(p.t); delete S.pend[id]; draw(false); } } });
  }
  function flush() { for (var id in S.pend) { var p = S.pend[id]; clearTimeout(p.t); delete S.pend[id]; try { api('/api/klip/delete', { id: id }, true); } catch (e) {} } }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); else load(true); });
  $('list').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
    var el = b.closest('.note'); if (!el) return; var x = find(el.getAttribute('data-id')); if (!x) return; var a = b.getAttribute('data-a');
    if (a === 'copy') { doCopy(el, x); return; }
    if (a === 'del') { del(x.id); return; }
    if (a === 'more') {
      if (el.className.indexOf(' open') >= 0) { el.className = el.className.replace(' open', ''); var pr = el.querySelector('pre'); pr.textContent = x.text + (x.cut ? '...' : ''); measure(); return; }
      if (!x.cut || S.full[x.id] != null) { expand(el, x); return; }
      b.className = 'btn busy';
      api('/api/klip/get', { id: x.id }).then(function (r) { b.className = 'btn'; if (!r.ok) { DS.toast(r.error || 'Gagal.', { bad: true }); return; } S.full[x.id] = r.text; expand(el, x); }).catch(function () { b.className = 'btn'; DS.toast('Gagal mengambil teks.', { bad: true }); });
    }
  });
  // ---- geser kartu ke kiri = hapus (sentuhan) ----
  var sw = null;
  $('list').addEventListener('touchstart', function (e) {
    var n = e.target.closest ? e.target.closest('.note') : null; if (!n || e.touches.length !== 1) { sw = null; return; }
    sw = { n: n, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false };
  }, { passive: true });
  $('list').addEventListener('touchmove', function (e) {
    if (!sw) return; var dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
    if (!sw.on) { if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) { sw.on = true; sw.n.className += ' moving'; } else { if (Math.abs(dy) > 12) sw = null; return; } }
    if (e.cancelable) e.preventDefault();
    sw.dx = Math.min(0, dx); sw.n.style.transform = 'translateX(' + sw.dx + 'px)'; sw.n.parentNode.className = 'nw' + (sw.dx < -8 ? ' sw' : '');
  }, { passive: false });
  function swEnd() { if (!sw) return; var n = sw.n, dx = sw.dx, on = sw.on; sw = null; if (!on) return;
    n.className = n.className.replace(' moving', ''); n.style.transform = ''; n.parentNode.className = 'nw';
    if (dx < -90) { del(n.getAttribute('data-id')); } }
  $('list').addEventListener('touchend', swEnd); $('list').addEventListener('touchcancel', function () { if (sw) { var n = sw.n; sw = null; n.className = n.className.replace(' moving', ''); n.style.transform = ''; n.parentNode.className = 'nw'; } });
  window.addEventListener('resize', measure);
  DS.pullRefresh(function () { S.fresh = true; return load(true); });
  DS.initShell({});
  // data terakhir dari browser langsung tampil, lalu diperbarui
  var c = DS.store.get('klip:first'); if (c && c.items && !c.q) { S.items = c.items; S.total = c.total; S.all = c.all; S.got = true; }
  S.fresh = true; draw(true); load(true); grow();
}

const sheets = `<div class="sheet" id="shCp" role="dialog" aria-modal="true" aria-labelledby="cpT" style="--w:480px"><div class="scrim" data-close></div><div class="panel" tabindex="-1"><div class="grab"></div>
<div class="sh-h"><h2 id="cpT">Salin manual</h2><button class="ib flat" type="button" data-close aria-label="Tutup">${I('x')}</button></div>
<div class="sh-b"><p class="fhelp" style="margin:0 0 10px">Tekan lama di dalam kotak ini, pilih <b>Pilih Semua</b>, lalu <b>Salin</b>. Setelah itu tempel di WA seperti biasa.</p><textarea class="inp" id="cpbox" rows="8" style="width:100%"></textarea></div></div></div>`;

const page = () => ds.page({
  title: 'Papan klip', cur: 'more', h1: 'Papan klip', sub: 'Titip teks dan catatan',
  css, body, sheets, script: '(' + klipApp.toString() + ')();',
});

module.exports = { createClipStore, page, MAX_ITEM_CHARS };
