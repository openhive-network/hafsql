import { queryAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'

export const reputationsAPI = new Router()
	/**
	 * GET /reputations/{username}
	 * @summary Get Reputation
	 * @description Return reputation of a user.
	 * @tag Reputations
	 * @pathParam {string} username - Account name e.g. gtg
	 * @response 200 - Reputation string
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/reputations/:username', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const result = await getReputation(username)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result[0].rep),
		)
	})

const getReputation = async (username: string) => {
	const result = await queryAPI(
		`SELECT rep FROM hafsql.reputations WHERE account_name=$1`,
		[username],
	)
	return result.rows
}
