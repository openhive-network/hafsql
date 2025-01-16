import { Context } from '../../deps.ts'

export const validateLimit = (
	ctx: Context,
	defaultLimit: number,
	max: number,
	min = -max,
): number => {
	const params = ctx.request.url.searchParams
	if (params.has('limit')) {
		const limitStr = params.get('limit')
		if (!limitStr || !Number(limitStr)) {
			return badValueError(ctx, defaultLimit)
		}
		const limitNum = Number(limitStr)
		if (
			isNaN(limitNum) || limitNum > max || limitNum < min ||
			!Number.isInteger(limitNum)
		) {
			return badValueError(ctx, defaultLimit)
		}
		if (limitNum === 0) {
			return ctx.throw(400, 'Limit must be non 0')
		}
		return limitNum
	} else {
		return defaultLimit
	}
}

const badValueError = (ctx: Context, defaultLimit = 100) => {
	ctx.throw(400, `Invalid value for limit - Example: ${defaultLimit}`)
}
