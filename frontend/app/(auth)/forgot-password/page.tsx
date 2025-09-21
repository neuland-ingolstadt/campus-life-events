'use client'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { requestPasswordReset } from '@/client'
import Beams from '@/components/Beams'
import NeulandPalm from '@/components/neuland-palm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UnifiedFooter } from '@/components/unified-footer'

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
									E-Mail versendet
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<Alert>
									<CheckCircle className="h-4 w-4" />
									<AlertTitle>E-Mail versendet</AlertTitle>
									<AlertDescription>
										Falls ein Konto mit dieser E-Mail-Adresse existiert, haben
										wir dir eine E-Mail mit einem Link zum Zurücksetzen deines
										Passworts gesendet.
									</AlertDescription>
								</Alert>
								<p className="text-sm text-muted-foreground text-center">
									Der Link ist für 10 Minuten gültig. Prüfe auch deinen
									Spam-Ordner.
								</p>
								<div className="flex flex-col gap-2">
									<Button
										onClick={() => router.push('/login')}
										className="w-full"
									>
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
						</Card>
					</div>
				</div>
				<UnifiedFooter variant="auth" showThemeToggle />
			</div>
		)
	}

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
								Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
								Zurücksetzen deines Passworts.
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
					</Card>
				</div>
			</div>
			<UnifiedFooter variant="auth" showThemeToggle />
		</div>
	)
}
