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
import { createLastIndexes } from '../helpers/setups/tables.js'
import { fillDeleteComments, syncDeleteComments } from '../helpers/syncs/deleteComments.js'
import { fillReputations, syncReputations } from '../helpers/syncs/reputations.js'
import { pool } from '../helpers/database.js'
config()

const main = async () => {
  await setup()
  const now = Date.now()

  await fillings()

  // Indexes
  console.log('Creating related indexes...')
  await createLastIndexes()

  const timeSpent = (Date.now() - now) / 1000
  console.log(
    'Sync done in ' + timeSpent / 60 + ' minutes. Live sync starting...'
  )

  startSyncing()

  console.log('Live sync ready and running.')
}

const fillings = async () => {
  if (process.env.DELEGATIONS !== 'false') {
    console.log('Syncing delegations...')
    await fillDelegations()
  }

  if (process.env.RCDELEGATIONS !== 'false') {
    console.log('Syncing RC delegations...')
    await fillRCDelegations()
  }

  if (process.env.PROPOSALS !== 'false') {
    console.log('Syncing proposals...')
    await fillProposalApprovals()
  }

  if (process.env.FOLLOWS !== 'false') {
    console.log('Syncing follows, mutes, blacklists, ...')
    await fillFollows()
  }

  if (process.env.COMMUNITIES !== 'false') {
    console.log('Syncing communities...')
    await fillCommunities()
  }

  if (process.env.COMMENTS !== 'false') {
    console.log('Syncing comments...')
    await fillComments()

    console.log('Syncing deleted comments...')
    await fillDeleteComments()

    console.log('Syncing rewards...')
    await fillRewards()

    console.log('Syncing reblogs...')
    await fillReblogs()

    if (process.env.REPUTATIONS !== 'false') {
      console.log('Syncing reputations...')
      await fillReputations()
    }
  }
}

const startSyncing = async () => {
  if (process.env.DELEGATIONS !== 'false') {
    syncDelegations()
  }

  if (process.env.RCDELEGATIONS !== 'false') {
    syncRCDelegations()
  }

  if (process.env.PROPOSALS !== 'false') {
    syncProposalApprovals()
  }

  if (process.env.FOLLOWS !== 'false') {
    syncFollows()
  }

  if (process.env.COMMUNITIES !== 'false') {
    syncCommunities()
  }

  if (process.env.COMMENTS !== 'false') {
    syncComments()
    syncDeleteComments()
    syncRewards()
    syncReblogs()
    if (process.env.REPUTATIONS !== 'false') {
      syncReputations()
    }
  }
}

let gs = false
const gracefulShutdown = async () => {
  if (gs) {
    return
  }
  gs = true
  console.info('Shutting down... a moment please.')
  await pool.end()
  console.log('Postgresql pool drained.')
  process.exit()
}
process.on('SIGTERM', () => gracefulShutdown())
process.on('SIGINT', () => gracefulShutdown())

main()
