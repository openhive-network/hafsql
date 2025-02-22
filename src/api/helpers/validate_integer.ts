import { Context } from '../../deps.ts'

export const validateInteger = (
	ctx: Context,
	input: string | number | null,
	defaultInteger: number,
	max: number,
	min = -max,
): number => {
	if (!input) {
		return defaultInteger
	}
	if (isNaN(Number(input)) || !Number.isInteger(Number(input))) {
		return ctx.throw(
			400,
			`Invalid value for integer - Example: ${defaultInteger}`,
		)
	}
	const numInt = Number(input)
	if (numInt < min || numInt > max) {
		return ctx.throw(400, `Integer out of range ${min}:${max}`)
	}
	return numInt
}
