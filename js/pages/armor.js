import { query, queryOne } from '../db.js';
import { esc, armorIconPath, img, slots, resClass, ptsClass, groupBy } from './utils.js';

const SLOTS_ORDER = ['Head','Body','Arms','Waist','Legs'];

export async function renderArmorList() {
  const armor = query(`SELECT a._id, a.slot, a.defense, a.num_slots, a.gender, a.hunter_type, i.name, i.rarity
                        FROM armor a JOIN items i ON a._id = i._id ORDER BY a.slot, i.name`);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="armor" placeholder="Search armor…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="filter-bar">
      <div class="chip active" data-filter="all" data-filter-group="slot" data-filter-target="armor">All</div>
      ${SLOTS_ORDER.map(s => `<div class="chip" data-filter="${s}" data-filter-group="slot" data-filter-target="armor">${s}</div>`).join('')}
    </div>
    <div class="card">
      ${armor.map(a => `
        <div class="list-item"
          data-nav="/armor/${a._id}"
          data-searchable="armor"
          data-searchtext="${esc(a.name)}"
          data-filterable="armor"
          data-filter-value="${esc(a.slot)}">
          ${img(armorIconPath(a.slot, a.rarity), a.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(a.name)}</div>
            <div class="list-item-sub">${esc(a.slot)} · DEF ${a.defense} · ${slots(a.num_slots)}</div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;

  return { title: 'Armor', html };
}

export async function renderArmorDetail(id) {
  const a = queryOne(`SELECT a.*, i.name, i.rarity, i.description FROM armor a
                       JOIN items i ON a._id = i._id WHERE a._id = ?`, [id]);
  if (!a) return { title: 'Not Found', html: '<div class="empty-state"><p>Armor not found.</p></div>' };

  const skills = query(`SELECT st.name, its.point_value
                         FROM item_to_skill_tree its
                         JOIN skill_trees st ON its.skill_tree_id = st._id
                         WHERE its.item_id = ?`, [id]);

  const components = query(`SELECT c.quantity, c.type, i.name, i.icon_name
                             FROM components c JOIN items i ON c.component_item_id = i._id
                             WHERE c.created_item_id = ?`, [id]);

  const html = `
    <div class="detail-header">
      ${img(armorIconPath(a.slot, a.rarity), a.name, '')}
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(a.name)}</div>
        <div class="detail-header-meta">
          <span class="badge badge-default">${esc(a.slot)}</span>
          ${a.gender !== 'Both' ? `<span class="badge badge-gold">${esc(a.gender)}</span>` : ''}
          ${a.hunter_type !== 'Both' ? `<span class="badge badge-default">${esc(a.hunter_type)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Stats</div>
      <div class="card">
        <div class="stat-row"><span class="stat-label">Defense</span><span class="stat-value">${a.defense} → ${a.max_defense || '?'}</span></div>
        <div class="stat-row"><span class="stat-label">Slots</span><span class="stat-value">${slots(a.num_slots)}</span></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Resistances</div>
      <div class="card">
        ${[['🔥 Fire', a.fire_res],['💧 Water', a.water_res],['⚡ Thunder', a.thunder_res],['❄️ Ice', a.ice_res],['🐉 Dragon', a.dragon_res]].map(([label, val]) => `
          <div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-value ${resClass(val)}">${val > 0 ? '+' : ''}${val}</span>
          </div>`).join('')}
      </div>
    </div>

    ${skills.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Skills</div>
      <div class="card">
        ${skills.map(s => `
          <div class="stat-row">
            <span class="stat-label">${esc(s.name)}</span>
            <span class="stat-value ${ptsClass(s.point_value)}">${s.point_value > 0 ? '+' : ''}${s.point_value}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${components.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Components</div>
      <div class="card">
        ${components.map(c => `
          <div class="list-item" style="cursor:default">
            ${img('icons/icons_items/' + c.icon_name, c.name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(c.name)}</div>
              <div class="list-item-sub">${esc(c.type)}</div>
            </div>
            <span style="font-weight:600">×${c.quantity}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: a.name, html };
}
