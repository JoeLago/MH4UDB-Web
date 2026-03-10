import { query, queryOne } from '../db.js';
import { esc, itemIconPath, armorIconPath, img, ptsClass } from './utils.js';

export async function renderSkillList() {
  const trees = query('SELECT _id, name FROM skill_trees ORDER BY name');

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="skills" placeholder="Search skills…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="card">
      ${trees.map(t => `
        <div class="list-item" data-nav="/skills/${t._id}"
          data-searchable="skills" data-searchtext="${esc(t.name)}">
          <div class="list-item-info">
            <div class="list-item-name">✨ ${esc(t.name)}</div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;

  return { title: 'Skills', html };
}

export async function renderSkillDetail(id) {
  const tree = queryOne('SELECT * FROM skill_trees WHERE _id = ?', [id]);
  if (!tree) return { title: 'Not Found', html: '<div class="empty-state"><p>Skill not found.</p></div>' };

  const skills = query('SELECT * FROM skills WHERE skill_tree_id = ? ORDER BY required_skill_tree_points', [id]);

  const items = query(`SELECT i.name, i.icon_name, i.type, i.rarity, i._id, its.point_value
                        FROM item_to_skill_tree its JOIN items i ON its.item_id = i._id
                        WHERE its.skill_tree_id = ? ORDER BY i.type, ABS(its.point_value) DESC`, [id]);

  // Separate armor and other items
  const armorItems = items.filter(i => i.type === 'Armor');
  const decItems   = items.filter(i => i.type === 'Decoration');
  const otherItems = items.filter(i => i.type !== 'Armor' && i.type !== 'Decoration');

  const html = `
    <div class="detail-header" style="padding:16px">
      <div style="font-size:36px">✨</div>
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(tree.name)}</div>
      </div>
    </div>

    ${skills.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Skill Effects</div>
      <div class="card">
        ${skills.map(s => {
          const pts = s.required_skill_tree_points;
          return `
            <div class="list-item" style="cursor:default;flex-wrap:wrap;gap:4px">
              <span class="${ptsClass(pts)}" style="font-weight:700;font-size:14px;min-width:36px">${pts > 0 ? '+' : ''}${pts}</span>
              <div class="list-item-info">
                <div class="list-item-name">${esc(s.name)}</div>
                ${s.description ? `<div class="list-item-sub">${esc(s.description)}</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${armorItems.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Armor Pieces</div>
      <div class="card">
        ${armorItems.map(i => `
          <div class="list-item" data-nav="/armor/${i._id}">
            ${img(itemIconPath(i.icon_name) || '', i.name)}
            <div class="list-item-info"><div class="list-item-name">${esc(i.name)}</div></div>
            <span class="${ptsClass(i.point_value)}" style="font-weight:700">${i.point_value > 0 ? '+' : ''}${i.point_value}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${decItems.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Decorations</div>
      <div class="card">
        ${decItems.map(i => `
          <div class="list-item" data-nav="/decorations/${i._id}">
            ${img(itemIconPath(i.icon_name), i.name)}
            <div class="list-item-info"><div class="list-item-name">${esc(i.name)}</div></div>
            <span class="${ptsClass(i.point_value)}" style="font-weight:700">${i.point_value > 0 ? '+' : ''}${i.point_value}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${otherItems.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Other Items</div>
      <div class="card">
        ${otherItems.map(i => `
          <div class="list-item" data-nav="/items/${i._id}">
            ${img(itemIconPath(i.icon_name), i.name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(i.name)}</div>
              <div class="list-item-sub">${esc(i.type)}</div>
            </div>
            <span class="${ptsClass(i.point_value)}" style="font-weight:700">${i.point_value > 0 ? '+' : ''}${i.point_value}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: tree.name, html };
}
