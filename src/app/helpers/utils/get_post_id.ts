import { query } from '../database.ts'

let postCache: Record<string, number> = {}

const clearCache = () => {
	postCache = {}
}
// every 10min clear cache
setInterval(() => clearCache(), 600000)

export const getPostId = async (author: string, permlink: string) => {
	const postString = author + ';' + permlink
	if (Object.hasOwn(postCache, postString)) {
		return postCache[postString]
	} else {
		const idQ = await query<{ id: number }>(
			'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
			[author, permlink],
		)
		if (idQ.rows.length < 1) {
			return null
		}
		const id = idQ.rows[0].id
		postCache[postString] = id
		return id
	}
}
