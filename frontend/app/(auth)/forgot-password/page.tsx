'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { requestPasswordReset } from '@/client'
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

	return 'Anfrage fehlgeschlagen'
}

export default function ForgotPasswordPage() {
	const router = useRouter()
	const emailId = useId()
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setError(null)
		setSuccess(false)

		try {
			await requestPasswordReset({
				body: { email }
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
							E-Mail versendet
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertTitle>E-Mail versendet</AlertTitle>
							<AlertDescription>
								Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir
								dir eine E-Mail mit einem Link zum Zurücksetzen deines Passworts
								gesendet.
							</AlertDescription>
						</Alert>
						<p className="text-sm text-muted-foreground text-center">
							Der Link ist für 10 Minuten gültig. Prüfe auch deinen Spam-Ordner.
						</p>
						<div className="flex flex-col gap-2">
							<Button onClick={() => router.push('/login')} className="w-full">
								Zurück zur Anmeldung
							</Button>
							<Button
								onClick={() => {
									setSuccess(false)
									setEmail('')
								}}
								variant="outline"
								className="w-full"
							>
								Neue Anfrage stellen
							</Button>
						</div>
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
						Passwort zurücksetzen
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
						Gib deine E-Mail-Adresse ein. Falls ein Konto mit dieser Adresse
						existiert, senden wir dir einen Link zum Zurücksetzen deines
						Passworts.
					</p>
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
						<div className="flex flex-col gap-2">
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? 'Senden...' : 'Link senden'}
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
