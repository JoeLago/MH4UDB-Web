import { query } from '../db.js';
import { esc, groupBy } from './utils.js';

const COOK_COLORS = {
  'Saute': '#e67e22',
  'Stew':  '#3a8fd9',
  'Steam': '#17b8c8',
  'Fry':   '#e74c3c',
};

function cookBadge(cooked) {
  const color = COOK_COLORS[cooked] || 'var(--text-muted)';
  return cooked ? `<span style="font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;background:${color}22;color:${color}">${esc(cooked)}</span>` : '';
}

export async function renderCanteen() {
  const combos = query(`SELECT fc.*,
                         fs1.skill_name as skill1_name, fs1.description as skill1_desc,
                         fs2.skill_name as skill2_name, fs2.description as skill2_desc,
                         fs3.skill_name as skill3_name, fs3.description as skill3_desc
                         FROM food_combos fc
                         LEFT JOIN felyne_skills fs1 ON fc.skill1_id = fs1._id
                         LEFT JOIN felyne_skills fs2 ON fc.skill2_id = fs2._id
                         LEFT JOIN felyne_skills fs3 ON fc.skill3_id = fs3._id
                         ORDER BY fc.bonus, fc.ingredient1, fc.ingredient2, fc.cooked`);

  let ingredients = [];
  try {
    ingredients = query(`SELECT _id, ingredient, name, level FROM ingredients ORDER BY ingredient, level`);
  } catch(e) {}

  const bonuses = ['All', ...[...new Set(combos.map(c => c.bonus).filter(Boolean))].sort()];
  const byIngr = groupBy(combos, c => c.ingredient1);

  const html = `
    <div class="tabs" style="margin-bottom:8px">
      <div class="tab active" data-tab-group="ctype" data-tab-id="combos">Combos</div>
      ${ingredients.length ? `<div class="tab" data-tab-group="ctype" data-tab-id="ingredients">Ingredients</div>` : ''}
    </div>

    <div class="tab-panel" data-tab-group="ctype" data-tab-id="combos">
      <div class="search-wrap">
        <input class="search-input" data-search="canteen" placeholder="Search ingredients or skills…" type="search" autocomplete="off">
        <span class="search-icon">🔍</span>
      </div>
      ${bonuses.length > 1 ? `
      <div class="filter-bar">
        ${bonuses.map(b => `<div class="chip ${b === 'All' ? 'active' : ''}" data-filter="${b === 'All' ? 'all' : esc(b)}" data-filter-group="bonus" data-filter-target="canteen-combos">${esc(b)}</div>`).join('')}
      </div>` : ''}
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
                  data-searchtext="${esc(ingr)} ${esc(c.ingredient2)} ${skills.join(' ')}"
                  data-filterable="canteen-combos"
                  data-filter-value="${esc(c.bonus || '')}">
                  <div style="display:flex;gap:8px;align-items:center;width:100%">
                    <span style="font-size:13px">${esc(ingr)} + ${esc(c.ingredient2)}</span>
                    <span style="margin-left:auto">${cookBadge(c.cooked)}</span>
                  </div>
                  ${c.bonus ? `<div style="font-size:11px;color:var(--gold)">${esc(c.bonus)}</div>` : ''}
                  ${skills.length ? `<div class="combo-skills">
                    ${skills.map((s, i) => `<span class="badge badge-green" style="margin-right:4px">${esc(s)}</span>${descs[i] ? `<span style="font-size:11px;color:var(--text-dim)">${esc(descs[i])}</span>` : ''}`).join(' ')}
                  </div>` : ''}
                </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>

    ${ingredients.length ? `
    <div class="tab-panel" data-tab-group="ctype" data-tab-id="ingredients" style="display:none">
      ${(() => {
        const byType = groupBy(ingredients, i => i.ingredient);
        return Object.entries(byType).map(([type, items]) => `
          <div class="detail-section-title" style="margin-top:12px">${esc(type)}</div>
          <div class="card" style="margin-bottom:8px">
            ${items.map(i => `
              <div class="list-item" style="cursor:default">
                <div class="list-item-info"><div class="list-item-name">${esc(i.name)}</div></div>
                <div style="color:var(--gold)">${'★'.repeat(i.level || 0) || '—'}</div>
              </div>`).join('')}
          </div>`).join('');
      })()}
    </div>` : ''}`;

  return { title: 'Canteen', html };
}
