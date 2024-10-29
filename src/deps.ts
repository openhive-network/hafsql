export {
  Pool,
  PoolClient,
  Transaction,
} from 'https://deno.land/x/postgres@v0.19.3/mod.ts'
export { load as loadDotEnv } from 'https://deno.land/std@0.224.0/dotenv/mod.ts'
export { BigDenary } from 'https://deno.land/x/bigdenary@1.0.0/mod.ts'
export {
  Application,
  isHttpError,
  Router,
  Status,
  STATUS_TEXT,
} from 'jsr:@oak/oak@^17'
// export { Controller, DanetApplication, Get } from 'jsr:@danet/core@^2'
export { default as swaggerJsDoc } from 'npm:swagger-jsdoc@6.2.8'
export { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts'

// @deno-types="npm:@types/diff-match-patch@1.0.36"
import diff_match_patch from 'npm:diff-match-patch@1.0.5'
// @deno-types="npm:@types/json-bigint@1.0.4"
import JSONbig from 'npm:json-bigint@1.0.0'

export const DiffMatchPatch = diff_match_patch
export const JSONBigInt = JSONbig
