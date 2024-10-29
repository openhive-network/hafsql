import { removeExtraViews, setupExtraViews } from './extra_views.ts'
import { setupFunctions } from './functions.ts'
import { setupOperationTables } from './setup_operation_tables.ts'
import {
	removeOperationViews,
	setupOperationViews,
} from './setup_operations_views.ts'
import { setupPublicUser } from './setup_public_user.ts'
import { setupSchema } from './setup_schema.ts'
import { setupTables } from './setup_tables.ts'

export const setup = async (): Promise<void> => {
	await setupSchema()

	await setupFunctions()

	await setupTables()

	await setupOperationTables()

	// Remove the views to recreate them in case they have changed
	await removeExtraViews()

	await removeOperationViews()

	await setupOperationViews()

	await setupExtraViews()

	if (Deno.env.get('HAFSQL_PUBLICUSER') === 'true') {
		await setupPublicUser()
	}
}
