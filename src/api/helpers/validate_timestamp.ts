import { Context } from '../../deps.ts'

export const validateTimestamp = (ctx: Context, value: string) => {
	if (new Date(value).getTime() > 0) {
		const regex =
			/^(?:(\d{4}-\d{2}-\d{2}(?:T|\s)\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::\d{2})?)?)|(\d{4}-\d{2}-\d{2}))$/

		if (regex.test(value)) {
			return value
		}
	}
	return badValueError(ctx)
}

const badValueError = (ctx: Context) => {
	ctx.throw(
		400,
		`Invalid value for timestamp - Example: '2019-11-21T22:04:30.000Z'`,
	)
}
