// Shared helpers

export function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function weaponIconPath(wtype, rarity) {
  const folder = wtype.toLowerCase()
    .replace(/sword and shield/, 'sword_and_shield')
    .replace(/\s+/g, '_');
  return `icons/icons_weapons/icons_${folder}/${folder}${rarity || 1}.png`;
}

export function armorIconPath(slot, rarity) {
  const s = (slot || 'head').toLowerCase();
  return `icons/icons_armor/icons_${s}/${s}${rarity || 1}.png`;
}

export function monsterIconPath(iconName) {
  return `icons/icons_monster/${iconName}`;
}

export function itemIconPath(iconName) {
  return `icons/icons_items/${iconName}`;
}

export function img(src, alt = '', cls = 'icon') {
  return `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" onerror="this.style.display='none'">`;
}

export function elementIcon(element, value) {
  if (!element) return '';
  return `<span class="elem-icon-wrap"><img src="icons/icons_monster_info/${esc(element)}.png" alt="${esc(element)}" class="elem-icon" onerror="this.style.display='none'"> ${value ?? ''}</span>`;
}

export function elementBadge(element) {
  if (!element) return '';
  const cls = element.toLowerCase().replace(/\s+/g,'');
  const knownElements = ['fire','water','thunder','ice','dragon','poison'];
  const badgeCls = knownElements.includes(cls) ? `badge-${cls}` : 'badge-default';
  return `<span class="badge ${badgeCls}">${esc(element)}</span>`;
}

export function slots(n) {
  n = n || 0;
  return '<span style="letter-spacing:2px">' + '◯'.repeat(n) + '—'.repeat(3 - n) + '</span>';
}

export function rarity(n) {
  n = Math.min(n || 1, 10);
  return `<span class="rarity">${'★'.repeat(n)}</span>`;
}

export function sharpnessBar(str) {
  if (!str) return '';
  const colors = ['#e74c3c','#e67e22','#f1c40f','#27ae60','#3498db','#ecf0f1','#9b59b6'];
  const halves = str.trim().split(' ');
  function renderRow(label, vals) {
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const segs = vals.map((v, i) => v > 0
      ? `<div style="width:${(v/total*100).toFixed(1)}%;background:${colors[i]};height:100%"></div>` : '').join('');
    return `<div class="sharpness-row">
      <span class="sharpness-label">${label}</span>
      <div class="sharpness-bar">${segs}</div>
    </div>`;
  }
  const base   = halves[0].split('.').map(Number);
  const plus1  = halves.length > 1 ? halves[1].split('.').map(Number) : null;
  return `<div class="sharpness-wrap">
    ${renderRow('Base', base)}
    ${plus1 ? renderRow('+1', plus1) : ''}
  </div>`;
}

export function resClass(v) {
  if (v > 0) return 'res-pos';
  if (v < 0) return 'res-neg';
  return 'res-zero';
}

export function ptsClass(v) {
  return v > 0 ? 'pts-pos' : v < 0 ? 'pts-neg' : '';
}

const EFF_LABELS = [
  ['⬛', 'eff-0'],  // 0
  ['●', 'eff-1'],   // 1–9
  ['●●', 'eff-2'],  // 10–19
  ['●●●', 'eff-3'], // 20+
];
export function effLabel(v) {
  v = v || 0;
  if (v <= 0) return '<span class="eff-x">—</span>';
  const [lbl, cls] = v >= 20 ? EFF_LABELS[3] : v >= 10 ? EFF_LABELS[2] : EFF_LABELS[1];
  return `<span class="${cls}">${lbl}</span>`;
}

export function trapLabel(v) {
  if (v == null || v === '') return '<span class="eff-x">?</span>';
  if (v === 0) return '<span class="eff-0">✗</span>';
  return '<span class="eff-3">✓</span>';
}

export function pctBar(pct) {
  return `<div class="pct-bar"><div class="pct-fill" style="width:${Math.min(pct,100)}%"></div></div>`;
}

export function starStr(n) {
  return `<span class="star-gold">${'★'.repeat(n)}${'☆'.repeat(Math.max(0,10-n))}</span>`;
}

// Group array by key
export function groupBy(arr, fn) {
  const out = {};
  for (const item of arr) {
    const k = fn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function listWrap(items) {
  if (!items.length) return '<div class="empty-state"><p>None found.</p></div>';
  return `<div class="card">${items.join('')}</div>`;
}
