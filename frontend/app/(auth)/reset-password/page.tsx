'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useId, useState } from 'react'
import { resetPassword } from '@/client/sdk.gen'
import { AuthCard, AuthLayout, AuthLeftSide } from '@/components/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getErrorMessage(error: unknown): string {
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as { message: unknown }).message === 'string'
	) {
		return (error as { message: string }).message
	}

	return 'Passwort zurücksetzen fehlgeschlagen'
}

function ResetPasswordForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const passwordId = useId()
	const confirmPasswordId = useId()
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [token, setToken] = useState<string | null>(null)

	useEffect(() => {
		const tokenParam = searchParams.get('token')
		if (!tokenParam) {
			setError('Ungültiger oder fehlender Reset-Token')
			return
		}
		setToken(tokenParam)
	}, [searchParams])

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError('Die Passwörter stimmen nicht überein')
			setLoading(false)
			return
		}

		if (!token) {
			setError('Ungültiger Reset-Token')
			setLoading(false)
			return
		}

		try {
			await resetPassword({
				body: {
					token,
					new_password: password
				}
			})
			setSuccess(true)
		} catch (err) {
			setError(getErrorMessage(err))
		} finally {
			setLoading(false)
		}
	}

	if (success) {
		return (
			<AuthLayout>
				<AuthLeftSide />
				<AuthCard>
					<CardHeader>
						<CardTitle className="text-center text-xl">
							Passwort zurückgesetzt
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertTitle>Erfolgreich</AlertTitle>
							<AlertDescription>
								Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich
								jetzt mit deinem neuen Passwort anmelden.
							</AlertDescription>
						</Alert>
						<Button onClick={() => router.push('/login')} className="w-full">
							Zur Anmeldung
						</Button>
					</CardContent>
				</AuthCard>
			</AuthLayout>
		)
	}

	if (!token) {
		return (
			<AuthLayout>
				<AuthLeftSide />
				<AuthCard>
					<CardHeader>
						<CardTitle className="text-center text-xl">
							Ungültiger Link
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Fehler</AlertTitle>
							<AlertDescription>
								Der Reset-Link ist ungültig oder fehlt. Bitte fordere einen
								neuen Link an.
							</AlertDescription>
						</Alert>
						<Button
							onClick={() => router.push('/forgot-password')}
							className="w-full"
						>
							Neuen Link anfordern
						</Button>
					</CardContent>
				</AuthCard>
			</AuthLayout>
		)
	}

	return (
		<AuthLayout>
			<AuthLeftSide />
			<AuthCard>
				<CardHeader>
					<CardTitle className="text-center text-xl">
						Neues Passwort setzen
					</CardTitle>
				</CardHeader>
				<CardContent>
					{error && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Fehler</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<p className="text-sm text-muted-foreground mb-4">
						Gib dein neues Passwort ein. Es muss mindestens 20 Zeichen lang sein
						und Groß- und Kleinbuchstaben, Zahlen und Symbole enthalten. Der
						Reset-Link ist für 10 Minuten gültig.
					</p>
					<form className="space-y-4" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label htmlFor={passwordId}>Neues Passwort</Label>
							<Input
								id={passwordId}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••••••••••••••"
								required
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={confirmPasswordId}>Passwort bestätigen</Label>
							<Input
								id={confirmPasswordId}
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••••••••••••••"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? 'Zurücksetzen...' : 'Passwort zurücksetzen'}
							</Button>
							<Button
								onClick={() => router.push('/login')}
								variant="outline"
								className="w-full"
							>
								Zurück zur Anmeldung
							</Button>
						</div>
					</form>
				</CardContent>
			</AuthCard>
		</AuthLayout>
	)
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<AuthLayout>
					<AuthLeftSide />
					<AuthCard>
						<CardHeader>
							<CardTitle className="text-center text-xl">Lädt...</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="h-4 w-24 mx-auto bg-muted rounded animate-pulse"></div>
							<div className="h-10 w-full bg-muted rounded animate-pulse"></div>
							<div className="h-10 w-full bg-muted rounded animate-pulse"></div>
						</CardContent>
					</AuthCard>
				</AuthLayout>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	)
}
