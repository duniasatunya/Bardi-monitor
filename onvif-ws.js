// Stream real-time lewat WebSocket. Alasan: browser hanya membuka 6 sambungan HTTP bersamaan ke satu alamat,
// jadi multiview dengan lebih dari 6 kamera tidak bisa jalan kalau tiap kamera memakai satu sambungan HTTP.
// WebSocket tidak kena batas itu. Tanpa pustaka tambahan (RFC 6455: hanya frame biner/teks dari server, ping/close dari klien).
'use strict';
const crypto = require('crypto');
const { EventEmitter } = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const PATH_RE = /^\/onvif-live\/([0-9a-f]{8})\/rt\.ws$/;

function frame(op, payload) {
  const n = payload.length;
  let h;
  if (n < 126) { h = Buffer.alloc(2); h[1] = n; }
  else if (n < 65536) { h = Buffer.alloc(4); h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  h[0] = 0x80 | op;
  return Buffer.concat([h, payload]);
}

// authed(req) -> boolean; onvifLive.realtime(id, quality, req, res, audio, small) menulis lewat res.writeHead/write/end.
function attachRealtimeWs(server, { authed, onvifLive, log }) {
  server.on('upgrade', (req, socket) => {
    let url;
    try { url = new URL(req.url, 'http://x'); } catch (_) { return socket.destroy(); }
    const m = PATH_RE.exec(url.pathname);
    const reject = (code, msg) => { try { socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); } catch (_) {} socket.destroy(); };
    if (!m) return reject(404, 'Not Found');
    if (String(req.headers.upgrade || '').toLowerCase() !== 'websocket') return reject(400, 'Bad Request');
    if (!authed(req)) return reject(401, 'Unauthorized');
    const origin = req.headers.origin;
    if (origin) { let ok = false; try { ok = new URL(origin).host === req.headers.host; } catch (_) {} if (!ok) return reject(403, 'Forbidden'); }
    const key = req.headers['sec-websocket-key'];
    if (!key || typeof key !== 'string') return reject(400, 'Bad Request');
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.setNoDelay(true);

    let closed = false, code = 200;
    const rq = new EventEmitter(), rs = new EventEmitter();
    const doClose = () => { if (closed) return; closed = true; rq.emit('close'); rs.emit('close'); };
    socket.on('close', doClose); socket.on('error', () => { doClose(); try { socket.destroy(); } catch (_) {} });
    const send = (op, buf) => { if (!closed && socket.writable) socket.write(frame(op, buf)); };
    // Pengganti ServerResponse untuk onvifLive.realtime
    rs.headersSent = false;
    Object.defineProperty(rs, 'writableLength', { get: () => socket.writableLength });
    rs.writeHead = (c) => { code = c; rs.headersSent = true; };
    rs.write = (chunk) => { send(0x2, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); return true; };
    rs.end = (msg) => {
      if (code !== 200 && msg) send(0x1, Buffer.from(String(msg).slice(0, 400)));
      if (!closed && socket.writable) { const c = Buffer.alloc(2); c.writeUInt16BE(code === 200 ? 1000 : 1011, 0); socket.write(frame(0x8, c)); socket.end(); }
    };
    rs.destroy = () => { try { socket.destroy(); } catch (_) {} };

    // Frame dari klien (bertopeng): hanya ping/close yang diperhatikan.
    let buf = Buffer.alloc(0);
    socket.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (buf.length > 1 << 20) return socket.destroy();
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 0x0f; let len = buf[1] & 0x7f, off = 2;
        const masked = (buf[1] & 0x80) !== 0;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (len > 65536) return socket.destroy();
        const need = off + (masked ? 4 : 0) + len;
        if (buf.length < need) return;
        let payload = buf.subarray(off + (masked ? 4 : 0), need);
        if (masked) { const mk = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ mk[i % 4])); }
        buf = buf.subarray(need);
        if (op === 0x8) { try { socket.end(); } catch (_) {} return; }
        if (op === 0x9) send(0xA, payload);
      }
    });
    Promise.resolve(onvifLive.realtime(m[1], url.searchParams.get('q'), rq, rs, url.searchParams.get('a') !== '0', url.searchParams.get('s') === '1'))
      .catch((e) => { if (log) log('WARN', 'WS real-time galat: ' + (e && e.message)); rs.writeHead(500); rs.end('Galat di server'); });
  });
}

module.exports = { attachRealtimeWs };
