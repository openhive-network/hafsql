import { queryAPI, queryArrayAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'

export const communitiesAPI = new Router()
	/**
	 * GET /communities/{username}/roles
	 * @summary Community Roles
	 * @description Returns list of roles in a community.
	 * @tag Communities
	 * @pathParam {string} username - Community account name e.g. hive-139531
	 * @response 200 - A JSON array of roles
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/communities/:username/roles', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, ctx.params.username, 1)
		const result = await getRoles(username)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})
	/**
	 * GET /communities/{username}/subscribers
	 * @summary Community Subscribers
	 * @description Returns list of community subscribers.
	 * @tag Communities
	 * @pathParam {string} username - Community account name e.g. hive-139531
	 * @response 200 - A JSON array of accounts
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/communities/:username/subscribers', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, ctx.params.username, 1)
		const result = await getSubs(username)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})

const getRoles = async (username: string) => {
	const result = await queryAPI(
		`SELECT account_name AS account, role, title FROM hafsql.community_roles WHERE community_name=$1
      ORDER BY account_name`,
		[username],
	)
	return result.rows
}

const getSubs = async (username: string) => {
	const result = await queryArrayAPI(
		`SELECT account_name AS account FROM hafsql.community_subs WHERE community_name=$1
      ORDER BY account_name`,
		[username],
	)
	return result.rows
}
