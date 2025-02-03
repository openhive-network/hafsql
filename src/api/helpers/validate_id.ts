import { Context } from '../../deps.ts'

export const validateId = (ctx: Context, input: string | null) => {
	// Check if it's a string
	if (typeof input !== 'string' || !input) {
		return ctx.throw(
			400,
			'Bad value provided for id - Example 21474475702750777',
		)
	}
	const intRegex = /^(0|[1-9]\d*)$/
	if (!intRegex.test(input)) {
		return ctx.throw(
			400,
			'Bad value provided for id - Example 21474475702750777',
		)
	}
	try {
		BigInt(input)
		return input
	} catch (_e) {
		return ctx.throw(
			400,
			'Bad value provided for id - Example 21474475702750777',
		)
	}
}
