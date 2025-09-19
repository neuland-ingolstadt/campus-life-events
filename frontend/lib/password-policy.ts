const COMMON_PASSWORD_FRAGMENTS = [
	'password',
	'123456',
	'password123',
	'admin',
	'qwerty',
	'letmein',
	'welcome',
	'monkey',
	'dragon',
	'master',
	'sunshine',
	'princess'
]

export const PASSWORD_MIN_LENGTH = 20
export const PASSWORD_MIN_ENTROPY = 60

export function estimatePasswordEntropy(password: string): number {
	let charsetSize = 0
	if (/[a-z]/.test(password)) charsetSize += 26
	if (/[A-Z]/.test(password)) charsetSize += 26
	if (/[0-9]/.test(password)) charsetSize += 10
	if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32

	if (charsetSize === 0) return 0
	return password.length * Math.log2(charsetSize)
}

export function getPasswordPolicyError(password: string): string | null {
	if (password.length < PASSWORD_MIN_LENGTH) {
		return `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`
	}
	if (!/[a-z]/.test(password)) {
		return 'Passwort muss mindestens einen Kleinbuchstaben enthalten'
	}
	if (!/[A-Z]/.test(password)) {
		return 'Passwort muss mindestens einen Großbuchstaben enthalten'
	}
	if (!/[0-9]/.test(password)) {
		return 'Passwort muss mindestens eine Zahl enthalten'
	}
	if (!/[^A-Za-z0-9]/.test(password)) {
		return 'Passwort muss mindestens ein Symbol enthalten'
	}

	const lower = password.toLowerCase()
	if (COMMON_PASSWORD_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
		return 'Passwort ist zu verbreitet oder vorhersehbar'
	}

	if (estimatePasswordEntropy(password) < PASSWORD_MIN_ENTROPY) {
		return `Passwort muss mindestens ${PASSWORD_MIN_ENTROPY} Bit Entropie erreichen`
	}

	return null
}

export const PASSWORD_POLICY_SUMMARY =
	'Mindestens 20 Zeichen sowie Groß- und Kleinbuchstaben, Zahl und Symbol. Vermeide häufige oder vorhersehbare Begriffe.'
