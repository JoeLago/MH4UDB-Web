import { query, queryOne } from '../db.js';
import { esc, weaponIconPath, img, elementBadge, elementIcon, slots, sharpnessBar, groupBy } from './utils.js';

const COATING_ORDER = ['Power','Poison','Para','Sleep','C. Range','Paint','Exhaust','Blast'];
const COATING_COLORS = {
  'Power':   '#e67e22',
  'Poison':  '#8e44ad',
  'Para':    '#f39c12',
  'Sleep':   '#3498db',
  'C. Range':'#27ae60',
  'Paint':   '#aaaaaa',
  'Exhaust': '#c0392b',
  'Blast':   '#e74c3c',
};

function bowChargesHtml(charges) {
  const parts = charges.split('|');
  return `<div class="bow-charges">${parts.map((p, i) => `
    <div class="bow-charge-pill">
      <span class="bow-charge-num">Lv${i + 1}</span>
      <span class="bow-charge-name">${esc(p.replace('*',''))}</span>
      ${p.endsWith('*') ? '<span class="bow-charge-arc">ARC</span>' : ''}
    </div>`).join('')}</div>`;
}

function bowCoatingsHtml(coatings) {
  const parts = coatings.split('|');
  return `<div class="bow-coatings">${COATING_ORDER.map((name, i) => {
    const val = parts[i] || '-';
    const active = val !== '-';
    const color = COATING_COLORS[name] || '#aaa';
    return `<div class="bow-coating${active ? ' bow-coating-active' : ''}" style="${active ? `--coat-color:${color}` : ''}">
      <span class="bow-coating-name">${name}</span>
    </div>`;
  }).join('')}</div>`;
}

const NOTE_COLORS = { W:'#aaa', B:'#3a8fd9', R:'#d9343a', G:'#27ae60', Y:'#e0c020', C:'#17b8c8', P:'#9b59b6', O:'#e67e22' };
function hornNoteCircles(notes) {
  return [...notes].map(ch => {
    const bg = NOTE_COLORS[ch] || '#666';
    return `<span class="note-circle" style="background:${bg}">${esc(ch)}</span>`;
  }).join('');
}

const WEAPON_TYPES = [
  'Great Sword','Sword and Shield','Dual Blades','Hammer','Hunting Horn',
  'Lance','Gunlance','Switch Axe','Charge Blade','Insect Glaive',
  'Bow','Light Bowgun','Heavy Bowgun',
];

function wtypeFolder(wtype) {
  return wtype.toLowerCase()
    .replace('sword and shield','sword_and_shield')
    .replace(/\s+/g,'_');
}

function wtypeIcon(wtype) {
  const folder = wtypeFolder(wtype);
  return `icons/icons_weapons/icons_${folder}/${folder}1.png`;
}

export async function renderWeaponList() {
  const html = `
    <div class="section-label">Weapon Type</div>
    <div class="wtype-grid">
      ${WEAPON_TYPES.map(t => `
        <div class="wtype-card" data-nav="/weapons/${encodeURIComponent(t)}">
          ${img(wtypeIcon(t), t)}
          <span class="wtype-card-name">${esc(t)}</span>
        </div>`).join('')}
    </div>`;
  return { title: 'Weapons', html };
}

export async function renderWeaponDetail(idOrType) {
  // If it's a string (weapon type name), render the tree
  if (typeof idOrType === 'string') return renderWeaponTree(idOrType);

  const w = queryOne(`SELECT w.*, i.name, i.rarity, i.description FROM weapons w
                       JOIN items i ON w._id = i._id WHERE w._id = ?`, [idOrType]);
  if (!w) return { title: 'Not Found', html: '<div class="empty-state"><p>Weapon not found.</p></div>' };

  const components = query(`SELECT c.quantity, c.type, i._id, i.name, i.icon_name
                             FROM components c JOIN items i ON c.component_item_id = i._id
                             WHERE c.created_item_id = ? ORDER BY c.type, i.name`, [idOrType]);

  const melodies = w.wtype === 'Hunting Horn' && w.horn_notes
    ? query('SELECT * FROM horn_melodies WHERE notes = ?', [w.horn_notes])
    : [];

  const parent = w.parent_id
    ? queryOne(`SELECT w._id, w.attack, w.wtype, i.name, i.rarity FROM weapons w JOIN items i ON w._id=i._id WHERE w._id=?`, [w.parent_id])
    : null;

  const children = query(`SELECT w._id, w.wtype, w.attack, w.element, w.element_attack,
                           w.awaken, w.awaken_attack, w.num_slots, w.final,
                           i.name, i.rarity FROM weapons w JOIN items i ON w._id=i._id
                           WHERE w.parent_id=?`, [idOrType]);

  const affStr = w.affinity ? ((+w.affinity > 0 ? '+' : '') + w.affinity + '%') : '';
  const affColor = +w.affinity > 0 ? '#27ae60' : (+w.affinity < 0 ? '#e74c3c' : '');

  const statsHtml = `
    <div class="card" style="margin-bottom:16px">
      <div class="stat-row"><span class="stat-label">Attack</span><span class="stat-value">${w.attack}</span></div>
      ${w.element ? `<div class="stat-row"><span class="stat-label">Element</span><span class="stat-value">${elementBadge(w.element)} ${w.element_attack || ''}</span></div>` : ''}
      ${w.element_2 ? `<div class="stat-row"><span class="stat-label">Element 2</span><span class="stat-value">${elementBadge(w.element_2)} ${w.element_2_attack || ''}</span></div>` : ''}
      ${w.awaken ? `<div class="stat-row"><span class="stat-label">Awaken</span><span class="stat-value" style="color:var(--text-muted)">${esc(w.awaken)} ${w.awaken_attack || ''}</span></div>` : ''}
      ${affStr ? `<div class="stat-row"><span class="stat-label">Affinity</span><span class="stat-value" style="color:${affColor}">${affStr}</span></div>` : ''}
      <div class="stat-row"><span class="stat-label">Slots</span><span class="stat-value">${slots(w.num_slots)}</span></div>
      ${w.defense ? `<div class="stat-row"><span class="stat-label">Defense Bonus</span><span class="stat-value">+${w.defense}</span></div>` : ''}
      ${w.shelling_type ? `<div class="stat-row"><span class="stat-label">Shelling</span><span class="stat-value">${esc(w.shelling_type)}</span></div>` : ''}
      ${w.phial ? `<div class="stat-row"><span class="stat-label">Phial</span><span class="stat-value">${esc(w.phial)}</span></div>` : ''}
      ${w.charges ? `<div class="stat-row stat-row-block"><span class="stat-label">Charges</span>${bowChargesHtml(w.charges)}</div>` : ''}
      ${w.coatings ? `<div class="stat-row stat-row-block"><span class="stat-label">Coatings</span>${bowCoatingsHtml(w.coatings)}</div>` : ''}
      ${w.horn_notes ? `<div class="stat-row"><span class="stat-label">Horn Notes</span><span class="stat-value">${hornNoteCircles(w.horn_notes)}</span></div>` : ''}
      ${w.recoil ? `<div class="stat-row"><span class="stat-label">Recoil</span><span class="stat-value">${esc(w.recoil)}</span></div>` : ''}
      ${w.reload_speed ? `<div class="stat-row"><span class="stat-label">Reload</span><span class="stat-value">${esc(w.reload_speed)}</span></div>` : ''}
      ${w.deviation ? `<div class="stat-row"><span class="stat-label">Deviation</span><span class="stat-value">${esc(w.deviation)}</span></div>` : ''}
      ${w.creation_cost ? `<div class="stat-row"><span class="stat-label">Creation Cost</span><span class="stat-value">${w.creation_cost.toLocaleString()}z</span></div>` : ''}
      ${w.upgrade_cost ? `<div class="stat-row"><span class="stat-label">Upgrade Cost</span><span class="stat-value">${w.upgrade_cost.toLocaleString()}z</span></div>` : ''}
    </div>`;

  const sharpnessHtml = w.sharpness && !['Light Bowgun','Heavy Bowgun','Bow'].includes(w.wtype) ? `
    <div class="detail-section">
      <div class="detail-section-title">Sharpness</div>
      <div class="card" style="padding:12px 16px">${sharpnessBar(w.sharpness)}</div>
    </div>` : '';

  function compCard(items) {
    return items.map(c => `
      <div class="list-item" data-nav="/items/${c._id}">
        ${img('icons/icons_items/' + c.icon_name, c.name)}
        <div class="list-item-info">
          <div class="list-item-name">${esc(c.name)}</div>
        </div>
        <span style="font-weight:600">×${c.quantity}</span>
      </div>`).join('');
  }

  const craftComps   = components.filter(c => c.type === 'Create');
  const upgradeComps = components.filter(c => c.type === 'Improve' && c._id !== parent?._id);

  const craftHtml = craftComps.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Craft Materials</div>
      <div class="card">${compCard(craftComps)}</div>
    </div>` : '';

  const upgradeHtml = (parent || upgradeComps.length) ? `
    <div class="detail-section">
      <div class="detail-section-title">Upgrade Materials</div>
      <div class="card">
        ${parent ? `<div class="list-item" data-nav="/weapons/${parent._id}">
          ${img(weaponIconPath(parent.wtype, parent.rarity), parent.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(parent.name)}</div>
            <div class="list-item-sub">ATK ${parent.attack} · Base weapon</div>
          </div>
          <span class="list-arrow">›</span></div>` : ''}
        ${compCard(upgradeComps)}
      </div>
    </div>` : '';

  const melodiesHtml = melodies.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Melodies</div>
      <div class="card">
        ${melodies.map(m => `
          <div class="list-item" style="cursor:default;flex-direction:column;align-items:flex-start;gap:6px;padding:12px 16px">
            <div style="display:flex;align-items:center;gap:6px">
              ${hornNoteCircles(m.notes || '')}
            </div>
            <div style="font-size:13px;color:var(--text)">${esc(m.effect1 || '')}</div>
            ${m.effect2 && m.effect2 !== 'N/A' ? `<div style="font-size:12px;color:var(--text-muted)">${esc(m.effect2)}</div>` : ''}
            <div style="display:flex;gap:12px;font-size:11px;color:var(--text-dim)">
              ${m.duration && m.duration !== 'N/A' ? `<span>Duration: ${esc(m.duration)}</span>` : ''}
              ${m.extension && m.extension !== 'N/A' ? `<span>Extension: ${esc(m.extension)}</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const chainHtml = children.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Upgrades Into</div>
      <div class="card">
        ${children.map(c => `<div class="list-item" data-nav="/weapons/${c._id}">
          ${img(weaponIconPath(c.wtype, c.rarity), c.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(c.name)}${c.final ? ' <span class="badge badge-gold" style="font-size:10px">F</span>' : ''}</div>
            <div class="list-item-sub">ATK ${c.attack}${c.element ? ` · ${elementIcon(c.element, c.element_attack)}` : ''}${c.awaken && c.awaken_attack ? ` · <em style="color:var(--text-muted)">(${elementIcon(c.awaken, c.awaken_attack)})</em>` : ''}${c.num_slots ? ` · ${'◯'.repeat(c.num_slots)}` : ''}</div>
          </div>
          <span class="list-arrow">›</span></div>`).join('')}
      </div>
    </div>` : '';

  const html = `
    <div class="detail-header">
      ${img(weaponIconPath(w.wtype, w.rarity), w.name, '')}
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(w.name)}</div>
        <div class="detail-header-meta">
          <span class="badge badge-default">${esc(w.wtype)}</span>
          ${w.final ? '<span class="badge badge-gold">Final</span>' : ''}
        </div>
      </div>
    </div>
    ${statsHtml}${sharpnessHtml}${craftHtml}${upgradeHtml}${melodiesHtml}${chainHtml}`;

  return { title: w.name, html };
}

async function renderWeaponTree(wtype) {
  const weapons = query(`SELECT w._id, w.parent_id, w.wtype, w.attack, w.element, w.element_attack,
                          w.awaken, w.awaken_attack, w.num_slots, w.tree_depth, w.final, w.sharpness, w.affinity, w.horn_notes,
                          i.name, i.rarity
                          FROM weapons w JOIN items i ON w._id = i._id
                          WHERE w.wtype = ? ORDER BY w._id`, [wtype]);

  if (!weapons.length) return { title: wtype, html: '<div class="empty-state"><p>No weapons found.</p></div>' };

  const html = `
    <div style="margin-bottom:12px">
      <span class="badge badge-default" style="font-size:13px">${esc(wtype)}</span>
    </div>
    <div class="card weapon-tree">
      ${weapons.map(w => {
        const depth = w.tree_depth || 0;
        const elemStr = w.element ? elementIcon(w.element, w.element_attack || '') : '';
        const awakenStr = w.awaken && w.awaken_attack ? `<span style="color:var(--text-muted);font-style:italic">(${elementIcon(w.awaken, w.awaken_attack)})</span>` : '';
        const pfx = depth > 0 ? '└ '.padStart(depth * 2 + 2) : '';
        return `
          <div class="tree-node" data-nav="/weapons/${w._id}" style="padding-left:${16 + depth * 20}px">
            ${img(weaponIconPath(w.wtype, w.rarity), w.name)}
            <div class="tree-node-info">
              <div class="tree-node-name">${depth > 0 ? '↳ ' : ''}${esc(w.name)}${w.final ? ' <span class="badge badge-gold" style="font-size:10px">F</span>' : ''}</div>
              <div class="tree-node-stats">
                <span>ATK ${w.attack}</span>
                ${elemStr}${awakenStr}
                ${w.affinity ? `<span style="color:${+w.affinity > 0 ? '#27ae60' : '#e74c3c'};font-weight:600">${+w.affinity > 0 ? '+' : ''}${w.affinity}%</span>` : ''}
                ${w.num_slots ? `<span>${'◯'.repeat(w.num_slots)}</span>` : ''}
                ${w.horn_notes ? hornNoteCircles(w.horn_notes) : ''}
              </div>
            </div>
            <span class="list-arrow">›</span>
          </div>`;
      }).join('')}
    </div>`;

  return { title: wtype, html };
}
