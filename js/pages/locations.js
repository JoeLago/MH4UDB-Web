import { query, queryOne } from '../db.js';
import { esc, itemIconPath, img, pctBar, groupBy } from './utils.js';

export async function renderLocationList() {
  const locations = query('SELECT _id, name, map FROM locations ORDER BY name');

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="locs" placeholder="Search locations…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="card">
      ${locations.map(l => {
        const miniMap = l.map ? l.map.replace('.png', '_mini.png') : null;
        return `
          <div class="list-item" data-nav="/locations/${l._id}"
            data-searchable="locs" data-searchtext="${esc(l.name)}">
            ${miniMap ? img('icons/icons_location/' + miniMap, l.name, 'icon') : '<div style="width:40px;height:40px;background:var(--surface2);border-radius:4px;flex-shrink:0"></div>'}
            <div class="list-item-info">
              <div class="list-item-name">${esc(l.name)}</div>
            </div>
            <span class="list-arrow">›</span>
          </div>`;
      }).join('')}
    </div>`;

  return { title: 'Locations', html };
}

export async function renderLocationDetail(id) {
  const loc = queryOne('SELECT * FROM locations WHERE _id = ?', [id]);
  if (!loc) return { title: 'Not Found', html: '<div class="empty-state"><p>Location not found.</p></div>' };

  const gathering = query(`SELECT g.area, g.site, g.rank, g.quantity, g.percentage, i.name, i.icon_name, i._id
                            FROM gathering g JOIN items i ON g.item_id = i._id
                            WHERE g.location_id = ? ORDER BY g.rank, g.area, g.percentage DESC`, [id]);

  const quests = query(`SELECT q._id, q.name, q.hub, q.stars FROM quests q
                         WHERE q.location_id = ? ORDER BY q.hub, q.stars`, [id]);

  const ranks = ['LR','HR','G'];
  const byRank = groupBy(gathering, g => g.rank);
  const availRanks = ranks.filter(r => byRank[r]);

  const html = `
    ${loc.map ? `<img src="icons/icons_location/${loc.map}" alt="${esc(loc.name)}" class="location-map">` : ''}

    <h2 style="font-size:20px;font-weight:700;margin-bottom:20px">${esc(loc.name)}</h2>

    ${availRanks.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Gathering</div>
      <div class="tabs">
        ${availRanks.map((r, i) => `
          <div class="tab ${i===0?'active':''}" data-tab-group="rank" data-tab-id="${r}">${r} Rank</div>`).join('')}
      </div>
      ${availRanks.map((rank, i) => {
        const byArea = groupBy(byRank[rank], g => g.area);
        return `
          <div class="tab-panel" data-tab-group="rank" data-tab-id="${rank}" ${i>0?'style="display:none"':''}>
            ${Object.entries(byArea).map(([area, items]) => `
              <div class="detail-section-title" style="margin-top:10px">Area ${esc(area)}</div>
              <div class="card" style="margin-bottom:10px">
                ${items.map(g => `
                  <div class="list-item" data-nav="/items/${g._id}">
                    ${img(itemIconPath(g.icon_name), g.name)}
                    <div class="list-item-info">
                      <div class="list-item-name">${esc(g.name)}</div>
                      <div class="list-item-sub">${esc(g.site)} · x${g.quantity}</div>
                    </div>
                    <div style="text-align:right;min-width:48px">
                      <div style="font-weight:600">${g.percentage}%</div>
                      ${pctBar(g.percentage)}
                    </div>
                  </div>`).join('')}
              </div>`).join('')}
          </div>`;
      }).join('')}
    </div>` : ''}

    ${quests.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Quests Here</div>
      <div class="card">
        ${quests.map(q => `
          <div class="list-item" data-nav="/quests/${q._id}">
            <div class="list-item-info">
              <div class="list-item-name">${esc(q.name)}</div>
              <div class="list-item-sub">${esc(q.hub)} · ${'★'.repeat(q.stars)}</div>
            </div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: loc.name, html };
}
