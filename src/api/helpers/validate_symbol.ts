import { Context } from '../../deps.ts'

const SYMBOLS = ['hive', 'hbd', 'vests', 'hive_savings', 'hbd_savings']

export const validateSymbol = (ctx: Context, symbol: string) => {
  if (!SYMBOLS.includes(symbol)) {
    return ctx.throw(400, `Invalid symbol - Valid symbols are: ${SYMBOLS}`)
  }
}
