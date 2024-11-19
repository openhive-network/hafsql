import { pool } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateStartLimit } from '../helpers/validate_start_limit.ts'

export const blacklistsAPI = new Router()
  /**
   * GET /accounts/{username}/blacklisting
   * @summary Blacklisting accounts
   * @description Returns list of accounts who have blacklisted a certain username.
   * @tag Blacklists
   * @pathParam {string} username - Account name e.g. mahdiyari
   * @response 200 - A JSON array of account names
   * @response 400 - Bad request value
   * @response 404 - No items found
   * @responseContent {string[]} 200.application/json
   * @responseContent {BadRequest} 400.application/json
   * @responseContent {NoItemFound} 404.application/json
   */
  // The list *should* be short and not need a limit
  .get('/accounts/:username/blacklisting', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const result = await getBlacklisting(username)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })
  /**
   * GET /accounts/{username}/blacklisted
   * @summary Blacklisted accounts
   * @description Returns list of accounts blacklisted by a certain username.
   * @tag Blacklists
   * @pathParam {string} username - Account name e.g. mahdiyari
   * @queryParam {integer} [start] - Username used for pagination
   * @queryParam {integer} [limit=100] - Max number of returned items -
   * Can be negative for going backwards and to reverse the sorting<br/>
   * <sub>min: -1000 | max: 1000</sub>
   * @response 200 - A JSON array of account names
   * @response 400 - Bad request value
   * @response 404 - No items found
   * @responseContent {string[]} 200.application/json
   * @responseContent {BadRequest} 400.application/json
   * @responseContent {NoItemFound} 404.application/json
   */
  .get('/accounts/:username/blacklisted', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const validKeys = ['start', 'limit']
    validateSearchParams(ctx, validKeys, false)
    const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
    const result = await getBlacklisted(username, startId, limit)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })
  /**
   * GET /accounts/{username}/blacklists
   * @summary Blacklists followed
   * @description Returns list of blacklists followed by a certain username.
   * Each blacklist is a Hive username.
   * @tag Blacklists
   * @pathParam {string} username - Account name e.g. mahdiyari
   * @response 200 - A JSON array of account names
   * @response 400 - Bad request value
   * @response 404 - No items found
   * @responseContent {string[]} 200.application/json
   * @responseContent {BadRequest} 400.application/json
   * @responseContent {NoItemFound} 404.application/json
   */
  .get('/accounts/:username/blacklists', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const result = await getBlacklists(username)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })

// Helper functions
const getBlacklisting = async (username: string) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT blacklister_name FROM hafsql.blacklists
      WHERE blacklisted_name = $1`,
    [username],
  )
  return result.rows
}

const getBlacklisted = async (
  username: string,
  startId: number,
  limit: number,
) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT blacklisted_name FROM hafsql.blacklists
      WHERE blacklister_name = $1
      AND blacklisted_id ${limit < 0 && startId !== -1 ? '< $2' : '> $2'}
      ORDER BY blacklisted_id ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
    [username, startId, limit < 0 ? -limit : limit],
  )
  return result.rows
}

const getBlacklists = async (username: string) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT blacklist_name FROM hafsql.blacklist_follows
      WHERE account_name = $1`,
    [username],
  )
  return result.rows
}
