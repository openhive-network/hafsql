import { removeOperationViews, setupOperationViews } from '../helpers/setups/operations.js'
import { removeVirtualOperationViews, setupVirtualOperationViews } from '../helpers/setups/virtualOperations.js'
import { setupFunctions } from '../helpers/setups/functions.js'
import { setupSchema } from '../helpers/setups/schema.js'
import { setupTables } from '../helpers/setups/tables.js'
import { removeExtraViews, setupExtraViews } from '../helpers/setups/extraViews.js'

// Creating hafsql schema and all the views
export const setup = async () => {
  console.log('Setting up Views...')
  await setupSchema()
  await setupFunctions()
  await removeExtraViews()
  await removeVirtualOperationViews()
  await removeOperationViews()
  await setupOperationViews()
  await setupVirtualOperationViews()
  await setupTables()
  await setupExtraViews()
}
