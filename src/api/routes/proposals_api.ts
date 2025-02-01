import { queryArrayAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateBlockNum } from '../helpers/validate_block_num.ts'

export const proposalsAPI = new Router()
	/**
	 * GET /proposals/{id}/approvals
	 * @summary Proposal Approvals
	 * @description Returns list of accounts voting for a proposal.
	 * @tag Proposals
	 * @pathParam {integer} id - Proposal id e.g. 0
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/proposals/:id/approvals', async (ctx) => {
		const id = validateBlockNum(ctx, ctx.params.id)
		const result = await getApprovals(id)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})

const getApprovals = async (id: number) => {
	const result = await queryArrayAPI(
		`SELECT voter FROM hafsql.proposal_approvals WHERE proposal_id=$1
      ORDER BY voter`,
		[id],
	)
	return result.rows
}
