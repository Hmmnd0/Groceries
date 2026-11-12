// Zero-dependency server: serves ./public and proxies Kroger's public Products API.
// Usage: KROGER_CLIENT_ID=... KROGER_CLIENT_SECRET=... node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ZIP = process.env.ZIP || '37040'; // Clarksville, TN
const { KROGER_CLIENT_ID: ID, KROGER_CLIENT_SECRET: SECRET } = process.env;
const API = 'https://api.kroger.com/v1';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

let token = null, tokenExp = 0, location = null;

async function getToken() {
  if (token && Date.now() < tokenExp) return token;
  const r = await fetch(`${API}/connect/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${ID}:${SECRET}`).toString('base64') },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!r.ok) throw new Error('Kroger auth failed: ' + r.status);
  const d = await r.json();
  token = d.access_token; tokenExp = Date.now() + (d.expires_in - 60) * 1000;
  return token;
}

async function kroger(p) {
  const r = await fetch(API + p, { headers: { Authorization: 'Bearer ' + await getToken(), Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Kroger API ${r.status}`);
  return r.json();
}

async function nearestStore() {
  if (location) return location;
  const d = await kroger(`/locations?filter.zipCode.near=${ZIP}&filter.chain=KROGER&filter.limit=1`);
  if (!d.data?.length) throw new Error('No Kroger store found near ' + ZIP);
  location = { id: d.data[0].locationId, name: `${d.data[0].name} – ${d.data[0].address.addressLine1}` };
  return location;
}

async function search(term) {
  const loc = await nearestStore();
  const d = await kroger(`/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${loc.id}&filter.limit=20`);
  return {
    storeName: loc.name,
    items: d.data.map(p => {
      const it = p.items?.[0] || {};
      return { description: p.description, brand: p.brand, size: it.size,
        regular: it.price?.regular || null, promo: it.price?.promo || null };
    }),
  };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/kroger') {
    res.setHeader('Content-Type', 'application/json');
    if (!ID || !SECRET) { res.writeHead(500); return res.end(JSON.stringify({ error: 'KROGER_CLIENT_ID / KROGER_CLIENT_SECRET not set' })); }
    try { res.end(JSON.stringify(await search(url.searchParams.get('term') || ''))); }
    catch (e) { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); }
    return;
  }
  const root = path.join(__dirname, 'public');
  const file = path.join(root, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`Grocery Compare on http://localhost:${PORT}`));
