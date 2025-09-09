// All external dependencies go here for easier maintenance

// @deno-types="npm:@types/pg"
import pg from 'npm:pg'
export const Pool = pg.Pool
export const Client = pg.Client
export type { PoolClient } from 'npm:pg'
export type {
	Pool as PoolType,
	QueryArrayConfig,
	QueryArrayResult,
	QueryResultRow,
} from 'npm:@types/pg'

import '@std/dotenv/load'
// export { BigDenary } from 'https://deno.land/x/bigdenary@1.0.0/mod.ts'
// @deno-types="https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/big.js/index.d.ts"
export { Big } from 'big.js'
export {
	Application,
	Context,
	isHttpError,
	Router,
	Status,
	STATUS_TEXT,
} from '@oak/oak'
export { oakCors } from '@tajpouria/cors'
import openapi, { ParserOptions } from 'oa-parser'
// import openapi, { ParserOptions } from 'openapi-comment-parser'

// @deno-types="npm:@types/diff-match-patch@1.0.36"
import diff_match_patch from 'diff-match-patch'
// @deno-types="npm:@types/json-bigint@1.0.4"
import JSONbig from 'json-bigint'

export const DiffMatchPatch = diff_match_patch
export const BigJSONparser = JSONbig({ storeAsString: true }).parse
export const BigJSONstringifier = JSONbig({ storeAsString: true }).stringify
export const openApi = openapi
export type ApiParserOptions = ParserOptions
