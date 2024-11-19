/**
 * Retrun null on valid username string
 */
export const validateAccountName = (value: string) => {
	let i, label, len, suffix
	suffix = 'Account name should '
	if (!value) {
		return suffix + 'not be empty.'
	}
	const length = value.length
	if (length < 3) {
		return suffix + 'be longer.'
	}
	if (length > 16) {
		return suffix + 'be shorter.'
	}
	if (/\./.test(value)) {
		suffix = 'Each account segment should '
	}
	const ref = value.split('.')
	for (i = 0, len = ref.length; i < len; i++) {
		label = ref[i]
		if (!/^[a-z]/.test(label)) {
			return suffix + 'start with a lowercase letter.'
		}
		if (!/^[a-z0-9-]*$/.test(label)) {
			return suffix + 'have only lowercase letters, digits, or dashes.'
		}
		if (!/[a-z0-9]$/.test(label)) {
			return suffix + 'end with a lowercase letter or digit.'
		}
		if (!(label.length >= 3)) {
			return suffix + 'be longer'
		}
	}
	return null
}

/** slice(0,16) */
export const clearUsername = (username: string) => {
	return username.slice(0, 16)
}
