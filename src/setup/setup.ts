import { removeExtraViews, setupExtraViews } from './extra_views.ts'
import { setupFunctions } from './functions.ts'
import { removeOperationViews, setupOperationViews } from './operations.ts'
import { setupPublicUser } from './public_user.ts'
import { setupSchema } from './schema.ts'
import { setupTables } from './tables.ts'
import {
	removeVirtualOperationViews,
	setupVirtualOperationViews,
} from './virtual_operations.ts'

export const setup = async (): Promise<void> => {
	try {
		await setupSchema()

		await setupFunctions()

		await setupTables()

		// Remove the views to recreate them in case they have changed
		await removeExtraViews()

		await removeVirtualOperationViews()

		await removeOperationViews()

		await setupOperationViews()

		await setupVirtualOperationViews()

		await setupExtraViews()

		if (Deno.env.get('HAFSQL_PUBLICUSER') === 'true') {
			await setupPublicUser()
		}
	} catch (_e) {
		console.log('trying setup again...')
		return setup()
	}
}
