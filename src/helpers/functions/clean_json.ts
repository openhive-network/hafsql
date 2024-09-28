import { cleanString } from './clean_string.ts'

export const cleanJson = (str: string): object => {
  return safeToJson(cleanString(str))
}

const safeToJson = (str: string) => {
  try {
    return JSON.parse(str)
  } catch (_e) {
    return {}
  }
}
