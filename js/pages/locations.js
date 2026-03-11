import { query, queryOne } from '../db.js';
import { esc, itemIconPath, monsterIconPath, img, pctBar, groupBy } from './utils.js';

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

  const monsters = query(`SELECT DISTINCT m._id, m.name, m.icon_name
                           FROM monster_habitat mh JOIN monsters m ON mh.monster_id = m._id
                           WHERE mh.location_id = ? ORDER BY m.name`, [id]);

  const veggieElderTrades = query(`SELECT ve._id, ve.offer_item_id, i_off.name as offer_name, i_off.icon_name as offer_icon,
                                    ve.receive_item_id, i_rec.name as receive_name, i_rec.icon_name as receive_icon,
                                    ve.quantity
                                    FROM veggie_elder ve
                                    JOIN items i_off ON ve.offer_item_id = i_off._id
                                    JOIN items i_rec ON ve.receive_item_id = i_rec._id
                                    WHERE ve.location_id = ? ORDER BY i_off.name`, [id]);

  const byRank = groupBy(gathering, g => g.rank);
  const availRanks = ['LR','HR','G'].filter(r => byRank[r]);
  const savedLocRank = localStorage.getItem('filter:loc-gath:rank');
  const defaultLocRank = (savedLocRank && availRanks.includes(savedLocRank)) ? savedLocRank : availRanks[0];

  const html = `
    ${loc.map ? `<img src="icons/icons_location/${loc.map}" alt="${esc(loc.name)}" class="location-map">` : ''}

    <h2 style="font-size:20px;font-weight:700;margin-bottom:20px">${esc(loc.name)}</h2>

    ${availRanks.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Gathering</div>
      <div class="filter-bar">
        ${availRanks.map(r => `<div class="chip ${r === defaultLocRank ? 'active' : ''}" data-filter="${r}" data-filter-group="rank" data-filter-target="loc-gath">${r} Rank</div>`).join('')}
      </div>
      ${availRanks.map(rank => {
        const byArea = groupBy(byRank[rank], g => g.area);
        const areas = Object.keys(byArea).sort((a, b) => {
          const an = parseInt(a.replace('Area ', '')), bn = parseInt(b.replace('Area ', ''));
          if (!isNaN(an) && !isNaN(bn)) return an - bn;
          if (!isNaN(an)) return -1;
          if (!isNaN(bn)) return 1;
          return a.localeCompare(b);
        });
        const fg = `loc-area-${rank}`;
        return `
          <div data-filterable="loc-gath" data-filter-value="${rank}" ${rank !== defaultLocRank ? 'style="display:none"' : ''}>
            <div class="filter-bar" style="margin:8px 0">
              <div class="chip active" data-filter="all" data-filter-group="${fg}" data-filter-target="${fg}">All</div>
              ${areas.map(a => {
                const label = a.startsWith('Area ') ? a.slice(5) : a;
                return `<div class="chip" data-filter="${esc(a)}" data-filter-group="${fg}" data-filter-target="${fg}">${esc(label)}</div>`;
              }).join('')}
            </div>
            ${areas.map(area => `
              <div data-filterable="${fg}" data-filter-value="${esc(area)}">
                <div class="detail-section-title" style="margin-top:10px">${esc(area)}</div>
                <div class="card" style="margin-bottom:10px">
                  ${byArea[area].map(g => `
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
                </div>
              </div>`).join('')}
          </div>`;
      }).join('')}
    </div>` : ''}

    ${monsters.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Monsters Here</div>
      <div class="card">
        ${monsters.map(m => `
          <div class="list-item" data-nav="/monsters/${m._id}">
            ${img(monsterIconPath(m.icon_name), m.name)}
            <div class="list-item-info"><div class="list-item-name">${esc(m.name)}</div></div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${veggieElderTrades.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Veggie Elder Trades</div>
      <div class="card">
        ${veggieElderTrades.map(t => `
          <div class="trade-row">
            <div data-nav="/items/${t.offer_item_id}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
              ${img(itemIconPath(t.offer_icon), t.offer_name)}
              <div style="font-size:13px">${esc(t.offer_name)}</div>
            </div>
            <span class="trade-arrow-big">→</span>
            <div data-nav="/items/${t.receive_item_id}" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">
              ${img(itemIconPath(t.receive_icon), t.receive_name)}
              <div style="font-size:13px;font-weight:600;color:var(--gold)">${esc(t.receive_name)}${t.quantity > 1 ? ` ×${t.quantity}` : ''}</div>
            </div>
          </div>`).join('')}
      </div>
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
