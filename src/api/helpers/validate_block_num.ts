import { Context } from '../../deps.ts'

export const validateBlockNum = (
	ctx: Context,
	blockNum: string | null,
	allowZero = false,
) => {
	if (!blockNum) {
		return badValueError(ctx)
	}
	const num = Number(blockNum)
	if (
		isNaN(num) || num < (allowZero ? 0 : 1) || num > 2147483647 ||
		!Number.isInteger(num)
	) {
		return badValueError(ctx)
	}
	return num
}

const badValueError = (ctx: Context) => {
	ctx.throw(400, 'Invalid value for block_num - Example: 5000000')
}
