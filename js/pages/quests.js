import { query, queryOne } from '../db.js';
import { esc, monsterIconPath, itemIconPath, img, pctBar, groupBy } from './utils.js';

export async function renderQuestList() {
  const quests = query(`SELECT q._id, q.name, q.hub, q.type, q.stars, q.goal, l.name as location_name
                         FROM quests q JOIN locations l ON q.location_id = l._id
                         ORDER BY q.hub, q.stars, q.name`);

  const hubs = [...new Set(quests.map(q => q.hub))].sort();

  const html = `
    <div class="search-wrap">
      <input class="search-input" data-search="quests" placeholder="Search quests…" type="search" autocomplete="off">
      <span class="search-icon">🔍</span>
    </div>
    <div class="filter-bar">
      <div class="chip active" data-filter="all" data-filter-group="hub" data-filter-target="quests">All</div>
      ${hubs.map(h => `<div class="chip" data-filter="${esc(h)}" data-filter-group="hub" data-filter-target="quests">${esc(h)}</div>`).join('')}
    </div>
    <div class="card">
      ${quests.map(q => `
        <div class="list-item"
          data-nav="/quests/${q._id}"
          data-searchable="quests"
          data-searchtext="${esc(q.name)} ${esc(q.goal)}"
          data-filterable="quests"
          data-filter-value="${esc(q.hub)}">
          <div class="list-item-info">
            <div class="list-item-name">${esc(q.name)}</div>
            <div class="list-item-sub">${esc(q.hub)} · ${'★'.repeat(q.stars)} · ${esc(q.type)}</div>
          </div>
          <span class="list-arrow">›</span>
        </div>`).join('')}
    </div>`;

  return { title: 'Quests', html };
}

export async function renderQuestDetail(id) {
  const q = queryOne(`SELECT q.*, l.name as location_name FROM quests q
                       JOIN locations l ON q.location_id = l._id WHERE q._id = ?`, [id]);
  if (!q) return { title: 'Not Found', html: '<div class="empty-state"><p>Quest not found.</p></div>' };

  const monsters = query(`SELECT m.name, m.icon_name, m._id FROM monster_to_quest mtq
                           JOIN monsters m ON mtq.monster_id = m._id WHERE mtq.quest_id = ?`, [id]);

  let rewards = [];
  try {
    rewards = query(`SELECT qr.*, i.name as item_name, i.icon_name FROM quest_rewards qr
                      JOIN items i ON qr.item_id = i._id WHERE qr.quest_id = ?
                      ORDER BY qr.percentage DESC`, [id]);
  } catch(e) {}

  const prereqs = query(`SELECT q2.name, q2._id FROM quest_prereqs qp
                          JOIN quests q2 ON qp.prerequisite_id = q2._id
                          WHERE qp.quest_id = ?`, [id]);

  const html = `
    <div class="detail-header" style="padding:16px">
      <div class="detail-header-info">
        <div class="detail-header-name">${esc(q.name)}</div>
        <div class="detail-header-meta" style="margin-top:6px">
          <span class="badge badge-default">${esc(q.hub)}</span>
          <span class="badge badge-gold">${'★'.repeat(q.stars)}</span>
          ${q.type ? `<span class="badge badge-red">${esc(q.type)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Details</div>
      <div class="card">
        <div class="stat-row"><span class="stat-label">Location</span><span class="stat-value">${esc(q.location_name)}</span></div>
        <div class="stat-row"><span class="stat-label">Time Limit</span><span class="stat-value">${q.time_limit} min</span></div>
        <div class="stat-row"><span class="stat-label">Entry Fee</span><span class="stat-value">${Number(q.fee).toLocaleString()}z</span></div>
        <div class="stat-row"><span class="stat-label">Reward</span><span class="stat-value">${Number(q.reward).toLocaleString()}z</span></div>
        ${q.hrp != null ? `<div class="stat-row"><span class="stat-label">HRP</span><span class="stat-value">+${q.hrp}</span></div>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Objective</div>
      <p style="font-size:14px;line-height:1.6;margin-bottom:${q.sub_goal ? '12px' : '0'}">${esc(q.goal)}</p>
      ${q.sub_goal ? `<p style="font-size:13px;color:var(--text-muted);line-height:1.6">Sub: ${esc(q.sub_goal)}</p>` : ''}
    </div>

    ${monsters.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Monsters</div>
      <div class="card">
        ${monsters.map(m => `
          <div class="list-item" data-nav="/monsters/${m._id}">
            ${img(monsterIconPath(m.icon_name), m.name)}
            <div class="list-item-info"><div class="list-item-name">${esc(m.name)}</div></div>
            <span class="list-arrow">›</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${rewards.length ? `
    <div class="detail-section">
      <div class="detail-section-title">Rewards</div>
      <div class="card">
        ${rewards.map(r => `
          <div class="list-item" style="cursor:default">
            ${img(itemIconPath(r.icon_name), r.item_name)}
            <div class="list-item-info">
              <div class="list-item-name">${esc(r.item_name)}</div>
              <div class="list-item-sub">${r.rank ? esc(r.rank) + ' · ' : ''}x${r.stack_size || 1}</div>
            </div>
            <div style="text-align:right;min-width:48px">
              <div style="font-weight:600">${r.percentage}%</div>
              ${pctBar(r.percentage)}
            </div>
          </div>`).join('')}
      </div>
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
