import { Context } from '../../deps.ts'
import { opId } from '../../app/helpers/operation_id.ts'

/**
 * Throws http error on invalid types
 * @param ctx Oak context
 * @param types List of types separated by `,`
 * @returns Array of validated types
 */
export const validateTypes = (
	ctx: Context,
	types: string | null,
	maxItems = 100,
): string[] => {
	if (!types || types.length < 2) {
		return badValueError(ctx)
	}
	const typesArray = types.split(',')
	if (!Array.isArray(typesArray) || typesArray.length === 0) {
		return badValueError(ctx)
	}
	if (typesArray.length > maxItems) {
		return ctx.throw(400, `Max ${maxItems} types`)
	}
	for (const i in typesArray) {
		const type = typesArray[i].trim()
		if (!Object.hasOwn(opId, type)) {
			return badValueError(ctx)
		}
		typesArray[i] = type
	}
	return typesArray
}

const badValueError = (ctx: Context) => {
	ctx.throw(
		400,
		'Invalid value provided for an operation type - Example: transfer',
	)
}
