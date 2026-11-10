// Halaman "Rekaman Kejadian": daftar klip saat kamera putus (2 menit sebelum putus + 2 menit sesudah menyala) dan pemutarnya.
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
module.exports = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rekaman Kejadian - Bardi Monitor</title><style>${BASE_CSS}
header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--card);border-bottom:1px solid var(--bd);flex-wrap:wrap}
header h1{font-size:17px;margin:0}
.btn{display:inline-block;padding:6px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--tx);text-decoration:none;font-size:14px;cursor:pointer}
.btn.pri{background:var(--pri);color:#fff;border-color:var(--pri)}
main{max-width:1100px;margin:0 auto;padding:14px 16px 40px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.mut{color:var(--mut);font-size:13px}
#chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.chip{font-size:12px;padding:3px 9px;border-radius:99px;border:1px solid var(--bd);display:flex;gap:6px;align-items:center}
.chip i{width:8px;height:8px;border-radius:50%;background:#999;display:inline-block}
.chip.ok i{background:var(--ok)}.chip.putus i{background:var(--bad)}.chip.login i{background:var(--warn)}
#player{position:sticky;top:0;z-index:5;display:none}
#player video{width:100%;max-height:60vh;background:#000;border-radius:8px;display:block}
#tl{position:relative;height:14px;background:var(--bd);border-radius:7px;margin:10px 0 6px}
#tl b{position:absolute;top:-3px;width:4px;height:20px;border-radius:2px;background:var(--bad);margin-left:-2px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row .grow{flex:1;min-width:200px}
.badge{font-size:12px;padding:2px 8px;border-radius:99px;color:#fff;background:#888}
.badge.b{background:var(--bad)}.badge.s{background:var(--ok)}.badge.t{background:var(--warn)}
.item h3{margin:0 0 2px;font-size:16px}
select,input{padding:6px 8px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font-size:14px}
.warn{color:var(--warn);font-size:13px;margin-top:4px}
</style></head><body>
<header><h1>Rekaman Kejadian - kamera putus</h1><div class="row"><a class="btn" href="/displaycostum.html">Laporan</a><a class="btn" href="/multiview">Multiview</a><a class="btn" href="/onvif">Kelola kamera</a></div></header>
<main>
<div class="card"><b>Status perekam</b> <span class="mut" id="dirinfo"></span>
<div class="mut">Tiap kamera terdaftar direkam ke buffer sementara. Saat kamera berhenti mengirim gambar 60 detik, 2 menit sebelumnya disimpan; saat menyala lagi, 2 menit sesudahnya ditambahkan. Suara tidak direkam. Klip disimpan <span id="days">7</span> hari, lebih lama dari itu dihapus otomatis.</div>
<div id="chips"></div></div>
<div class="card" id="player"><div class="row"><b class="grow" id="ptitle"></b><a class="btn" id="pdl" download>Unduh</a><button class="btn" id="pclose">Tutup</button></div>
<video id="v" controls playsinline></video><div id="tl"></div><div class="row" id="pj"></div><div class="mut" id="pnote"></div></div>
<div class="card row"><span>Kamera:</span><select id="fcam"><option value="">Semua kamera</option></select><span class="mut" id="cnt"></span></div>
<div id="list"></div>
</main>
<script>
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function dur(s){s=Math.round(s||0);var m=Math.floor(s/60),x=s-m*60;return m>0?(m+' mnt '+x+' dtk'):(x+' dtk')}
function clk(s){var d=new Date(s);return d.toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function tm(s){var d=new Date(s);return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
var DATA={incidents:[],recorder:[]},cur=null;
var STATE={ok:'merekam',putus:'putus',mulai:'menyiapkan',login:'login ditolak'};
function drawChips(){
  $('chips').innerHTML=DATA.recorder.map(function(r){
    var t=STATE[r.state]||r.state; if(r.state==='putus'&&r.sejak)t+=' sejak '+tm(r.sejak);
    return '<span class="chip '+esc(r.state)+'" title="'+esc(r.error||'')+'"><i></i>'+esc(r.name)+' - '+esc(t)+'</span>'
  }).join('')||'<span class="mut">Belum ada kamera terdaftar.</span>';
  var sel=$('fcam'),v=sel.value,seen={},opts='<option value="">Semua kamera</option>';
  DATA.incidents.forEach(function(x){if(!seen[x.id]){seen[x.id]=1;opts+='<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}});
  if(sel.getAttribute('data-o')!==opts){sel.innerHTML=opts;sel.setAttribute('data-o',opts);sel.value=v}
}
function drawList(){
  var f=$('fcam').value,L=DATA.incidents.filter(function(x){return !f||x.id===f});
  $('cnt').textContent=L.length+' kejadian';
  $('list').innerHTML=L.map(function(x,i){
    var b=x.status==='berlangsung'?'<span class="badge b">kamera masih mati</span>':x.status==='selesai'?'<span class="badge s">selesai</span>':'<span class="badge t">tidak selesai</span>';
    var t='Putus '+esc(clk(x.lostAt));
    if(x.recoveredAt)t+=' &middot; menyala lagi '+esc(tm(x.recoveredAt))+' (mati '+esc(dur(x.downSec))+')';
    var h='<div class="card item"><div class="row"><div class="grow"><h3>'+esc(x.name)+' '+b+'</h3><div class="mut">'+t+'</div>';
    if(x.hasFile)h+='<div class="mut">Klip '+esc(dur(x.durationSec))+(x.joins.length>1?' &middot; terputus '+x.joins.length+' kali':'')+'</div>';
    if(x.bersamaan.length)h+='<div class="warn">Kamera lain putus hampir bersamaan: '+esc(x.bersamaan.join(', '))+' (kemungkinan masalah di titik bersama: listrik, switch, atau kabel)</div>';
    if(x.catatan)h+='<div class="warn">'+esc(x.catatan)+'</div>';
    h+='</div>';
    if(x.hasFile)h+='<button class="btn pri" data-k="'+esc(x.id+'|'+x.stamp)+'">Putar</button>';
    return h+'</div></div>'
  }).join('')||'<div class="mut">Belum ada kejadian. Klip muncul di sini saat ada kamera yang putus.</div>';
  var bs=$('list').getElementsByTagName('button');
  for(var i=0;i<bs.length;i++){bs[i].onclick=function(){play(this.getAttribute('data-k'))}}
}
function play(k){
  var p=k.split('|'),x=null;
  DATA.incidents.forEach(function(y){if(y.id===p[0]&&y.stamp===p[1])x=y});
  if(!x||!x.file)return; cur=k;
  var url='/kejadian/f/'+x.id+'/'+x.file;
  $('player').style.display='block';
  $('ptitle').textContent=x.name+' - putus '+clk(x.lostAt);
  var v=$('v');v.src=url;v.load();v.play&&v.play().catch(function(){});
  $('pdl').href=url;$('pdl').setAttribute('download',x.stamp+'.mp4');
  var tl=$('tl'),pj=$('pj'),h='',jh='';
  (x.joins||[]).forEach(function(j,i){
    var pct=x.durationSec>0?Math.min(100,j.atSec/x.durationSec*100):0;
    h+='<b style="left:'+pct+'%" title="Rekaman terputus di sini"></b>';
    jh+='<button class="btn" data-t="'+j.atSec+'">Titik putus '+(i+1)+' ('+esc(dur(j.atSec))+', kamera mati '+esc(dur(j.gapSec))+')</button>';
  });
  tl.innerHTML=h;pj.innerHTML=jh||'<span class="mut">Tidak ada titik sambungan.</span>';
  var bs=pj.getElementsByTagName('button');
  for(var i=0;i<bs.length;i++){bs[i].onclick=function(){var s=Number(this.getAttribute('data-t'));v.currentTime=Math.max(0,s-10);v.play&&v.play().catch(function(){})}}
  $('pnote').textContent='Garis merah di bawah video = titik kamera putus. Bagian sebelum garis adalah 2 menit terakhir sebelum putus; sesudahnya adalah rekaman setelah kamera menyala lagi.'+(x.hevc?' (Kamera H.265: diputar dari salinan H.264; berkas asli tetap tersimpan di folder.)':'');
  window.scrollTo(0,0);
}
$('pclose').onclick=function(){var v=$('v');v.pause();v.removeAttribute('src');v.load();$('player').style.display='none';cur=null};
$('fcam').onchange=drawList;
function load(){
  fetch('/api/kejadian',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(d){
    if(!d||!d.ok)return; DATA=d; if(d.days)$('days').textContent=d.days; $('dirinfo').textContent='- folder klip: '+d.dir; drawChips(); drawList();
  }).catch(function(){})
}
load();setInterval(load,10000);
</script></body></html>`;
