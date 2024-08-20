import { pool } from '../database.ts'
import { clearUsername } from './validate_username.ts'

let accountCache: Record<string, number> = {}

const clearCache = () => {
  accountCache = {}
}
// every 10min clear cache
setInterval(() => clearCache(), 600000)

// Caching ids for duration of the sync
export const getUserId = async (username: string) => {
  username = clearUsername(username)
  if (Object.hasOwn(accountCache, username)) {
    return accountCache[username]
  } else {
    using client = await pool.connect()
    const getId = await client.queryObject<{ id: number }>(
      'SELECT a.id FROM hive.accounts a WHERE a.name=$1',
      [username],
    )
    if (getId.rows.length < 1) {
      return null
    }
    const id = getId.rows[0].id
    accountCache[username] = id
    return id
  }
}
