import { query, queryOne } from '../db.js';
import { esc, itemIconPath, img, pctBar, groupBy, weaponIconPath, armorIconPath } from './utils.js';

function rankBadge(rank) {
  const cls = rank === 'G' ? 'badge-orange' : rank === 'HR' ? 'badge-blue' : 'badge-green';
  return `<span class="badge ${cls}">${esc(rank)}</span>`;
}

function conditionBadge(condition) {
  const c = condition || '';
  let cls = 'badge-default';
  if (c.startsWith('Break')) cls = 'badge-red';
  else if (c.startsWith('Shiny Drop')) cls = 'badge-gold';
  else if (c.includes('Carve')) cls = 'badge-default';
  else if (c === 'Capture') cls = 'badge-water';
  return `<span class="badge ${cls}">${esc(c)}</span>`;
}

export async function renderItemList() {
  const items = query(`SELECT _id, name, type, sub_type, rarity, icon_name
                        FROM items WHERE type NOT IN ('Weapon','Armor','Decoration')
                        ORDER BY type, name`);

  const types = [...new Set(items.map(i => i.type))].sort();

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="items" placeholder="Search items…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="filter-bar">
      <div class="chip active" data-filter="all" data-filter-group="type" data-filter-target="items">All</div>
      ${types.map(t => `<div class="chip" data-filter="${esc(t)}" data-filter-group="type" data-filter-target="items">${esc(t)}</div>`).join('')}
    </div>
    <div class="card">
      ${items.map(i => `
        <div class="list-item"
          data-nav="/items/${i._id}"
          data-searchable="items"
          data-searchtext="${esc(i.name)}"
          data-filterable="items"
          data-filter-value="${esc(i.type)}">
          ${img(itemIconPath(i.icon_name), i.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(i.name)}</div>
            <div class="list-item-sub">${esc(i.type)}${i.sub_type ? ' · ' + esc(i.sub_type) : ''}${i.rarity ? ` · R${i.rarity}` : ''}</div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;

  return { title: 'Items', html };
}

export async function renderItemDetail(id) {
  const item = queryOne('SELECT * FROM items WHERE _id = ?', [id]);
  if (!item) return { title: 'Not Found', html: '<div class="empty-state"><p>Item not found.</p></div>' };

  const monsterSources = query(`SELECT hr.condition, hr.rank, hr.stack_size, hr.percentage, m.name as monster_name, m._id as monster_id, m.icon_name as monster_icon
                                 FROM hunting_rewards hr JOIN monsters m ON hr.monster_id = m._id
                                 WHERE hr.item_id = ? ORDER BY hr.rank, hr.percentage DESC`, [id]);

  const gathering = query(`SELECT g.area, g.site, g.rank, g.quantity, g.percentage, l.name as location_name, l._id as location_id
                            FROM gathering g JOIN locations l ON g.location_id = l._id
                            WHERE g.item_id = ? ORDER BY g.rank, g.percentage DESC`, [id]);

  const craftingUses = query(`SELECT c.quantity, c.type, i.name, i._id, i.type as item_type, i.rarity, i.icon_name,
                                w.wtype, a.slot
                               FROM components c
                               JOIN items i ON c.created_item_id = i._id
                               LEFT JOIN weapons w ON w._id = i._id
                               LEFT JOIN armor a ON a._id = i._id
                               WHERE c.component_item_id = ?`, [id]);

  const combining = query(`SELECT c.percentage, c.amount_made_min, c.amount_made_max,
                            i1.name as item1, i2.name as item2, ir.name as result, ir._id as result_id
                            FROM combining c
                            JOIN items i1 ON c.item_1_id = i1._id
                            JOIN items i2 ON c.item_2_id = i2._id
                            JOIN items ir ON c.created_item_id = ir._id
                            WHERE c.item_1_id = ? OR c.item_2_id = ?`, [id, id]);

  const questRewards = query(`SELECT qr.stack_size, qr.percentage, qr.reward_slot, q.name as quest_name, q._id as quest_id, q.hub, q.stars
                               FROM quest_rewards qr JOIN quests q ON qr.quest_id = q._id
                               WHERE qr.item_id = ? ORDER BY q.hub, q.stars, q.name, qr.reward_slot`, [id]);

  const html = `
    <div class="detail-header">
      ${img(itemIconPath(item.icon_name), item.name, '')}
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(item.name)}</div>
        <div class="detail-header-meta">
          <span class="badge badge-default">${esc(item.type)}</span>
          ${item.sub_type ? `<span class="badge badge-default">${esc(item.sub_type)}</span>` : ''}
          ${item.rarity ? `<span style="font-size:13px;color:var(--text-muted)">Rarity ${item.rarity}</span>` : ''}
        </div>
      </div>
    </div>

    ${item.description ? `<p style="font-size:14px;color:var(--text-muted);margin-bottom:20px;line-height:1.6">${esc(item.description)}</p>` : ''}

    <div class="detail-section">
      <div class="detail-section-title">Info</div>
      <div class="card">
        ${item.buy != null ? `<div class="stat-row"><span class="stat-label">Buy</span><span class="stat-value">${Number(item.buy).toLocaleString()}z</span></div>` : ''}
        ${item.sell != null ? `<div class="stat-row"><span class="stat-label">Sell</span><span class="stat-value">${Number(item.sell).toLocaleString()}z</span></div>` : ''}
        <div class="stat-row"><span class="stat-label">Carry</span><span class="stat-value">${item.carry_capacity}</span></div>
      </div>
    </div>

    ${combining.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Combining</div>
      <div class="card">
        ${combining.map(c => `
          <div class="combine-row">
            <div class="combine-item">${esc(c.item1)}</div>
            <span class="combine-plus">+</span>
            <div class="combine-item">${esc(c.item2)}</div>
            <span class="combine-arrow">→</span>
            <div class="combine-item" style="font-weight:600" data-nav="/items/${c.result_id}">${esc(c.result)}</div>
            <div class="combine-pct">${c.percentage}% · x${c.amount_made_min}${c.amount_made_min !== c.amount_made_max ? '-' + c.amount_made_max : ''}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${monsterSources.length ? (() => {
      const byRank = groupBy(monsterSources, s => s.rank);
      const allRanks = ['LR','HR','G'].filter(r => byRank[r]);
      const savedMsrcRank = localStorage.getItem('filter:item-msrc:rank');
      const defaultMsrcRank = (savedMsrcRank && allRanks.includes(savedMsrcRank)) ? savedMsrcRank : allRanks[0];
      return `
    <div class="detail-section">
      <div class="detail-section-title">Monster Sources</div>
      ${allRanks.length > 1 ? `<div class="filter-bar">
        ${allRanks.map(r => `<div class="chip ${r === defaultMsrcRank ? 'active' : ''}" data-filter="${r}" data-filter-group="rank" data-filter-target="item-msrc">${r} Rank</div>`).join('')}
      </div>` : ''}
      <div class="card">
        ${allRanks.map(rank => byRank[rank].map(s => `
          <div class="list-item" data-nav="/monsters/${s.monster_id}"
            ${allRanks.length > 1 ? `data-filterable="item-msrc" data-filter-value="${rank}" ${rank !== defaultMsrcRank ? 'style="display:none"' : ''}` : ''}>
            ${img(`icons/icons_monster/${s.monster_icon}`, s.monster_name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(s.monster_name)}</div>
              <div class="list-item-sub" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:2px">
                ${conditionBadge(s.condition)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
              <span style="color:var(--text-muted);font-size:14px;font-weight:600;min-width:28px;text-align:right">×${s.stack_size}</span>
              <div style="min-width:44px;text-align:center">
                <div style="font-weight:600;font-size:14px">${s.percentage}%</div>
                ${pctBar(s.percentage)}
              </div>
            </div>
          </div>`).join('')).join('')}
      </div>
    </div>`;
    })() : ''}

    ${gathering.length ? (() => {
      const byRank = groupBy(gathering, g => g.rank);
      const allRanks = ['LR','HR','G'].filter(r => byRank[r]);
      const savedGathRank = localStorage.getItem('filter:item-gath:rank');
      const defaultGathRank = (savedGathRank && allRanks.includes(savedGathRank)) ? savedGathRank : allRanks[0];
      return `
    <div class="detail-section">
      <div class="detail-section-title">Gathering</div>
      ${allRanks.length > 1 ? `<div class="filter-bar">
        ${allRanks.map(r => `<div class="chip ${r === defaultGathRank ? 'active' : ''}" data-filter="${r}" data-filter-group="rank" data-filter-target="item-gath">${r} Rank</div>`).join('')}
      </div>` : ''}
      <div class="card">
        ${allRanks.map(rank => byRank[rank].map(g => `
          <div class="list-item" data-nav="/locations/${g.location_id}"
            ${allRanks.length > 1 ? `data-filterable="item-gath" data-filter-value="${rank}" ${rank !== defaultGathRank ? 'style="display:none"' : ''}` : ''}>
            <div class="list-item-info">
              <div class="list-item-name">${esc(g.location_name)}</div>
              <div class="list-item-sub">Area ${esc(g.area)} · ${esc(g.site)} · x${g.quantity}</div>
            </div>
            <div style="text-align:right;min-width:48px">
              <div style="font-weight:600">${g.percentage}%</div>
              ${pctBar(g.percentage)}
            </div>
          </div>`).join('')).join('')}
      </div>
    </div>`;
    })() : ''}

    ${questRewards.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Quest Rewards</div>
      <div class="card">
        ${questRewards.map(q => `
          <div class="list-item" data-nav="/quests/${q.quest_id}">
            <div class="list-item-info">
              <div class="list-item-name">${esc(q.quest_name)}</div>
              <div class="list-item-sub" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px">
                <span class="badge ${q.hub === 'Guild' ? 'badge-blue' : q.hub === 'Event' ? 'badge-gold' : 'badge-green'}">${esc(q.hub)}</span>
                ${q.stars ? `<span class="badge badge-default">${q.stars}★</span>` : ''}
                <span class="badge ${q.reward_slot === 'A' ? 'badge-default' : q.reward_slot === 'B' ? 'badge-orange' : 'badge-red'}">Slot ${esc(q.reward_slot)}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
              <span style="color:var(--text-muted);font-size:14px;font-weight:600;min-width:28px;text-align:right">×${q.stack_size}</span>
              <div style="min-width:44px;text-align:center">
                <div style="font-weight:600;font-size:14px">${q.percentage}%</div>
                ${pctBar(q.percentage)}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${craftingUses.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Used To Craft</div>
      <div class="card">
        ${craftingUses.map(c => {
          const iconPath = c.item_type === 'Weapon'     ? weaponIconPath(c.wtype, c.rarity)
                         : c.item_type === 'Armor'      ? armorIconPath(c.slot, c.rarity)
                         : itemIconPath(c.icon_name);
          const navSection = c.item_type === 'Weapon' ? 'weapons'
                           : c.item_type === 'Armor' ? 'armor'
                           : c.item_type === 'Decoration' ? 'decorations'
                           : 'items';
          const craftCls = c.type.startsWith('Create') ? 'badge-green' : 'badge-gold';
          return `
          <div class="list-item" data-nav="/${navSection}/${c._id}">
            ${img(iconPath, c.name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(c.name)}</div>
              <div class="list-item-sub"><span class="badge ${craftCls}">${esc(c.type)}</span></div>
            </div>
            <span style="color:var(--text-muted);font-size:13px;font-weight:600;white-space:nowrap">×${c.quantity}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;

  return { title: item.name, html };
}
