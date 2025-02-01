import { Context } from '../../deps.ts'

export const validatePermlink = (ctx: Context, permlink: string) => {
	const pattern = /^[a-z0-9-]+$/
	if (!permlink || permlink.length < 1 || permlink.length > 256) {
		return badValueError(ctx)
	}
	if (!pattern.test(permlink)) {
		return badValueError(ctx)
	}
	return permlink
}

const badValueError = (ctx: Context) => {
	ctx.throw(400, 'Invalid value provided for permlink')
}
