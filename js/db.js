let db = null;

export async function initDB() {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
  });
  const res = await fetch('./mh4u.db');
  if (!res.ok) throw new Error(`Failed to load database: ${res.status}`);
  const buf = await res.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buf));
  return db;
}

export function query(sql, params = []) {
  if (!db) throw new Error('DB not initialized');
  const out = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

export function queryOne(sql, params = []) {
  return query(sql, params)[0] ?? null;
}
