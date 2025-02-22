import { queryAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validatePermlink } from '../helpers/validate_permlink.ts'

export const commentsAPI = new Router()
	/**
	 * GET /comments/{author}/{permlink}
	 * @summary Get Comment
	 * @description Returns a post or comment by author and permlink.
	 * @tag Comments/Posts
	 * @pathParam {string} author - The post/comment author e.g. mahdiyari
	 * @pathParam {string} permlink - The post/comment permlink
	 * e.g. docker-compose-how-to-run-a-hived-node-seed-node-witness-node
	 * @queryParam {boolean} [include_body=false] - Set true to return the post/comment body
	 * @response 200 - Post/comment as JSON
	 * @response 400 - Bad request value
	 * @responseContent {object} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/comments/:author/:permlink', async (ctx) => {
		const author = await validateNames(ctx, ctx.params.author, 1)
		const permlink = validatePermlink(ctx, ctx.params.permlink)
		const result = await getComment(author[0], permlink)
		if (result.length === 0) {
			return ctx.response.body = []
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result[0]),
		)
	})

const getComment = async (author: string, permlink: string) => {
	const result = await queryAPI(
		`SELECT * FROM hafsql.comments WHERE author=$1 AND permlink=$2
      ORDER BY id`,
		[author, permlink],
	)
	return result.rows
}
