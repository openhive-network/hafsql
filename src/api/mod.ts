import { Router } from '../deps.ts'
import { scalar } from './ui/scalar.ts'
import { accountsAPI } from './routes/accounts_api.ts'
import { balancesAPI } from './routes/balances_api.ts'
import { followsAPI } from './routes/follows_api.ts'
import { mutesAPI } from './routes/mutes_api.ts'
import { blacklistsAPI } from './routes/blacklists_api.ts'
import { delegationsAPI } from './routes/delegations_api.ts'
import { chainAPI } from './routes/chain_api.ts'
import { proposalsAPI } from './routes/proposals_api.ts'
import { communitiesAPI } from './routes/communities_api.ts'
import { reputationsAPI } from './routes/reputations_api.ts'
import { operationsAPI } from './routes/operations_api.ts'
import { commentsAPI } from './routes/comments_api.ts'
import { marketAPI } from './routes/market_api.ts'

export const apiRouter = new Router()

apiRouter.use(
	scalar.routes(),
	accountsAPI.routes(),
	balancesAPI.routes(),
	followsAPI.routes(),
	mutesAPI.routes(),
	blacklistsAPI.routes(),
	delegationsAPI.routes(),
	chainAPI.routes(),
	proposalsAPI.routes(),
	communitiesAPI.routes(),
	reputationsAPI.routes(),
	operationsAPI.routes(),
	commentsAPI.routes(),
	marketAPI.routes(),
)
