// Pemutar langsung tanpa MediaSource, dipakai oleh aplikasi pemantau (Bardi Viewer).
// Alur: WebSocket (MPEG-TS dari relay) -> pembongkar TS (JS) -> VideoDecoder (WebCodecs) -> MediaStreamTrackGenerator -> <video>.
// Tidak ada buffer yang menumpuk seperti MediaSource, jadi aman dibiarkan menyala berhari-hari.
// Berkas ini dilayani server di /vendor/wc-player.js dan juga dites di Node (module.exports).
(function (root) {
  'use strict';

  function hx(n) { return (n < 16 ? '0' : '') + n.toString(16); }
  function cat(a, b) { var c = new Uint8Array(a.length + b.length); c.set(a, 0); c.set(b, a.length); return c; }

  // ---- pembongkar MPEG-TS: keluaran satu "access unit" (satu frame, format Annex-B) per PES video ----
  function TsDemux(onAU, onAudio) {
    this.rest = new Uint8Array(0); this.pmt = -1; this.vpid = -1; this.vtype = 0; this.apid = -1;
    this.parts = null; this.aparts = null; this.onAU = onAU; this.onAudio = onAudio || null;
  }
  TsDemux.prototype.feed = function (chunk) {
    var b = this.rest.length ? cat(this.rest, chunk) : chunk, i = 0, n = b.length;
    while (i < n && b[i] !== 0x47) i++; // cari sinkron
    while (i + 188 <= n) {
      if (b[i] !== 0x47) { i++; while (i < n && b[i] !== 0x47) i++; continue; }
      this.packet(b.subarray(i, i + 188)); i += 188;
    }
    this.rest = i < n ? b.slice(i) : new Uint8Array(0);
  };
  TsDemux.prototype.packet = function (p) {
    var pid = ((p[1] & 0x1f) << 8) | p[2], pusi = (p[1] & 0x40) !== 0, afc = (p[3] >> 4) & 3, off = 4;
    if (afc & 2) off += 1 + p[4];
    if (!(afc & 1) || off >= 188) return;
    var pl = p.subarray(off, 188);
    if (pid === 0 && pusi) { this.pat(pl); return; }
    if (pid === this.pmt && pusi) { this.pmtParse(pl); return; }
    if (pid === this.vpid) {
      if (pusi) { this.flush(); this.parts = [pl]; }
      else if (this.parts) this.parts.push(pl);
    } else if (pid === this.apid) {
      if (pusi) { this.flushA(); this.aparts = [pl]; }
      else if (this.aparts) this.aparts.push(pl);
    }
  };
  TsDemux.prototype.pat = function (pl) {
    var s = pl.subarray(1 + pl[0]), end = 3 + (((s[1] & 0xf) << 8) | s[2]) - 4;
    for (var i = 8; i + 4 <= end && i + 4 <= s.length; i += 4) {
      var prog = (s[i] << 8) | s[i + 1];
      if (prog !== 0) { this.pmt = ((s[i + 2] & 0x1f) << 8) | s[i + 3]; return; }
    }
  };
  TsDemux.prototype.pmtParse = function (pl) {
    var s = pl.subarray(1 + pl[0]), end = Math.min(3 + (((s[1] & 0xf) << 8) | s[2]) - 4, s.length);
    var i = 12 + (((s[10] & 0xf) << 8) | s[11]);
    while (i + 5 <= end) {
      var t = s[i], ep = ((s[i + 1] & 0x1f) << 8) | s[i + 2], esl = ((s[i + 3] & 0xf) << 8) | s[i + 4];
      if ((t === 0x1b || t === 0x24) && this.vpid < 0) { this.vpid = ep; this.vtype = t; }
      if (t === 0x0f && this.apid < 0) this.apid = ep; // AAC dengan header ADTS
      i += 5 + esl;
    }
  };
  function joinPes(parts) {
    var len = 0, k; for (k = 0; k < parts.length; k++) len += parts[k].length;
    var b = new Uint8Array(len), o = 0; for (k = 0; k < parts.length; k++) { b.set(parts[k], o); o += parts[k].length; }
    if (len < 9 || b[0] !== 0 || b[1] !== 0 || b[2] !== 1) return null;
    var f2 = b[7], hl = b[8], pts = -1;
    if (f2 & 0x80 && len >= 14) pts = ((b[9] >> 1) & 7) * 1073741824 + b[10] * 4194304 + (b[11] >> 1) * 32768 + b[12] * 128 + (b[13] >> 1);
    return { pts: pts < 0 ? -1 : Math.round(pts * 100 / 9), data: b.subarray(9 + hl) };
  }
  TsDemux.prototype.flush = function () {
    var parts = this.parts; this.parts = null;
    if (!parts) return;
    var e = joinPes(parts);
    if (e && e.data.length) this.onAU({ pts: e.pts, data: e.data, hevc: this.vtype === 0x24 });
  };
  TsDemux.prototype.flushA = function () {
    var parts = this.aparts; this.aparts = null;
    if (!parts || !this.onAudio) return;
    var e = joinPes(parts); if (!e) return;
    // satu PES bisa memuat beberapa frame ADTS: pisahkan satu per satu
    var d = e.data, i = 0, n = 0;
    while (i + 7 <= d.length && d[i] === 0xff && (d[i + 1] & 0xf0) === 0xf0) {
      var fl = ((d[i + 3] & 3) << 11) | (d[i + 4] << 3) | (d[i + 5] >> 5);
      if (fl < 7 || i + fl > d.length) break;
      var sr = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000][(d[i + 2] >> 2) & 15] || 16000;
      var ch = ((d[i + 2] & 1) << 2) | (d[i + 3] >> 6);
      this.onAudio({ pts: e.pts < 0 ? -1 : e.pts + Math.round(n * 1024 * 1000000 / sr), data: d.subarray(i, i + fl), rate: sr, ch: ch || 1 });
      i += fl; n++;
    }
  };

  // ---- isi access unit: kunci frame? parameter SPS? ----
  function scan(data, hevc) {
    var key = false, sps = null, n = data.length;
    for (var i = 0; i + 3 < n; i++) {
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1) {
        var h = data[i + 3], t = hevc ? (h >> 1) & 0x3f : h & 0x1f, s = i + 3;
        if (hevc) { if (t >= 16 && t <= 21) key = true; if (t === 33 && !sps) sps = nalBody(data, s); }
        else { if (t === 5) key = true; if (t === 7 && !sps) sps = nalBody(data, s); }
        i += 2;
      }
    }
    return { key: key, sps: sps };
  }
  function nalBody(d, s) { // dari byte header NAL sampai awal NAL berikut, emulation-prevention dibuang
    var e = d.length;
    for (var i = s + 1; i + 2 < d.length; i++) { if (d[i] === 0 && d[i + 1] === 0 && (d[i + 2] === 1 || d[i + 2] === 0)) { e = i; break; } }
    var out = [], z = 0;
    for (var j = s; j < e; j++) { if (z >= 2 && d[j] === 3) { z = 0; continue; } out.push(d[j]); z = d[j] === 0 ? z + 1 : 0; }
    return Uint8Array.from(out);
  }
  function codecOf(sps, hevc) {
    if (!sps) return null;
    if (!hevc) return sps.length >= 4 ? 'avc1.' + hx(sps[1]) + hx(sps[2]) + hx(sps[3]) : null;
    if (sps.length < 15) return null;
    var p = sps.subarray(3);
    var space = (p[0] >> 6) & 3, tier = (p[0] >> 5) & 1, idc = p[0] & 0x1f;
    var compat = ((p[1] << 24) | (p[2] << 16) | (p[3] << 8) | p[4]) >>> 0, rev = 0;
    for (var i = 0; i < 32; i++) { rev = ((rev << 1) | ((compat >>> i) & 1)) >>> 0; }
    var cons = [p[5], p[6], p[7], p[8], p[9], p[10]], last = 5; while (last > 0 && cons[last] === 0) last--;
    var cs = []; for (var k = 0; k <= last; k++) cs.push(hx(cons[k]).toUpperCase());
    return 'hev1.' + (space ? String.fromCharCode(64 + space) : '') + idc + '.' + rev.toString(16).toUpperCase() + '.' + (tier ? 'H' : 'L') + p[11] + '.' + cs.join('.');
  }

  // ---- pemutar ----
  var supportedCache = null;
  function hasApi() { return typeof VideoDecoder !== 'undefined' && typeof MediaStreamTrackGenerator !== 'undefined' && typeof WebSocket !== 'undefined'; }

  // opt: { url(): path ws, onFrame() }. Antarmuka sama dengan mkPlayer di halaman: start, stop.
  function mkPlayer(v, say, opt) {
    var P = { on: false, tries: 0, timer: null, tok: 0, ws: null, dec: null, gen: null, writer: null, adec: null, agen: null, awriter: null, watch: null, audio: false, firstFrame: false, noSupport: false };
    function clean() {
      P.tok++;
      if (P.ws) { try { P.ws.onmessage = P.ws.onclose = P.ws.onerror = null; P.ws.close(); } catch (e) {} P.ws = null; }
      if (P.watch) { clearInterval(P.watch); P.watch = null; }
      if (P.timer) { clearTimeout(P.timer); P.timer = null; }
      if (P.dec) { try { P.dec.close(); } catch (e) {} P.dec = null; }
      if (P.writer) { try { P.writer.releaseLock(); } catch (e) {} P.writer = null; }
      if (P.adec) { try { P.adec.close(); } catch (e) {} P.adec = null; }
      if (P.awriter) { try { P.awriter.releaseLock(); } catch (e) {} P.awriter = null; }
      if (P.agen) { try { P.agen.stop(); } catch (e) {} P.agen = null; }
      if (P.gen) { try { P.gen.stop(); } catch (e) {} P.gen = null; }
      P.audio = false;
      try { if (v.srcObject) { v.pause(); v.srcObject = null; } } catch (e) {}
    }
    function fail(msg, tok) {
      if (tok !== P.tok) return;
      P.tries++; var wait = Math.min(2000 * P.tries, 15000);
      var perm = /tidak ditemukan/.test(msg);
      clean(); say(perm ? 'Kamera sudah dihapus' : ('Terputus: ' + String(msg).slice(0, 80)), true);
      if (perm) return;
      P.timer = setTimeout(function () { if (P.on) run(); }, wait);
    }
    function run() {
      clean(); var tok = P.tok; say('Menyambung...');
      P.firstFrame = false;
      var gen = new MediaStreamTrackGenerator({ kind: 'video' }); P.gen = gen; P.writer = gen.writable.getWriter();
      var wantA = !!(opt.audio && opt.audio() && typeof AudioDecoder !== 'undefined' && typeof MediaStreamTrackGenerator !== 'undefined');
      var tracks = [gen];
      if (wantA) { P.agen = new MediaStreamTrackGenerator({ kind: 'audio' }); P.awriter = P.agen.writable.getWriter(); tracks.push(P.agen); }
      v.srcObject = new MediaStream(tracks);
      var aReady = false, aTold = false;
      var configured = false, needKey = true, lastData = Date.now(), dropped = 0;
      var writer = P.writer;
      var dec = new VideoDecoder({
        output: function (fr) {
          if (tok !== P.tok) { fr.close(); return; }
          if (!P.firstFrame) {
            P.firstFrame = true; P.tries = 0; var r = v.play(); if (r && r.catch) r.catch(function () {}); if (opt.onFrame) opt.onFrame();
            if (wantA && opt.onInit && !aTold) { aTold = true; P.audio = demux && demux.apid >= 0; opt.onInit(P.audio); }
            P.applyMute();
          }
          writer.write(fr).then(function () { fr.close(); }, function () { try { fr.close(); } catch (e) {} });
        },
        error: function (e) { fail('Decoder: ' + (e && e.message ? e.message : e), tok); }
      });
      P.dec = dec;
      var demux = null;
      function onAudio(a) {
        if (tok !== P.tok || !wantA || !P.awriter) return;
        if (!aReady) {
          aReady = true; var acfg = { codec: 'mp4a.40.2', sampleRate: a.rate, numberOfChannels: a.ch };
          AudioDecoder.isConfigSupported(acfg).then(function (s) {
            if (tok !== P.tok || !s.supported) return; // tanpa suara saja, video tetap jalan
            P.adec = new AudioDecoder({ output: function (ad) { if (tok !== P.tok || !P.awriter) { ad.close(); return; } P.awriter.write(ad).then(function () { ad.close(); }, function () { try { ad.close(); } catch (e) {} }); }, error: function () {} });
            try { P.adec.configure(acfg); } catch (e) { P.adec = null; }
          }, function () {});
        }
        if (P.adec && P.adec.state === 'configured' && P.adec.decodeQueueSize < 20) {
          try { P.adec.decode(new EncodedAudioChunk({ type: 'key', timestamp: a.pts < 0 ? 0 : a.pts, data: a.data })); } catch (e) {}
        }
      }
      demux = new TsDemux(function (au) {
        if (tok !== P.tok) return;
        var sc = scan(au.data, au.hevc);
        if (!configured) {
          if (!sc.key || !sc.sps) return;
          var codec = codecOf(sc.sps, au.hevc);
          if (!codec) { fail('Kodek tidak dikenali', tok); return; }
          var cfg = { codec: codec, optimizeForLatency: true, hardwareAcceleration: 'no-preference' };
          if (au.hevc) cfg.hevc = { format: 'annexb' }; else cfg.avc = { format: 'annexb' };
          configured = true;
          VideoDecoder.isConfigSupported(cfg).then(function (s) {
            if (tok !== P.tok) return;
            if (!s.supported) { P.noSupport = true; fail('Kodek ' + codec + ' tidak didukung di komputer ini', tok); return; }
            try { dec.configure(s.config || cfg); } catch (e) { P.noSupport = true; fail('Decoder: ' + e.message, tok); }
          }, function (e) { P.noSupport = true; fail('Decoder: ' + (e && e.message), tok); });
        }
        if (dec.state !== 'configured') return; // menunggu isConfigSupported
        if (needKey && !sc.key) return;
        if (dec.decodeQueueSize > 8) { needKey = true; dropped++; if (!sc.key) return; } // PC kewalahan: buang sampai keyframe
        needKey = false;
        try { dec.decode(new EncodedVideoChunk({ type: sc.key ? 'key' : 'delta', timestamp: au.pts < 0 ? 0 : au.pts, data: au.data })); }
        catch (e) { fail('Decoder: ' + e.message, tok); }
      }, onAudio);
      var ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + opt.url());
      ws.binaryType = 'arraybuffer'; P.ws = ws;
      ws.onmessage = function (ev) {
        if (tok !== P.tok) return;
        if (typeof ev.data === 'string') { fail(ev.data, tok); return; }
        lastData = Date.now();
        try { demux.feed(new Uint8Array(ev.data)); } catch (e) { fail('Bongkar TS: ' + e.message, tok); }
      };
      ws.onclose = function () { fail('Siaran berakhir', tok); };
      ws.onerror = function () { fail('Sambungan ke server gagal', tok); };
      P.watch = setInterval(function () {
        if (tok !== P.tok) return;
        if (Date.now() - lastData > 8000) fail('Tidak ada data 8 detik', tok);
        else if (P.firstFrame && !document.hidden && v.paused) { var r = v.play(); if (r && r.catch) r.catch(function () {}); }
      }, 2000);
    }
    P.applyMute = function () { var m = !(opt.audio && opt.audio() && P.audio); if (v.muted !== m) v.muted = m; };
    P.start = function () { P.on = true; P.tries = 0; run(); };
    P.stop = function () { P.on = false; clean(); };
    return P;
  }

  var api = { TsDemux: TsDemux, scan: scan, codecOf: codecOf, mkPlayer: mkPlayer, hasApi: hasApi };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WCP = api;
})(typeof window !== 'undefined' ? window : this);
