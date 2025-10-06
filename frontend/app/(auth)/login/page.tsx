'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { LogIn } from '@/components/animate-ui/icons/log-in'
import { AuthCard, AuthLayout, AuthLeftSide } from '@/components/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
	const emailId = useId()
	const passwordId = useId()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

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
		<AuthLayout>
			<AuthLeftSide />
			<AuthCard>
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
							<Label htmlFor={emailId}>E-Mail</Label>
							<Input
								id={emailId}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="vorstand@thi-verein.de"
								required
								autoFocus
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
						</div>
						<AnimateIcon animateOnHover animateOnTap>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? 'Einloggen...' : 'Einloggen'}
								<LogIn className="h-4 w-4" />
							</Button>
						</AnimateIcon>
					</form>
					<div className="mt-5 space-y-4">
						<p className="text-center text-xs text-muted-foreground">
							Das erste Mal hier? Nutze den Einladungslink, den du per E-Mail
							erhalten hast.
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
			</AuthCard>
		</AuthLayout>
	)
}
