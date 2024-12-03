import { pool } from '../../src/app/helpers/database.ts'

const getColumns = async (tableName: string) => {
  using client = await pool.connect()
  const items = await client.queryObject<
    { column_name: string; udt_name: string }
  >(
    `SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'hafsql' 
    AND table_name = $1`,
    [tableName],
  )
  return items.rows
}

const spitMarkdown = async () => {
  let document = '\n'
  using client = await pool.connect()
  const getTables = await client.queryObject<{ table_name: string }>(
    `SELECT DISTINCT table_name 
    FROM information_schema.columns
    WHERE table_schema = 'hafsql'
    AND is_updatable = 'NO'
    AND table_name NOT LIKE 'operation_%_view'
    AND table_name NOT LIKE 'haf_%'`,
  )
  if (getTables.rows.length === 0) {
    throw new Error('HafSQL must run on this database')
  }

  for (let i = 0; i < getTables.rows.length; i++) {
    const tableName = getTables.rows[i].table_name
    const columns = await getColumns(tableName)
    document += `### ${i + 1}. ${tableName}`
    document += '\n'

    // Example SQL query
    document += '```sql\n'
    document += `SELECT * FROM hafsql.${tableName}\nLIMIT 1\n`
    document += '```\n'

    // Columns and their type
    let row1 = '|'
    let row2 = '|'
    let row3 = '|'
    for (let k = 0; k < columns.length; k++) {
      const { column_name, udt_name } = columns[k]
      row1 += `${column_name}|`
      row2 += '-'.repeat(column_name.length) + '|'
      row3 += `${udt_name}|`
    }
    document += `${row1}\n`
    document += `${row2}\n`
    document += `${row3}\n\n`

    document += 'Indexes on: \n\n***\n'
  }
  await Deno.writeTextFile(
    'sql_docs/excluded/hafsql_table_helper.md',
    document,
  )
}

spitMarkdown()
