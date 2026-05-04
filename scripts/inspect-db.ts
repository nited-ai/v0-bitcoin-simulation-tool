// One-shot read-only inspector. Lists tables + row counts for the DB pointed to by DATABASE_URL.
// Usage: DATABASE_URL=... pnpm dlx tsx scripts/inspect-db.ts
import { Client } from 'pg'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  const host = new URL(url.replace('postgres://', 'http://')).host
  console.log(`📡 Connecting to ${host} ...`)

  const client = new Client({ connectionString: url })
  await client.connect()

  const tablesRes = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `)
  if (tablesRes.rows.length === 0) {
    console.log('⚠️  No tables in public schema. DB is empty.')
  } else {
    console.log(`\nTables (${tablesRes.rows.length}):`)
    for (const { tablename } of tablesRes.rows) {
      try {
        const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM "${tablename}"`)
        console.log(`  ${tablename.padEnd(30)} ${countRes.rows[0].n} rows`)
      } catch (e) {
        console.log(`  ${tablename.padEnd(30)} (error: ${(e as Error).message})`)
      }
    }
  }

  // If bitcoin_prices exists, show first/last date and ATH
  const hasPrices = tablesRes.rows.some((r) => r.tablename === 'bitcoin_prices')
  if (hasPrices) {
    const stats = await client.query(`
      SELECT MIN(date) AS earliest, MAX(date) AS latest,
             MAX(high) AS ath_high, MAX(close) AS ath_close
      FROM bitcoin_prices
    `)
    console.log('\nbitcoin_prices stats:')
    console.log(`  earliest:  ${stats.rows[0].earliest}`)
    console.log(`  latest:    ${stats.rows[0].latest}`)
    console.log(`  ath_high:  ${stats.rows[0].ath_high}`)
    console.log(`  ath_close: ${stats.rows[0].ath_close}`)
  }

  await client.end()
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
