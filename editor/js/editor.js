import { query, run } from './db.js';
import { SCHEMA } from './schema.js';

const TEXTAREA_COLS = new Set(['description', 'goal', 'sub_goal', 'signature_move', 'trait',
  'description_de', 'description_fr', 'description_es', 'description_it', 'description_jp']);

function getColumnInfo(tableName) {
  return query(`PRAGMA table_info(${tableName})`);
}

function isNullable(colInfo) {
  // notnull = 0 means nullable; also check if dflt_value allows null
  return colInfo.notnull == 0;
}

function isIntegerType(colInfo) {
  return /int|mediumint/i.test(colInfo.type);
}

function buildField(colInfo, value, meta, fkCache) {
  const col = colInfo.name;
  const pk = meta.pk;
  const fks = meta.fks || {};
  const enums = meta.enums || {};
  const textareas = meta.textareas || [];
  // Integer PKs are implicitly NOT NULL even when pragma says notnull=0
  const isPkCol = col === pk && !fks[col];
  const nullable = isNullable(colInfo) && !isPkCol;
  const isInteger = isIntegerType(colInfo);

  const group = document.createElement('div');
  group.className = 'field-group';

  // Label
  const labelEl = document.createElement('div');
  labelEl.className = 'field-label';
  labelEl.textContent = col;

  if (col === pk) {
    labelEl.innerHTML += ' <span class="field-badge badge-pk">PK</span>';
  }
  if (fks[col]) {
    labelEl.innerHTML += ` <span class="field-badge badge-fk">FK → ${fks[col].table}</span>`;
  }
  if (enums[col]) {
    labelEl.innerHTML += ' <span class="field-badge badge-enum">enum</span>';
  }
  if (nullable) {
    labelEl.innerHTML += ' <span class="field-badge badge-null">nullable</span>';
  }
  group.appendChild(labelEl);

  // PK: read-only display
  if (col === pk && !fks[col]) {
    const ro = document.createElement('div');
    ro.className = 'field-value-ro';
    ro.textContent = value !== null && value !== undefined ? String(value) : '(auto)';
    ro.dataset.col = col;
    ro.dataset.isPk = '1';
    group.appendChild(ro);
    return group;
  }

  let inputEl;
  const isNull = value === null || value === undefined;

  // FK field: searchable select
  if (fks[col]) {
    const fkInfo = fks[col];
    const cache = fkCache[fkInfo.table] || [];

    const wrapper = document.createElement('div');
    wrapper.className = 'fk-field';

    const filterInput = document.createElement('input');
    filterInput.type = 'search';
    filterInput.className = 'fk-filter';
    filterInput.placeholder = `Filter ${fkInfo.table}…`;
    filterInput.autocomplete = 'off';
    wrapper.appendChild(filterInput);

    const selectEl = document.createElement('select');
    selectEl.dataset.col = col;
    selectEl.size = 6;
    selectEl.style.height = '120px';

    function populateOptions(filter) {
      selectEl.innerHTML = '';
      const fl = filter ? filter.toLowerCase() : '';
      const filtered = fl
        ? cache.filter(e => e.label.toLowerCase().includes(fl) || String(e.id).includes(fl))
        : cache;

      // Add null option if nullable
      if (nullable) {
        const nullOpt = document.createElement('option');
        nullOpt.value = '';
        nullOpt.textContent = '(NULL)';
        if (isNull) nullOpt.selected = true;
        selectEl.appendChild(nullOpt);
      }

      const sliced = filtered.slice(0, 500);
      // Always include the current value even if outside the 500-item window
      const currentInSlice = isNull || sliced.some(e => String(e.id) === String(value));
      if (!isNull && !currentInSlice) {
        const currentEntry = cache.find(e => String(e.id) === String(value));
        if (currentEntry) sliced.unshift(currentEntry);
      }

      for (const entry of sliced) {
        const opt = document.createElement('option');
        opt.value = String(entry.id);
        opt.textContent = `${entry.id}: ${entry.label}`;
        if (!isNull && String(value) === String(entry.id)) opt.selected = true;
        selectEl.appendChild(opt);
      }
    }

    populateOptions('');
    filterInput.addEventListener('input', () => populateOptions(filterInput.value));
    wrapper.appendChild(selectEl);
    inputEl = wrapper;
    group.appendChild(wrapper);
    return group;
  }

  // Enum field: select with optional custom
  if (enums[col]) {
    const options = enums[col];
    const wrapper = document.createElement('div');

    const selectEl = document.createElement('select');
    selectEl.dataset.col = col;
    selectEl.dataset.isEnum = '1';

    if (nullable) {
      const nullOpt = document.createElement('option');
      nullOpt.value = '__null__';
      nullOpt.textContent = '(NULL)';
      selectEl.appendChild(nullOpt);
    }

    let foundInOptions = false;
    for (const opt of options) {
      const optEl = document.createElement('option');
      optEl.value = opt;
      optEl.textContent = opt || '(empty)';
      if (String(value) === String(opt)) { optEl.selected = true; foundInOptions = true; }
      selectEl.appendChild(optEl);
    }

    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = 'Custom…';
    selectEl.appendChild(customOpt);

    if (!foundInOptions && !isNull) {
      customOpt.selected = true;
    }

    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.placeholder = 'Custom value…';
    customInput.dataset.col = col;
    customInput.dataset.isCustom = '1';
    customInput.style.marginTop = '4px';
    customInput.style.display = customOpt.selected ? 'block' : 'none';
    if (!foundInOptions && !isNull) customInput.value = value ?? '';

    selectEl.addEventListener('change', () => {
      customInput.style.display = selectEl.value === '__custom__' ? 'block' : 'none';
    });

    wrapper.appendChild(selectEl);
    wrapper.appendChild(customInput);
    group.appendChild(wrapper);
    return group;
  }

  // Textarea for long text fields
  const useTextarea = TEXTAREA_COLS.has(col) || textareas.includes(col);
  if (useTextarea) {
    inputEl = document.createElement('textarea');
    inputEl.dataset.col = col;
    inputEl.value = isNull ? '' : String(value);
  } else if (isInteger) {
    inputEl = document.createElement('input');
    inputEl.type = 'number';
    inputEl.dataset.col = col;
    inputEl.value = isNull ? '' : String(value);
    inputEl.step = '1';
  } else {
    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.dataset.col = col;
    inputEl.value = isNull ? '' : String(value);
  }

  group.appendChild(inputEl);

  // Nullable checkbox
  if (nullable) {
    const nullRow = document.createElement('div');
    nullRow.className = 'null-checkbox-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `null-cb-${col}`;
    cb.dataset.nullFor = col;
    cb.checked = isNull;
    const lbl = document.createElement('label');
    lbl.htmlFor = `null-cb-${col}`;
    lbl.textContent = 'Set to NULL';
    nullRow.appendChild(cb);
    nullRow.appendChild(lbl);

    if (isNull) inputEl.disabled = true;
    cb.addEventListener('change', () => {
      inputEl.disabled = cb.checked;
      if (cb.checked) inputEl.value = '';
    });

    group.appendChild(nullRow);
  }

  return group;
}

function collectValues(modal, colInfos, meta) {
  const values = {};
  const fks = meta.fks || {};
  const enums = meta.enums || {};

  for (const col of colInfos) {
    const name = col.name;
    if (name === meta.pk && !fks[name]) continue; // skip auto PK

    // Check null checkbox
    const nullCb = modal.querySelector(`[data-null-for="${name}"]`);
    if (nullCb && nullCb.checked) {
      values[name] = null;
      continue;
    }

    // FK select (inside .fk-field wrapper)
    if (fks[name]) {
      const sel = modal.querySelector(`select[data-col="${name}"]`);
      if (sel) {
        const val = sel.value;
        values[name] = val === '' ? null : parseInt(val, 10);
        continue;
      }
    }

    // Enum select
    const enumSel = modal.querySelector(`select[data-col="${name}"][data-is-enum]`);
    if (enumSel) {
      if (enumSel.value === '__null__') {
        values[name] = null;
      } else if (enumSel.value === '__custom__') {
        const custom = modal.querySelector(`input[data-col="${name}"][data-is-custom]`);
        values[name] = custom ? custom.value : '';
      } else {
        values[name] = enumSel.value;
      }
      continue;
    }

    // Regular input
    const inp = modal.querySelector(`[data-col="${name}"]:not([data-is-enum]):not([data-is-custom])`);
    if (inp) {
      const val = inp.value;
      if (val === '' && isNullable(col)) {
        values[name] = null;
      } else if (/int|mediumint/i.test(col.type)) {
        values[name] = val === '' ? null : parseInt(val, 10);
      } else {
        values[name] = val;
      }
    }
  }

  return values;
}

export function openEditor(row, tableName, onSaved, fkCache = {}) {
  const meta = SCHEMA[tableName] || { pk: '_id', fks: {}, enums: {} };
  const colInfos = query(`PRAGMA table_info(${tableName})`);

  const modal = document.getElementById('modal');
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  title.textContent = `Edit: ${tableName} #${row[meta.pk]}`;
  body.innerHTML = '';

  for (const col of colInfos) {
    const field = buildField(col, row[col.name], meta, fkCache);
    body.appendChild(field);
  }

  overlay.style.display = 'flex';
  document.getElementById('delete-btn').style.display = 'inline-block';

  // Save
  const saveHandler = () => {
    const values = collectValues(body, colInfos, meta);
    const setClauses = Object.keys(values).map(k => `${k} = ?`).join(', ');
    if (!setClauses) { closeModal(); return; }
    try {
      run(
        `UPDATE ${tableName} SET ${setClauses} WHERE ${meta.pk} = ?`,
        [...Object.values(values), row[meta.pk]]
      );
      closeModal();
      onSaved();
    } catch (e) {
      alert(`Save error: ${e.message}`);
    }
  };

  // Delete
  const deleteHandler = () => {
    if (!confirm(`Delete row ${meta.pk}=${row[meta.pk]} from ${tableName}?`)) return;
    try {
      run(`DELETE FROM ${tableName} WHERE ${meta.pk} = ?`, [row[meta.pk]]);
      closeModal();
      onSaved();
    } catch (e) {
      alert(`Delete error: ${e.message}`);
    }
  };

  setupModalHandlers(saveHandler, deleteHandler);
}

export function openAddRow(tableName, onSaved, fkCache = {}) {
  const meta = SCHEMA[tableName] || { pk: '_id', fks: {}, enums: {} };
  const colInfos = query(`PRAGMA table_info(${tableName})`);

  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const title = document.getElementById('modal-title');

  title.textContent = `Add Row: ${tableName}`;
  body.innerHTML = '';

  // Skip PK for add
  for (const col of colInfos) {
    if (col.name === meta.pk && !meta.fks[col.name]) continue;
    const field = buildField(col, col.dflt_value ?? null, meta, fkCache);
    body.appendChild(field);
  }

  overlay.style.display = 'flex';
  document.getElementById('delete-btn').style.display = 'none';

  const nonPkCols = colInfos.filter(c => !(c.name === meta.pk && !meta.fks[c.name]));

  const saveHandler = () => {
    const values = collectValues(body, nonPkCols, { ...meta, pk: '__none__' });
    const cols = Object.keys(values);
    const placeholders = cols.map(() => '?').join(', ');
    try {
      run(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
        Object.values(values)
      );
      closeModal();
      onSaved();
    } catch (e) {
      alert(`Insert error: ${e.message}`);
    }
  };

  setupModalHandlers(saveHandler, null);
}

function setupModalHandlers(onSave, onDelete) {
  // Clone buttons to remove old listeners
  const saveBtn = replaceButton('save-btn');
  const deleteBtn = replaceButton('delete-btn');
  const cancelBtn = replaceButton('cancel-btn');
  const closeBtn = replaceButton('modal-close');

  saveBtn.addEventListener('click', onSave);
  if (onDelete) deleteBtn.addEventListener('click', onDelete);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);

  document.getElementById('modal-overlay').addEventListener('click', function handler(e) {
    if (e.target === this) {
      closeModal();
      this.removeEventListener('click', handler);
    }
  });
}

function replaceButton(id) {
  const old = document.getElementById(id);
  const fresh = old.cloneNode(true);
  old.parentNode.replaceChild(fresh, old);
  return fresh;
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

