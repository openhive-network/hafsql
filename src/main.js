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

  const timeSpent = (Date.now() - now) / 1000
  console.log(
    'Sync done in ' + timeSpent / 60 + ' minutes. Live sync started...'
  )
  syncDelegations()
  syncRCDelegations()
  syncProposalApprovals()
  // syncFollows()
}

main()
// ["delegate_rc",{"from":"mahdiyari","delegatees":["gtg"],"max_rc":1800000000}]

// fillDelegations()

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":["gtg"],"what":["blacklist"]}]

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":["unblacklist"]}]

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":["gtg"],"what":["follow_blacklist"]}]

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":["unfollow_blacklist"]}]

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":["gtg"],"what":["follow_muted"]}]

// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":["unfollow_muted"]}]

// follow
// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":["blog"]}]

// unfollow
// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":[]}]

// reblog
// required_posting_auths
// 0. mahdiyari
// id follow
// json ["reblog",{"account":"mahdiyari","author":"gtg","permlink":"time-for-updates-v1-27-4-is-here"}]

// remove reblog
// required_posting_auths
// 0. mahdiyari
// id reblog
// json ["reblog",{"account":"mahdiyari","author":"gtg","permlink":"time-for-updates-v1-27-4-is-here","delete":"delete"}]

// mute
// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":["ignore"]}]

// unmute
// required_posting_auths
// 0. mahdiyari
// id follow
// json ["follow",{"follower":"mahdiyari","following":"gtg","what":[]}]

// ogechukwu-martha

// id follow
// json ["follow",{"follower":"labrat","following":"all","what":["reset_follow_muted_list"]}]

// id	follow
// json	["follow",{"follower":"labrat","following":"all","what":["reset_follow_blacklist"]}]

// id	follow
// json	["follow",{"follower":"labrat","following":"all","what":["reset_muted_list"]}]

// id	follow
// json	["follow",{"follower":"labrat","following":"all","what":["reset_blacklist"]}]
