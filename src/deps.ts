// All external dependencies go here for easier maintenance

export {
  Pool,
  PoolClient,
  Transaction,
} from 'https://deno.land/x/postgres@v0.19.3/mod.ts'
export { load as loadDotEnv } from '@std/dotenv'
export { BigDenary } from 'https://deno.land/x/bigdenary@1.0.0/mod.ts'
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
