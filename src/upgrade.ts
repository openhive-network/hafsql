import deno from '../deno.json' with { type: 'json' }
import { query, transaction } from './app/helpers/database.ts'
import { print } from './app/helpers/utils/print.ts'
import { operationTables } from './app/setup/setup_operation_tables.ts'
import { semver } from './deps.ts'
import { setup } from './app/setup/setup.ts'

/**
 * Make upgrade decisions based on the version - this runs just after the setup
 */
export const handleUpgrade = async () => {
	const getVersion = await query<{ version: string }>(
		'SELECT version FROM hafsql.version WHERE name=$1',
		['hafsql'],
	)
	if (getVersion.rows.length === 0) {
		// not an upgrade
		await query(
			'INSERT INTO hafsql.version (name, version) VALUES ($1, $2)',
			['hafsql', deno.version],
		)
		return
	}

	const oldVersion = getVersion.rows[0].version
	const newVersion = deno.version

	// Upgrading from <= 2.3.1
	// Need to resync operations and accounts table
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.3.1'))) {
		print(
			'Upgrading from version <= 2.3.1 - need to resync accounts & operations',
		)
		await transaction(async (client) => {
			for (const [name, _value] of Object.entries(operationTables)) {
				// The tables should exists because setup already ran
				await client.query(
					`DROP TABLE IF EXISTS hafsql.operation_${name}_table CASCADE;`,
				)
			}
			await client.query(`DROP TABLE IF EXISTS hafsql.accounts_table CASCADE;`)
			await client.query(
				`UPDATE hafsql.sync_data SET last_block_num=0 WHERE table_name IN ('accounts', 'operations')`,
			)
		})
		print('Upgrade script done ✅')
		// Run setup again to recreate the tables
		await setup()
	}

	// Upgrading from = 2.3.2
	// Some tables were removed
	if (semver.equals(semver.parse(oldVersion), semver.parse('2.3.2'))) {
		print(
			'Upgrading from version = 2.3.2 - some tables are removed in favor of reptracker and hafbe',
		)
		await transaction(async (client) => {
			for (const [name, _value] of Object.entries(operationTables)) {
				await client.query(
					`DROP TABLE IF EXISTS hafsql.operation_${name}_table CASCADE;`,
				)
			}
			await client.query(
				`UPDATE hafsql.sync_data SET last_block_num=0 WHERE table_name IN ('operations')`,
			)
			const query = client.query
			await query('DROP TABLE IF EXISTS hafsql.blacklists_table CASCADE;')
			await query(
				'DROP TABLE IF EXISTS hafsql.blacklist_follows_table CASCADE;',
			)
			await query('DROP TABLE IF EXISTS hafsql.mutes_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.mute_follows_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.reblogs_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.follows_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.community_roles_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.reputations_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.balances_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.balances_history_table CASCADE;')
			await query('DROP TABLE IF EXISTS hafsql.total_balances_table CASCADE;')
			await query(
				'DROP TABLE IF EXISTS hafsql.pending_saving_withdraws_table CASCADE;',
			)
			await query(
				'DELETE FROM hafsql.sync_data WHERE table_name IN ($1, $2, $3, $4, $5, $6)',
				[
					'reblogs',
					'delegations',
					'follows',
					'communities',
					'balances',
					'reputations',
				],
			)
		})

		print('Upgrade script done ✅')
		// Run setup again to recreate the tables
		await setup()
	}

	// Upgrading from <= 2.6.1
	// Rebuild comments, including their deletion status and rewards.
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.6.1'))) {
		print('Upgrading from version <= 2.6.1 - need to resync comments')
		await transaction(async (client) => {
			await client.query('DROP TABLE IF EXISTS hafsql.comments_table CASCADE;')
			await client.query(
				`UPDATE hafsql.sync_data SET last_block_num=0 WHERE table_name IN ('comments', 'delete_comments', 'paid_rewards', 'pending_rewards')`,
			)
		})
		await setup()
		print('Upgrade script done ✅')
	}

	// Upgrading from <= 2.6.5
	// Empty json_metadata/posting_json_metadata in account updates means "unchanged"
	// but was stored as {} and overwrote the account metadata. Store NULL and repair accounts.
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.6.5'))) {
		print('Upgrading from version <= 2.6.5 - repairing account metadata')
		await transaction(async (client) => {
			await client.query(`UPDATE hafsql.operation_account_update_table t
				SET json_metadata = NULL
				FROM hafd.operations o
				WHERE o.id = t.id AND t.json_metadata = '{}'::jsonb
				AND o.body_value->>'json_metadata' = ''`)
			await client.query(`UPDATE hafsql.operation_account_update2_table t
				SET json_metadata = CASE WHEN o.body_value->>'json_metadata' = '' THEN NULL ELSE t.json_metadata END,
				posting_json_metadata = CASE WHEN o.body_value->>'posting_json_metadata' = '' THEN NULL ELSE t.posting_json_metadata END
				FROM hafd.operations o
				WHERE o.id = t.id
				AND (t.json_metadata = '{}'::jsonb OR t.posting_json_metadata = '{}'::jsonb)
				AND (o.body_value->>'json_metadata' = '' OR o.body_value->>'posting_json_metadata' = '')`)
			// Latest non-empty value wins, same as the accounts sync
			await client.query(`UPDATE hafsql.accounts_table t
				SET json_metadata = l.json_metadata
				FROM (
					SELECT DISTINCT ON (account) account, json_metadata FROM (
						SELECT a.id AS account, x.id, x.json_metadata FROM hafsql.operation_account_create_table x JOIN hafd.accounts a ON a.name = x.new_account_name
						UNION ALL SELECT a.id, x.id, x.json_metadata FROM hafsql.operation_account_create_with_delegation_table x JOIN hafd.accounts a ON a.name = x.new_account_name
						UNION ALL SELECT a.id, x.id, x.json_metadata FROM hafsql.operation_create_claimed_account_table x JOIN hafd.accounts a ON a.name = x.new_account_name
						UNION ALL SELECT a.id, x.id, x.json_metadata FROM hafsql.operation_account_update_table x JOIN hafd.accounts a ON a.name = x.account
						UNION ALL SELECT a.id, x.id, x.json_metadata FROM hafsql.operation_account_update2_table x JOIN hafd.accounts a ON a.name = x.account
					) s ORDER BY account, (json_metadata IS NULL), id DESC
				) l
				WHERE l.account = t.account AND t.json_metadata IS DISTINCT FROM l.json_metadata`)
			await client.query(`UPDATE hafsql.accounts_table t
				SET posting_metadata = l.posting_json_metadata
				FROM (
					SELECT DISTINCT ON (a.id) a.id AS account, x.posting_json_metadata
					FROM hafsql.operation_account_update2_table x JOIN hafd.accounts a ON a.name = x.account
					ORDER BY a.id, (x.posting_json_metadata IS NULL), x.id DESC
				) l
				WHERE l.account = t.account AND t.posting_metadata IS DISTINCT FROM l.posting_json_metadata`)
		})
		print('Upgrade script done ✅')
	}

	// Upgrading from <= 2.6.6
	// Edits with an empty title blanked the title - restore the latest non-empty title.
	// Batched by id without a transaction to avoid one long transaction - safe to re-run.
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.6.6'))) {
		print('Upgrading from version <= 2.6.6 - restoring comment titles')
		const maxId = (await query<{ max: number }>(
			'SELECT COALESCE(MAX(id), 0) AS max FROM hafsql.comments_table',
		)).rows[0].max
		const batch = 1000000
		for (let start = 0; start <= maxId; start += batch) {
			await query(
				`UPDATE hafsql.comments_table c SET title = l.title
				FROM (
					SELECT c2.id, (SELECT replace(o.body_value->>'title', 'u0000', '')
						FROM hafd.operations o
						WHERE o.op_type_id = 1
						AND o.body_value->>'author' = c2.author
						AND o.body_value->>'permlink' = c2.permlink
						AND o.body_value->>'title' <> ''
						ORDER BY o.id DESC LIMIT 1) AS title
					FROM hafsql.comments_table c2
					WHERE c2.id BETWEEN $1 AND $2 AND c2.title = '' AND c2.last_edited IS NOT NULL AND NOT c2.deleted
				) l
				WHERE l.id = c.id AND l.title IS NOT NULL`,
				[start, start + batch - 1],
			)
			print(
				`[Upgrade] Comment titles: ${Math.min(start + batch, maxId)}/${maxId}`,
			)
		}
		print('Upgrade script done ✅')
	}

	// Upgrading from <= 2.6.7
	// Deletes moved from a separate worker into the comments worker.
	// Apply deletes the old worker had not reached yet, drop its sync row,
	// and ask the comments worker to rebuild comments re-posted after a delete.
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.6.7'))) {
		print(
			'Upgrading from version <= 2.6.7 - merging delete_comments into comments',
		)
		await transaction(async (client) => {
			await client.query(`UPDATE hafsql.comments_table c SET deleted = true
				FROM hafsql.operation_delete_comment_table d
				WHERE c.author = d.author AND c.permlink = d.permlink
				AND d.id >= hafd.operation_id((SELECT last_block_num FROM hafsql.sync_data WHERE table_name = 'delete_comments') + 1, 0)
				AND d.id < hafd.operation_id((SELECT last_block_num FROM hafsql.sync_data WHERE table_name = 'comments') + 1, 0)
				AND NOT EXISTS (
					SELECT 1 FROM hafsql.operation_ineffective_delete_comment_table i
					WHERE i.author = d.author AND i.permlink = d.permlink
					AND hafd.operation_id_to_block_num(i.id) = hafd.operation_id_to_block_num(d.id))`)
			await client.query(
				`DELETE FROM hafsql.sync_data WHERE table_name = 'delete_comments'`,
			)
			// Picked up by the comments worker on start (repairRecreatedComments)
			await client.query(
				`INSERT INTO hafsql.version (name, version) VALUES ('repair_recreated_comments', '1')
				ON CONFLICT DO NOTHING`,
			)
		})
		print('Upgrade script done ✅')
	}

	// Update the version
	if (oldVersion !== newVersion) {
		await query(
			'UPDATE hafsql.version SET version=$1 WHERE name=$2',
			[newVersion, 'hafsql'],
		)
	}
}
