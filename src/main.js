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
config()

const main = async () => {
  const now = Date.now()
  console.log('Syncing old data...')
  await fillDelegations()

  console.log('Syncing old RC data...')
  await fillRCDelegations()

  console.log('Syncing old ProposalApprovals data...')
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
    'Sync done in ' + timeSpent / 60 + ' minutes. Live sync started...'
  )
  syncDelegations()
  syncRCDelegations()
  syncProposalApprovals()
  syncFollows()
  syncComments()
  syncRewards()
  syncReblogs()
  syncCommunities()
}

main()
