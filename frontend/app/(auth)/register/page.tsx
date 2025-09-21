'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useId, useState } from 'react'
import Beams from '@/components/Beams'
import NeulandPalm from '@/components/neuland-palm'
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
import { UnifiedFooter } from '@/components/unified-footer'
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
				setClubName(data.account_name)
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
				<div className="lg:hidden flex  p-4 bg-neutral-100 dark:bg-[#010101] border-b">
					<div className="flex items-center gap-3">
						<NeulandPalm className="h-8 w-8" color="currentColor" />
						<div className="flex flex-col">
							<h1 className="text-lg font-semibold">Campus Life Events</h1>
							<p className="text-xs text-muted-foreground">
								made by Neuland for StudVer at THI
							</p>
						</div>
					</div>
				</div>
				<div className="flex-1 grid lg:grid-cols-2">
					<div className="hidden lg:block relative">
						<div className="absolute inset-0">
							<Beams
								beamWidth={2}
								beamHeight={15}
								beamNumber={12}
								lightColor="#ffffff"
								speed={2}
								noiseIntensity={1.75}
								scale={0.2}
								rotation={30}
							/>
						</div>
						<div className="absolute inset-0 flex items-center justify-center rounded-2xl">
							<Card className="max-w-md mx-10 shadow-lg bg-background/50 backdrop-blur-sm border-border/50 rounded-2xl p-6 dark">
								<CardContent className="p-6 text-center flex flex-col items-center justify-center">
									<NeulandPalm
										className="h-20 w-20 mb-6"
										color="currentColor"
									/>
									<h1 className="text-4xl font-bold text-primary">
										Campus Life Events
									</h1>
									<p className="mt-4 text-sm text-foreground/90 font-medium">
										made by Neuland for StudVer at THI
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
					<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
						<Card className="w-full max-w-sm shadow-lg">
							<CardHeader>
								<CardTitle className="text-center text-xl">
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
				</div>
				<UnifiedFooter variant="auth" showThemeToggle />
			</div>
		)
	}

	if (tokenStatus === 'invalid') {
		return (
			<div className="min-h-screen w-full flex flex-col">
				<div className="lg:hidden flex items-center justify-center p-4 bg-neutral-100 dark:bg-[#010101] border-b">
					<div className="flex items-center gap-3">
						<NeulandPalm className="h-8 w-8" color="currentColor" />
						<h1 className="text-xl font-bold">Campus Life Events</h1>
					</div>
				</div>
				<div className="flex-1 grid lg:grid-cols-2">
					<div className="hidden lg:block relative">
						<div className="absolute inset-0">
							<Beams
								beamWidth={2}
								beamHeight={15}
								beamNumber={12}
								lightColor="#ffffff"
								speed={2}
								noiseIntensity={1.75}
								scale={0.2}
								rotation={30}
							/>
						</div>
						<div className="absolute inset-0 flex items-center justify-center rounded-2xl">
							<Card className="max-w-md mx-10 shadow-lg bg-background/50 backdrop-blur-sm border-border/50 rounded-2xl p-6 dark">
								<CardContent className="p-6 text-center flex flex-col items-center justify-center">
									<NeulandPalm
										className="h-20 w-20 mb-6"
										color="currentColor"
									/>
									<h1 className="text-4xl font-bold text-primary">
										Campus Life Events
									</h1>
									<p className="mt-4 text-sm text-foreground/90 font-medium">
										made by Neuland for StudVer at THI
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
					<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
						<Card className="w-full max-w-sm shadow-lg">
							<CardHeader>
								<CardTitle className="text-center text-xl">
									Einladung ungültig
								</CardTitle>
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
				</div>
				<UnifiedFooter variant="auth" showThemeToggle />
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
				<div className="lg:hidden flex items-center justify-center p-4 bg-neutral-100 dark:bg-[#010101] border-b">
					<div className="flex items-center gap-3">
						<NeulandPalm className="h-8 w-8" color="currentColor" />
						<h1 className="text-xl font-bold">Campus Life Events</h1>
					</div>
				</div>
				<div className="flex-1 grid lg:grid-cols-2">
					<div className="hidden lg:block relative">
						<div className="absolute inset-0">
							<Beams
								beamWidth={2}
								beamHeight={15}
								beamNumber={12}
								lightColor="#ffffff"
								speed={2}
								noiseIntensity={1.75}
								scale={0.2}
								rotation={30}
							/>
						</div>
						<div className="absolute inset-0 flex items-center justify-center rounded-2xl">
							<Card className="max-w-md mx-10 shadow-lg bg-background/50 backdrop-blur-sm border-border/50 rounded-2xl p-6 dark">
								<CardContent className="p-6 text-center flex flex-col items-center justify-center">
									<NeulandPalm
										className="h-20 w-20 mb-6"
										color="currentColor"
									/>
									<h1 className="text-4xl font-bold text-primary">
										Campus Life Events
									</h1>
									<p className="mt-4 text-sm text-foreground/90 font-medium">
										made by Neuland for StudVer at THI
									</p>
									{tokenStatus === 'valid' && clubName && (
										<div className="mt-6 p-4 bg-primary/10 rounded-lg">
											<p className="text-xl font-semibold text-foreground">
												{clubName}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>

					<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
						<Card className="w-full max-w-sm shadow-lg">
							<CardHeader>
								<CardTitle className="text-center text-xl">
									Richte dein Konto ein
								</CardTitle>
								{tokenStatus === 'valid' && clubName && (
									<div className="lg:hidden mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
										<div className="flex items-center justify-center gap-2">
											<p className="text-sm font-medium text-blue-700 dark:text-blue-300">
												Willkommen
											</p>
										</div>
										<p className="text-lg font-semibold text-blue-900 dark:text-blue-100 mt-1 text-center">
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
				<UnifiedFooter variant="auth" showThemeToggle />
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
					<div className="lg:hidden flex items-center justify-center p-4 bg-neutral-100 dark:bg-[#010101] border-b">
						<div className="flex items-center gap-3">
							<NeulandPalm className="h-8 w-8" color="currentColor" />
							<h1 className="text-xl font-bold">Campus Life Events</h1>
						</div>
					</div>
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
					<UnifiedFooter variant="auth" showThemeToggle />
				</div>
			}
		>
			<RegisterWithTokenPage />
		</Suspense>
	)
}
