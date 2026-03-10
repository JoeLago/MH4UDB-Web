import { query } from '../db.js';
import { esc, ptsClass } from './utils.js';

const STORAGE_KEY = 'mh4u_talismans';

function loadTalismans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveTalismans(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function renderTalismans() {
  const skillTrees = query('SELECT _id, name FROM skill_trees ORDER BY name');
  const talismans = loadTalismans();

  const skillOptions = skillTrees.map(s => `<option value="${s._id}">${esc(s.name)}</option>`).join('');

  const talismanCards = talismans.length
    ? talismans.map((t, idx) => `
        <div class="talisman-card">
          <div class="talisman-header">
            <span class="talisman-slots">Slots: ${'◯'.repeat(t.slots)}${'—'.repeat(3 - t.slots)}</span>
            <div class="talisman-actions">
              <button class="btn btn-ghost btn-sm" data-edit="${idx}">Edit</button>
              <button class="btn btn-danger btn-sm" data-delete="${idx}">✕</button>
            </div>
          </div>
          <div class="talisman-skills">
            ${t.skill1Name ? `<div class="talisman-skill">
              <span>${esc(t.skill1Name)}</span>
              <span class="${ptsClass(t.skill1Pts)}" style="font-weight:600">${t.skill1Pts > 0 ? '+' : ''}${t.skill1Pts}</span>
            </div>` : ''}
            ${t.skill2Name ? `<div class="talisman-skill">
              <span>${esc(t.skill2Name)}</span>
              <span class="${ptsClass(t.skill2Pts)}" style="font-weight:600">${t.skill2Pts > 0 ? '+' : ''}${t.skill2Pts}</span>
            </div>` : ''}
            ${!t.skill1Name && !t.skill2Name ? '<span style="color:var(--text-dim)">No skills</span>' : ''}
          </div>
        </div>`)
      .join('')
    : '<div class="empty-state"><div class="es-icon">🔮</div><h2>No Talismans</h2><p>Add your talismans to track their skills and slots.</p></div>';

  const html = `
    <div id="talisman-list">${talismanCards}</div>
    <button class="btn btn-primary" id="add-talisman-btn" style="width:100%;margin-top:12px">+ Add Talisman</button>

    <div id="talisman-form" style="display:none;margin-top:16px" class="card" style="padding:16px">
      <div style="padding:16px">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px" id="form-title">Add Talisman</h3>
        <input type="hidden" id="edit-index" value="">

        <div class="form-group">
          <label class="form-label">Decoration Slots</label>
          <select class="form-select" id="t-slots">
            <option value="0">0 slots</option>
            <option value="1">1 slot</option>
            <option value="2">2 slots</option>
            <option value="3">3 slots</option>
          </select>
        </div>

        <div class="detail-section-title" style="margin-bottom:12px">Skill 1</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Skill</label>
            <select class="form-select" id="t-skill1">
              <option value="">None</option>
              ${skillOptions}
            </select>
          </div>
          <div class="form-group" style="max-width:100px">
            <label class="form-label">Points</label>
            <input type="number" class="form-input" id="t-pts1" value="0" min="-10" max="10">
          </div>
        </div>

        <div class="detail-section-title" style="margin-bottom:12px">Skill 2 (optional)</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Skill</label>
            <select class="form-select" id="t-skill2">
              <option value="">None</option>
              ${skillOptions}
            </select>
          </div>
          <div class="form-group" style="max-width:100px">
            <label class="form-label">Points</label>
            <input type="number" class="form-input" id="t-pts2" value="0" min="-10" max="10">
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" id="save-talisman-btn" style="flex:1">Save</button>
          <button class="btn btn-ghost" id="cancel-talisman-btn">Cancel</button>
        </div>
      </div>
    </div>`;

  return {
    title: 'Talismans',
    html,
    afterRender() {
      const form = document.getElementById('talisman-form');
      const list = document.getElementById('talisman-list');

      function openForm(talisman, idx) {
        document.getElementById('form-title').textContent = idx != null ? 'Edit Talisman' : 'Add Talisman';
        document.getElementById('edit-index').value = idx ?? '';
        document.getElementById('t-slots').value = talisman?.slots ?? 0;
        document.getElementById('t-skill1').value = talisman?.skill1Id ?? '';
        document.getElementById('t-pts1').value = talisman?.skill1Pts ?? 0;
        document.getElementById('t-skill2').value = talisman?.skill2Id ?? '';
        document.getElementById('t-pts2').value = talisman?.skill2Pts ?? 0;
        form.style.display = '';
        document.getElementById('add-talisman-btn').style.display = 'none';
      }

      function closeForm() {
        form.style.display = 'none';
        document.getElementById('add-talisman-btn').style.display = '';
      }

      function saveForm() {
        const skill1Sel = document.getElementById('t-skill1');
        const skill2Sel = document.getElementById('t-skill2');
        const talisman = {
          slots:      +document.getElementById('t-slots').value,
          skill1Id:   skill1Sel.value || null,
          skill1Name: skill1Sel.options[skill1Sel.selectedIndex]?.text || null,
          skill1Pts:  +document.getElementById('t-pts1').value,
          skill2Id:   skill2Sel.value || null,
          skill2Name: skill2Sel.value ? skill2Sel.options[skill2Sel.selectedIndex].text : null,
          skill2Pts:  +document.getElementById('t-pts2').value,
        };
        if (!talisman.skill1Id) { talisman.skill1Name = null; talisman.skill1Pts = 0; }
        if (!talisman.skill2Id) { talisman.skill2Name = null; talisman.skill2Pts = 0; }

        const talismans = loadTalismans();
        const editIdx = document.getElementById('edit-index').value;
        if (editIdx !== '') talismans[+editIdx] = talisman;
        else talismans.push(talisman);
        saveTalismans(talismans);

        // Re-render list
        window.location.hash = '/talismans';
      }

      document.getElementById('add-talisman-btn').addEventListener('click', () => openForm(null, null));
      document.getElementById('save-talisman-btn').addEventListener('click', saveForm);
      document.getElementById('cancel-talisman-btn').addEventListener('click', closeForm);

      // Delete / edit
      document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = +btn.dataset.delete;
          const talismans = loadTalismans();
          talismans.splice(idx, 1);
          saveTalismans(talismans);
          window.location.hash = '';
          window.location.hash = '/talismans';
        });
      });

      document.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = +btn.dataset.edit;
          openForm(loadTalismans()[idx], idx);
        });
      });
    }
  };
}
