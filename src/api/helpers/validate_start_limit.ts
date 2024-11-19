import { getUserId } from '../../app/helpers/utils/get_user_id.ts'
import { Context } from '../../deps.ts'
import { validateLimit } from './validate_limit.ts'
import { validateNames } from './validate_names.ts'

export const validateStartLimit = async (
  ctx: Context,
  max = 1000,
  defaultLimit = max,
) => {
  const params = ctx.request.url.searchParams
  let startId = -1
  if (params.has('start')) {
    const start = <string> params.get('start')
    await validateNames(ctx, start, 1)
    startId = <number> await getUserId(start)
  }
  let limit = defaultLimit
  if (params.has('limit')) {
    const limitStr = params.get('limit')
    validateLimit(ctx, limitStr, max)
    limit = Number(limitStr)
  }
  return { startId, limit }
}
