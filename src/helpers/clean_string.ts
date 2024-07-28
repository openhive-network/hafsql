// Charcode 0 is invalid for Postgres
export const cleanString = (input: string) => {
  let output = ''
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) !== 0) {
      output += input.charAt(i)
    }
  }
  return output
}
