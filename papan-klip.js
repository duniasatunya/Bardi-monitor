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
    list({ q, offset } = {}) {
      const needle = String(q || '').trim().toLowerCase();
      const src = needle ? items.filter((x) => x.text.toLowerCase().includes(needle)) : items;
      const off = Math.max(0, parseInt(offset, 10) || 0);
      return { ok: true, all: items.length, total: src.length, offset: off, items: src.slice(off, off + PAGE_SIZE).map(view) };
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

const page = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Papan Klip - Bardi Monitor</title><style>${BASE_CSS}
header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--card);border-bottom:1px solid var(--bd);flex-wrap:wrap}
header h1{font-size:17px;margin:0}
.btn{display:inline-block;padding:6px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--tx);text-decoration:none;font-size:14px;cursor:pointer}
.btn.pri{background:var(--pri);color:#fff;border-color:var(--pri)}
main{max-width:900px;margin:0 auto;padding:14px 16px 40px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.mut{color:var(--mut);font-size:13px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.row .grow{flex:1;min-width:160px}
textarea{width:100%;min-height:90px;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font-size:14px;font-family:inherit;resize:vertical}
input{padding:6px 8px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font-size:14px}
pre{margin:6px 0 0;padding:8px;border-radius:8px;background:rgba(127,127,127,.12);white-space:pre-wrap;word-break:break-word;font-size:13px;max-height:9.5em;overflow:hidden}
pre.open{max-height:none}
#msg{font-size:13px;min-height:18px}
#msg.ok{color:var(--ok)}#msg.bad{color:var(--bad)}
</style></head><body>
<header><h1>Papan Klip</h1><div class="row"><a class="btn" href="/displaycostum.html">Laporan</a><a class="btn" href="/kejadian">Rekaman kejadian</a><a class="btn" href="/onvif">Kamera ONVIF</a></div></header>
<main>
<div class="card"><b>Titip teks</b>
<div class="mut" style="margin:2px 0 6px">Klik kotak di bawah (atau di mana saja di halaman ini) lalu tempel dengan Ctrl+V. Setiap tempelan langsung tersimpan jadi satu catatan, tanpa tombol. Tidak ada batas jumlah catatan.</div>
<textarea id="box" placeholder="Tempel di sini (Ctrl+V). Atau ketik, lalu tekan Simpan."></textarea>
<div class="row" style="margin-top:6px"><button class="btn pri" id="save">Simpan ketikan</button><span id="msg"></span></div></div>
<div class="card row"><input id="q" class="grow" placeholder="Cari di semua catatan..."><span class="mut" id="cnt"></span></div>
<div id="list"></div>
<div class="row"><button class="btn" id="more" style="display:none">Tampilkan lebih banyak</button></div>
</main>
<script>
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clk(s){return new Date(s).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
var NL=String.fromCharCode(10);
var ITEMS=[],TOTAL=0,ALL=0,Q='',timer=null;
function say(t,ok){var m=$('msg');m.textContent=t;m.className=ok?'ok':'bad';clearTimeout(say.t);say.t=setTimeout(function(){m.textContent=''},4000)}
function api(p,b){return fetch(p,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(function(r){return r.json()})}
function draw(){
  $('cnt').textContent=(Q?TOTAL+' cocok dari ':'')+ALL+' catatan';
  $('list').innerHTML=ITEMS.map(function(x){
    var lines=x.text.split(NL).length;
    return '<div class="card" data-id="'+esc(x.id)+'"><div class="row"><span class="mut grow">'+esc(clk(x.at))+' &middot; '+x.len+' karakter</span><button class="btn" data-a="copy">Salin</button><button class="btn" data-a="del">Hapus</button></div><pre>'+esc(x.text)+(x.cut?'...':'')+'</pre>'+((lines>8||x.cut)?'<button class="btn" data-a="open" style="margin-top:6px">Tampilkan semua</button>':'')+'</div>'
  }).join('')||'<div class="mut">'+(Q?'Tidak ada catatan yang cocok.':'Belum ada catatan. Tempel sesuatu dengan Ctrl+V.')+'</div>';
  $('more').style.display=ITEMS.length<TOTAL?'inline-block':'none';
}
function load(reset){
  var off=reset?0:ITEMS.length;
  return api('/api/klip/list',{q:Q,offset:off}).then(function(r){
    if(!r||!r.ok)return;
    ITEMS=reset?r.items:ITEMS.concat(r.items);TOTAL=r.total;ALL=r.all;draw()
  }).catch(function(){})
}
var queue=Promise.resolve();
function saveText(t){
  if(!t||!t.trim()){say('Teksnya kosong.',false);return}
  queue=queue.then(function(){return api('/api/klip/add',{text:t})}).then(function(r){
    if(r&&r.ok){say(r.duplicate?'Sama dengan catatan terakhir, tidak disimpan dua kali.':'Tersimpan.',true);$('box').value='';return load(true)}
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
$('q').oninput=function(){clearTimeout(timer);timer=setTimeout(function(){Q=$('q').value.trim();load(true)},250)};
$('more').onclick=function(){load(false)};
function copyText(t){
  if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t)}
  return new Promise(function(res,rej){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy')}catch(_){}document.body.removeChild(a);ok?res():rej()})
}
$('list').onclick=function(e){
  var b=e.target;if(!b||!b.getAttribute)return;var a=b.getAttribute('data-a');if(!a)return;
  var card=b.parentNode;while(card&&!(card.getAttribute&&card.getAttribute('data-id')))card=card.parentNode;if(!card)return;
  var id=card.getAttribute('data-id');
  if(a==='copy'){api('/api/klip/get',{id:id}).then(function(r){if(!r.ok){say(r.error||'Gagal.',false);return}return copyText(r.text).then(function(){say('Tersalin ke clipboard.',true)})}).catch(function(){say('Gagal menyalin. Tahan teks lalu salin manual.',false)})}
  if(a==='del'){if(!confirm('Hapus catatan ini? Tidak bisa dikembalikan.'))return;api('/api/klip/delete',{id:id}).then(function(r){if(r.ok){say('Dihapus.',true);load(true)}else say(r.error||'Gagal menghapus.',false)})}
  if(a==='open'){api('/api/klip/get',{id:id}).then(function(r){if(!r.ok)return;var p=card.getElementsByTagName('pre')[0];p.textContent=r.text;p.className='open';b.style.display='none'})}
};
load(true);
</script></body></html>`;

module.exports = { createClipStore, page, MAX_ITEM_CHARS };
