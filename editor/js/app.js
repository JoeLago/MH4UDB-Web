import { initDB, query } from './db.js';
import { SCHEMA, TABLE_GROUPS, TABLE_ORDER } from './schema.js';
import { renderGrid } from './grid.js';
import { openEditor, openAddRow } from './editor.js';
import { exportSQL } from './exporter.js';

export const FK_CACHE = {}; // { tableName: [{ id, label }] }

export const state = {
  table: null,
  page: 0,
  pageSize: 50,
  search: '',
  sortCol: null,
  sortDir: 'asc'
};

async function buildFKCache() {
  // Pre-load FK target tables so grid/editor can resolve names without repeated queries
  const fkTables = new Set();
  for (const meta of Object.values(SCHEMA)) {
    for (const fk of Object.values(meta.fks || {})) {
      fkTables.add(JSON.stringify({ table: fk.table, display: fk.display }));
    }
  }

  for (const entry of fkTables) {
    const { table, display } = JSON.parse(entry);
    if (FK_CACHE[table]) continue;
    try {
      const cols = display === '_id' ? '_id' : `_id, ${display}`;
      const rows = query(`SELECT ${cols} FROM ${table} ORDER BY ${display === '_id' ? '_id' : display}`);
      FK_CACHE[table] = rows.map(r => ({
        id: r._id,
        label: display === '_id' ? String(r._id) : String(r[display] ?? r._id)
      }));
    } catch (e) {
      FK_CACHE[table] = [];
    }
  }
}

export function refreshGrid() {
  if (!state.table) return;
  renderGrid(state, FK_CACHE, (row) => openEditor(row, state.table, onSaved, FK_CACHE));
}

function onSaved() {
  // Rebuild FK cache entry for the edited table (in case it's used as an FK target)
  delete FK_CACHE[state.table];
  // Find the display column for this table by looking at what other tables reference it
  let displayCol = 'name';
  outer: for (const meta of Object.values(SCHEMA)) {
    for (const fk of Object.values(meta.fks || {})) {
      if (fk.table === state.table) { displayCol = fk.display; break outer; }
    }
  }
  try {
    const cols = displayCol === '_id' ? '_id' : `_id, ${displayCol}`;
    const rows = query(`SELECT ${cols} FROM ${state.table} ORDER BY ${displayCol === '_id' ? '_id' : displayCol}`);
    FK_CACHE[state.table] = rows.map(r => ({
      id: r._id,
      label: displayCol === '_id' ? String(r._id) : String(r[displayCol] ?? r._id)
    }));
  } catch (_) {}
  refreshGrid();
}

function buildSidebar() {
  const container = document.getElementById('table-groups');
  const allTablesInGroups = new Set(TABLE_GROUPS.flatMap(g => g.tables));

  // Add any tables not in groups to "Other"
  const others = TABLE_ORDER.filter(t => !allTablesInGroups.has(t));

  const groups = [...TABLE_GROUPS];
  if (others.length) {
    // merge into Other group
    const otherGroup = groups.find(g => g.label === 'Other');
    if (otherGroup) {
      otherGroup.tables = [...new Set([...otherGroup.tables, ...others])];
    }
  }

  container.innerHTML = '';

  for (const group of groups) {
    // Filter to tables actually in TABLE_ORDER
    const validTables = group.tables.filter(t => TABLE_ORDER.includes(t));
    if (!validTables.length) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'table-group';
    groupEl.innerHTML = `<div class="group-label">${group.label}</div>`;

    for (const tableName of validTables) {
      const btn = document.createElement('button');
      btn.className = 'table-btn';
      btn.textContent = tableName;
      btn.dataset.table = tableName;
      btn.addEventListener('click', () => selectTable(tableName));
      groupEl.appendChild(btn);
    }

    container.appendChild(groupEl);
  }
}

function selectTable(tableName) {
  state.table = tableName;
  state.page = 0;
  state.search = '';
  state.sortCol = null;
  state.sortDir = 'asc';

  // Update active button
  document.querySelectorAll('.table-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.table === tableName);
  });

  // Update toolbar
  document.getElementById('table-title').textContent = tableName;
  document.getElementById('search-input').disabled = false;
  document.getElementById('search-input').value = '';
  document.getElementById('add-btn').disabled = false;
  document.getElementById('pagination').style.display = 'flex';

  // On mobile, switch to grid view
  if (window.innerWidth < 768) {
    document.getElementById('app').classList.add('grid-view');
  }

  refreshGrid();
}

function initToolbar() {
  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('app').classList.remove('grid-view');
  });

  const searchInput = document.getElementById('search-input');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = searchInput.value.trim();
      state.page = 0;
      refreshGrid();
    }, 300);
  });

  document.getElementById('add-btn').addEventListener('click', () => {
    if (!state.table) return;
    openAddRow(state.table, () => {
      refreshGrid();
    }, FK_CACHE);
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    exportSQL();
  });

  document.getElementById('export-btn-sidebar').addEventListener('click', () => {
    exportSQL();
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (state.page > 0) { state.page--; refreshGrid(); }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    state.page++;
    refreshGrid();
  });

  document.getElementById('page-size-select').addEventListener('change', (e) => {
    state.pageSize = +e.target.value;
    state.page = 0;
    refreshGrid();
  });
}

function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const app = document.getElementById('app');
  const MIN = 160, MAX = 480;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const width = Math.min(MAX, Math.max(MIN, e.clientX));
      app.style.setProperty('--sidebar-width', `${width}px`);
    };
    const onUp = () => {
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

async function init() {
  const gridContainer = document.getElementById('grid-container');
  gridContainer.innerHTML = '<div class="loading-overlay">Loading database…</div>';

  try {
    await initDB();
    await buildFKCache();
    gridContainer.innerHTML = '<div id="grid-placeholder"><p>Select a table from the sidebar to begin editing.</p></div>';
  } catch (e) {
    gridContainer.innerHTML = `<div class="error-msg">Failed to load database: ${e.message}</div>`;
    return;
  }

  buildSidebar();
  initToolbar();
  initResizeHandle();
}

init();
