// Clarksville Grocery Compare — all data stays in your browser (localStorage).
const DEFAULT_STORES = [
  { id: 'publix',    name: 'Publix',                 color: '#3d8b37', ad: 'https://www.publix.com/savings/weekly-ad' },
  { id: 'kroger',    name: 'Kroger',                 color: '#2453a6', ad: 'https://www.kroger.com/weeklyad' },
  { id: 'aldi',      name: 'Aldi',                   color: '#f59e0b', ad: 'https://www.aldi.us/weekly-specials/our-weekly-ads/' },
  { id: 'foodlion',  name: 'Food Lion',              color: '#0f6cbd', ad: 'https://www.foodlion.com/weekly-specials' },
  { id: 'sprouts',   name: 'Sprouts',                color: '#6aa84f', ad: 'https://www.sprouts.com/weekly-ad/' },
  { id: 'walmart',   name: 'Walmart',                color: '#0071ce', ad: 'https://www.walmart.com/store/finder?location=37040' },
  { id: 'target',    name: 'Target',                 color: '#cc0000', ad: 'https://www.target.com/weekly-ad' },
  { id: 'samsclub',  name: "Sam's Club",             color: '#004c91', ad: 'https://www.samsclub.com/b/instant-savings/1490101' },
  { id: 'commissary',name: 'Fort Campbell Commissary', color: '#6b7280', ad: 'https://www.commissaries.com/our-agency/newsroom/sales-flyer' },
];

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let stores = load('stores', DEFAULT_STORES.map(s => ({ ...s, enabled: true })));
let prices = load('prices', []);
let list = load('list', []);

const $ = s => document.querySelector(s);
const norm = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
const money = n => '$' + n.toFixed(2);
const storeById = id => stores.find(s => s.id === id) || { name: id, color: '#999' };
const enabledIds = () => new Set(stores.filter(s => s.enabled).map(s => s.id));

// Normalize to a comparable unit so "16 oz for $3" vs "2 lb for $5" compare fairly.
const UNIT = { oz: ['oz', 1], lb: ['oz', 16], 'fl oz': ['fl oz', 1], gal: ['fl oz', 128], ct: ['ct', 1], each: ['ct', 1] };
function unitPrice(p) {
  if (!p.size || !UNIT[p.unit]) return null;
  const [base, mult] = UNIT[p.unit];
  return { base, value: p.price / (p.size * mult) };
}
function isActive(p) {
  if (!p.sale || !p.saleEnds) return true;
  return new Date(p.saleEnds + 'T23:59:59') >= new Date();
}
function compareKey(p) { const u = unitPrice(p); return u ? u.value : p.price; }

// ---------- tabs ----------
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button, .tab').forEach(e => e.classList.remove('active'));
  b.classList.add('active');
  $('#tab-' + b.dataset.tab).classList.add('active');
  render();
});

// ---------- search ----------
function matches(term) {
  const t = norm(term), on = enabledIds();
  return prices.filter(p => on.has(p.store) && isActive(p) &&
    (!t || norm(p.item).includes(t) || norm(p.brand).includes(t)) &&
    (!$('#salesOnly').checked || p.sale));
}
function renderSearch() {
  const groups = {};
  for (const p of matches($('#q').value)) (groups[norm(p.item)] ||= []).push(p);
  const keys = Object.keys(groups).sort();
  if (!keys.length) {
    $('#results').innerHTML = `<p class="muted">${prices.length ? 'No matches.' : 'No prices saved yet. Use "Add Price" to log prices from receipts or weekly ads, or try "Live Kroger".'}</p>`;
    return;
  }
  $('#results').innerHTML = keys.map(k => {
    const rows = groups[k].sort((a, b) => compareKey(a) - compareKey(b));
    return `<div class="card"><h3>${esc(k)}</h3><table>
      <tr><th>Store</th><th>Brand</th><th>Price</th><th>Unit price</th><th></th></tr>
      ${rows.map((p, i) => {
        const s = storeById(p.store), u = unitPrice(p);
        return `<tr class="${i === 0 ? 'best' : ''}">
          <td><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</td>
          <td>${esc(p.brand || '')}</td>
          <td>${money(p.price)}${p.size ? ` <span class="muted">/ ${p.size} ${p.unit}</span>` : ''}
            ${p.sale ? `<div class="sale">SALE${p.saleEnds ? ' thru ' + p.saleEnds : ''}</div>` : ''}
            ${p.notes ? `<div class="muted">${esc(p.notes)}</div>` : ''}</td>
          <td>${u ? '$' + u.value.toFixed(3) + '/' + u.base : '—'}</td>
          <td><button class="x" title="Delete" onclick="delPrice('${p.id}')">✕</button></td></tr>`;
      }).join('')}</table></div>`;
  }).join('');
}
$('#q').oninput = renderSearch;
$('#salesOnly').onchange = renderSearch;
window.delPrice = id => { prices = prices.filter(p => p.id !== id); save('prices', prices); render(); };

// ---------- live Kroger (via server.js proxy) ----------
$('#krogerBtn').onclick = async () => {
  const term = $('#q').value.trim();
  if (!term) return alert('Type an item to search first.');
  $('#results').innerHTML = '<p class="muted">Fetching live Kroger prices…</p>';
  try {
    const r = await fetch('/api/kroger?term=' + encodeURIComponent(term));
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || r.statusText);
    $('#results').innerHTML = `<div class="card"><h3>Kroger live: ${esc(term)}</h3><p class="muted">${esc(data.storeName || '')}</p><table>
      <tr><th>Product</th><th>Size</th><th>Price</th><th></th></tr>
      ${data.items.map((it, i) => `<tr><td>${esc(it.description)}</td><td>${esc(it.size || '')}</td>
        <td>${it.promo && it.promo < it.regular ? `<s class="muted">${money(it.regular)}</s> <b>${money(it.promo)}</b> <span class="sale">SALE</span>` : it.regular ? money(it.regular) : '—'}</td>
        <td>${it.regular ? `<button class="ghost" onclick='saveKroger(${i})'>Save</button>` : ''}</td></tr>`).join('')}
      </table></div>`;
    window._kroger = data.items;
  } catch (e) {
    $('#results').innerHTML = `<p class="muted">Kroger lookup failed: ${esc(e.message)}. Run <code>node server.js</code> with KROGER_CLIENT_ID / KROGER_CLIENT_SECRET set (see README).</p>`;
  }
};
window.saveKroger = i => {
  const it = window._kroger[i];
  const onSale = it.promo && it.promo < it.regular;
  addPrice({ item: $('#q').value.trim(), brand: it.brand || '', store: 'kroger',
    price: onSale ? it.promo : it.regular, size: null, unit: 'each', sale: !!onSale, notes: it.description });
  alert('Saved to your price book.');
};

// ---------- add price ----------
function addPrice(p) {
  prices.push({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), ...p });
  save('prices', prices);
}
$('#priceForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  addPrice({
    item: f.get('item').trim(), brand: f.get('brand').trim(), store: f.get('store'),
    price: +f.get('price'), size: f.get('size') ? +f.get('size') : null, unit: f.get('unit'),
    sale: !!f.get('sale'), saleEnds: f.get('saleEnds') || null, notes: f.get('notes').trim(),
  });
  e.target.reset();
  e.target.item.focus();
};
$('#exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify({ stores, prices, list }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'grocery-prices.json' });
  a.click();
};
$('#importFile').onchange = async e => {
  const d = JSON.parse(await e.target.files[0].text());
  if (d.prices) prices = d.prices; if (d.stores) stores = d.stores; if (d.list) list = d.list;
  save('prices', prices); save('stores', stores); save('list', list); render();
  alert('Imported.');
};

// ---------- shopping list ----------
$('#listAdd').onclick = () => {
  const v = $('#listItem').value.trim();
  if (v) { list.push(v); save('list', list); $('#listItem').value = ''; renderList(); }
};
$('#listItem').onkeydown = e => { if (e.key === 'Enter') $('#listAdd').click(); };
$('#listClear').onclick = () => { list = []; save('list', list); renderList(); };
window.delItem = i => { list.splice(i, 1); save('list', list); renderList(); };

function cheapestFor(term, storeId) {
  const t = norm(term), on = enabledIds();
  return prices.filter(p => on.has(p.store) && isActive(p) && norm(p.item).includes(t) && (!storeId || p.store === storeId))
    .sort((a, b) => a.price - b.price)[0];
}
function renderList() {
  $('#listItems').innerHTML = list.map((it, i) => {
    const best = cheapestFor(it);
    return `<li><span>${esc(it)}</span><span>${best
      ? `<span class="dot" style="background:${storeById(best.store).color}"></span>${esc(storeById(best.store).name)} ${money(best.price)}${best.sale ? ' <span class="sale">SALE</span>' : ''}`
      : '<span class="muted">no price yet</span>'} <button class="x" onclick="delItem(${i})">✕</button></span></li>`;
  }).join('');
  if (!list.length) { $('#plan').innerHTML = ''; return; }

  // Option A: split the trip — cheapest store per item.
  const split = {}; let splitTotal = 0, missing = 0;
  for (const it of list) {
    const b = cheapestFor(it);
    if (!b) { missing++; continue; }
    (split[b.store] ||= []).push(`${it} (${money(b.price)})`);
    splitTotal += b.price;
  }
  // Option B: one store for everything.
  const single = stores.filter(s => s.enabled).map(s => {
    let total = 0, have = 0;
    for (const it of list) { const b = cheapestFor(it, s.id); if (b) { total += b.price; have++; } }
    return { s, total, have };
  }).filter(x => x.have).sort((a, b) => (b.have - a.have) || (a.total - b.total));

  $('#plan').innerHTML = `<div class="card"><h3>Cheapest split trip: ${money(splitTotal)}</h3>
      ${Object.entries(split).map(([id, items]) => `<p><span class="dot" style="background:${storeById(id).color}"></span><b>${esc(storeById(id).name)}</b>: ${items.map(esc).join(', ')}</p>`).join('')}
      ${missing ? `<p class="muted">${missing} item(s) have no saved price.</p>` : ''}</div>
    <div class="card"><h3>One-stop shop</h3><table><tr><th>Store</th><th>Items found</th><th>Total</th></tr>
      ${single.map((x, i) => `<tr class="${i === 0 ? 'best' : ''}"><td>${esc(x.s.name)}</td><td>${x.have}/${list.length}</td><td>${money(x.total)}</td></tr>`).join('')}
    </table></div>`;
}

// ---------- stores ----------
function renderStores() {
  $('#storeSelect').innerHTML = stores.filter(s => s.enabled).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('#storeList').innerHTML = stores.map((s, i) => `<li>
    <label class="chk"><input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="toggleStore(${i})">
      <span class="dot" style="background:${s.color}"></span>${esc(s.name)}</label>
    <a href="${s.ad}" target="_blank" rel="noopener">Weekly ad ↗</a></li>`).join('') +
    `<li><input id="newStore" placeholder="Add another store"><button onclick="addStore()">Add</button></li>`;
}
window.toggleStore = i => { stores[i].enabled = !stores[i].enabled; save('stores', stores); render(); };
window.addStore = () => {
  const n = $('#newStore').value.trim(); if (!n) return;
  stores.push({ id: norm(n).replace(/\W+/g, ''), name: n, color: '#8b5cf6', ad: '#', enabled: true });
  save('stores', stores); render();
};

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function render() { renderStores(); renderSearch(); renderList(); }
render();
