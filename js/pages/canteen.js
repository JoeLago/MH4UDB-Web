import { query } from '../db.js';
import { esc, groupBy } from './utils.js';

export async function renderCanteen() {
  const combos = query(`SELECT fc.*,
                         fs1.name as skill1_name, fs1.description as skill1_desc,
                         fs2.name as skill2_name, fs2.description as skill2_desc,
                         fs3.name as skill3_name, fs3.description as skill3_desc
                         FROM food_combos fc
                         LEFT JOIN felyne_skills fs1 ON fc.skill1_id = fs1._id
                         LEFT JOIN felyne_skills fs2 ON fc.skill2_id = fs2._id
                         LEFT JOIN felyne_skills fs3 ON fc.skill3_id = fs3._id
                         ORDER BY fc.ingredient1, fc.ingredient2`);

  const byIngr = groupBy(combos, c => c.ingredient1);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="canteen" placeholder="Search ingredients or skills…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${Object.entries(byIngr).map(([ingr, items]) => `
        <div class="card">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px;color:var(--text-muted)">
            🍖 ${esc(ingr)}
          </div>
          ${items.map(c => {
            const skills = [c.skill1_name, c.skill2_name, c.skill3_name].filter(Boolean);
            const descs  = [c.skill1_desc, c.skill2_desc, c.skill3_desc].filter(Boolean);
            return `
              <div class="list-item" style="cursor:default;flex-direction:column;align-items:flex-start;gap:6px"
                data-searchable="canteen"
                data-searchtext="${esc(ingr)} ${esc(c.ingredient2)} ${skills.join(' ')}">
                <div style="display:flex;gap:8px;align-items:center;width:100%">
                  <span style="font-size:13px">${esc(ingr)} + ${esc(c.ingredient2)}</span>
                  <span style="margin-left:auto;font-size:12px;color:var(--text-dim)">${esc(c.cooked || '')}</span>
                </div>
                ${skills.length ? `<div class="combo-skills">
                  ${skills.map((s, i) => `<span class="badge badge-green" style="margin-right:4px">${esc(s)}</span>${descs[i] ? `<span style="font-size:11px;color:var(--text-dim)">${esc(descs[i])}</span>` : ''}`).join(' ')}
                </div>` : ''}
              </div>`;
          }).join('')}
        </div>`).join('')}
    </div>`;

  return { title: 'Canteen', html };
}
