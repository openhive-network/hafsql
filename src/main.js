import { config } from 'dotenv'
import {
  fillDelegations,
  syncDelegations
} from '../helpers/syncs/delegations.js'
import {
  fillRCDelegations,
  syncRCDelegations
} from '../helpers/syncs/rcDelegations.js'
import {
  fillProposalApprovals,
  syncProposalApprovals
} from '../helpers/syncs/proposalApprovals.js'
import { fillFollows, syncFollows } from '../helpers/syncs/follows.js'
import { fillComments, syncComments } from '../helpers/syncs/comments.js'
import { fillRewards, syncRewards } from '../helpers/syncs/rewards.js'
import { fillReblogs, syncReblogs } from '../helpers/syncs/reblogs.js'
import { fillCommunities, syncCommunities } from '../helpers/syncs/communities.js'
import { setup } from './setup.js'
config()

const main = async () => {
  await setup()
  const now = Date.now()
  console.log('Syncing delegations...')
  await fillDelegations()

  console.log('Syncing RC delegations...')
  await fillRCDelegations()

  console.log('Syncing proposals...')
  await fillProposalApprovals()

  console.log('Syncing follows, mutes, blacklists, etc...')
  await fillFollows()

  console.log('Syncing comments...')
  await fillComments()

  console.log('Syncing rewards...')
  await fillRewards()

  console.log('Syncing reblogs...')
  await fillReblogs()

  console.log('Syncing communities...')
  await fillCommunities()

  const timeSpent = (Date.now() - now) / 1000
  console.log(
    'Sync done in ' + timeSpent / 60 + ' minutes. Live sync starting...'
  )
  syncDelegations()
  syncRCDelegations()
  syncProposalApprovals()
  syncFollows()
  syncComments()
  syncRewards()
  syncReblogs()
  syncCommunities()

  console.log('Live sync ready and running.')
}

main()
