// Halaman "Rekaman Kejadian": daftar klip saat kamera putus (2 menit sebelum putus + 2 menit sesudah menyala) dan pemutarnya.
// Tampilan: daftar di kiri, pemutar di kanan (di HP: dua tab). Satu layar tanpa gulir panjang.
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
const UIKIT = require('./ui-kit');
module.exports = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Rekaman Kejadian - Bardi Monitor</title><style>${BASE_CSS}${UIKIT.css}
.vwrap{flex:1;min-height:0;position:relative;background:#000;border-radius:8px;overflow:hidden}
.vwrap video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;background:#000}
.vwrap .ph0{position:absolute;left:0;right:0;top:42%;text-align:center;color:#9aa2b3;font-size:13px;padding:0 12px;pointer-events:none}
#tl{flex:none;position:relative;height:12px;background:var(--bd);border-radius:6px;margin:10px 0 6px}
#tl b{position:absolute;top:-3px;width:4px;height:18px;border-radius:2px;background:var(--bad);margin-left:-2px}
#pj{flex:none;display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:12px;padding:3px 9px;border-radius:99px;border:1px solid var(--bd);display:inline-flex;gap:6px;align-items:center;margin:0 6px 6px 0}
.chip i{width:8px;height:8px;border-radius:50%;background:#999;display:inline-block}
.chip.ok i{background:var(--ok)}.chip.putus i{background:var(--bad)}.chip.login i{background:var(--warn)}
.badge{font-size:11px;padding:1px 8px;border-radius:99px;color:#fff;background:#888}
.badge.b{background:var(--bad)}.badge.s{background:var(--ok)}.badge.t{background:var(--warn)}
.tile.sel{border-color:var(--pri);box-shadow:0 0 0 1px var(--pri) inset}
.wr{color:var(--warn);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body>
${UIKIT.header('Rekaman Kejadian - kamera putus', 'kj')}
<div class="tabs"><button data-p="pA">Daftar</button><button data-p="pB">Pemutar</button></div>
<main class="shell" style="grid-template-columns:minmax(300px,430px) minmax(0,1fr)">
<section class="panel" id="pA"><div class="ph"><h2>Kejadian</h2><select id="fcam"><option value="">Semua kamera</option></select><button class="btn sm" id="bst">Status perekam</button></div>
<div class="mut" id="cnt" style="margin-bottom:6px"></div>
<div class="pbody" id="lsHost"></div><div class="pg" id="lsCtl"></div></section>
<section class="panel" id="pB"><div class="ph"><h2 id="ptitle">Pemutar</h2><a class="btn sm" id="pdl" download style="display:none">Unduh</a></div>
<div class="vwrap"><video id="v" controls playsinline preload="metadata"></video><div class="ph0" id="ph0">Pilih kejadian di daftar, lalu tekan Putar.</div></div>
<div id="tl" style="display:none"></div><div id="pj"></div><div class="mut" id="pnote" style="margin-top:6px"></div></section>
</main>
<div class="modal" id="mSt"><div class="box" style="max-width:720px;max-height:90%"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Status perekam <span class="mut" id="dirinfo"></span></b><button class="btn" id="stx">Tutup</button></div>
<div class="mb"><div class="mut" style="margin-bottom:8px">Tiap kamera terdaftar direkam ke buffer sementara. Saat kamera berhenti mengirim gambar 60 detik, 2 menit sebelumnya disimpan; saat menyala lagi, 2 menit sesudahnya ditambahkan. Suara tidak direkam. Klip disimpan <span id="days">7</span> hari, lebih lama dari itu dihapus otomatis.</div><div id="chips"></div></div></div></div>
<script>${UIKIT.js}</script>
<script>
var $=function(i){return document.getElementById(i)};
var esc=UI.esc;
function dur(s){s=Math.round(s||0);var m=Math.floor(s/60),x=s-m*60;return m>0?(m+' mnt '+x+' dtk'):(x+' dtk')}
function clk(s){var d=new Date(s);return d.toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function tm(s){var d=new Date(s);return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
var DATA={incidents:[],recorder:[]},cur=null;
var STATE={ok:'merekam',putus:'putus',mulai:'menyiapkan',login:'login ditolak'};
function drawChips(){
  var n=DATA.recorder.length,ok=0;DATA.recorder.forEach(function(r){if(r.state==='ok')ok++});
  $('bst').textContent=n?('Status perekam: '+ok+'/'+n+' merekam'):'Status perekam';
  $('chips').innerHTML=DATA.recorder.map(function(r){
    var t=STATE[r.state]||r.state; if(r.state==='putus'&&r.sejak)t+=' sejak '+tm(r.sejak);
    var rate=(r.state==='ok'&&r.rate&&r.rate.avgMbps!=null)?(' - '+r.rate.avgMbps.toFixed(2)+' Mbps'):'';
    return '<span class="chip '+esc(r.state)+'" title="'+esc(r.error||'')+'"><i></i>'+esc(r.name)+' - '+esc(t)+rate+'</span>'
  }).join('')||'<span class="mut">Belum ada kamera terdaftar.</span>';
  var sel=$('fcam'),v=sel.value,seen={},opts='<option value="">Semua kamera</option>';
  DATA.incidents.forEach(function(x){if(!seen[x.id]){seen[x.id]=1;opts+='<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}});
  if(sel.getAttribute('data-o')!==opts){sel.innerHTML=opts;sel.setAttribute('data-o',opts);sel.value=v}
}
var pg=UI.paged($('lsHost'),$('lsCtl'),{mode:'tiles',tw:9999,th:96,gap:8,label:'kejadian',
  empty:'<div class="mut" style="padding:8px 2px">Belum ada kejadian. Klip muncul di sini saat ada kamera yang putus.</div>',
  render:function(x){
    var b=x.status==='berlangsung'?'<span class="badge b">masih mati</span>':x.status==='selesai'?'<span class="badge s">selesai</span>':'<span class="badge t">tidak selesai</span>';
    var t='Putus '+esc(clk(x.lostAt));
    if(x.recoveredAt)t+=' &middot; hidup '+esc(tm(x.recoveredAt))+' (mati '+esc(dur(x.downSec))+')';
    var k=x.id+'|'+x.stamp;
    var h='<div class="tile'+(cur===k?' sel':'')+'"><div class="row" style="flex-wrap:nowrap"><div class="tn" style="flex:1;min-width:0">'+esc(x.name)+'</div>'+b+'</div><div class="tm">'+t+'</div>';
    if(x.hasFile)h+='<div class="tm">Klip '+esc(dur(x.durationSec))+(x.joins.length>1?' &middot; terputus '+x.joins.length+' kali':'')+'</div>';
    else if(x.catatan)h+='<div class="wr">'+esc(x.catatan)+'</div>';
    if(x.bersamaan.length)h+='<div class="wr" title="Kemungkinan masalah di titik bersama: listrik, switch, atau kabel">Bersamaan: '+esc(x.bersamaan.join(', '))+'</div>';
    if(x.hasFile)h+='<div class="ta"><button class="btn sm pri" data-k="'+esc(k)+'">Putar</button></div>';
    return h+'</div>'}});
function drawList(){
  var f=$('fcam').value,L=DATA.incidents.filter(function(x){return !f||x.id===f});
  $('cnt').textContent=L.length+' kejadian';
  pg.set(L);
}
$('lsHost').onclick=function(e){var b=e.target;if(b&&b.getAttribute&&b.getAttribute('data-k'))play(b.getAttribute('data-k'))};
function play(k){
  var p=k.split('|'),x=null;
  DATA.incidents.forEach(function(y){if(y.id===p[0]&&y.stamp===p[1])x=y});
  if(!x||!x.file)return; cur=k;
  var url='/kejadian/f/'+x.id+'/'+x.file;
  $('ph0').style.display='none';
  $('ptitle').textContent=x.name+' - putus '+clk(x.lostAt);
  var v=$('v');v.src=url;v.load();var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});
  $('pdl').style.display='inline-flex';$('pdl').href=url;$('pdl').setAttribute('download',x.stamp+'.mp4');
  var tl=$('tl'),pj=$('pj'),h='',jh='';
  (x.joins||[]).forEach(function(j,i){
    var pct=x.durationSec>0?Math.min(100,j.atSec/x.durationSec*100):0;
    h+='<b style="left:'+pct+'%" title="Rekaman terputus di sini"></b>';
    jh+='<button class="btn sm" data-t="'+j.atSec+'">Titik putus '+(i+1)+' ('+esc(dur(j.atSec))+', mati '+esc(dur(j.gapSec))+')</button>';
  });
  tl.innerHTML=h;tl.style.display=h?'block':'none';pj.innerHTML=jh;
  var bs=pj.getElementsByTagName('button');
  for(var i=0;i<bs.length;i++){bs[i].onclick=function(){var s=Number(this.getAttribute('data-t'));v.currentTime=Math.max(0,s-10);var q=v.play();if(q&&q.catch)q.catch(function(){})}}
  $('pnote').textContent='Garis merah = titik kamera putus. Sebelum garis: 2 menit terakhir sebelum putus; sesudahnya: rekaman setelah kamera menyala lagi.'+(x.hevc?' (Kamera H.265: diputar dari salinan H.264.)':'');
  drawList();
  if(UI.pickTab)UI.pickTab('pB');
}
$('fcam').onchange=function(){pg.page=0;drawList()};
$('bst').onclick=function(){UI.show('mSt')};
$('stx').onclick=function(){UI.hide('mSt')};
function load(){
  fetch('/api/kejadian',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(d){
    if(!d||!d.ok)return; DATA=d; if(d.days)$('days').textContent=d.days; $('dirinfo').textContent='- folder klip: '+d.dir; drawChips(); drawList();
  }).catch(function(){})
}
UI.tabs('pA');
load();setInterval(load,10000);
</script></body></html>`;
