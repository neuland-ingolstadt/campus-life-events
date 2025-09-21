'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useId, useState } from 'react'
import { resetPassword } from '@/client/sdk.gen'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthLeftSide } from '@/components/auth/auth-left-side'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
				<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
					<Card className="w-full max-w-sm shadow-lg">
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
					</Card>
				</div>
			</AuthLayout>
		)
	}

	if (!token) {
		return (
			<AuthLayout>
				<AuthLeftSide />
				<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
					<Card className="w-full max-w-sm shadow-lg">
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
					</Card>
				</div>
			</AuthLayout>
		)
	}

	return (
		<AuthLayout>
			<AuthLeftSide />
			<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
				<Card className="w-full max-w-sm shadow-lg">
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
							Gib dein neues Passwort ein. Es muss mindestens 20 Zeichen lang
							sein und Groß- und Kleinbuchstaben, Zahlen und Symbole enthalten.
							Der Reset-Link ist für 10 Minuten gültig.
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
				</Card>
			</div>
		</AuthLayout>
	)
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen w-full flex flex-col">
					<div className="lg:hidden flex p-4 bg-neutral-100 dark:bg-[#010101] border-b">
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
							<div className="flex flex-col gap-1">
								<div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
								<div className="h-3 w-48 bg-muted rounded animate-pulse"></div>
							</div>
						</div>
					</div>
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
							<p className="mt-2 text-sm text-muted-foreground">Laden...</p>
						</div>
					</div>
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	)
}
