import { queryAPI, queryArrayAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { userExists } from '../helpers/user_exists.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateStartLimit } from '../helpers/validate_start_limit.ts'

export const accountsAPI = new Router()
	/**
	 * GET /accounts
	 * @summary All accounts
	 * @description Returns the list of all Hive accounts.
	 * @tag Accounts
	 * @queryParam {string} [start] - Account name used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting <br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/accounts', async (ctx) => {
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getAccounts(startId, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/by-names
	 * @summary Accounts by names
	 * @description Returns account[s] related information.
	 * @tag Accounts
	 * @queryParam {string} names - List of usernames separated by `,` e.g. mahdiyari,gtg
	 * @response 200 - A JSON array of account objects
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/accounts/by-names', async (ctx) => {
		const validKeys = ['names']
		validateSearchParams(ctx, validKeys)
		const params = ctx.request.url.searchParams
		const names = params.get('names')
		const namesArray = await validateNames(ctx, names)
		const result = await getByNames(namesArray)
		if (result.length === 0) {
			return ctx.throw(404, 'No accounts found')
		}
		return ctx.response.body = BigJSONparser(BigJSONstringifier(result))
	})
	/**
	 * GET /accounts/by-creator/{username}
	 * @summary Accounts by creator
	 * @description Search accounts by their creator.
	 * @tag Accounts
	 * @pathParam {string} username - Username of the creator e.g. mahdiyari
	 * @queryParam {string} [start] - Account name used for pagination
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
	.get('/accounts/by-creator/:username', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getByCreator(username, startId, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/by-recovery/{username}
	 * @summary Accounts by recovery
	 * @description Search accounts by their recovery.
	 * @tag Accounts
	 * @pathParam {string} username - Username of the recovery e.g. mahdiyari
	 * @queryParam {string} [start] - Account name used for pagination
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
	.get('/accounts/by-recovery/:username', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const exists = await userExists(username)
		if (!exists) {
			return ctx.throw(404, `Account ${username} doesn't exist`)
		}
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getByRecovery(username, startId, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/by-key/{key}
	 * @summary Accounts by key
	 * @description Search accounts by their public key (memo, posting, active, and owner)
	 * @tag Accounts
	 * @pathParam {string} key - Public key
	 * e.g. STM5tp5hWbGLL1R3tMVsgYdYxLPyAQFdKoYFbT2hcWUmrU42p1MQC
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/accounts/by-key/:key', async (ctx) => {
		const key = ctx.params.key
		if (!key.startsWith('STM') || key.length !== 53) {
			return ctx.throw(400, 'Bad value for key')
		}
		const result = await getByKey(key)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/by-authority/{username}
	 * @summary Accounts by authority
	 * @description Search accounts by their granted authorities
	 * (posting, active, and owner)
	 * @tag Accounts
	 * @pathParam {string} username - Username of the authority
	 * e.g. mahdiyari
	 * @queryParam {string} [start] - Account name used for pagination
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
	.get('/accounts/by-authority/:username', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const { startId, limit } = await validateStartLimit(ctx, 1000, 100)
		const result = await getByAuthority(username, startId, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})
	/**
	 * GET /accounts/by-proxy/{username}
	 * @summary Accounts by proxy
	 * @description Search accounts by their proxy.
	 * @tag Accounts
	 * @pathParam {string} username - Proxy username e.g. gtg
	 * @response 200 - A JSON array of account names
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {string[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/accounts/by-proxy/:username', async (ctx) => {
		const username = ctx.params.username
		await validateNames(ctx, username, 1)
		const result = await getByProxy(username)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result.join().split(',')),
		)
	})

// The helper functions will release the client to the pool on errors
// Otherwise will need try-catch on every single endpoint to release the client on errors

const getAccounts = async (startId: number, limit: number) => {
	const result = await queryArrayAPI(
		`SELECT name FROM hafsql.accounts WHERE
    id ${limit < 0 && startId !== -1 ? '<$1' : '>$1'}
    ORDER BY id ${limit < 0 ? 'DESC' : 'ASC'}
    LIMIT $2`,
		[startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getByNames = async (namesArray: string[]) => {
	let queryStr = ''
	for (let i = 0; i < namesArray.length; i++) {
		if (i !== 0) {
			queryStr += 'UNION ALL\n'
		}
		queryStr += `SELECT * FROM hafsql.accounts WHERE name=$${i + 1}\n`
	}
	const result = await queryAPI(queryStr, namesArray)
	return result.rows
}

const getByCreator = async (
	username: string,
	startId: number,
	limit: number,
) => {
	const result = await queryArrayAPI(
		`SELECT name FROM hafsql.accounts
        WHERE creator=$1 
        AND ${limit < 0 && startId !== -1 ? 'id < $2' : 'id > $2'}
        ORDER BY id ${limit < 0 ? 'DESC' : 'ASC'}
        LIMIT $3`,
		[username, startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getByRecovery = async (
	username: string,
	startId: number,
	limit: number,
) => {
	const result = await queryArrayAPI(
		`SELECT name FROM hafsql.accounts
        WHERE recovery=$1 AND ${
			limit < 0 && startId !== -1 ? 'id < $2' : 'id > $2'
		}
        ORDER BY id ${limit < 0 ? 'DESC' : 'ASC'}
        LIMIT $3`,
		[username, startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getByKey = async (key: string) => {
	const keyJson = JSON.stringify({ key_auths: [[key]] })
	const result = await queryArrayAPI(
		`SELECT DISTINCT(name) FROM
      (SELECT name, id FROM hafsql.accounts
      WHERE posting @> $1::jsonb
      UNION ALL 
      SELECT name, id FROM hafsql.accounts
      WHERE active @> $1::jsonb
      UNION ALL
      SELECT name, id FROM hafsql.accounts
      WHERE "owner" @> $1::jsonb
      UNION ALL
      SELECT name, id FROM hafsql.accounts
      WHERE memo_key = $2
      ORDER BY id)`,
		[keyJson, key],
	)
	return result.rows
}

const getByAuthority = async (
	username: string,
	startId: number,
	limit: number,
) => {
	const authJson = JSON.stringify({ account_auths: [[username]] })
	const result = await queryArrayAPI(
		`SELECT DISTINCT(name) FROM
        (SELECT name, id FROM hafsql.accounts
        WHERE posting @> $1::jsonb
        OR active @> $1::jsonb
        OR "owner" @> $1::jsonb
        AND ${limit < 0 && startId !== -1 ? 'id < $2' : 'id > $2'}
        ORDER BY id ${limit < 0 ? 'DESC' : 'ASC'}
        LIMIT $3)`,
		[authJson, startId, limit < 0 ? -limit : limit],
	)
	return result.rows
}

const getByProxy = async (username: string) => {
	const result = await queryArrayAPI(
		`SELECT name FROM hafsql.accounts WHERE 
			id IN (SELECT account FROM hafsql.accounts_table WHERE
				proxy=(SELECT id FROM hafd.accounts WHERE name=$1))`,
		[username],
	)
	return result.rows
}
