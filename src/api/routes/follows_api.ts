import { queryArrayAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateStartLimit } from '../helpers/validate_start_limit.ts'

export const followsAPI = new Router()
	/**
	 * GET /accounts/{username}/followers
	 * @summary Followers
	 * @description Returns list of followers of a certain username.
	 * @tag Follows
	 * @pathParam {string} username - Account name e.g. mahdiyari
	 * @queryParam {integer} [start] - Username used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/accounts/:username/followers', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getFollowers(username, startId, limit)
		if (result.length === 0) {
			return ctx.response.body = []
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/{username}/following
	 * @summary Following
	 * @description Returns list of following of a certain username.
	 * @tag Follows
	 * @pathParam {string} username - Account name e.g. mahdiyari
	 * @queryParam {integer} [start] - Username used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/accounts/:username/following', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getFollowing(username, startId, limit)
		if (result.length === 0) {
			return ctx.response.body = []
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/{username}/follow-counts
	 * @summary Follow counts
	 * @description Returns number of the followers and following of an account.
	 * @tag Follows
	 * @pathParam {string} username - Account name e.g. mahdiyari
	 * @response 200 - A JSON object of followers and following count
	 * @response 400 - Bad request value
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/accounts/:username/follow-counts', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const result = await getFollowCounts(username)
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})

// Helper functions
const getFollowers = async (
	username: string,
	startId: number,
	limit: number,
) => {
	const result = await queryArrayAPI(
		`SELECT follower_name FROM hafsql.follows
      WHERE following_name = $1
      AND follower_id ${limit < 0 && startId !== -1 ? '< $2' : '> $2'}
      ORDER BY follower_id ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
		[username, startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getFollowing = async (
	username: string,
	startId: number,
	limit: number,
) => {
	const result = await queryArrayAPI(
		`SELECT following_name FROM hafsql.follows
      WHERE follower_name = $1
      AND following_id ${limit < 0 && startId !== -1 ? '< $2' : '> $2'}
      ORDER BY following_id ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
		[username, startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getFollowCounts = async (username: string) => {
	const result = await queryArrayAPI(
		`SELECT count(1) FROM hafsql.follows
      WHERE following_name = $1
      UNION ALL 
      SELECT count(1) FROM hafsql.follows
      WHERE follower_name = $1`,
		[username],
	)
	const temp = {
		followers: result.rows[0][0],
		following: result.rows[1][0],
	}
	return temp
}
