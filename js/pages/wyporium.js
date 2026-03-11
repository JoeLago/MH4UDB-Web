import { query } from '../db.js';
import { esc, itemIconPath, img } from './utils.js';

export async function renderWyporium() {
  const rows = query(`SELECT w._id, ii.name as item_in, ii.icon_name as icon_in, ii._id as id_in,
                       io.name as item_out, io.icon_name as icon_out, io._id as id_out,
                       q.name as quest_name, q._id as quest_id
                       FROM wyporium w
                       JOIN items ii ON w.item_in_id = ii._id
                       JOIN items io ON w.item_out_id = io._id
                       LEFT JOIN quests q ON w.unlock_quest_id = q._id
                       ORDER BY io.name`);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="wyp" placeholder="Search trades…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="card">
      ${rows.map(r => `
        <div class="trade-row"
          data-searchable="wyp"
          data-searchtext="${esc(r.item_in)} ${esc(r.item_out)}">
          <div data-nav="/items/${r.id_in}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
            ${img(itemIconPath(r.icon_in), r.item_in)}
            <div>
              <div style="font-size:14px;font-weight:500">${esc(r.item_in)}</div>
              ${r.quest_name ? `<div style="font-size:11px;color:var(--text-muted)">Unlock: ${esc(r.quest_name)}</div>` : ''}
            </div>
          </div>
          <span class="trade-arrow-big">→</span>
          <div data-nav="/items/${r.id_out}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
            ${img(itemIconPath(r.icon_out), r.item_out)}
            <div style="font-size:14px;font-weight:600;color:var(--gold)">${esc(r.item_out)}</div>
          </div>
        </div>`).join('')}
    </div>`;

  return { title: 'Wyporium', html };
}
