import { Context } from '../../deps.ts'
import { userExists } from './user_exists.ts'

/**
 * Throws http error on invalid names
 * @param ctx Oak context
 * @param names List of names separated by `,`
 * @returns Array of validated names
 */
export const validateNames = async (
  ctx: Context,
  names: string | null,
  maxItems = 100,
): Promise<string[]> => {
  if (!names || names.length < 3) {
    return badValueError(ctx)
  }
  const namesArray = names.split(',')
  if (!Array.isArray(namesArray) || namesArray.length === 0) {
    return badValueError(ctx)
  }
  if (namesArray.length > maxItems) {
    return ctx.throw(400, `Max ${maxItems} usernames`)
  }
  for (const i in namesArray) {
    const username = namesArray[i].trim()
    if (validateHiveName(username)) {
      return badValueError(ctx)
    }
    if (!await userExists(username)) {
      return ctx.throw(404, `Account ${username} doesn't exist`)
    }
    namesArray[i] = username
  }
  return namesArray
}

const badValueError = (ctx: Context) => {
  ctx.throw(400, 'Invalid value provided for a username - Example: mahdiyari')
}

const validateHiveName = (username: string) => {
  let suffix = 'Account name should '
  if (!username || typeof username !== 'string') {
    return suffix + 'not be empty.'
  }
  const length = username.length
  if (length < 3) {
    return suffix + 'be longer.'
  }
  if (length > 16) {
    return suffix + 'be shorter.'
  }
  if (/\./.test(username)) {
    suffix = 'Each account segment should '
  }
  const ref = username.split('.')
  const len = ref.length
  for (let i = 0; i < len; i++) {
    const label = ref[i]
    if (!/^[a-z]/.test(label)) {
      return suffix + 'start with a lowercase letter.'
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      return suffix + 'have only lowercase letters, digits, or dashes.'
    }
    if (!/[a-z0-9]$/.test(label)) {
      return suffix + 'end with a lowercase letter or digit.'
    }
    if (!(label.length >= 3)) {
      return suffix + 'be longer'
    }
  }
  return null
}
