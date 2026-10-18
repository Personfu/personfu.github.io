'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.CYBERWORLD_PREVIEW_PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8' };
http.createServer((request,response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch (_) { response.writeHead(400).end(); return; }
  const filename = path.resolve(root, '.' + pathname);
  const relative = path.relative(root, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.')) || relative.startsWith('node_modules')) { response.writeHead(403).end(); return; }
  let target = filename;
  try { if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html'); } catch (_) { response.writeHead(404).end('Not found'); return; }
  fs.readFile(target, (error, data) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type':mime[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff' });
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('CyberWorld preview: http://127.0.0.1:' + port + '/CyberWorld/ascension.html'));
