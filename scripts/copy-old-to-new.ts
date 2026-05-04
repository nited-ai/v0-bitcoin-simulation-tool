// One-shot data migration: copy user tables from OLD Postgres → NEW Postgres.
// Read-only on OLD; INSERT-only on NEW. Skips _prisma_migrations.
// Preserves original ids and timestamps so we know when rows were originally captured.
//
// Usage:
//   OLD_DATABASE_URL="postgres://..." NEW_DATABASE_URL="postgres://..." \
//     pnpm dlx tsx scripts/copy-old-to-new.ts
//
// Run once. If it fails partway, fix the cause and re-run against an empty NEW DB.
import { Client } from 'pg'

const CHUNK_SIZE = 500

// Schema of each table we copy. Order matters — must match SELECT/INSERT column lists.
const TABLES: Array<{ name: string; columns: string[] }> = [
  {
    name: 'bitcoin_prices',
    columns: [
      'id', 'date', 'timestamp', 'open', 'high', 'low', 'close',
      'volume', 'source', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'data_updates',
    columns: [
      'id', 'update_date', 'records_added', 'records_updated', 'source',
      'start_date', 'end_date', 'status', 'error_message', 'created_at',
    ],
  },
  {
    name: 'api_usage',
    columns: [
      'id', 'api_name', 'endpoint', 'request_count', 'last_request_at',
      'success_count', 'error_count', 'rate_limit_reset_at', 'created_at',
    ],
  },
]

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

// Build "($1,$2,...),($N+1,...)" placeholders for a chunk of rows.
function buildValuesClause(rowCount: number, colCount: number): string {
  const groups: string[] = []
  let n = 1
  for (let i = 0; i < rowCount; i++) {
    const placeholders: string[] = []
    for (let j = 0; j < colCount; j++) placeholders.push(`$${n++}`)
    groups.push(`(${placeholders.join(',')})`)
  }
  return groups.join(',')
}

async function copyTable(
  oldClient: Client,
  newClient: Client,
  table: { name: string; columns: string[] },
): Promise<number> {
  const cols = table.columns.map(quoteIdent).join(',')
  const selectSql = `SELECT ${cols} FROM ${quoteIdent(table.name)} ORDER BY id`
  const res = await oldClient.query(selectSql)
  const rows = res.rows
  if (rows.length === 0) {
    console.log(`✅ ${table.name}: copied 0 rows (source empty)`)
    return 0
  }

  let inserted = 0
  for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + CHUNK_SIZE)
    const values: unknown[] = []
    for (const row of chunk) {
      for (const col of table.columns) values.push(row[col])
    }
    const sql =
      `INSERT INTO ${quoteIdent(table.name)} (${cols}) ` +
      `VALUES ${buildValuesClause(chunk.length, table.columns.length)}`
    const insertRes = await newClient.query(sql, values)
    inserted += insertRes.rowCount ?? chunk.length
  }

  // After inserting explicit ids, advance the SERIAL sequence so future
  // auto-generated ids don't collide with the migrated ones.
  await newClient.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), (SELECT COALESCE(MAX(id), 0) FROM ${quoteIdent(table.name)}))`,
    [table.name],
  )

  console.log(`✅ ${table.name}: copied ${inserted} rows`)
  return inserted
}

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL
  const newUrl = process.env.NEW_DATABASE_URL
  if (!oldUrl) throw new Error('OLD_DATABASE_URL not set')
  if (!newUrl) throw new Error('NEW_DATABASE_URL not set')

  const oldClient = new Client({ connectionString: oldUrl })
  const newClient = new Client({ connectionString: newUrl })
  await oldClient.connect()
  await newClient.connect()

  try {
    for (const table of TABLES) {
      await copyTable(oldClient, newClient, table)
    }

    // Final summary from NEW DB.
    console.log('\n📊 Final counts in NEW DB:')
    for (const table of TABLES) {
      const r = await newClient.query(
        `SELECT COUNT(*)::int AS n FROM ${quoteIdent(table.name)}`,
      )
      console.log(`  ${table.name.padEnd(20)} ${r.rows[0].n} rows`)
    }
  } finally {
    await oldClient.end()
    await newClient.end()
  }
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
