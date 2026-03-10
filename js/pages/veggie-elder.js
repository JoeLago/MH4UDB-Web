import { query } from '../db.js';
import { esc, itemIconPath, img, groupBy } from './utils.js';

export async function renderVeggieElder() {
  const rows = query(`SELECT ve._id, ve.quantity, l.name as location_name, l._id as location_id,
                       io.name as offer_item, io.icon_name as offer_icon, io._id as offer_id,
                       ir.name as receive_item, ir.icon_name as receive_icon, ir._id as receive_id
                       FROM veggie_elder ve
                       JOIN locations l ON ve.location_id = l._id
                       JOIN items io ON ve.offer_item_id = io._id
                       JOIN items ir ON ve.receive_item_id = ir._id
                       ORDER BY l.name, io.name`);

  const byLocation = groupBy(rows, r => r.location_name);

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="veggie" placeholder="Search trades…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${Object.entries(byLocation).map(([loc, items]) => `
        <div class="card">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px;color:var(--text-muted)">
            🗺️ ${esc(loc)}
          </div>
          ${items.map(r => `
            <div class="trade-row"
              data-searchable="veggie"
              data-searchtext="${esc(r.offer_item)} ${esc(r.receive_item)} ${esc(loc)}">
              <div data-nav="/items/${r.offer_id}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
                ${img(itemIconPath(r.offer_icon), r.offer_item)}
                <div style="font-size:13px;font-weight:500">${esc(r.offer_item)}</div>
              </div>
              <span class="trade-arrow-big">→</span>
              <div data-nav="/items/${r.receive_id}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
                ${img(itemIconPath(r.receive_icon), r.receive_item)}
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--gold)">${esc(r.receive_item)}</div>
                  ${r.quantity > 1 ? `<div style="font-size:11px;color:var(--text-muted)">×${r.quantity}</div>` : ''}
                </div>
              </div>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;

  return { title: 'Veggie Elder', html };
}
