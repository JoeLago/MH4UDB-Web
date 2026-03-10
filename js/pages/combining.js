import { query } from '../db.js';
import { esc, itemIconPath, img } from './utils.js';

export async function renderCombining() {
  const rows = query(`SELECT c.percentage, c.amount_made_min, c.amount_made_max,
                       i1.name as item1, i1.icon_name as icon1, i1._id as id1,
                       i2.name as item2, i2.icon_name as icon2, i2._id as id2,
                       ir.name as result, ir.icon_name as result_icon, ir._id as result_id
                       FROM combining c
                       JOIN items i1 ON c.item_1_id = i1._id
                       JOIN items i2 ON c.item_2_id = i2._id
                       JOIN items ir ON c.created_item_id = ir._id
                       ORDER BY ir.name`);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="combine" placeholder="Search by item or result…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="card">
      ${rows.map(r => `
        <div class="combine-row"
          data-searchable="combine"
          data-searchtext="${esc(r.item1)} ${esc(r.item2)} ${esc(r.result)}">
          <div class="combine-item">
            ${img(itemIconPath(r.icon1), r.item1)}
            <span data-nav="/items/${r.id1}" style="cursor:pointer;color:var(--accent)">${esc(r.item1)}</span>
          </div>
          <span class="combine-plus">+</span>
          <div class="combine-item">
            ${img(itemIconPath(r.icon2), r.item2)}
            <span data-nav="/items/${r.id2}" style="cursor:pointer;color:var(--accent)">${esc(r.item2)}</span>
          </div>
          <span class="combine-arrow">→</span>
          <div class="combine-item" style="font-weight:600">
            ${img(itemIconPath(r.result_icon), r.result)}
            <span data-nav="/items/${r.result_id}" style="cursor:pointer;color:var(--text)">${esc(r.result)}</span>
          </div>
          <div class="combine-pct">
            ${r.percentage}%
            <div style="font-size:11px;color:var(--text-dim)">×${r.amount_made_min}${r.amount_made_min !== r.amount_made_max ? '–' + r.amount_made_max : ''}</div>
          </div>
        </div>`).join('')}
    </div>`;

  return { title: 'Combining', html };
}
