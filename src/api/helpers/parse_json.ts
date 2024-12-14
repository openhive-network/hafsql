export const parseJson = (
  str: string,
  type: 'array' | 'object' = 'object',
): object => {
  try {
    const result = JSON.parse(str)
    if (typeof result !== 'object') {
      return type === 'object' ? {} : []
    }
    return result
  } catch (_e) {
    return type === 'object' ? {} : []
  }
}
