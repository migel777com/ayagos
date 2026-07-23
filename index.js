// Simple static server with wishes API
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'wishes.json');
const PORT = process.env.PORT || 3000;

function readWishes() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeWishes(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  let reqPath = url.parse(req.url).pathname || '/';
  if (reqPath === '/') reqPath = '/index.html';
  // Prevent path traversal
  const safePath = path.normalize(reqPath).replace(/^\/+/, '');
  const filePath = path.join(ROOT, safePath);

  // If requested path is directory, serve index.html inside it (unlikely here)
  let finalPath = filePath;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) finalPath = path.join(filePath, 'index.html');
  } catch {}

  const ext = path.extname(finalPath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp3': 'audio/mpeg',
    '.json': 'application/json; charset=utf-8'
  };
  const type = types[ext] || 'application/octet-stream';

  fs.readFile(finalPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function listImages(dirAbs, baseWebPath) {
  let results = [];
  try {
    const items = fs.readdirSync(dirAbs, { withFileTypes: true });
    for (const it of items) {
      const abs = path.join(dirAbs, it.name);
      const web = baseWebPath + '/' + it.name;
      if (it.isDirectory()) {
        results = results.concat(listImages(abs, web));
      } else {
        const ext = path.extname(it.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
          // Normalize to forward slashes for web
          results.push(web.replace(/\\/g, '/'));
        }
      }
    }
  } catch {}
  return results;
}

function handleApi(req, res) {
  const parsed = url.parse(req.url, true);
  const method = req.method || 'GET';

  // GET /api/images -> list all images under assets/images
  if (method === 'GET' && parsed.pathname === '/api/images') {
    const imagesRootAbs = path.join(ROOT, 'assets', 'images');
    const imagesBaseWeb = 'assets/images';
    const list = listImages(imagesRootAbs, imagesBaseWeb);
    // Sort by path for stability
    list.sort();
    return sendJson(res, 200, list);
  }

  // GET /api/wishes
  if (method === 'GET' && parsed.pathname === '/api/wishes') {
    return sendJson(res, 200, readWishes().sort((a,b)=> b.createdAt - a.createdAt));
  }

  // POST /api/wishes
  if (method === 'POST' && parsed.pathname === '/api/wishes') {
    parseBody(req).then(body => {
      const name = String(body.name || '').trim();
      const message = String(body.message || '').trim();
      if (!name || !message) return sendJson(res, 400, { error: 'Name and message are required' });
      if (name.length > 50 || message.length > 500) return sendJson(res, 400, { error: 'Length limit exceeded' });
      const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,8), name, message, createdAt: Date.now() };
      const arr = readWishes();
      arr.push(entry);
      try { writeWishes(arr); } catch (e) { return sendJson(res, 500, { error: 'Failed to save' }); }
      return sendJson(res, 201, entry);
    }).catch(() => sendJson(res, 400, { error: 'Invalid JSON' }));
    return;
  }

  // DELETE /api/wishes/:id
  if (method === 'DELETE' && parsed.pathname && parsed.pathname.startsWith('/api/wishes/')) {
    const id = parsed.pathname.split('/').pop();
    const arr = readWishes();
    const next = arr.filter(w => w.id !== id);
    if (next.length === arr.length) return sendJson(res, 404, { error: 'Not found' });
    try { writeWishes(next); } catch (e) { return sendJson(res, 500, { error: 'Failed to save' }); }
    return sendJson(res, 200, { ok: true });
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end('{"error":"Not found"}');
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname && parsed.pathname.startsWith('/api/')) {
    return handleApi(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
