import { query, queryOne } from '../db.js';
import { esc, itemIconPath, img, slots, ptsClass } from './utils.js';

export async function renderDecorationList() {
  const decs = query(`SELECT d._id, d.num_slots, i.name, i.rarity, i.icon_name,
    COALESCE(GROUP_CONCAT(st.name, ', '), '') as skills_preview
    FROM decorations d
    JOIN items i ON d._id = i._id
    LEFT JOIN item_to_skill_tree itst ON itst.item_id = d._id
    LEFT JOIN skill_trees st ON itst.skill_tree_id = st._id
    GROUP BY d._id ORDER BY d.num_slots, i.name`);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="decs" placeholder="Search decorations…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="filter-bar">
      <div class="chip active" data-filter="all" data-filter-group="slots" data-filter-target="decs">All</div>
      <div class="chip" data-filter="1" data-filter-group="slots" data-filter-target="decs">1 Slot</div>
      <div class="chip" data-filter="2" data-filter-group="slots" data-filter-target="decs">2 Slots</div>
      <div class="chip" data-filter="3" data-filter-group="slots" data-filter-target="decs">3 Slots</div>
    </div>
    <div class="card">
      ${decs.map(d => `
        <div class="list-item"
          data-nav="/decorations/${d._id}"
          data-searchable="decs"
          data-searchtext="${esc(d.name)}"
          data-filterable="decs"
          data-filter-value="${d.num_slots}">
          ${img(itemIconPath(d.icon_name), d.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(d.name)}</div>
            <div class="list-item-sub">Slot ${d.num_slots} · ★${d.rarity}${d.skills_preview ? ' · ' + esc(d.skills_preview) : ''}</div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;

  return { title: 'Decorations', html };
}

export async function renderDecorationDetail(id) {
  const d = queryOne(`SELECT d.*, i.name, i.rarity, i.icon_name, i.description, i.buy, i.sell
                       FROM decorations d JOIN items i ON d._id = i._id WHERE d._id = ?`, [id]);
  if (!d) return { title: 'Not Found', html: '<div class="empty-state"><p>Decoration not found.</p></div>' };

  const skills = query(`SELECT st.name, st._id, its.point_value
                         FROM item_to_skill_tree its JOIN skill_trees st ON its.skill_tree_id = st._id
                         WHERE its.item_id = ?`, [id]);

  const components = query(`SELECT c.quantity, c.type, i.name, i.icon_name
                             FROM components c JOIN items i ON c.component_item_id = i._id
                             WHERE c.created_item_id = ?`, [id]);

  const html = `
    <div class="detail-header">
      ${img(itemIconPath(d.icon_name), d.name, '')}
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(d.name)}</div>
        <div class="detail-header-meta">
          <span class="badge badge-default">${d.num_slots} Slot${d.num_slots > 1 ? 's' : ''}</span>
          <span class="badge badge-gold">★${d.rarity}</span>
        </div>
      </div>
    </div>

    ${d.description ? `<p style="font-size:14px;color:var(--text-muted);margin-bottom:20px;line-height:1.6">${esc(d.description)}</p>` : ''}

    ${skills.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Skills</div>
      <div class="card">
        ${skills.map(s => `
          <div class="list-item" data-nav="/skills/${s._id}">
            <div class="list-item-info"><div class="list-item-name">${esc(s.name)}</div></div>
            <span class="${ptsClass(s.point_value)}" style="font-weight:700;font-size:15px">${s.point_value > 0 ? '+' : ''}${s.point_value}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${components.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Components</div>
      <div class="card">
        ${components.map(c => `
          <div class="list-item" style="cursor:default">
            ${img(itemIconPath(c.icon_name), c.name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(c.name)}</div>
              <div class="list-item-sub">${esc(c.type)}</div>
            </div>
            <span style="font-weight:600">×${c.quantity}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: d.name, html };
}
