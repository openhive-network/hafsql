const time = () => {
	return new Date().toISOString()
}

/**
 * Print the message with current timestamp
 */
export const print = (message: string) => {
	console.log(time(), message)
}
