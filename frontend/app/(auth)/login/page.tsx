'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/auth'

export default function LoginPage() {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Feature cycling animation
	const features = [
		'Events bewerben',
		'Vereinsinfos verwalten',
		'Integriert in Neuland Next',
		'Export in wöchentlichen Newsletter',
		'Für alle Vereine der THI',
		'iCalendar Abonnement'
	]
	const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0)
	const [isVisible, setIsVisible] = useState(false)

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
		} catch (err: any) {
			setError(err?.message || 'Login fehlgeschlagen')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen w-full flex flex-col">
			<div className="flex-1 grid lg:grid-cols-2">
				<div className="hidden lg:block relative">
					{/* Full screen soft glow */}
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3"></div>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="max-w-md px-10 text-center">
							<h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary animate-gradient-text bg-clip-text text-transparent">
								Campus Life Events
							</h1>
							<p className="mt-2 text-sm text-muted-foreground/80 font-medium">
								made by Neuland for StudVer at THI
							</p>
							<div className="mt-12 h-8 flex items-center justify-center relative">
								{isVisible && (
									<span
										key={currentFeatureIndex}
										className="text-muted-foreground animate-fade-up absolute"
									>
										{features[currentFeatureIndex]}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
				<div className="flex items-center justify-center p-6">
					<Card className="w-full max-w-sm shadow-lg">
						<CardHeader>
							<CardTitle className="text-center text-lg">
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
							<p className="mt-4 text-center text-xs text-muted-foreground">
								Das erste Mal hier? Nutze den Einladungslink, den du per E-Mail
								erhalten hast.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
			{/* Footer */}
			<footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
				<span>
					© {`${new Date().getFullYear()} `}
					<Link
						href="https://neuland-ingolstadt.de"
						className="hover:underline"
					>
						Neuland Ingolstadt e.V.
					</Link>
				</span>
				<span>•</span>
				<Link
					href="https://neuland-ingolstadt.de/legal/impressum"
					className="hover:underline"
				>
					Impressum
				</Link>
				<span>•</span>
				<Link
					href="https://neuland-ingolstadt.de/legal/datenschutz"
					className="hover:underline"
				>
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
