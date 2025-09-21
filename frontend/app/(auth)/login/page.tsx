'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import Beams from '@/components/Beams'
import NeulandPalm from '@/components/neuland-palm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UnifiedFooter } from '@/components/unified-footer'
import { login } from '@/lib/auth'

function getErrorMessage(error: unknown): string {
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as { message: unknown }).message === 'string'
	) {
		return (error as { message: string }).message
	}

	return 'Login fehlgeschlagen'
}

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Feature cycling animation
	const features = [
		'Events professionell bewerben',
		'Vereinsinfos zentral verwalten',
		'Nahtlos in Neuland Next integriert',
		'Automatischer Newsletter-Export',
		'Exklusiv für THI-Vereine',
		'iCalendar-Synchronisation'
	]
	const [_currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
	const [_isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Initial delay to prevent flash
		const initialDelay = setTimeout(() => {
			setIsVisible(true)
		}, 100)

		const interval = setInterval(() => {
			setCurrentFeatureIndex((prev) => (prev + 1) % features.length)
		}, 4000)

		return () => {
			clearTimeout(initialDelay)
			clearInterval(interval)
		}
	}, [])

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setError(null)
		try {
			await login({ email, password })
			router.push('/')
		} catch (err) {
			setError(getErrorMessage(err))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen w-full flex flex-col">
			{/* Mobile Header */}
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
					{/* Full screen Beams background */}
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
							<CardContent className="p-6 text-center flex flex-col items-center justify-center ">
								<NeulandPalm className="h-20 w-20 mb-6" color="currentColor" />
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
								Willkommen zurück
							</CardTitle>
						</CardHeader>
						<CardContent>
							{error && (
								<Alert variant="destructive" className="mb-4">
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Login fehlgeschlagen</AlertTitle>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
							<form className="space-y-4" onSubmit={onSubmit}>
								<div className="space-y-2">
									<Label htmlFor="email">E-Mail</Label>
									<Input
										id={`${useId()}email`}
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="vorstand@thi-verein.de"
										required
										autoFocus
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="password">Passwort</Label>
									<Input
										id={`${useId()}password`}
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
										required
									/>
								</div>
								<Button type="submit" className="w-full" disabled={loading}>
									{loading ? 'Einloggen...' : 'Einloggen'}
								</Button>
							</form>
							<div className="mt-5 space-y-4">
								<p className="text-center text-xs text-muted-foreground">
									Das erste Mal hier? Nutze den Einladungslink, den du per
									E-Mail erhalten hast.
								</p>
								<p className="text-center text-xs">
									<Link
										href="/forgot-password"
										className="text-primary hover:underline"
									>
										Passwort vergessen?
									</Link>
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
			<UnifiedFooter variant="auth" showThemeToggle />
		</div>
	)
}
