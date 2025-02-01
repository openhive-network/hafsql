import { query } from '../../src/app/helpers/database.ts'
import { opId, OPS } from '../../src/app/helpers/operation_id.ts'
import { OperationNames } from '../../src/app/helpers/types.ts'

/**
 * Connect to the HAF database (.env|.env.defaults)
 * HafSQL must fully sync on that database for this script to work
 * Get the list of operation tables operation_*_table | operaiton_*_view
 * And fetch their columns and the column types
 * And fetch their indexes
 * Format in markdown
 * Then merge with sql_docs/excluded/operations.md
 * Write to sql_docs/operations.md
 */
const generateDocs = async () => {
	let prePrefix = '---\nicon: stack\norder: 97\n---\n\n\n\n\n'
	prePrefix += '<!-- AUTO GENERATED -->\n'
	prePrefix += '<!-- DO NOT EDIT THIS PAGE -->\n'
	prePrefix += '<!-- To edit this page see "excluded/operations.md" -->\n'
	prePrefix +=
		'<!-- The following script generates the list of operations -->\n'
	prePrefix += '<!-- and merges that with "excluded/operations.md" -->\n'
	prePrefix += '<!-- The output goes to "sql_docs/operations.md" -->\n'
	prePrefix += '<!-- SEE sql_docs/helpers/operations_helper.ts -->\n\n\n\n\n\n\n'

	let document = '\n'
	const getTables = await query<{ table_name: string }>(
		`SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'hafsql' 
    AND table_name LIKE 'operation_%_view'
    OR table_name LIKE 'operation_%_table'`,
	)
	if (getTables.rows.length === 0) {
		throw new Error('HafSQL must run on this database')
	}
	for (let i = 0; i < getTables.rows.length; i++) {
		const tableName = getTables.rows[i].table_name
		const columns = await getColumns(tableName)
		document += `### ${i + 1}. ${tableName}`
		if (isVirtual(tableName)) {
			document += ' [!badge size="xs" text="Virtual"]'
		}
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

		// Indexes
		const indexes = await getIndexes(tableName)
		document += 'Indexes on: '
		for (let j = 0; j < indexes.length; j++) {
			const { column_names } = indexes[j]
			document += `\`${column_names}\``
			if (j !== indexes.length - 1) {
				document += ' | '
			}
		}

		// The views have indexes on the hive.operations table
		if (tableName === 'operation_vote_view') {
			document +=
				'`(author, permlink, id)` | `(author, id)` | `(voter, id)` | `(id)`'
		}
		if (tableName === 'operation_comment_view') {
			document +=
				"`(author, permlink, id)` | `(author, id)` | `(parent_author, id)` | `(parent_author, parent_permlink)` | `((json_metadata->>'content_type'), id)` | `(id)`"
		}
		if (tableName === 'operation_custom_json_view') {
			document += '`(custom_id, id)` | `(id)`'
		}
		if (tableName === 'operation_effective_comment_vote_view') {
			document +=
				'`(author, permlink, id)` | `(author, id)` | `(voter, id)` | `(id)`'
		}
		document += '\n\n***\n'
	}
	const prefix = await Deno.readTextFile('sql_docs/excluded/operations.md')
	await Deno.writeTextFile(
		'sql_docs/operations.md',
		prePrefix + prefix + document,
	)
}

const getColumns = async (tableName: string) => {
	const items = await query<
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

const getIndexes = async (tableName: string) => {
	const items = await query<{ column_names: string }>(
		`SELECT substring(indexdef FROM '\\(.*\\)') AS column_names
		FROM pg_indexes
		WHERE tablename = $1`,
		[tableName],
	)
	return items.rows
}

const isVirtual = (tableName: string) => {
	const matcher = tableName.match(/^operation_(.+)_(view|table)$/)
	const opName = <OperationNames> (matcher ? matcher[1] : '')
	const result = opId[opName] > OPS
	return result
}

generateDocs()
