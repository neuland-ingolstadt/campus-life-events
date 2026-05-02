'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	CircleQuestionMarkIcon,
	CodeIcon,
	CopyIcon,
	GithubIcon,
	GitPullRequest,
	InfoIcon,
	KeyRoundIcon,
	MailIcon
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
	changePassword,
	createApiToken,
	listApiTokens,
	revokeApiToken
} from '@/client'
import type {
	ApiTokenCreatedResponse,
	ApiTokenSummaryResponse
} from '@/client/types.gen'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
	estimatePasswordEntropy,
	getPasswordPolicyError,
	PASSWORD_POLICY_SUMMARY
} from '@/lib/password-policy'

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof Error) {
		return err.message
	}
	if (
		typeof err === 'object' &&
		err !== null &&
		'message' in err &&
		typeof (err as { message: unknown }).message === 'string'
	) {
		return (err as { message: string }).message
	}
	return fallback
}

function formatDeDate(iso: string) {
	return new Date(iso).toLocaleString('de-DE')
}

function isTokenExpired(iso: string) {
	return new Date(iso).getTime() <= Date.now()
}

export default function SettingsPage() {
	const qc = useQueryClient()
	const currentId = useId()
	const nextId = useId()
	const apiLabelId = useId()
	const [current, setCurrent] = useState('')
	const [nextPw, setNextPw] = useState('')
	const [saving, setSaving] = useState(false)
	const [ok, setOk] = useState<string | null>(null)
	const [err, setErr] = useState<string | null>(null)
	const [apiLabel, setApiLabel] = useState('')
	const [createdToken, setCreatedToken] =
		useState<ApiTokenCreatedResponse | null>(null)
	const newPasswordError = nextPw ? getPasswordPolicyError(nextPw) : null
	const newPasswordEntropy = nextPw
		? Math.floor(estimatePasswordEntropy(nextPw))
		: 0
	const submitDisabled =
		saving || !current || !nextPw || Boolean(newPasswordError)

	const apiTokensQuery = useQuery({
		queryKey: ['auth', 'api-tokens'],
		queryFn: async () => {
			const response = await listApiTokens({ throwOnError: true })
			return (response.data ?? []) as ApiTokenSummaryResponse[]
		}
	})

	const createTokenMutation = useMutation({
		mutationFn: async (label: string) => {
			const response = await createApiToken({
				body: { label },
				throwOnError: true
			})
			return response.data
		},
		onSuccess: (data) => {
			if (data) {
				setCreatedToken(data)
			}
			setApiLabel('')
			void qc.invalidateQueries({ queryKey: ['auth', 'api-tokens'] })
		}
	})

	const revokeTokenMutation = useMutation({
		mutationFn: (id: number) =>
			revokeApiToken({ path: { id }, throwOnError: true }),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ['auth', 'api-tokens'] })
		}
	})

	const apiTokensErr = useMemo(() => {
		const fromQuery = apiTokensQuery.error
			? errorMessage(
					apiTokensQuery.error,
					'API-Token konnten nicht geladen werden'
				)
			: null
		const fromCreate = createTokenMutation.error
			? errorMessage(
					createTokenMutation.error,
					'API-Token konnte nicht erstellt werden'
				)
			: null
		const fromRevoke = revokeTokenMutation.error
			? errorMessage(revokeTokenMutation.error, 'Widerruf fehlgeschlagen')
			: null
		return fromRevoke ?? fromCreate ?? fromQuery
	}, [
		apiTokensQuery.error,
		createTokenMutation.error,
		revokeTokenMutation.error
	])

	const apiTokens = apiTokensQuery.data ?? []
	const apiTokensLoading = apiTokensQuery.isLoading

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
			await changePassword({
				body: {
					current_password: current,
					new_password: nextPw
				},
				throwOnError: true
			})
			setOk('Passwort geändert')
			setCurrent('')
			setNextPw('')
		} catch (e) {
			setErr(errorMessage(e, 'Passwort konnte nicht geändert werden'))
		} finally {
			setSaving(false)
		}
	}

	function onCreateApiToken(e: React.FormEvent) {
		e.preventDefault()
		setCreatedToken(null)
		createTokenMutation.mutate(apiLabel.trim())
	}

	function onRevokeApiToken(id: number) {
		revokeTokenMutation.mutate(id)
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
				<Card className="transition-all duration-300 hover:shadow-lg">
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

				<h2 className="text-3xl font-bold tracking-tight">API-Token</h2>
				<Card className="transition-all duration-300 hover:shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<KeyRoundIcon className="h-5 w-5" />
							Zugang für Automatisierung
						</CardTitle>
						<CardDescription>
							Token für API-Zugriff (z. B. MCP oder Skripte), gültig 30 Tage ab
							Erstellung. Beim Aufruf Header{' '}
							<code className="text-xs bg-muted px-1 rounded">
								Authorization: Bearer …
							</code>{' '}
							setzen. Der Klartext wird nur einmal beim Erzeugen angezeigt.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{createdToken && (
							<Alert className="border-amber-500/40 bg-amber-500/5">
								<AlertTitle>Token einmalig speichern</AlertTitle>
								<AlertDescription className="space-y-3">
									<p className="text-muted-foreground">
										Kopiere das Token jetzt. Es wird nicht wieder angezeigt.
										Gültig bis{' '}
										<span className="font-medium text-foreground">
											{formatDeDate(createdToken.expires_at)}
										</span>
										.
									</p>
									<div className="flex rounded-lg border bg-background shadow-sm overflow-hidden">
										<div className="min-w-0 flex-1 px-3 py-2.5 font-mono text-xs leading-relaxed break-all select-all">
											{createdToken.token}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="w-11 shrink-0 self-stretch rounded-none border-l border-border"
											aria-label="Token kopieren"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(
														createdToken.token
													)
													toast.success('In die Zwischenablage kopiert')
												} catch {
													toast.error('Kopieren nicht möglich')
												}
											}}
										>
											<CopyIcon className="size-4" />
										</Button>
									</div>
									<Button
										type="button"
										size="sm"
										variant="secondary"
										onClick={() => setCreatedToken(null)}
									>
										Schließen
									</Button>
								</AlertDescription>
							</Alert>
						)}
						<form
							className="flex flex-col gap-3 sm:flex-row sm:items-end"
							onSubmit={onCreateApiToken}
						>
							<div className="space-y-2 flex-1">
								<Label htmlFor={apiLabelId}>Bezeichnung (optional)</Label>
								<Input
									id={apiLabelId}
									value={apiLabel}
									onChange={(e) => setApiLabel(e.target.value)}
									placeholder="z. B. MCP Laptop"
									maxLength={200}
									autoComplete="off"
								/>
							</div>
							<Button type="submit" disabled={createTokenMutation.isPending}>
								{createTokenMutation.isPending ? 'Erstelle…' : 'Neues Token'}
							</Button>
						</form>
						{apiTokensErr && (
							<p className="text-sm text-destructive">{apiTokensErr}</p>
						)}
						{apiTokensLoading ? (
							<p className="text-sm text-muted-foreground">Lade Token…</p>
						) : apiTokensQuery.isError ? null : apiTokens.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Noch keine Token erstellt.
							</p>
						) : (
							<ul className="divide-y rounded-md border">
								{apiTokens.map((t) => (
									<li
										key={t.id}
										className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
									>
										<div>
											<p className="font-medium">
												{t.label || 'Ohne Bezeichnung'}
											</p>
											<p className="text-xs text-muted-foreground font-mono">
												…{t.token_last_four} · erstellt{' '}
												{formatDeDate(t.created_at)}
												{' · gültig bis '}
												{formatDeDate(t.expires_at)}
												{isTokenExpired(t.expires_at) ? (
													<span className="text-destructive font-sans font-medium">
														{' '}
														(abgelaufen)
													</span>
												) : null}
												{t.last_used_at
													? ` · zuletzt ${formatDeDate(t.last_used_at)}`
													: ' · noch nicht verwendet'}
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="text-destructive border-destructive/50 hover:bg-destructive/10"
											disabled={revokeTokenMutation.isPending}
											onClick={() => onRevokeApiToken(t.id)}
										>
											{revokeTokenMutation.isPending &&
											revokeTokenMutation.variables === t.id
												? 'Widerruf…'
												: 'Widerrufen'}
										</Button>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
			<div className="flex-1 p-4 md:p-8 space-y-6 pt-2">
				<h2 className="text-3xl font-bold tracking-tight">Sonstiges</h2>

				<div className="grid gap-6 md:grid-cols-2">
					<Card className="transition-all duration-300 hover:shadow-lg">
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
										href="mailto:campuslife@neuland-ingolstadt.de"
										className="font-medium transition-colors"
									>
										campuslife@neuland-ingolstadt.de
									</a>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="transition-all duration-300 hover:shadow-lg">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2">
								<InfoIcon className="h-5 w-5" />
								Informationen
							</CardTitle>
							<CardDescription>Über Campus Life Events</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Eine Kooperation von Neuland Ingolstadt e.V. und StudVer
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Beauftragt von der THI StudVer, als Nachfolger des
										Moodle-Kurses
									</p>
								</div>
								<div className="flex items-start gap-3">
									<div className="h-2 w-2 bg-current rounded-full mt-2 flex-shrink-0"></div>
									<p className="text-sm text-muted-foreground">
										Entwickelt und betrieben von Neuland Ingolstadt e.V.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="flex-1 p-4 md:p-8 space-y-6 pt-2">
				<h2 className="text-3xl font-bold tracking-tight">Über</h2>

				<Card className="transition-all duration-300 hover:shadow-lg">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2">
							<GithubIcon className="h-5 w-5" />
							GitHub
						</CardTitle>
						<CardDescription>Quellcode und Entwicklung</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<GitPullRequest className="h-4 w-4" />
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
								<div className="flex items-center gap-2">
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
