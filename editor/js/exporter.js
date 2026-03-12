import { getDB, query } from './db.js';
import { TABLE_ORDER } from './schema.js';

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  // Strings: wrap in single quotes, double any internal single quotes
  return "'" + String(val).replace(/'/g, "''") + "'";
}

export function exportSQL() {
  const db = getDB();
  const lines = [];

  lines.push('PRAGMA foreign_keys=OFF;');
  lines.push('BEGIN TRANSACTION;');

  // Get CREATE TABLE statements from sqlite_master in our required order
  const masterRows = query(
    `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid`
  );
  const createMap = {};
  for (const r of masterRows) {
    if (r.sql) createMap[r.name] = r.sql;
  }

  for (const tableName of TABLE_ORDER) {
    const createSQL = createMap[tableName];
    if (!createSQL) continue;

    lines.push(createSQL + ';');

    // Get all rows
    let rows;
    try {
      const stmt = db.prepare(`SELECT * FROM ${tableName}`);
      rows = [];
      while (stmt.step()) {
        rows.push(stmt.get());
      }
      stmt.free();
    } catch (e) {
      continue;
    }

    for (const row of rows) {
      const vals = row.map(escapeSQL).join(',');
      lines.push(`INSERT INTO ${tableName} VALUES(${vals});`);
    }
  }

  // sqlite_sequence for autoincrement tables
  try {
    const seqRows = query(`SELECT * FROM sqlite_sequence`);
    if (seqRows.length) {
      lines.push(`CREATE TABLE IF NOT EXISTS sqlite_sequence(name,seq);`);
      for (const r of seqRows) {
        lines.push(`INSERT INTO sqlite_sequence VALUES(${escapeSQL(r.name)},${escapeSQL(r.seq)});`);
      }
    }
  } catch (_) {}

  lines.push('COMMIT;');

  const sql = lines.join('\n');
  const blob = new Blob([sql], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mh4u.sql';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
