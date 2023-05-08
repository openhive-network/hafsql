import { pool } from '../helpers/database.js'
import { removeOperationViews, setupOperationViews } from '../helpers/operations.js'
import { removeVirtualOperationViews, setupVirtualOperationViews } from '../helpers/virtualOperations.js'
import { setupFunctions } from '../helpers/functions.js'
import { setupSchema } from '../helpers/schema.js'

// Creating hafsql schema and all the views
export const setup = async () => {
  console.log('Setting up the schema...')
  await setupSchema()

  console.log('Creating the functions...')
  await setupFunctions()

  console.log('Dropping the views...')
  await removeOperationViews()
  await removeVirtualOperationViews()

  console.log('Recreating the views...')
  await setupOperationViews()
  await setupVirtualOperationViews()

  // console.log('Creating indexes...')
  // await setupOperationIndexes()
  // await setupVirtualOperationIndexes()
  await pool.end()
  console.log('Everything ready.')
}

setup()

// index operations id, op_type_id

