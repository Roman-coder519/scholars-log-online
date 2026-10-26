import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const exportPath = process.argv[2] ?? "development-data-export.json";

const allowedTables = [
  "badges",
  "conversations",
  "deadlines",
  "flashcard_sets",
  "flashcards",
  "focus_sessions",
  "grades",
  "habit_completions",
  "habits",
  "messages",
  "notes",
  "settings",
  "tasks",
  "transactions",
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before importing saved data.");
}

const exportDocument = JSON.parse(await readFile(exportPath, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

let importedRows = 0;

try {
  await client.query("BEGIN");

  for (const table of allowedTables) {
    const rows = exportDocument.tables?.[table] ?? [];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    for (const row of rows) {
      const columns = Object.keys(row);
      if (columns.length === 0) continue;

      for (const column of columns) quoteIdentifier(column);

      const values = columns.map((column) => row[column] ?? null);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      const sql = `
        INSERT INTO ${quoteIdentifier(table)}
          (${columns.map(quoteIdentifier).join(", ")})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      await client.query(sql, values);
      importedRows += 1;
    }

    if (rows.some((row) => Object.prototype.hasOwnProperty.call(row, "id"))) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE(MAX(id), 1),
          MAX(id) IS NOT NULL
        )
        FROM ${quoteIdentifier(table)}
      `);
    }
  }

  await client.query("COMMIT");
  console.log(`Imported ${importedRows} saved rows from ${exportPath}.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}