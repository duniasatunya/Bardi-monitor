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

const UIKIT = require('./ui-kit');

const page = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Papan Klip - Bardi Monitor</title><style>${BASE_CSS}${UIKIT.css}
textarea{width:100%;resize:none;flex:1;min-height:60px}
.cp{flex:1;min-height:0;margin:0;padding:5px 7px;border-radius:6px;background:rgba(127,127,127,.12);white-space:pre-wrap;word-break:break-word;overflow:hidden;font-size:12px;font-family:ui-monospace,Consolas,monospace}
#msg{font-size:12px;min-height:16px}#msg.ok{color:var(--ok)}#msg.bad{color:var(--bad)}
#bigt{margin:0;white-space:pre-wrap;word-break:break-word;font-size:13px;font-family:ui-monospace,Consolas,monospace}
</style></head><body>
${UIKIT.header('Papan Klip', 'klip')}
<div class="tabs"><button data-p="pA">Titip teks</button><button data-p="pB">Catatan</button></div>
<main class="shell" style="grid-template-columns:minmax(260px,340px) minmax(0,1fr)">
<section class="panel" id="pA"><div class="ph"><h2>Titip teks</h2></div>
<div class="mut" style="margin-bottom:6px">Tempel dengan Ctrl+V (atau tahan lalu Tempel di HP) di mana saja di halaman ini. Setiap tempelan langsung tersimpan jadi satu catatan. Tidak ada batas jumlah catatan.</div>
<textarea id="box" placeholder="Tempel di sini. Atau ketik, lalu tekan Simpan."></textarea>
<div class="row" style="margin-top:6px"><button class="btn pri" id="save">Simpan ketikan</button><span id="msg"></span></div></section>
<section class="panel" id="pB"><div class="ph"><input id="q" placeholder="Cari di semua catatan..." style="flex:1;min-width:120px"><span class="mut" id="cnt"></span></div>
<div class="pbody" id="lsHost"></div><div class="pg" id="lsCtl"></div></section>
</main>
<div class="modal" id="mBig"><div class="box full"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b id="bigh">Catatan</b><div class="row"><button class="btn pri" id="bigc">Salin</button><button class="btn" id="bigx">Tutup</button></div></div><div class="mb"><pre id="bigt"></pre></div></div></div>
<script>${UIKIT.js}</script>
<script>
var $=function(i){return document.getElementById(i)};
var esc=UI.esc;
function clk(s){return new Date(s).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
var ITEMS=[],TOTAL=0,ALL=0,Q='',PAGE=0,SIZE=6,timer=null,FULL={},BIG='';
function say(t,ok){var m=$('msg');m.textContent=t;m.className=ok?'ok':'bad';clearTimeout(say.t);say.t=setTimeout(function(){m.textContent=''},4000)}
function api(p,b){return fetch(p,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(function(r){return r.json()})}
function draw(){
  $('cnt').textContent=(Q?TOTAL+' cocok dari ':'')+ALL+' catatan';
  var pages=Math.max(1,Math.ceil(TOTAL/SIZE));
  var f=UI.fit($('lsHost'),{tw:290,th:150,gap:8});
  $('lsHost').innerHTML=ITEMS.length?'<div class="tiles" style="--cols:'+f.cols+';--th:150px;--g:8px">'+ITEMS.map(function(x){
    return '<div class="tile" data-id="'+esc(x.id)+'"><div class="mut">'+esc(clk(x.at))+' &middot; '+x.len+' karakter</div><pre class="cp">'+esc(x.text)+(x.cut?'...':'')+'</pre><div class="ta"><button class="btn sm pri" data-a="copy">Salin</button><button class="btn sm" data-a="open">Lihat</button><button class="btn sm danger" data-a="del">Hapus</button></div></div>'}).join('')+'</div>'
    :'<div class="mut" style="padding:8px 2px">'+(Q?'Tidak ada catatan yang cocok.':'Belum ada catatan. Tempel sesuatu dengan Ctrl+V.')+'</div>';
  UI.ctl($('lsCtl'),PAGE,pages,TOTAL,'catatan',function(d){PAGE+=d;load()});
}
function load(){
  var f=UI.fit($('lsHost'),{tw:290,th:150,gap:8});SIZE=Math.max(1,Math.min(100,f.size));
  var maxPage=Math.max(0,Math.ceil(TOTAL/SIZE)-1);if(PAGE>maxPage&&TOTAL>0)PAGE=maxPage;
  return api('/api/klip/list',{q:Q,offset:PAGE*SIZE,limit:SIZE}).then(function(r){
    if(!r||!r.ok)return;
    ITEMS=r.items;TOTAL=r.total;ALL=r.all;
    if(!ITEMS.length&&TOTAL>0&&PAGE>0){PAGE=Math.max(0,Math.ceil(TOTAL/SIZE)-1);return load()}
    draw()
  }).catch(function(){})
}
var queue=Promise.resolve();
function saveText(t){
  if(!t||!t.trim()){say('Teksnya kosong.',false);return}
  queue=queue.then(function(){return api('/api/klip/add',{text:t})}).then(function(r){
    if(r&&r.ok){say(r.duplicate?'Sama dengan catatan terakhir, tidak disimpan dua kali.':'Tersimpan.',true);$('box').value='';PAGE=0;return load()}
    say((r&&r.error)||'Gagal menyimpan.',false)
  }).catch(function(){say('Gagal menyimpan (koneksi terputus?).',false)})
}
document.addEventListener('paste',function(e){
  var t=e.target;
  if(t&&t.id==='q')return;
  var txt=e.clipboardData&&e.clipboardData.getData('text');
  if(txt==null)return;
  e.preventDefault();saveText(txt)
});
$('save').onclick=function(){saveText($('box').value)};
$('q').oninput=function(){clearTimeout(timer);timer=setTimeout(function(){Q=$('q').value.trim();PAGE=0;load()},250)};
function bigOpen(text,head){BIG=text;$('bigt').textContent=text;$('bigh').textContent=head||'Catatan';UI.show('mBig')}
$('bigc').onclick=function(){UI.copy(BIG,function(ok){$('bigc').textContent=ok?'Tersalin':'Gagal, tahan teks lalu salin';setTimeout(function(){$('bigc').textContent='Salin'},2200)})};
$('bigx').onclick=function(){UI.hide('mBig')};
$('lsHost').onclick=function(e){
  var b=e.target;if(!b||!b.getAttribute)return;var a=b.getAttribute('data-a');if(!a)return;
  var card=b.parentNode;while(card&&!(card.getAttribute&&card.getAttribute('data-id')))card=card.parentNode;if(!card)return;
  var id=card.getAttribute('data-id'),x=null;for(var i=0;i<ITEMS.length;i++){if(ITEMS[i].id===id)x=ITEMS[i]}
  if(!x)return;
  if(a==='copy'){
    // Teks utuh yang sudah ada disalin langsung saat disentuh (syarat iPhone). Teks panjang: ambil dulu, kalau gagal tampil di jendela dengan tombol Salin.
    var done=function(ok){say(ok?'Tersalin ke clipboard.':'Gagal menyalin.',ok)};
    if(!x.cut){UI.copy(x.text,done);return}
    if(FULL[id]!=null){UI.copy(FULL[id],done);return}
    api('/api/klip/get',{id:id}).then(function(r){
      if(!r.ok){say(r.error||'Gagal.',false);return}
      FULL[id]=r.text;
      UI.copy(r.text,function(ok){if(ok)say('Tersalin ke clipboard.',true);else bigOpen(r.text,'Catatan panjang: tekan Salin')})
    }).catch(function(){say('Gagal mengambil teks.',false)});
    return}
  if(a==='del'){if(!confirm('Hapus catatan ini? Tidak bisa dikembalikan.'))return;api('/api/klip/delete',{id:id}).then(function(r){if(r.ok){say('Dihapus.',true);load()}else say(r.error||'Gagal menghapus.',false)});return}
  if(a==='open'){if(!x.cut){bigOpen(x.text,clk(x.at));return}
    if(FULL[id]!=null){bigOpen(FULL[id],clk(x.at));return}
    api('/api/klip/get',{id:id}).then(function(r){if(!r.ok)return;FULL[id]=r.text;bigOpen(r.text,clk(x.at))})}
};
var rt=null;function rs(){clearTimeout(rt);rt=setTimeout(load,80)}
if(window.ResizeObserver){try{new ResizeObserver(rs).observe($('lsHost'))}catch(e){window.addEventListener('resize',rs)}}else window.addEventListener('resize',rs);
UI.tabs('pB');
load();
</script></body></html>`;

module.exports = { createClipStore, page, MAX_ITEM_CHARS };
