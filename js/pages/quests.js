import { query, queryOne } from '../db.js';
import { esc, monsterIconPath, itemIconPath, img, pctBar, groupBy } from './utils.js';

function pctColor(pct) {
  if (pct >= 50) return '#27ae60';
  if (pct >= 20) return '#e67e22';
  return 'var(--text-muted)';
}

export async function renderQuestList() {
  const quests = query(`SELECT q._id, q.name, q.hub, q.type, q.stars, q.goal, q.reward, l.name as location_name
                         FROM quests q JOIN locations l ON q.location_id = l._id
                         ORDER BY q.hub, q.stars, q.name`);

  let arenaQuests = [];
  try {
    arenaQuests = query(`SELECT aq._id, aq.name, l.name as location_name, aq.reward, aq.num_participants
                          FROM arena_quests aq
                          LEFT JOIN locations l ON aq.location_id = l._id
                          ORDER BY aq.name`);
  } catch(e) {}

  const hubOrder = ['Caravan', 'Guild', 'Event'];
  const hubs = [...new Set(quests.map(q => q.hub))].sort((a, b) => {
    const ai = hubOrder.indexOf(a), bi = hubOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const html = `
    <div class="tabs" style="margin-bottom:8px">
      <div class="tab active" data-tab-group="qtype" data-tab-id="regular">Regular</div>
      ${arenaQuests.length ? `<div class="tab" data-tab-group="qtype" data-tab-id="arena">Arena</div>` : ''}
    </div>

    <div class="tab-panel" data-tab-group="qtype" data-tab-id="regular">
      <div class="search-wrap">
        <input class="search-input" data-search="quests" placeholder="Search quests…" type="search" autocomplete="off">
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-bar">
        <div class="chip" data-filter="all" data-filter-group="hub" data-filter-target="quests">All</div>
        ${hubs.map(h => `<div class="chip${h==='Caravan'?' active':''}" data-filter="${esc(h)}" data-filter-group="hub" data-filter-target="quests">${esc(h)}</div>`).join('')}
      </div>
      <div class="filter-bar">
        <div class="chip active" data-filter="all" data-filter-group="rank" data-filter-target="quests">All ★</div>
        ${[...Array(10)].map((_, i) => `<div class="chip" data-filter="${i+1}" data-filter-group="rank" data-filter-target="quests">${i+1}★</div>`).join('')}
      </div>
      <div class="card">
        ${quests.map(q => `
          <div class="list-item"
            data-nav="/quests/${q._id}"
            data-searchable="quests"
            data-searchtext="${esc(q.name)} ${esc(q.goal)}"
            data-filterable="quests"
            data-filter-value="${esc(q.hub)}"
            data-filter-rank="${q.stars}">
            <div class="list-item-info">
              <div class="list-item-name">${esc(q.name)}</div>
              <div class="list-item-sub" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">
                <span class="badge ${q.hub==='Guild'?'badge-gold':q.hub==='Event'?'badge-green':'badge-blue'}">${esc(q.hub)}</span>
                <span class="badge badge-gold">${q.stars}★</span>
                ${q.type==='Urgent'?`<span class="badge badge-red">Urgent</span>`:q.type==='Key'?`<span class="badge badge-gold">Key</span>`:''}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;color:var(--gold);font-weight:600">${Number(q.reward).toLocaleString()}z</div>
            </div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>

    ${arenaQuests.length ? `
    <div class="tab-panel" data-tab-group="qtype" data-tab-id="arena" style="display:none">
      <div class="card">
        ${arenaQuests.map(q => `
          <div class="list-item" data-nav="/arena-quests/${q._id}">
            <div class="list-item-info">
              <div class="list-item-name">${esc(q.name)}</div>
              <div class="list-item-sub">${q.location_name ? esc(q.location_name) : ''}${q.num_participants ? ' · ' + q.num_participants + ' players' : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;color:var(--gold);font-weight:600">${Number(q.reward || 0).toLocaleString()}z</div>
            </div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: 'Quests', html };
}

export async function renderQuestDetail(id) {
  const q = queryOne(`SELECT q.*, l.name as location_name FROM quests q
                       JOIN locations l ON q.location_id = l._id WHERE q._id = ?`, [id]);
  if (!q) return { title: 'Not Found', html: '<div class="empty-state"><p>Quest not found.</p></div>' };

  const monsters = query(`SELECT m.name, m.icon_name, m._id,
                           COALESCE(mtq.unstable, 'no') as unstable
                           FROM monster_to_quest mtq
                           JOIN monsters m ON mtq.monster_id = m._id
                           WHERE mtq.quest_id = ?
                           ORDER BY mtq.unstable DESC, m.name`, [id]);

  let rewards = [];
  try {
    rewards = query(`SELECT qr.*, i.name as item_name, i.icon_name FROM quest_rewards qr
                      JOIN items i ON qr.item_id = i._id WHERE qr.quest_id = ?
                      ORDER BY qr.rank, qr.reward_slot, qr.percentage DESC`, [id]);
  } catch(e) {}

  const prereqs = query(`SELECT q2.name, q2._id FROM quest_prereqs qp
                          JOIN quests q2 ON qp.prereq_id = q2._id
                          WHERE qp.quest_id = ?`, [id]);

  // Group rewards by slot (A / B / Sub)
  const rewardSlots = [];
  const bySlot = groupBy(rewards, r => r.reward_slot || 'A');
  for (const slot of ['A', 'B', 'Sub']) {
    if (bySlot[slot]) rewardSlots.push({ slot, items: bySlot[slot] });
  }
  // Any other slot values not handled above
  for (const [slot, items] of Object.entries(bySlot)) {
    if (!['A','B','Sub'].includes(slot)) rewardSlots.push({ slot, items });
  }

  const html = `
    <div class="detail-header" style="padding:16px">
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(q.name)}</div>
        <div class="detail-header-meta" style="margin-top:6px">
          <span class="badge badge-default">${esc(q.hub)}</span>
          <span class="badge badge-gold">${q.stars}★</span>
          ${q.type ? `<span class="badge badge-red">${esc(q.type)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Details</div>
      <div class="card">
        <div class="stat-row"><span class="stat-label">Location</span>
          <span class="stat-value" style="cursor:pointer;color:var(--gold)" data-nav="/locations/${q.location_id}">${esc(q.location_name)}</span>
        </div>
        <div class="stat-row"><span class="stat-label">Time Limit</span><span class="stat-value">${q.time_limit} min</span></div>
        <div class="stat-row"><span class="stat-label">Entry Fee</span><span class="stat-value">${Number(q.fee).toLocaleString()}z</span></div>
        <div class="stat-row"><span class="stat-label">Reward</span><span class="stat-value">${Number(q.reward).toLocaleString()}z</span></div>
        ${q.hrp != null ? `<div class="stat-row"><span class="stat-label">HRP</span><span class="stat-value">+${q.hrp}</span></div>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Objective</div>
      <div class="card" style="padding:12px 16px">
        <p style="font-size:14px;line-height:1.6;margin:0">${esc(q.goal)}</p>
      </div>
    </div>

    ${(q.sub_goal && q.sub_goal !== 'None') ? `
    <div class="detail-section">
      <div class="detail-section-title">Sub-Objective</div>
      <div class="card" style="padding:12px 16px">
        <p style="font-size:14px;line-height:1.6;margin:0 0 ${(q.sub_reward || q.sub_hrp) ? '10px' : '0'}">${esc(q.sub_goal)}</p>
        ${(q.sub_reward || q.sub_hrp) ? `<div style="display:flex;gap:16px;font-size:13px">
          ${q.sub_reward ? `<span style="color:var(--text-muted)">Reward: <strong style="color:var(--gold)">${Number(q.sub_reward).toLocaleString()}z</strong></span>` : ''}
          ${q.sub_hrp ? `<span style="color:var(--text-muted)">HRP: <strong style="color:var(--text)">+${q.sub_hrp}</strong></span>` : ''}
        </div>` : ''}
      </div>
    </div>` : ''}

    ${monsters.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Monsters</div>
      <div class="card">
        ${monsters.map(m => `
          <div class="list-item" data-nav="/monsters/${m._id}">
            ${img(monsterIconPath(m.icon_name), m.name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(m.name)}</div>
              ${m.unstable === 'yes' ? `<div class="list-item-sub"><span class="badge badge-red">Frenzied</span></div>` : ''}
            </div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${rewardSlots.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Rewards</div>
      ${rewardSlots.map(({ slot, items }) => `
        <div class="detail-section-title" style="font-size:12px;margin-top:10px;color:var(--text-muted)">Slot ${esc(slot)}</div>
        <div class="card" style="margin-bottom:8px">
          ${items.map(r => `
            <div class="list-item" data-nav="/items/${r.item_id}">
              ${img(itemIconPath(r.icon_name), r.item_name)}
              <div class="list-item-info">
                <div class="list-item-name">${esc(r.item_name)}</div>
                <div class="list-item-sub">x${r.stack_size || 1}</div>
              </div>
              <div style="text-align:right;min-width:48px">
                <div style="font-weight:600;color:${pctColor(r.percentage)}">${r.percentage}%</div>
                ${pctBar(r.percentage)}
              </div>
            </div>`).join('')}
        </div>`).join('')}
    </div>` : ''}

    ${prereqs.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Prerequisites</div>
      <div class="card">
        ${prereqs.map(p => `
          <div class="list-item" data-nav="/quests/${p._id}">
            <div class="list-item-info"><div class="list-item-name">${esc(p.name)}</div></div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: q.name, html };
}

export async function renderArenaQuestDetail(id) {
  let q = null;
  try {
    q = queryOne(`SELECT aq.*, l.name as location_name FROM arena_quests aq
                   LEFT JOIN locations l ON aq.location_id = l._id WHERE aq._id = ?`, [id]);
  } catch(e) {}
  if (!q) return { title: 'Not Found', html: '<div class="empty-state"><p>Arena quest not found.</p></div>' };

  let rewards = [];
  try {
    rewards = query(`SELECT ar.*, i.name as item_name, i.icon_name FROM arena_rewards ar
                      JOIN items i ON ar.item_id = i._id WHERE ar.quest_id = ?
                      ORDER BY ar.percentage DESC`, [id]);
  } catch(e) {}

  const html = `
    <div class="detail-header" style="padding:16px">
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(q.name)}</div>
        <div class="detail-header-meta" style="margin-top:6px">
          <span class="badge badge-red">Arena</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Details</div>
      <div class="card">
        ${q.location_name ? `<div class="stat-row"><span class="stat-label">Location</span><span class="stat-value">${esc(q.location_name)}</span></div>` : ''}
        ${q.reward ? `<div class="stat-row"><span class="stat-label">Reward</span><span class="stat-value">${Number(q.reward).toLocaleString()}z</span></div>` : ''}
        ${q.num_participants ? `<div class="stat-row"><span class="stat-label">Players</span><span class="stat-value">${q.num_participants}</span></div>` : ''}
        ${q.time_limit_s ? `<div class="stat-row"><span class="stat-label">S Rank</span><span class="stat-value">${q.time_limit_s}</span></div>` : ''}
        ${q.time_limit_a ? `<div class="stat-row"><span class="stat-label">A Rank</span><span class="stat-value">${q.time_limit_a}</span></div>` : ''}
        ${q.time_limit_b ? `<div class="stat-row"><span class="stat-label">B Rank</span><span class="stat-value">${q.time_limit_b}</span></div>` : ''}
      </div>
    </div>

    ${rewards.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Rewards</div>
      <div class="card">
        ${rewards.map(r => `
          <div class="list-item" data-nav="/items/${r.item_id}">
            ${img(itemIconPath(r.icon_name), r.item_name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(r.item_name)}</div>
              <div class="list-item-sub">x${r.stack_size || 1}</div>
            </div>
            <div style="text-align:right;min-width:48px">
              <div style="font-weight:600;color:${pctColor(r.percentage)}">${r.percentage}%</div>
              ${pctBar(r.percentage)}
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}`;

  return { title: q.name, html };
}
