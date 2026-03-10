import { query } from '../db.js';
import { esc, armorIconPath, img, slots, ptsClass } from './utils.js';

export async function renderArmorSearch() {
  const skillTrees = query('SELECT _id, name FROM skill_trees ORDER BY name');

  const html = `
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;line-height:1.5">
      Select skills to find armor pieces that contribute to them.
    </p>
    <div class="detail-section">
      <div class="detail-section-title">Select Skills</div>
      <div class="search-wrap">
        <input class="search-input" id="skill-search" placeholder="Filter skills…" type="search" autocomplete="off">
        <span class="search-icon">🔍</span>
      </div>
      <div id="skill-list" style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px">
        ${skillTrees.map(s => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border2);cursor:pointer" data-skill-name="${esc(s.name).toLowerCase()}">
            <input type="checkbox" value="${s._id}" data-name="${esc(s.name)}" style="accent-color:var(--accent);width:16px;height:16px">
            <span style="font-size:14px">${esc(s.name)}</span>
          </label>`).join('')}
      </div>
      <button class="btn btn-primary" id="search-btn" style="width:100%">🔍 Find Armor</button>
    </div>
    <div id="armor-results"></div>`;

  return {
    title: 'Armor Search',
    html,
    afterRender() {
      // Skill filter
      document.getElementById('skill-search').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#skill-list label').forEach(label => {
          label.style.display = label.dataset.skillName.includes(q) ? '' : 'none';
        });
      });

      document.getElementById('search-btn').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#skill-list input:checked')];
        if (!checked.length) {
          document.getElementById('armor-results').innerHTML =
            '<div class="empty-state"><p>Select at least one skill.</p></div>';
          return;
        }

        const ids = checked.map(c => c.value);
        const placeholders = ids.map(() => '?').join(',');

        const pieces = query(`
          SELECT a._id, a.slot, a.defense, a.num_slots, i.name, i.rarity,
                 st.name as skill_name, st._id as skill_id, its.point_value
          FROM armor a
          JOIN items i ON a._id = i._id
          JOIN item_to_skill_tree its ON its.item_id = a._id
          JOIN skill_trees st ON its.skill_tree_id = st._id
          WHERE its.skill_tree_id IN (${placeholders})
          ORDER BY a.slot, ABS(its.point_value) DESC`, ids);

        if (!pieces.length) {
          document.getElementById('armor-results').innerHTML =
            '<div class="empty-state"><p>No armor found for selected skills.</p></div>';
          return;
        }

        // Group by slot then by armor id
        const bySlot = {};
        for (const p of pieces) {
          if (!bySlot[p.slot]) bySlot[p.slot] = {};
          if (!bySlot[p.slot][p._id]) bySlot[p.slot][p._id] = { ...p, skills: [] };
          bySlot[p.slot][p._id].skills.push({ name: p.skill_name, pts: p.point_value, id: p.skill_id });
        }

        const slotOrder = ['Head','Body','Arms','Waist','Legs'];
        let html = '';
        for (const slot of slotOrder) {
          if (!bySlot[slot]) continue;
          const items = Object.values(bySlot[slot]);
          html += `
            <div class="detail-section-title" style="margin-top:16px">${slot}</div>
            <div class="card" style="margin-bottom:4px">
              ${items.map(a => `
                <div class="list-item" data-nav="/armor/${a._id}">
                  ${img(armorIconPath(a.slot, a.rarity), a.name)}
                  <div class="list-item-info">
                    <div class="list-item-name">${esc(a.name)}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">
                      ${a.skills.map(s => `
                        <span class="badge ${s.pts > 0 ? 'badge-green' : 'badge-red'}">${esc(s.name)} ${s.pts > 0 ? '+' : ''}${s.pts}</span>`).join('')}
                    </div>
                  </div>
                  <div style="text-align:right;font-size:12px;color:var(--text-muted)">${slots(a.num_slots)}</div>
                </div>`).join('')}
            </div>`;
        }

        const resultsEl = document.getElementById('armor-results');
        resultsEl.innerHTML = `<div class="detail-section-title" style="margin-bottom:12px">Results (${Object.values(bySlot).reduce((a,b) => a + Object.keys(b).length, 0)} pieces)</div>` + html;
        resultsEl.querySelectorAll('[data-nav]').forEach(el =>
          el.addEventListener('click', () => { window.location.hash = el.dataset.nav; }));
      });
    }
  };
}
