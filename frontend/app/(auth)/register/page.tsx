'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useId, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { initAccount, lookupSetupToken } from '@/lib/auth'
import {
	getPasswordPolicyError,
	PASSWORD_POLICY_SUMMARY
} from '@/lib/password-policy'

function friendlyTokenError(message: string): string {
	const normalized = message.toLowerCase()
	switch (normalized) {
		case 'invalid setup token':
			return 'Dieser Einrichtungslink ist ungültig.'
		case 'setup token expired':
			return 'Dieser Einrichtungslink ist abgelaufen.'
		case 'account already initialized':
			return 'Dieses Konto wurde bereits eingerichtet.'
		default:
			return message
	}
}

function RegisterForm({ token }: { token: string }) {
	const router = useRouter()
	const emailId = useId()
	const passwordId = useId()
	const password2Id = useId()
	const [clubName, setClubName] = useState<string | null>(null)
	const [tokenStatus, setTokenStatus] = useState<
		'idle' | 'loading' | 'valid' | 'invalid'
	>(token ? 'loading' : 'idle')
	const [tokenError, setTokenError] = useState<string | null>(null)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const passwordPolicyError = password ? getPasswordPolicyError(password) : null
	const passwordsMismatch = password2.length > 0 && password !== password2
	const submitDisabled =
		loading ||
		tokenStatus !== 'valid' ||
		Boolean(passwordPolicyError) ||
		passwordsMismatch

	useEffect(() => {
		if (!token) {
			setTokenStatus('idle')
			setClubName(null)
			setTokenError(null)
			return
		}

		let cancelled = false
		setTokenStatus('loading')
		setTokenError(null)
		setClubName(null)

		lookupSetupToken(token)
			.then((data) => {
				if (cancelled) return
				setClubName(data.organizer_name)
				setTokenStatus('valid')
			})
			.catch((err) => {
				if (cancelled) return
				const rawMessage =
					err instanceof Error
						? err.message
						: 'Einrichtungstoken ist ungültig oder abgelaufen'
				setTokenError(friendlyTokenError(rawMessage))
				setTokenStatus('invalid')
			})

		return () => {
			cancelled = true
		}
	}, [token])

	if (!token) {
		return (
			<div className="min-h-screen w-full flex flex-col">
				<div className="flex-1 grid place-items-center p-6">
					<Card className="w-full max-w-sm shadow-lg">
						<CardHeader>
							<CardTitle className="text-center">
								Einrichtungslink fehlt
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Alert className="mb-4">
								<AlertDescription>
									Diesem Einrichtungslink fehlt ein Token. Bitte verwende den
									Einladungslink, den du erhalten hast.
								</AlertDescription>
							</Alert>
							<div className="flex justify-center">
								<Button asChild>
									<Link href="/login">Zum Login</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
				{/* Footer */}
				<footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
					<span>© {new Date().getFullYear()} Neuland Ingolstadt e.V.</span>
					<span>•</span>
					<Link href="/imprint" className="hover:underline">
						Impressum
					</Link>
					<span>•</span>
					<Link href="/privacy" className="hover:underline">
						Datenschutz
					</Link>
					<span>•</span>
					<Link href="https://studver.thi.de" className="hover:underline">
						StudVer
					</Link>
				</footer>
			</div>
		)
	}

	if (tokenStatus === 'invalid') {
		return (
			<div className="min-h-screen w-full flex flex-col">
				<div className="flex-1 grid place-items-center p-6">
					<Card className="w-full max-w-sm shadow-lg">
						<CardHeader>
							<CardTitle className="text-center">Einladung ungültig</CardTitle>
						</CardHeader>
						<CardContent>
							<Alert variant="destructive" className="mb-4">
								<AlertDescription>
									{tokenError ??
										'Dieser Einrichtungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'}
								</AlertDescription>
							</Alert>
							<div className="flex justify-center">
								<Button asChild>
									<Link href="/login">Zum Login</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
				{/* Footer */}
				<footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
					<span>© {new Date().getFullYear()} Neuland Ingolstadt e.V.</span>
					<span>•</span>
					<Link href="/imprint" className="hover:underline">
						Impressum
					</Link>
					<span>•</span>
					<Link href="/privacy" className="hover:underline">
						Datenschutz
					</Link>
					<span>•</span>
					<Link href="https://studver.thi.de" className="hover:underline">
						StudVer
					</Link>
				</footer>
			</div>
		)
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		if (!token) {
			setError('Einrichtungstoken fehlt')
			return
		}
		if (passwordPolicyError) {
			setError(passwordPolicyError)
			return
		}
		if (password !== password2) {
			setError('Passwörter stimmen nicht überein')
			return
		}
		if (tokenStatus !== 'valid') {
			const message =
				tokenStatus === 'loading'
					? 'Einrichtungstoken wird noch geprüft.'
					: (tokenError ?? 'Einrichtungstoken ist ungültig.')
			setError(message)
			return
		}
		setLoading(true)
		try {
			await initAccount({ token, email, password })
			router.push('/')
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : 'Einrichtung fehlgeschlagen'
			setError(message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<TooltipProvider>
			<div className="min-h-screen w-full flex flex-col">
				<div className="flex-1 grid lg:grid-cols-2">
					{/* Left side - Welcome section (hidden on small screens) */}
					{tokenStatus === 'valid' && clubName && (
						<div className="hidden lg:block relative bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20">
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="max-w-md px-10 text-center">
									<h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">
										Willkommen
									</h1>
									<p className="mt-2 text-3xl font-semibold text-blue-700 dark:text-blue-300">
										{clubName}
									</p>
									<p className="mt-4 text-muted-foreground">
										Richte dein Konto ein, um deinen Verein zu verwalten.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Right side - Form */}
					<div className="flex items-center justify-center p-6">
						<Card className="w-full max-w-sm shadow-lg">
							<CardHeader className="text-center">
								<CardTitle>Richte dein Konto ein</CardTitle>
								{/* Show welcome section on small screens */}
								{tokenStatus === 'valid' && clubName && (
									<div className="lg:hidden mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
										<div className="flex items-center justify-center gap-2">
											<p className="text-sm font-medium text-blue-700 dark:text-blue-300">
												Willkommen
											</p>
										</div>
										<p className="text-lg font-semibold text-blue-900 dark:text-blue-100 mt-1">
											{clubName}
										</p>
									</div>
								)}
							</CardHeader>
							<CardContent>
								{tokenStatus === 'loading' && (
									<Alert className="mb-4">
										<AlertDescription>
											Einrichtungstoken wird geprüft...
										</AlertDescription>
									</Alert>
								)}
								{error && (
									<Alert variant="destructive" className="mb-4">
										<AlertDescription>{error}</AlertDescription>
									</Alert>
								)}
								<form className="space-y-4" onSubmit={onSubmit}>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Label htmlFor={emailId}>E-Mail</Label>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
													>
														?
													</button>
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-xs">
													<p className="text-sm">
														Gib deine offizielle E-Mail-Adresse für den Verein
														ein. Sie muss nicht mit der E-Mail übereinstimmen,
														über die du den Einladungslink erhalten hast.
													</p>
												</TooltipContent>
											</Tooltip>
										</div>
										<Input
											id={emailId}
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="you@university.edu"
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor={passwordId}>Passwort</Label>
										<Input
											id={passwordId}
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											required
										/>
										<p className="text-xs text-muted-foreground">
											{PASSWORD_POLICY_SUMMARY}
										</p>
										{password.length > 0 && passwordPolicyError && (
											<p className="text-xs text-destructive">
												{passwordPolicyError}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor={password2Id}>Passwort bestätigen</Label>
										<Input
											id={password2Id}
											type="password"
											value={password2}
											onChange={(e) => setPassword2(e.target.value)}
											placeholder="••••••••"
											required
										/>
										{passwordsMismatch && (
											<p className="text-xs text-destructive">
												Passwörter stimmen nicht überein
											</p>
										)}
									</div>
									<Button
										type="submit"
										className="w-full"
										disabled={submitDisabled}
									>
										{loading
											? 'Einrichtung läuft...'
											: tokenStatus === 'loading'
												? 'Einladung wird geprüft...'
												: 'Konto erstellen'}
									</Button>
									<p className="text-xs text-muted-foreground mt-2">
										Dieser Link ist nur für eine einmalige Einrichtung gültig.
									</p>
								</form>
							</CardContent>
						</Card>
					</div>
				</div>
				{/* Footer */}
				<footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
					<span>© {new Date().getFullYear()} Neuland Ingolstadt e.V.</span>
					<span>•</span>
					<Link href="/imprint" className="hover:underline">
						Impressum
					</Link>
					<span>•</span>
					<Link href="/privacy" className="hover:underline">
						Datenschutz
					</Link>
					<span>•</span>
					<Link href="https://studver.thi.de" className="hover:underline">
						StudVer
					</Link>
				</footer>
			</div>
		</TooltipProvider>
	)
}

function RegisterWithTokenPage() {
	const search = useSearchParams()
	const token = search.get('token') || ''

	return <RegisterForm token={token} />
}

export default function RegisterPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen w-full flex flex-col">
					<div className="flex-1 grid place-items-center p-6">
						<Card className="w-full max-w-sm shadow-lg">
							<CardHeader>
								<CardTitle className="text-center">Lädt...</CardTitle>
							</CardHeader>
							<CardContent>
								<Alert className="mb-4">
									<AlertDescription>
										Einrichtungslink wird geladen...
									</AlertDescription>
								</Alert>
							</CardContent>
						</Card>
					</div>
					{/* Footer */}
					<footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
						<span>© {new Date().getFullYear()} Neuland Ingolstadt e.V.</span>
						<span>•</span>
						<Link href="/imprint" className="hover:underline">
							Impressum
						</Link>
						<span>•</span>
						<Link href="/privacy" className="hover:underline">
							Datenschutz
						</Link>
						<span>•</span>
						<Link href="https://studver.thi.de" className="hover:underline">
							StudVer
						</Link>
					</footer>
				</div>
			}
		>
			<RegisterWithTokenPage />
		</Suspense>
	)
}
