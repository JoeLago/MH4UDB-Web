import { query, run } from './db.js';
import { SCHEMA } from './schema.js';

function getTextColumns(tableName) {
  try {
    const rows = query(`PRAGMA table_info(${tableName})`);
    return rows
      .filter(r => /text|char|clob/i.test(r.type) || r.type === '')
      .map(r => r.name);
  } catch (_) {
    return [];
  }
}

function getAllColumns(tableName) {
  try {
    return query(`PRAGMA table_info(${tableName})`).map(r => r.name);
  } catch (_) {
    return [];
  }
}

function getColInfoMap(tableName) {
  try {
    const rows = query(`PRAGMA table_info(${tableName})`);
    return Object.fromEntries(rows.map(r => [r.name, r]));
  } catch (_) {
    return {};
  }
}

function buildWhereClause(search, textCols, fkCols, fkCache, fkMeta) {
  if (!search) return { where: '', params: [] };
  const term = `%${search}%`;
  const conditions = [];
  const params = [];

  for (const c of textCols) {
    conditions.push(`CAST(${c} AS TEXT) LIKE ?`);
    params.push(term);
  }

  for (const col of fkCols) {
    const fkInfo = fkMeta[col];
    if (!fkInfo) continue;
    const cache = fkCache[fkInfo.table] || [];
    const sl = search.toLowerCase();
    const matchingIds = cache
      .filter(e => e.label.toLowerCase().includes(sl))
      .map(e => e.id);
    if (matchingIds.length) {
      conditions.push(`${col} IN (${matchingIds.join(',')})`);
    }
  }

  if (!conditions.length) return { where: '', params: [] };
  return { where: `WHERE (${conditions.join(' OR ')})`, params };
}

function resolveFKName(col, value, fkMeta, fkCache) {
  if (value === null || value === undefined) return null;
  const fkInfo = fkMeta[col];
  if (!fkInfo) return null;
  const cache = fkCache[fkInfo.table] || [];
  const entry = cache.find(e => e.id == value);
  return entry ? entry.label : null;
}

function setCellDisplay(td, col, value, meta, fkCache) {
  td.innerHTML = '';
  if (col === meta.pk && !meta.fks[col]) {
    td.className = 'pk-col';
    td.textContent = value ?? '';
  } else if (meta.fks[col]) {
    td.className = 'fk-col editable';
    if (value === null || value === undefined) {
      td.innerHTML = '<span class="null-badge">NULL</span>';
    } else {
      const name = resolveFKName(col, value, meta.fks, fkCache);
      td.innerHTML = name
        ? `${value} <span class="fk-name">(${name})</span>`
        : String(value);
    }
  } else if (value === null || value === undefined) {
    td.className = 'editable';
    td.innerHTML = '<span class="null-badge">NULL</span>';
  } else {
    td.className = 'editable';
    td.textContent = String(value);
  }
  td.title = value !== null && value !== undefined ? String(value) : 'NULL';
}

function showFKOverlay(anchorEl, currentVal, fkInfo, fkCache, onSelect) {
  document.querySelector('.fk-overlay')?.remove();

  const cache = fkCache[fkInfo.table] || [];
  const overlay = document.createElement('div');
  overlay.className = 'fk-overlay';

  const rect = anchorEl.getBoundingClientRect();
  const w = Math.max(rect.width, 300);
  const spaceBelow = window.innerHeight - rect.bottom;
  const listHeight = 260;
  const top = spaceBelow > listHeight + 40 ? rect.bottom + 2 : rect.top - listHeight - 36;
  overlay.style.cssText = `top:${Math.max(4, top)}px; left:${rect.left}px; width:${w}px;`;

  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.placeholder = `Filter ${fkInfo.table}…`;

  const listEl = document.createElement('div');
  listEl.className = 'fk-list';
  listEl.setAttribute('role', 'listbox');

  let selectedId = currentVal !== null && currentVal !== undefined ? String(currentVal) : null;

  function getSelected() {
    return listEl.querySelector('.fk-item.selected');
  }

  function setSelected(item) {
    getSelected()?.classList.remove('selected');
    item?.classList.add('selected');
    item?.scrollIntoView({ block: 'nearest' });
  }

  function populate(term) {
    listEl.innerHTML = '';
    const fl = term.toLowerCase();
    const filtered = fl
      ? cache.filter(e => e.label.toLowerCase().includes(fl) || String(e.id).includes(fl))
      : cache;

    const sliced = filtered.slice(0, 500);
    if (selectedId) {
      const inSlice = sliced.some(e => String(e.id) === selectedId);
      if (!inSlice) {
        const cur = cache.find(e => String(e.id) === selectedId);
        if (cur) sliced.unshift(cur);
      }
    }

    for (const e of sliced) {
      const item = document.createElement('div');
      item.className = 'fk-item';
      item.dataset.id = String(e.id);
      item.setAttribute('role', 'option');
      if (String(e.id) === selectedId) item.classList.add('selected');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'fk-item-name';
      nameSpan.textContent = e.label;

      const idSpan = document.createElement('span');
      idSpan.className = 'fk-item-id';
      idSpan.textContent = `#${e.id}`;

      item.appendChild(nameSpan);
      item.appendChild(idSpan);

      item.addEventListener('mousedown', (ev) => { ev.preventDefault(); });
      item.addEventListener('click', () => {
        selectedId = String(e.id);
        setSelected(item);
        onSelect(parseInt(e.id, 10));
        overlay.remove();
      });
      item.addEventListener('mouseover', () => setSelected(item));

      listEl.appendChild(item);
    }

    // Scroll selected into view after render
    requestAnimationFrame(() => getSelected()?.scrollIntoView({ block: 'nearest' }));
  }

  populate('');
  filterInput.addEventListener('input', () => populate(filterInput.value));

  filterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { overlay.remove(); return; }
    if (e.key === 'Enter') {
      const sel = getSelected();
      if (sel) { onSelect(parseInt(sel.dataset.id, 10)); overlay.remove(); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...listEl.querySelectorAll('.fk-item')];
      if (!items.length) return;
      const cur = getSelected();
      const idx = cur ? items.indexOf(cur) : -1;
      const next = e.key === 'ArrowDown'
        ? items[Math.min(idx + 1, items.length - 1)]
        : items[Math.max(idx - 1, 0)];
      setSelected(next);
    }
  });

  overlay.appendChild(filterInput);
  overlay.appendChild(listEl);
  document.body.appendChild(overlay);
  filterInput.focus();

  setTimeout(() => {
    document.addEventListener('mousedown', function handler(e) {
      if (!overlay.contains(e.target)) {
        overlay.remove();
        document.removeEventListener('mousedown', handler);
      }
    });
  }, 0);
}

function makeInlineEditable(td, row, col, tableName, meta, fkCache, colInfoMap, afterSave) {
  const pkCol = meta.pk;
  const currentVal = row[col];
  const fkInfo = meta.fks?.[col];
  const enumVals = meta.enums?.[col];
  const colInfo = colInfoMap[col];
  const isInteger = colInfo && /int|mediumint/i.test(colInfo.type);

  function save(newVal) {
    let val = newVal;
    if (newVal === '' || newVal === null || newVal === undefined) {
      val = colInfo?.notnull == 0 ? null : (isInteger ? 0 : '');
    } else if (isInteger) {
      val = parseInt(newVal, 10);
      if (isNaN(val)) val = currentVal;
    }
    try {
      run(`UPDATE ${tableName} SET ${col} = ? WHERE ${pkCol} = ?`, [val, row[pkCol]]);
      row[col] = val;
    } catch (e) {
      alert(`Save error: ${e.message}`);
      val = currentVal;
    }
    afterSave(col, row[col]);
  }

  if (fkInfo) {
    showFKOverlay(td, currentVal, fkInfo, fkCache, save);
    return;
  }

  if (enumVals) {
    const sel = document.createElement('select');
    sel.className = 'inline-select';
    for (const opt of enumVals) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt || '(empty)';
      if (String(currentVal) === String(opt)) o.selected = true;
      sel.appendChild(o);
    }
    td.innerHTML = '';
    td.appendChild(sel);
    sel.focus();
    let committed = false;
    const commit = () => { if (!committed) { committed = true; save(sel.value); } };
    sel.addEventListener('change', commit);
    sel.addEventListener('blur', commit);
    sel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { committed = true; afterSave(col, currentVal); }
    });
    return;
  }

  // Text / number
  const inp = document.createElement('input');
  inp.className = 'inline-input';
  inp.type = isInteger ? 'number' : 'text';
  inp.value = currentVal !== null && currentVal !== undefined ? String(currentVal) : '';
  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus();
  inp.select();

  let committed = false;
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { committed = true; save(inp.value); }
    if (e.key === 'Escape') { committed = true; afterSave(col, currentVal); }
    if (e.key === 'Tab') { committed = true; save(inp.value); }
  });
  inp.addEventListener('blur', () => { if (!committed) { committed = true; save(inp.value); } });
}

export function renderGrid(state, fkCache, onEdit) {
  const container = document.getElementById('grid-container');
  const { table, page, pageSize, search, sortCol, sortDir } = state;

  const meta = SCHEMA[table] || { pk: '_id', fks: {}, enums: {} };
  const textCols = getTextColumns(table);
  const allCols = getAllColumns(table);
  const colInfoMap = getColInfoMap(table);
  const fkCols = Object.keys(meta.fks || {});

  const { where, params } = buildWhereClause(search, textCols, fkCols, fkCache, meta.fks);

  let totalRows = 0;
  try {
    const countResult = query(`SELECT COUNT(*) as n FROM ${table} ${where}`, params);
    totalRows = countResult[0]?.n ?? 0;
  } catch (e) {
    container.innerHTML = `<div class="error-msg">Error counting rows: ${e.message}</div>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  if (state.page >= totalPages) state.page = totalPages - 1;
  const offset = state.page * pageSize;

  let orderClause = '';
  if (sortCol) orderClause = `ORDER BY ${sortCol} ${sortDir.toUpperCase()}`;

  let rows = [];
  try {
    rows = query(
      `SELECT * FROM ${table} ${where} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
  } catch (e) {
    container.innerHTML = `<div class="error-msg">Error querying table: ${e.message}</div>`;
    return;
  }

  document.getElementById('page-info').textContent =
    `Page ${state.page + 1} of ${totalPages} (${totalRows} rows)`;
  document.getElementById('row-count').textContent = `${totalRows} rows`;
  document.getElementById('prev-btn').disabled = state.page === 0;
  document.getElementById('next-btn').disabled = state.page >= totalPages - 1;

  const tableEl = document.createElement('table');
  tableEl.className = 'data-grid';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="width:50px"></th>';

  for (const col of allCols) {
    const th = document.createElement('th');
    th.textContent = col;
    th.title = col;
    if (col === sortCol) th.className = `sort-${sortDir}`;
    th.addEventListener('click', () => {
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        state.sortDir = 'asc';
      }
      renderGrid(state, fkCache, onEdit);
    });
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');

    const editTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '…';
    editBtn.title = 'Open full editor';
    editBtn.addEventListener('click', () => onEdit(row));
    editTd.appendChild(editBtn);
    tr.appendChild(editTd);

    for (const col of allCols) {
      const td = document.createElement('td');
      const isPk = col === meta.pk && !meta.fks[col];

      setCellDisplay(td, col, row[col], meta, fkCache);

      if (!isPk) {
        td.addEventListener('click', () => {
          // Don't open if another overlay/input is active in this cell
          if (td.querySelector('input, select')) return;
          makeInlineEditable(td, row, col, table, meta, fkCache, colInfoMap, (updatedCol, newVal) => {
            setCellDisplay(td, updatedCol, newVal, meta, fkCache);
          });
        });
      }

      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tableEl.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(tableEl);
}
