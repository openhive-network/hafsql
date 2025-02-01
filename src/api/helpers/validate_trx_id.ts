import { Context } from '../../deps.ts'

export const validateTrxId = (ctx: Context, value: string) => {
	const pattern = /^[0-9a-fA-F]{40}$/
	if (!pattern.test(value)) {
		return badValueError(ctx)
	}
	return value
}

const badValueError = (ctx: Context) => {
	ctx.throw(
		400,
		`Invalid value for trx_id - Example: '973290d26bac31335c000c7a3d3fe058ce3dbb9f'`,
	)
}
