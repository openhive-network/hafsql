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
  await removeOperationViews()
  await removeVirtualOperationViews()
  await removeExtraViews()
  await setupOperationViews()
  await setupVirtualOperationViews()
  await setupTables()
  await setupExtraViews()
}

setup()

// index operations id, op_type_id
