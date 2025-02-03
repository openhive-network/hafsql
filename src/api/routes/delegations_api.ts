import { queryAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateLimit } from '../helpers/validate_limit.ts'
import { validateTimestamp } from '../helpers/validate_timestamp.ts'

export const delegationsAPI = new Router()
	/**
	 * GET /delegations/{username}/incoming
	 * @summary Incoming HP Delegations
	 * @description Returns list of incoming delegations to a user.
	 * @tag Delegations
	 * @pathParam {string} username - Account name e.g. ocd
	 * @queryParam {string} [start] - Timestamp used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of delegations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/delegations/:username/incoming', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const limit = await validateLimit(ctx, 100, 1000)
		const params = ctx.request.url.searchParams
		let startTimestamp: string = '2010-01-01 10:10:10.000'
		if (params.has('start')) {
			startTimestamp = <string> params.get('start')
			startTimestamp = validateTimestamp(ctx, startTimestamp)
		}
		const result = await getIncomingDelegations(username, startTimestamp, limit)
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})
	/**
	 * GET /delegations/{username}/outgoing
	 * @summary Outgoing HP Delegations
	 * @description Returns list of outgoing delegations from a user.
	 * @tag Delegations
	 * @pathParam {string} username - Account name e.g. mahdiyari
	 * @queryParam {string} [start] - Timestamp used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of delegations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/delegations/:username/outgoing', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const limit = await validateLimit(ctx, 100, 1000)
		const params = ctx.request.url.searchParams
		let startTimestamp: string = '2010-01-01 10:10:10.000'
		if (params.has('start')) {
			startTimestamp = <string> params.get('start')
			startTimestamp = validateTimestamp(ctx, startTimestamp)
		}
		const result = await getOutgoingDelegations(username, startTimestamp, limit)
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})
	/**
	 * GET /rc-delegations/{username}/incoming
	 * @summary Incoming RC Delegations
	 * @description Returns list of incoming RC delegations to a user.
	 * @tag Delegations
	 * @pathParam {string} username - Account name e.g. ocd
	 * @queryParam {string} [start] - Timestamp used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of delegations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/rc-delegations/:username/incoming', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const limit = await validateLimit(ctx, 100, 1000)
		const params = ctx.request.url.searchParams
		let startTimestamp: string = '2010-01-01 10:10:10.000'
		if (params.has('start')) {
			startTimestamp = <string> params.get('start')
			startTimestamp = validateTimestamp(ctx, startTimestamp)
		}
		const result = await getIncomingRCDelegations(
			username,
			startTimestamp,
			limit,
		)
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})
	/**
	 * GET /rc-delegations/{username}/outgoing
	 * @summary Outgoing RC Delegations
	 * @description Returns list of outgoing RC delegations from a user.
	 * @tag Delegations
	 * @pathParam {string} username - Account name e.g. ocd
	 * @queryParam {string} [start] - Timestamp used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of delegations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/rc-delegations/:username/outgoing', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const limit = await validateLimit(ctx, 100, 1000)
		const params = ctx.request.url.searchParams
		let startTimestamp: string = '2010-01-01 10:10:10.000'
		if (params.has('start')) {
			startTimestamp = <string> params.get('start')
			startTimestamp = validateTimestamp(ctx, startTimestamp)
		}
		const result = await getOutgoingRCDelegations(
			username,
			startTimestamp,
			limit,
		)
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})

// Helper functions
const getIncomingDelegations = async (
	username: string,
	startTimestamp: string,
	limit: number,
) => {
	try {
		const result = await queryAPI(
			`SELECT delegator, delegatee, vests, hp_equivalent, timestamp FROM hafsql.delegations
      WHERE delegatee = $1
      AND timestamp ${
				limit < 0 && startTimestamp !== '2010-01-01 10:10:10.000'
					? '< $2'
					: '> $2'
			}
      ORDER BY timestamp AT TIME ZONE 'UTC' ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
			[username, startTimestamp, limit < 0 ? -limit : limit],
		)
		return result.rows
	} catch (_e) {
		// wrong formatted timestamp could throw
		return []
	}
}

const getOutgoingDelegations = async (
	username: string,
	startTimestamp: string,
	limit: number,
) => {
	try {
		const result = await queryAPI(
			`SELECT delegator, delegatee, vests, hp_equivalent, timestamp FROM hafsql.delegations
      WHERE delegator = $1
      AND timestamp ${
				limit < 0 && startTimestamp !== '2010-01-01 10:10:10.000'
					? '< $2'
					: '> $2'
			}
      ORDER BY timestamp ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
			[username, startTimestamp, limit < 0 ? -limit : limit],
		)
		return result.rows
	} catch (_e) {
		// wrong formatted timestamp could throw
		return []
	}
}

const getIncomingRCDelegations = async (
	username: string,
	startTimestamp: string,
	limit: number,
) => {
	const result = await queryAPI(
		`SELECT delegator, delegatee, rc, hp_equivalent FROM hafsql.rc_delegations
      WHERE delegatee = $1
      AND timestamp ${
			limit < 0 && startTimestamp !== '2010-01-01 10:10:10.000'
				? '< $2'
				: '> $2'
		}
      ORDER BY timestamp AT TIME ZONE 'UTC' ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
		[username, startTimestamp, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getOutgoingRCDelegations = async (
	username: string,
	startTimestamp: string,
	limit: number,
) => {
	const result = await queryAPI(
		`SELECT delegator, delegatee, rc, hp_equivalent FROM hafsql.rc_delegations
      WHERE delegator = $1
      AND timestamp ${
			limit < 0 && startTimestamp !== '2010-01-01 10:10:10.000'
				? '< $2'
				: '> $2'
		}
      ORDER BY timestamp AT TIME ZONE 'UTC' ${limit < 0 ? 'DESC' : 'ASC'}
      LIMIT $3`,
		[username, startTimestamp, limit < 0 ? -limit : limit],
	)
	return result.rows
}
