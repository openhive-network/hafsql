import { Context } from '../../deps.ts'

/**
 * Validate the name of the url search parameters of the request
 */
export const validateSearchParams = (
  ctx: Context,
  validKeys: string[],
  required = true,
): void => {
  const params = ctx.request.url.searchParams
  if (required && params.size === 0) {
    return ctx.throw(400, `Valid parameters: ${validKeys}`)
  }
  let hasAny = false
  const keys = params.keys()
  for (const key of keys) {
    if (!validKeys.includes(key)) {
      return ctx.throw(
        400,
        `Unkown Parameter ${key} - Valid parameters: ${validKeys}`,
      )
    } else {
      hasAny = true
    }
  }
  if (required && !hasAny) {
    return ctx.throw(400, `Valid parameters: ${validKeys}`)
  }
}
