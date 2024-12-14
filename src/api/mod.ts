import { Router } from '../deps.ts'
import { scalar } from './ui/scalar.ts'
import { accountsAPI } from './routes/accounts_api.ts'
import { balancesAPI } from './routes/balances_api.ts'
import { followsAPI } from './routes/follows.ts'
import { mutesAPI } from './routes/mutes.ts'
import { blacklistsAPI } from './routes/blacklists.ts'

export const apiRouter = new Router()

apiRouter.use(
  scalar.routes(),
  accountsAPI.routes(),
  balancesAPI.routes(),
  followsAPI.routes(),
  mutesAPI.routes(),
  blacklistsAPI.routes(),
)
