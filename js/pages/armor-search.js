import { query } from '../db.js';
import { esc, armorIconPath, img } from './utils.js';

const STORAGE_KEY = 'mh4u_talismans';
function loadTalismans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

// --- DB helpers ---

function fetchTreesWithSkills(search) {
  if (search) {
    const p = `%${search}%`;
    return query(`
      SELECT st._id AS treeId, st.name AS treeName, s.name AS skillName,
             s.required_skill_tree_points AS pts, COALESCE(s.description,'') AS desc
      FROM skill_trees st
      JOIN skills s ON s.skill_tree_id = st._id AND s.required_skill_tree_points > 0
      WHERE st.name LIKE ? OR s.name LIKE ? OR s.description LIKE ?
      ORDER BY st.name, s.required_skill_tree_points`, [p, p, p]);
  }
  return query(`
    SELECT st._id AS treeId, st.name AS treeName, s.name AS skillName,
           s.required_skill_tree_points AS pts, COALESCE(s.description,'') AS desc
    FROM skill_trees st
    JOIN skills s ON s.skill_tree_id = st._id AND s.required_skill_tree_points > 0
    ORDER BY st.name, s.required_skill_tree_points`);
}

function loadCandidates(skillIds) {
  if (!skillIds.length) return [];
  const ph = skillIds.map(() => '?').join(',');
  const rows = query(`
    SELECT a._id, i.name, a.slot, i.rarity, COALESCE(a.num_slots,0) AS numSlots,
           COALESCE(itst.skill_tree_id,0) AS sid, COALESCE(itst.point_value,0) AS pts
    FROM armor a
    JOIN items i ON a._id = i._id
    LEFT JOIN item_to_skill_tree itst ON a._id = itst.item_id
          AND itst.skill_tree_id IN (${ph})
    WHERE a.gender IN ('Male','Both')
    ORDER BY a._id`, skillIds);
  const info = {};
  const skills = {};
  for (const r of rows) {
    if (!info[r._id]) info[r._id] = { name: r.name, slot: r.slot, rarity: r.rarity, numSlots: r.numSlots };
    if (r.sid && r.pts) {
      if (!skills[r._id]) skills[r._id] = {};
      skills[r._id][r.sid] = r.pts;
    }
  }
  return Object.entries(info).map(([id, d]) => ({
    id: +id, name: d.name, slot: d.slot, rarity: d.rarity, numSlots: d.numSlots,
    skills: skills[id] || {}
  }));
}

function loadDecoOptions(skillIds) {
  if (!skillIds.length) return [];
  const ph = skillIds.map(() => '?').join(',');
  return query(`
    SELECT d._id, i.name, COALESCE(d.num_slots,1) AS slotsUsed,
           itst.skill_tree_id AS skillTreeId, st.name AS skillTreeName, itst.point_value AS points
    FROM decorations d
    JOIN items i ON d._id = i._id
    JOIN item_to_skill_tree itst ON d._id = itst.item_id
    JOIN skill_trees st ON itst.skill_tree_id = st._id
    WHERE itst.skill_tree_id IN (${ph}) AND itst.point_value > 0
    ORDER BY itst.skill_tree_id, itst.point_value DESC`, skillIds);
}

// --- Talisman helpers ---

function talismanPts(t, sid) {
  if (t.skill1Id && +t.skill1Id === sid) return t.skill1Pts || 0;
  if (t.skill2Id && +t.skill2Id === sid) return t.skill2Pts || 0;
  return 0;
}

// --- Search algorithm (ported from iOS ArmorSetSearchRepository) ---

function posPoints(piece, skillIds) {
  return skillIds.reduce((s, sid) => s + Math.max(piece.skills[sid] || 0, 0), 0);
}

function precomputeMaxRemaining(slotPieces, skillIds) {
  const n = slotPieces.length;
  const result = Array.from({ length: n + 1 }, () => ({}));
  for (let i = n - 1; i >= 0; i--) {
    const m = { ...result[i + 1] };
    for (const sid of skillIds) {
      const best = slotPieces[i].reduce((b, p) => Math.max(b, Math.max(p.skills[sid] || 0, 0)), 0);
      m[sid] = (m[sid] || 0) + best;
    }
    result[i] = m;
  }
  return result;
}

function precomputeMaxFutureDecoSlots(slotPieces) {
  const n = slotPieces.length;
  const result = Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    result[i] = slotPieces[i].reduce((b, p) => Math.max(b, p.numSlots), 0) + result[i + 1];
  }
  return result;
}

function setKey(pieces) { return pieces.map(p => p.id).sort((a, b) => a - b).join(','); }

function buildSet(pieces, decos, talisman) {
  const decoSlotsUsed = decos.reduce((s, d) => s + d.count * d.slotsEach, 0);
  return { pieces: pieces.map(p => ({ ...p })), decoAssignments: decos, talisman, decoSlotsUsed };
}

function assignDecos(shortfalls, totalSlots, decosBySkill) {
  let rem = totalSlots;
  const out = [];
  for (const { skillId, needed: neededIn, skillTreeName } of [...shortfalls].sort((a, b) => b.needed - a.needed)) {
    let needed = neededIn;
    const decos = decosBySkill[skillId];
    if (!decos || !decos.length) return null;
    for (const d of decos) {
      if (needed <= 0) break;
      if (rem < d.slotsUsed) continue;
      const count = Math.min(Math.floor(rem / d.slotsUsed), Math.ceil(needed / d.points));
      if (count <= 0) continue;
      out.push({ decoId: d._id, decoName: d.name, slotsEach: d.slotsUsed, skillTreeName, count });
      rem -= count * d.slotsUsed;
      needed -= count * d.points;
    }
    if (needed > 0) return null;
  }
  return out;
}

function searchNoDecos(slotIdx, slotPieces, maxRem, reqs, skillIds, curPts, chosen, results, limit, excluded, talisman, token) {
  if (results.length >= limit || token.c) return;
  if (slotIdx === slotPieces.length) {
    if (excluded.has(setKey(chosen))) return;
    if (reqs.every(r => (curPts[r.skillTreeId] || 0) >= r.threshold))
      results.push(buildSet(chosen, [], talisman));
    return;
  }
  for (const piece of slotPieces[slotIdx]) {
    if (results.length >= limit || token.c) return;
    let ok = true;
    for (const r of reqs) {
      const cur = (curPts[r.skillTreeId] || 0) + Math.max(piece.skills[r.skillTreeId] || 0, 0);
      if (cur + (maxRem[slotIdx + 1][r.skillTreeId] || 0) < r.threshold) { ok = false; break; }
    }
    if (!ok) continue;
    const np = { ...curPts };
    for (const [sid, pts] of Object.entries(piece.skills)) np[sid] = (np[sid] || 0) + pts;
    chosen.push(piece);
    searchNoDecos(slotIdx + 1, slotPieces, maxRem, reqs, skillIds, np, chosen, results, limit, excluded, talisman, token);
    chosen.pop();
  }
}

function searchWithDecos(slotIdx, slotPieces, maxRem, maxFutureSlots, maxDecoRate, reqs, skillIds, curPts, curDecoSlots, decosBySkill, chosen, results, limit, excluded, talisman, token) {
  if (results.length >= limit || token.c) return;
  if (slotIdx === slotPieces.length) {
    if (excluded.has(setKey(chosen))) return;
    if (reqs.every(r => (curPts[r.skillTreeId] || 0) >= r.threshold)) {
      results.push(buildSet(chosen, [], talisman));
      return;
    }
    const shortfalls = reqs
      .filter(r => (curPts[r.skillTreeId] || 0) < r.threshold)
      .map(r => ({ skillId: r.skillTreeId, needed: r.threshold - (curPts[r.skillTreeId] || 0), skillTreeName: r.skillTreeName }));
    const decos = assignDecos(shortfalls, curDecoSlots, decosBySkill);
    if (decos) results.push(buildSet(chosen, decos, talisman));
    return;
  }
  for (const piece of slotPieces[slotIdx]) {
    if (results.length >= limit || token.c) return;
    const newSlots = curDecoSlots + piece.numSlots;
    let ok = true;
    for (const r of reqs) {
      const sid = r.skillTreeId;
      const cur = (curPts[sid] || 0) + Math.max(piece.skills[sid] || 0, 0);
      const armorRem = maxRem[slotIdx + 1][sid] || 0;
      const decoRem = Math.floor((newSlots + maxFutureSlots[slotIdx + 1]) * (maxDecoRate[sid] || 0));
      if (cur + armorRem + decoRem < r.threshold) { ok = false; break; }
    }
    if (!ok) continue;
    const np = { ...curPts };
    for (const [sid, pts] of Object.entries(piece.skills)) np[sid] = (np[sid] || 0) + pts;
    chosen.push(piece);
    searchWithDecos(slotIdx + 1, slotPieces, maxRem, maxFutureSlots, maxDecoRate, reqs, skillIds, np, newSlots, decosBySkill, chosen, results, limit, excluded, talisman, token);
    chosen.pop();
  }
}

function coreSearch(allCandidates, decosBySkill, maxDecoRate, reqs, initDecoSlots, limit, excluded, talisman, token) {
  const SLOTS = ['Head', 'Body', 'Arms', 'Waist', 'Legs'];
  const skillIds = reqs.map(r => r.skillTreeId);

  const theoMaxArmor = {};
  for (const sid of skillIds) {
    theoMaxArmor[sid] = SLOTS.reduce((t, slot) =>
      t + allCandidates.filter(p => p.slot === slot).reduce((b, p) => Math.max(b, Math.max(p.skills[sid] || 0, 0)), 0), 0);
  }
  const theoMaxDecoSlots = initDecoSlots + SLOTS.reduce((t, slot) =>
    t + allCandidates.filter(p => p.slot === slot).reduce((b, p) => Math.max(b, p.numSlots), 0), 0);

  // Impossible early exit
  for (const r of reqs) {
    const armorMax = theoMaxArmor[r.skillTreeId] || 0;
    const decoMax = Math.floor(theoMaxDecoSlots * (maxDecoRate[r.skillTreeId] || 0));
    if (armorMax + decoMax < r.threshold) return [];
  }

  // Phase 1: armor only
  let noDecoResults = [];
  const armorOnly = reqs.every(r => (theoMaxArmor[r.skillTreeId] || 0) >= r.threshold);
  if (armorOnly) {
    const phase1 = SLOTS.map(slot =>
      allCandidates
        .filter(p => p.slot === slot && posPoints(p, skillIds) > 0)
        .sort((a, b) => a.rarity !== b.rarity ? a.rarity - b.rarity : posPoints(b, skillIds) - posPoints(a, skillIds))
        .slice(0, 35)
    );
    const maxRem1 = precomputeMaxRemaining(phase1, skillIds);
    searchNoDecos(0, phase1, maxRem1, reqs, skillIds, {}, [], noDecoResults, limit, excluded, talisman, token);
  }

  const allResults = [...noDecoResults];
  const phase1Excluded = new Set([...excluded, ...noDecoResults.map(s => setKey(s.pieces))]);

  // Phase 2: armor + decorations
  if (allResults.length < limit && !token.c) {
    const rem = limit - allResults.length;
    const phase2 = SLOTS.map(slot =>
      allCandidates
        .filter(p => p.slot === slot && (posPoints(p, skillIds) > 0 || p.numSlots > 0))
        .sort((a, b) => {
          const diff = posPoints(b, skillIds) - posPoints(a, skillIds);
          return diff !== 0 ? diff : b.rarity - a.rarity;
        })
        .slice(0, 12)
    );
    const maxRem2 = precomputeMaxRemaining(phase2, skillIds);
    const maxFutureSlots = precomputeMaxFutureDecoSlots(phase2);
    const decoResults = [];
    searchWithDecos(0, phase2, maxRem2, maxFutureSlots, maxDecoRate, reqs, skillIds, {}, initDecoSlots, decosBySkill, [], decoResults, rem, phase1Excluded, talisman, token);
    allResults.push(...decoResults);
  }
  return allResults;
}

function findSets(reqs, talismans, limit, token) {
  if (!reqs.length) return [];
  const skillIds = reqs.map(r => r.skillTreeId);
  const allCandidates = loadCandidates(skillIds);
  const decoOpts = loadDecoOptions(skillIds);

  const decosBySkill = {};
  const maxDecoRate = {};
  for (const sid of skillIds) {
    decosBySkill[sid] = decoOpts
      .filter(d => d.skillTreeId === sid && d.points > 0)
      .sort((a, b) => (b.points / b.slotsUsed) - (a.points / a.slotsUsed) || a.slotsUsed - b.slotsUsed);
    maxDecoRate[sid] = decosBySkill[sid][0] ? decosBySkill[sid][0].points / decosBySkill[sid][0].slotsUsed : 0;
  }

  function tScore(t) {
    return reqs.reduce((s, r) => s + Math.min(Math.max(talismanPts(t, r.skillTreeId), 0), r.threshold), 0);
  }

  const ordered = [...talismans].sort((a, b) => tScore(b) - tScore(a));
  ordered.push(null); // no talisman

  const allResults = [];
  const foundSets = new Set();

  for (const tOpt of ordered) {
    if (allResults.length >= limit || token.c) break;
    const rem = limit - allResults.length;
    let adjReqs = reqs;
    let initSlots = 0;
    if (tOpt) {
      adjReqs = reqs.map(r => ({ ...r, threshold: Math.max(r.threshold - Math.max(talismanPts(tOpt, r.skillTreeId), 0), 0) }));
      initSlots = tOpt.slots || 0;
    }
    const sets = coreSearch(allCandidates, decosBySkill, maxDecoRate, adjReqs, initSlots, rem, foundSets, tOpt, token);
    for (const s of sets) foundSets.add(setKey(s.pieces));
    allResults.push(...sets);
  }
  return allResults;
}

// --- Render ---

export async function renderArmorSearch() {
  const talismans = loadTalismans();

  const html = `
    <div class="card" style="margin-bottom:12px">
      <div class="list-item as-talisman-link" style="cursor:pointer">
        <img src="icons/icons_items/Talisman-Orange.png" alt="" style="width:32px;height:32px;object-fit:contain">
        <div class="list-item-info">
          <div class="list-item-name">Talismans</div>
        </div>
        <div style="color:var(--text-muted);font-size:14px">${talismans.length > 0 ? `<span style="color:var(--gold)">${talismans.length}</span> ` : ''}›</div>
      </div>
    </div>

    <div class="detail-section" style="margin-bottom:12px">
      <div class="detail-section-title">Required Skills</div>
      <div id="as-reqs"></div>
      <button class="btn btn-ghost" id="as-add-btn" style="width:100%;margin-top:8px">+ Add Skill</button>
    </div>

    <button class="btn btn-primary" id="as-search-btn" style="width:100%;margin-bottom:12px" disabled>Find Sets</button>

    <div id="as-results"></div>

    <div id="as-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75)" role="dialog">
      <div style="position:absolute;bottom:0;left:0;right:0;max-height:88vh;background:var(--bg);border-radius:16px 16px 0 0;display:flex;flex-direction:column">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <span style="font-weight:700;font-size:16px">Pick a Skill</span>
          <button class="btn btn-ghost btn-sm" id="as-modal-close">Cancel</button>
        </div>
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
          <input class="search-input" id="as-skill-search" placeholder="Search skill, tree, or description…" type="search" autocomplete="off" style="width:100%;box-sizing:border-box">
        </div>
        <div id="as-skill-list" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch"></div>
      </div>
    </div>`;

  return {
    title: 'Armor Set Search',
    html,
    afterRender() {
      const requirements = [];
      let token = { c: false };

      // --- Requirements ---
      function renderReqs() {
        const el = document.getElementById('as-reqs');
        if (!requirements.length) {
          el.innerHTML = `<div style="padding:12px 0;color:var(--text-muted);font-size:14px;text-align:center">No skills selected</div>`;
        } else {
          el.innerHTML = requirements.map((r, i) => `
            <div class="list-item" style="border-bottom:1px solid var(--border2)">
              <div class="list-item-info">
                <div class="list-item-name">${esc(r.skillName)}</div>
                <div class="list-item-sub">${esc(r.skillTreeName)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:13px;color:var(--text-muted)">${r.threshold} pts</span>
                <button class="btn btn-ghost btn-sm as-rm" data-i="${i}" style="color:var(--text-muted);padding:4px 8px">✕</button>
              </div>
            </div>`).join('');
          el.querySelectorAll('.as-rm').forEach(btn => btn.addEventListener('click', () => {
            requirements.splice(+btn.dataset.i, 1);
            renderReqs();
            clearResults();
          }));
        }
        document.getElementById('as-search-btn').disabled = !requirements.length;
      }

      function clearResults() {
        document.getElementById('as-results').innerHTML = '';
      }

      renderReqs();

      // Talisman link
      document.querySelector('.as-talisman-link').addEventListener('click', () => {
        window.location.hash = '/talismans';
      });

      // --- Skill picker modal ---
      const modal = document.getElementById('as-modal');
      const skillList = document.getElementById('as-skill-list');
      const skillSearch = document.getElementById('as-skill-search');

      function renderSkillList(rows) {
        if (!rows.length) {
          skillList.innerHTML = `<div class="empty-state" style="padding:24px"><p>No skills found.</p></div>`;
          return;
        }
        const groups = [];
        let lastTreeId = -1;
        for (const r of rows) {
          const selected = requirements.some(req => req.skillTreeId === r.treeId && req.threshold === r.pts);
          if (r.treeId !== lastTreeId) { groups.push({ treeName: r.treeName, skills: [] }); lastTreeId = r.treeId; }
          groups[groups.length - 1].skills.push({ ...r, selected });
        }
        skillList.innerHTML = groups.map(g => `
          <div style="padding:6px 16px 4px;background:var(--surface2);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)">${esc(g.treeName)}</div>
          ${g.skills.map(s => `
            <div class="as-pick list-item" data-tree-id="${s.treeId}" data-tree-name="${esc(s.treeName)}" data-skill-name="${esc(s.skillName)}" data-pts="${s.pts}"
                 style="cursor:pointer;border-bottom:1px solid var(--border2);padding:10px 16px">
              <div class="list-item-info">
                <div class="list-item-name" style="${s.selected ? 'color:var(--accent)' : ''}">${esc(s.skillName)}</div>
                ${s.desc ? `<div class="list-item-sub" style="white-space:normal;line-height:1.4">${esc(s.desc)}</div>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;padding-left:8px">
                <span style="font-size:12px;color:var(--text-muted)">${s.pts} pts</span>
                ${s.selected ? '<span style="color:var(--accent);font-size:14px">✓</span>' : ''}
              </div>
            </div>`).join('')}`).join('');

        skillList.querySelectorAll('.as-pick').forEach(el => el.addEventListener('click', () => {
          const treeId = +el.dataset.treeId;
          const req = {
            skillTreeId: treeId,
            skillTreeName: el.dataset.treeName,
            skillName: el.dataset.skillName,
            threshold: +el.dataset.pts
          };
          const idx = requirements.findIndex(r => r.skillTreeId === treeId);
          if (idx >= 0) requirements[idx] = req; else requirements.push(req);
          closeModal();
          renderReqs();
          clearResults();
        }));
      }

      function openModal() {
        modal.style.display = '';
        skillSearch.value = '';
        renderSkillList(fetchTreesWithSkills(''));
        setTimeout(() => skillSearch.focus(), 50);
      }
      function closeModal() { modal.style.display = 'none'; }

      document.getElementById('as-add-btn').addEventListener('click', openModal);
      document.getElementById('as-modal-close').addEventListener('click', closeModal);
      modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
      skillSearch.addEventListener('input', () => renderSkillList(fetchTreesWithSkills(skillSearch.value.trim())));

      // --- Search ---
      document.getElementById('as-search-btn').addEventListener('click', () => {
        token.c = true;
        token = { c: false };

        const btn = document.getElementById('as-search-btn');
        btn.disabled = true;
        btn.textContent = 'Searching…';
        const resultsEl = document.getElementById('as-results');
        resultsEl.innerHTML = '<div class="loading-inline" style="padding:24px 0">Searching…</div>';

        const reqs = requirements.map(r => ({ ...r }));
        const talismans = loadTalismans();
        const tok = token;

        setTimeout(() => {
          const t0 = performance.now();
          const sets = findSets(reqs, talismans, 5, tok);
          const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

          btn.textContent = 'Find Sets';
          btn.disabled = false;

          if (!sets.length) {
            resultsEl.innerHTML = `
              <div class="detail-section">
                <div class="detail-section-title">Results</div>
                <div class="empty-state" style="padding:20px 0">
                  <p>No sets found. Try fewer or different skills.</p>
                </div>
              </div>`;
            return;
          }

          let html = `<div class="detail-section-title" style="margin-bottom:8px">
            ${sets.length} set${sets.length === 1 ? '' : 's'} found
            <span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-left:6px">${elapsed}s</span>
          </div>`;

          sets.forEach((set, idx) => {
            const decoLabel = set.decoAssignments.length
              ? `<span style="color:var(--gold);font-size:12px">${set.decoSlotsUsed} deco slot${set.decoSlotsUsed === 1 ? '' : 's'}</span>`
              : `<span style="color:#4caf50;font-size:12px">No Decorations</span>`;

            html += `<div class="card" style="margin-bottom:10px">
              <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:700;font-size:14px">Set ${idx + 1}</span>
                ${decoLabel}
              </div>`;

            if (set.talisman) {
              const t = set.talisman;
              const skills = [
                t.skill1Name ? `${esc(t.skill1Name)} ${t.skill1Pts > 0 ? '+' : ''}${t.skill1Pts}` : '',
                t.skill2Name ? `${esc(t.skill2Name)} ${t.skill2Pts > 0 ? '+' : ''}${t.skill2Pts}` : ''
              ].filter(Boolean).join(' · ');
              const slotsStr = t.slots > 0 ? ' · ' + '◆'.repeat(t.slots) : '';
              html += `<div class="list-item" style="border-bottom:1px solid var(--border2)">
                <img src="icons/icons_items/Talisman-Orange.png" alt="" style="width:32px;height:32px;object-fit:contain">
                <div class="list-item-info">
                  <div class="list-item-name">Talisman</div>
                  <div class="list-item-sub">${skills || 'No skills'}${slotsStr}</div>
                </div>
              </div>`;
            }

            for (const piece of set.pieces) {
              html += `<div class="list-item" data-nav="/armor/${piece.id}" style="cursor:pointer;border-bottom:1px solid var(--border2)">
                ${img(armorIconPath(piece.slot, piece.rarity), piece.name)}
                <div class="list-item-info">
                  <div class="list-item-name">${esc(piece.name)}</div>
                  <div class="list-item-sub">${piece.slot}${piece.numSlots > 0 ? ' · ' + '◆'.repeat(piece.numSlots) : ''}</div>
                </div>
                <span style="font-size:11px;color:var(--text-muted)">R${piece.rarity}</span>
              </div>`;
            }

            for (const deco of set.decoAssignments) {
              html += `<div class="list-item" style="border-bottom:1px solid var(--border2)">
                <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#9c27b0;font-size:20px">◆</div>
                <div class="list-item-info">
                  <div class="list-item-name">${deco.count > 1 ? `${deco.count}× ` : ''}${esc(deco.decoName)}</div>
                  <div class="list-item-sub">${esc(deco.skillTreeName)}${deco.slotsEach > 0 ? ' · ' + '◆'.repeat(deco.slotsEach) : ''}</div>
                </div>
              </div>`;
            }

            html += '</div>';
          });

          resultsEl.innerHTML = html;
          resultsEl.querySelectorAll('[data-nav]').forEach(el =>
            el.addEventListener('click', () => { window.location.hash = el.dataset.nav; }));
        }, 16);
      });
    }
  };
}
