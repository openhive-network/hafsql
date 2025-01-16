import { Router } from '../deps.ts'
import { scalar } from './ui/scalar.ts'
import { accountsAPI } from './routes/accounts_api.ts'
import { balancesAPI } from './routes/balances_api.ts'
import { followsAPI } from './routes/follows_api.ts'
import { mutesAPI } from './routes/mutes_api.ts'
import { blacklistsAPI } from './routes/blacklists_api.ts'
import { delegationsAPI } from './routes/delegations_api.ts'

export const apiRouter = new Router()

apiRouter.use(
	scalar.routes(),
	accountsAPI.routes(),
	balancesAPI.routes(),
	followsAPI.routes(),
	mutesAPI.routes(),
	blacklistsAPI.routes(),
	delegationsAPI.routes(),
)
