import { Context } from '../../deps.ts'
import { validateBlockNum } from './validate_block_num.ts'

/**
 * Throws http error on invalid names
 * @param ctx Oak context
 * @param names List of names separated by `,`
 * @returns Array of validated names
 */
export const validateBlockRange = (
	ctx: Context,
	range: string | null,
) => {
	const patern = /^\d+-\d+$/
	if (!range || range.length < 3 || !patern.test(range)) {
		return badValueError(ctx)
	}
	const rangeArray = range.split('-')
	if (!Array.isArray(rangeArray) || rangeArray.length !== 2) {
		return badValueError(ctx)
	}
	const range1 = validateBlockNum(ctx, rangeArray[0])
	const range2 = validateBlockNum(ctx, rangeArray[1])
	if (range2 - range1 < 0) {
		return ctx.throw(400, `Range2 - Range1 must be >= 0`)
	}
	return [range1, range2]
}

const badValueError = (ctx: Context) => {
	ctx.throw(
		400,
		'Invalid value provided for a block range - Example: 5000000-5000100',
	)
}
