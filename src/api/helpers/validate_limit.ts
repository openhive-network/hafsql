import { Context } from '../../deps.ts'

export const validateLimit = (
  ctx: Context,
  limitStr: string | null,
  max: number,
  min = -max,
): void => {
  if (!limitStr || !Number(limitStr)) {
    return badValueError(ctx)
  }
  const limitNum = Number(limitStr)
  if (
    isNaN(limitNum) || limitNum > max || limitNum < min ||
    !Number.isInteger(limitNum)
  ) {
    return badValueError(ctx)
  }
  if (limitNum === 0) {
    return ctx.throw(400, 'Limit must be non 0')
  }
}

const badValueError = (ctx: Context) => {
  ctx.throw(400, 'Invalid value for limit - Example: 100')
}
