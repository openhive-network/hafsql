import { removeExtraViews, setupHafsqlViews } from './setup_hafsql_views.ts'
import { setupFunctions } from './setup_functions.ts'
import { setupOperationTables } from './setup_operation_tables.ts'
import {
	removeOperationViews,
	setupOperationViews,
} from './setup_operation_views.ts'
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

	await setupHafsqlViews()
}
