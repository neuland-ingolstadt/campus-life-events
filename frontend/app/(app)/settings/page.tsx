'use client'

import {
	CircleQuestionMarkIcon,
	CodeIcon,
	GithubIcon,
	InfoIcon,
	MailIcon
} from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { changePassword } from '@/lib/auth'
import {
	estimatePasswordEntropy,
	getPasswordPolicyError,
	PASSWORD_POLICY_SUMMARY
} from '@/lib/password-policy'

function isErrorWithMessage(error: unknown): error is { message: string } {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as { message: unknown }).message === 'string'
	)
}

export default function SettingsPage() {
	const currentId = useId()
	const nextId = useId()
	const [current, setCurrent] = useState('')
	const [nextPw, setNextPw] = useState('')
	const [saving, setSaving] = useState(false)
	const [ok, setOk] = useState<string | null>(null)
	const [err, setErr] = useState<string | null>(null)
	const newPasswordError = nextPw ? getPasswordPolicyError(nextPw) : null
	const newPasswordEntropy = nextPw
		? Math.floor(estimatePasswordEntropy(nextPw))
		: 0
	const submitDisabled =
		saving || !current || !nextPw || Boolean(newPasswordError)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setOk(null)
		setErr(null)
		if (newPasswordError) {
			setErr(newPasswordError)
			return
		}
		setSaving(true)
		try {
			await changePassword({ current_password: current, new_password: nextPw })
			setOk('Passwort geändert')
			setCurrent('')
			setNextPw('')
		} catch (e) {
			if (isErrorWithMessage(e)) {
				setErr(e.message)
			} else {
				setErr('Passwort konnte nicht geändert werden')
			}
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Einstellungen</h1>
				</div>
			</header>

			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				<h2 className="text-3xl font-bold tracking-tight">Passwort</h2>
				<Card>
					<CardHeader>
						<CardTitle>Passwort ändern</CardTitle>
						<CardDescription>Aktualisiere dein Passwort</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="space-y-4" onSubmit={onSubmit}>
							<div className="space-y-2">
								<Label htmlFor={currentId}>Aktuelles Passwort</Label>
								<Input
									id={currentId}
									type="password"
									autoComplete="current-password"
									value={current}
									onChange={(e) => {
										setCurrent(e.target.value)
										setOk(null)
										setErr(null)
									}}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={nextId}>Neues Passwort</Label>
								<Input
									id={nextId}
									type="password"
									autoComplete="new-password"
									value={nextPw}
									onChange={(e) => {
										setNextPw(e.target.value)
										setOk(null)
										setErr(null)
									}}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{PASSWORD_POLICY_SUMMARY}
								</p>
								{nextPw.length > 0 && newPasswordError && (
									<p className="text-xs text-destructive">{newPasswordError}</p>
								)}
								{nextPw.length > 0 && !newPasswordError && (
									<p className="text-xs text-muted-foreground">
										Geschätzte Entropie: {newPasswordEntropy} Bit
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Button type="submit" disabled={submitDisabled}>
									{saving ? 'Speichern...' : 'Speichern'}
								</Button>
								{ok && <span className="text-green-600 text-sm">{ok}</span>}
								{err && !newPasswordError && (
									<span className="text-destructive text-sm">{err}</span>
								)}
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
			<div className="flex-1 p-4 md:p-8 space-y-6 pt-2">
				<h2 className="text-3xl font-bold tracking-tight">Sonstiges</h2>

				<div className="grid gap-6 md:grid-cols-2">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2">
								<CircleQuestionMarkIcon className="h-5 w-5" />
								Kontakt & Support
							</CardTitle>
							<CardDescription>
								Hilfe bei Problemen oder Kontenänderungen
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Du möchtest deine E-Mail-Adresse ändern oder hast ein Problem
									mit deinem Konto?
								</p>
								<div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
									<MailIcon className="h-4 w-4" />
									<a
										href="mailto:support@neuland-ingolstadt.de"
										className="font-medium transition-colors"
									>
										support@neuland-ingolstadt.de
									</a>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2">
								<InfoIcon className="h-5 w-5" />
								Informationen
							</CardTitle>
							<CardDescription>Wichtige Hinweise zur Nutzung</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Deine Daten werden sicher und verschlüsselt gespeichert
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Bei Fragen stehen wir gerne zur Verfügung
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Regelmäßige Updates und Verbesserungen
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="flex-1 p-4 md:p-8 space-y-6 pt-2">
				<h2 className="text-3xl font-bold tracking-tight">Repository</h2>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2">
							<GithubIcon className="h-5 w-5" />
							GitHub Repository
						</CardTitle>
						<CardDescription>Quellcode und Entwicklung</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
								<GithubIcon className="h-4 w-4" />
								<a
									href="https://github.com/neuland-ingolstadt/campus-life-events"
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium transition-colors hover:text-primary"
								>
									neuland-ingolstadt/campus-life-events
								</a>
							</div>
							{process.env.NEXT_PUBLIC_COMMIT_HASH && (
								<div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
									<CodeIcon className="h-4 w-4" />
									<span className="text-sm font-mono">
										Commit: {process.env.NEXT_PUBLIC_COMMIT_HASH.slice(0, 8)}
									</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
