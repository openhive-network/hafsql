import { pool } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateStartLimit } from '../helpers/validate_start_limit.ts'

export const mutesAPI = new Router()
  /**
   * GET /accounts/{username}/muting
   * @summary Muting accounts
   * @description Returns list of accounts who have muted a certain username.
   * @tag Mutes
   * @pathParam {string} username - Account name e.g. mahdiyari
   * @response 200 - A JSON array of account names
   * @response 400 - Bad request value
   * @response 404 - No items found
   * @responseContent {string[]} 200.application/json
   * @responseContent {BadRequest} 400.application/json
   * @responseContent {NoItemFound} 404.application/json
   */
  // I don't think there will be an account muted by a large number of accounts
  // So the list *should* be short and not need a limit
  .get('/accounts/:username/muting', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const result = await getMuting(username)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })
  /**
   * GET /accounts/{username}/muted
   * @summary Muted accounts
   * @description Returns list of accounts muted by a certain username.
   * @tag Mutes
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
  .get('/accounts/:username/muted', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const validKeys = ['start', 'limit']
    validateSearchParams(ctx, validKeys, false)
    const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
    const result = await getMuted(username, startId, limit)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })
  /**
   * GET /accounts/{username}/muted-lists
   * @summary Muted lists
   * @description Returns list of mute-lists followed by a certain username.
   * Each mute-list is a Hive username.
   * @tag Mutes
   * @pathParam {string} username - Account name e.g. mahdiyari
   * @response 200 - A JSON array of account names
   * @response 400 - Bad request value
   * @response 404 - No items found
   * @responseContent {string[]} 200.application/json
   * @responseContent {BadRequest} 400.application/json
   * @responseContent {NoItemFound} 404.application/json
   */
  .get('/accounts/:username/muted-lists', async (ctx) => {
    const username = ctx.params.username
    await validateNames(ctx, username, 1)
    const result = await getMutedLists(username)
    if (result.length === 0) {
      return ctx.throw(404, 'No items found')
    }
    return ctx.response.body = BigJSONparser(
      BigJSONstringifier(result.join().split(',')),
    )
  })

// Helper functions
const getMuting = async (username: string) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT muter_name FROM hafsql.mutes
      WHERE muted_name = $1`,
    [username],
  )
  return result.rows
}

const getMuted = async (
  username: string,
  startId: number,
  limit: number,
) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT muted_name FROM hafsql.mutes
      WHERE muter_name = $1
      AND muted_id ${limit < 0 && startId !== -1 ? '< $2' : '> $2'}
      ORDER BY muted_id ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
    [username, startId, limit < 0 ? -limit : limit],
  )
  return result.rows
}

const getMutedLists = async (username: string) => {
  using client = await pool.connect()
  const result = await client.queryArray(
    `SELECT mute_list_name FROM hafsql.mute_follows
      WHERE account_name = $1`,
    [username],
  )
  return result.rows
}
