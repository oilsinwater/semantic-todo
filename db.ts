import { existsSync, mkdirSync } from "fs";
import { Database } from "bun:sqlite";

const DB_PATH = "./data/todos.db";

function openDb(): Database {
  if (!existsSync("./data")) {
    mkdirSync("./data", { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

const db = openDb();

export function getSchema(): string {
  const row = db
    .query(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'todos'"
    )
    .get() as { sql?: string } | undefined;

  if (row?.sql) return row.sql;

  return `CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;
}

function isSelectStatement(sql: string): boolean {
  return /^(select|with)\s/i.test(sql.trim());
}

export function executeSQL(sql: string): {
  success: boolean;
  data?: any;
  error?: string;
} {
  try {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    let lastData: any = undefined;

    for (const statement of statements) {
      if (isSelectStatement(statement)) {
        lastData = db.query(statement).all();
      } else {
        db.exec(statement);
      }
    }

    return { success: true, data: lastData };
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) };
  }
}

if (import.meta.main) {
  console.log(`Database ready at ${DB_PATH}`);
}
