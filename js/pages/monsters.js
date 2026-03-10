import { query, queryOne } from '../db.js';
import { esc, monsterIconPath, img, elementBadge, effLabel, trapLabel, pctBar, groupBy } from './utils.js';

export async function renderMonsterList() {
  const monsters = query('SELECT _id, name, class, icon_name FROM monsters ORDER BY class DESC, sort_name');
  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="monsters" placeholder="Search monsters…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="filter-bar">
      <div class="chip" data-filter="all" data-filter-group="class" data-filter-target="monsters">All</div>
      <div class="chip active" data-filter="Boss" data-filter-group="class" data-filter-target="monsters">Large</div>
      <div class="chip" data-filter="Minion" data-filter-group="class" data-filter-target="monsters">Small</div>
    </div>
    <div class="card">
      ${monsters.map(m => `
        <div class="list-item"
          data-nav="/monsters/${m._id}"
          data-searchable="monsters"
          data-searchtext="${esc(m.name)}"
          data-filterable="monsters"
          data-filter-value="${esc(m.class)}"
          ${m.class !== 'Boss' ? 'style="display:none"' : ''}>
          ${img(monsterIconPath(m.icon_name), m.name)}
          <div class="list-item-info">
            <div class="list-item-name">${esc(m.name)}</div>
            <div class="list-item-sub"><span class="badge ${m.class === 'Boss' ? 'badge-boss' : 'badge-minion'}">${m.class === 'Boss' ? 'Large Monster' : 'Small Monster'}</span></div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;
  return { title: 'Monsters', html };
}

export async function renderMonsterDetail(id) {
  const m = queryOne('SELECT * FROM monsters WHERE _id = ?', [id]);
  if (!m) return { title: 'Not Found', html: '<div class="empty-state"><p>Monster not found.</p></div>' };

  const weaknesses = query('SELECT * FROM monster_weakness WHERE monster_id = ?', [id]);
  const ailments   = query('SELECT ailment FROM monster_ailment WHERE monster_id = ? ORDER BY ailment', [id]);
  const status     = query('SELECT status, initial, increase, max, duration, damage FROM monster_status WHERE monster_id = ?', [id]).filter(s => s.max > 0);
  const damage     = query('SELECT * FROM monster_damage WHERE monster_id = ?', [id]);
  const habitats   = query(`SELECT l.name as loc, l._id as loc_id, mh.start_area, mh.move_area, mh.rest_area
                             FROM monster_habitat mh
                             JOIN locations l ON mh.location_id = l._id WHERE mh.monster_id = ?`, [id]);
  const rewards    = query(`SELECT hr.condition, hr.rank, hr.stack_size, hr.percentage, hr.item_id, i.name, i.icon_name
                             FROM hunting_rewards hr JOIN items i ON hr.item_id = i._id
                             WHERE hr.monster_id = ? ORDER BY hr.rank, hr.condition, hr.percentage DESC`, [id]);

  // Weakness tabs
  const states = [...new Set(weaknesses.map(w => w.state))];
  const weaknessTabs = states.map((state, idx) => {
    const w = weaknesses.find(x => x.state === state);
    if (!w) return '';
    return `
      <div class="tab ${idx === 0 ? 'active' : ''}" data-tab-group="weak" data-tab-id="${state}">${state}</div>`;
  }).join('');

  const weaknessPanels = states.map((state, idx) => {
    const w = weaknesses.find(x => x.state === state);
    if (!w) return '';

    function mii(name) { return `<img src="icons/icons_monster_info/${name}.png" class="weak-icon" alt="${name}">`; }

    function starColor(val, outOf) {
      if (val <= 0)       return 'var(--text-dim)';
      if (val >= outOf)   return 'var(--accent)';
      if (val === 1)      return '#f0c040';
      return '#e67e22';
    }

    function weakCell(icon, label, val, outOf) {
      const stars = val > 0 ? '★'.repeat(val) : '—';
      const color = starColor(val, outOf);
      return `
        <div class="weak-cell">
          ${icon ? mii(icon) : '<span class="weak-icon-placeholder"></span>'}
          <span class="weak-cell-label">${label}</span>
          <span class="weak-cell-stars" style="color:${color}">${stars}</span>
        </div>`;
    }

    function trapItem(label, val) {
      const active = val > 0;
      return `
        <div class="trap-item ${active ? 'trap-active' : 'trap-inactive'}">
          <span class="trap-check">${active ? '✓' : '✗'}</span>
          <span class="trap-label">${label}</span>
        </div>`;
    }

    return `
      <div class="tab-panel" data-tab-group="weak" data-tab-id="${state}" ${idx > 0 ? 'style="display:none"' : ''}>
        <div class="weak-row">
          ${weakCell('Fire',      'Fire',      w.fire,      3)}
          ${weakCell('Water',     'Water',     w.water,     3)}
          ${weakCell('Thunder',   'Thunder',   w.thunder,   3)}
          ${weakCell('Ice',       'Ice',       w.ice,       3)}
          ${weakCell('Dragon',    'Dragon',    w.dragon,    3)}
        </div>
        <div class="weak-divider"></div>
        <div class="weak-row">
          ${weakCell('Poison',    'Poison',    w.poison,    2)}
          ${weakCell('Paralysis', 'Para',      w.paralysis, 2)}
          ${weakCell('Sleep',     'Sleep',     w.sleep,     2)}
        </div>
        <div class="weak-divider"></div>
        <div class="trap-grid">
          ${trapItem('Pitfall',  w.pitfall_trap)}
          ${trapItem('Shock',    w.shock_trap)}
          ${trapItem('Flash',    w.flash_bomb)}
          ${trapItem('Sonic',    w.sonic_bomb)}
          ${trapItem('Dung',     w.dung_bomb)}
          ${trapItem('Meat',     w.meat)}
        </div>
      </div>`;
  }).join('');

  // Hitzone table — group by state parsed from body_part parentheses
  function parsePart(bodyPart) {
    const m = bodyPart.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    return m ? { name: m[1], state: m[2] } : { name: bodyPart, state: null };
  }
  const stateGroups = [];
  const stateMap = new Map();
  for (const d of damage) {
    const { name, state } = parsePart(d.body_part);
    const key = state ?? '__normal__';
    if (!stateMap.has(key)) {
      const group = { state: state ?? 'Normal', rows: [] };
      stateMap.set(key, group);
      stateGroups.push(group);
    }
    stateMap.get(key).rows.push({ ...d, cleanName: name });
  }
  const useStateHeaders = stateGroups.length > 1 || stateGroups.some(g => g.state !== 'Normal');

  function hzColor(v) {
    if (v == null) return 'var(--text-dim)';
    if (v >= 50)   return 'var(--accent)';
    if (v >= 30)   return '#e67e22';
    if (v >= 15)   return 'var(--text)';
    return 'var(--text-dim)';
  }
  function hzCell(v) {
    return `<td style="color:${hzColor(v)}">${v ?? '—'}</td>`;
  }

  const hitzoneHtml = damage.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Hitzones</div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Part</th><th>Cut</th><th>Imp</th><th>Shot</th>
            <th><img src="icons/icons_monster_info/Fire.png" class="elem-icon" alt="Fire"></th>
            <th><img src="icons/icons_monster_info/Water.png" class="elem-icon" alt="Water"></th>
            <th><img src="icons/icons_monster_info/Ice.png" class="elem-icon" alt="Ice"></th>
            <th><img src="icons/icons_monster_info/Thunder.png" class="elem-icon" alt="Thunder"></th>
            <th><img src="icons/icons_monster_info/Dragon.png" class="elem-icon" alt="Dragon"></th>
            <th>KO</th>
          </tr></thead>
          <tbody>
            ${stateGroups.map(g => `
              ${useStateHeaders ? `<tr class="hitzone-state-header"><td colspan="10">${esc(g.state)}</td></tr>` : ''}
              ${g.rows.map(d => `<tr>
                <td>${esc(d.cleanName)}</td>
                ${hzCell(d.cut)}${hzCell(d.impact)}${hzCell(d.shot)}
                ${hzCell(d.fire)}${hzCell(d.water)}${hzCell(d.ice)}${hzCell(d.thunder)}
                ${hzCell(d.dragon)}${hzCell(d.ko)}
              </tr>`).join('')}`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

  // Habitats
  const habitatHtml = habitats.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Habitats</div>
      <div class="card">
        ${habitats.map(h => `
          <div class="list-item" data-nav="/locations/${h.loc_id}">
            <div class="list-item-info">
              <div class="list-item-name">${esc(h.loc)}</div>
              <div class="list-item-sub">
                ${h.start_area != null ? `Start: ${h.start_area}` : ''}
                ${h.move_area ? ` · Roam: ${esc(h.move_area)}` : ''}
                ${h.rest_area != null ? ` · Rest: ${h.rest_area}` : ''}
              </div>
            </div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  // Rewards by rank
  const rankRewards = groupBy(rewards, r => r.rank);
  const ranks = ['LR', 'HR', 'G'];
  const availableRanks = ranks.filter(r => rankRewards[r]);
  const rewardsHtml = availableRanks.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Rewards</div>
      <div class="tabs">
        ${availableRanks.map((r, i) => `
          <div class="tab ${i === 0 ? 'active' : ''}" data-tab-group="rewards" data-tab-id="${r}">${r} Rank</div>`).join('')}
      </div>
      ${availableRanks.map((rank, i) => {
        const byCondition = groupBy(rankRewards[rank], r => r.condition);
        return `
          <div class="tab-panel" data-tab-group="rewards" data-tab-id="${rank}" ${i > 0 ? 'style="display:none"' : ''}>
            ${Object.entries(byCondition).map(([cond, items]) => `
              <div class="detail-section-title" style="margin-top:12px">${esc(cond)}</div>
              <div class="card" style="margin-bottom:12px">
                ${items.map(r => `
                  <div class="list-item" data-nav="/items/${r.item_id}">
                    ${img('icons/icons_items/' + r.icon_name, r.name)}
                    <div class="list-item-info">
                      <div class="list-item-name">${esc(r.name)}</div>
                      <div class="list-item-sub">x${r.stack_size}</div>
                    </div>
                    <div style="text-align:right;min-width:48px">
                      <div style="font-weight:600">${r.percentage}%</div>
                      ${pctBar(r.percentage)}
                    </div>
                  </div>`).join('')}
              </div>`).join('')}
          </div>`;
      }).join('')}
    </div>` : '';

  const html = `
    <div class="detail-header">
      ${img(monsterIconPath(m.icon_name), m.name, '')}
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(m.name)}</div>
        <div class="detail-header-meta">
          <span class="badge ${m.class === 'Boss' ? 'badge-boss' : 'badge-minion'}">${m.class === 'Boss' ? 'Large Monster' : 'Small Monster'}</span>
        </div>
      </div>
    </div>

    ${m.trait ? `
    <div class="detail-section">
      <div class="detail-section-title">Trait</div>
      <p style="font-size:14px;color:var(--text-muted);line-height:1.6">${esc(m.trait)}</p>
    </div>` : ''}

    ${weaknesses.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Weaknesses</div>
      <div class="tabs">${weaknessTabs}</div>
      <div class="card" style="padding:0;overflow:hidden">${weaknessPanels}</div>
    </div>` : ''}

    ${status.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Status Buildup</div>
      <div class="card">
        <div class="status-header">
          <span></span>
          <span class="status-cols">
            <span>Initial</span><span>+</span><span>Max</span><span>Dur</span><span>Dmg</span>
          </span>
        </div>
        ${status.map(s => `
        <div class="list-item" style="cursor:default">
          <span class="list-item-name" style="flex:1">${esc(s.status)}</span>
          <span class="status-cols">
            <span>${s.initial ?? '—'}</span>
            <span>${s.increase ?? '—'}</span>
            <span>${s.max ?? '—'}</span>
            <span>${s.duration ?? '—'}</span>
            <span>${s.damage ?? '—'}</span>
          </span>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${ailments.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Inflicts</div>
      <div class="ailment-tags">
        ${ailments.map(a => `<span class="ailment-tag">${esc(a.ailment)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${hitzoneHtml}
    ${habitatHtml}
    ${rewardsHtml}`;

  return { title: m.name, html };
}
