'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { LoginForm } from '@/components/auth'
import NeulandPalm from '@/components/neuland-palm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { me } from '@/lib/auth'

type PendingAuthorization = {
	request_id: string
	client_id: string
	client_name?: string | null
	redirect_uri: string
	state?: string | null
}

async function fetchPending(
	requestId: string
): Promise<PendingAuthorization | null> {
	const res = await fetch(
		`/api/v1/oauth/pending/${encodeURIComponent(requestId)}`,
		{ credentials: 'include' }
	)
	if (!res.ok) return null
	return res.json()
}

async function submitConsent(
	requestId: string
): Promise<{ redirect_to: string }> {
	const res = await fetch('/api/v1/oauth/consent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ request_id: requestId })
	})
	if (!res.ok) {
		let message = 'Freigabe fehlgeschlagen'
		try {
			const data = await res.json()
			if (typeof data?.message === 'string') message = data.message
		} catch {
			/* ignore */
		}
		throw new Error(message)
	}
	return res.json()
}

const BLOCKED_REDIRECT_PROTOCOLS = new Set([
	'javascript:',
	'data:',
	'vbscript:',
	'file:',
	'blob:',
	'about:'
])

function isLoopbackHttpRedirect(uri: string): boolean {
	try {
		const parsed = new URL(uri)
		return (
			parsed.protocol === 'http:' &&
			['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
		)
	} catch {
		return false
	}
}

function isSafeRedirectTarget(uri: string): boolean {
	try {
		const parsed = new URL(uri)
		if (BLOCKED_REDIRECT_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
			return false
		}
		if (parsed.protocol === 'http:') {
			return ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
		}
		return uri.length > 0 && uri.length <= 2048 && !uri.includes('#')
	} catch {
		return false
	}
}

function withQueryParam(uri: string, key: string, value: string): string {
	const sep = uri.includes('?') ? '&' : '?'
	return `${uri}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
}

function OAuthAuthorizeInner() {
	const searchParams = useSearchParams()
	const queryClient = useQueryClient()
	const [consentLoading, setConsentLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const requestId = searchParams.get('request') ?? ''

	const { data: pending, isLoading: pendingLoading } = useQuery({
		queryKey: ['oauth', 'pending', requestId],
		queryFn: () => fetchPending(requestId),
		enabled: requestId.length > 0
	})

	const { data: meData, isLoading: meLoading } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me,
		enabled: !!pending
	})

	async function onAllow() {
		if (!pending) return
		setConsentLoading(true)
		setError(null)
		try {
			const { redirect_to } = await submitConsent(pending.request_id)
			if (!isSafeRedirectTarget(redirect_to)) {
				throw new Error('Ungültige redirect_uri')
			}
			window.location.assign(redirect_to)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Freigabe fehlgeschlagen')
			setConsentLoading(false)
		}
	}

	function onDeny() {
		if (!pending) return
		if (!isSafeRedirectTarget(pending.redirect_uri)) {
			setError('Ungültige redirect_uri')
			return
		}
		try {
			const url = new URL(pending.redirect_uri)
			url.searchParams.set('error', 'access_denied')
			if (pending.state) url.searchParams.set('state', pending.state)
			window.location.assign(url.toString())
		} catch {
			let next = withQueryParam(pending.redirect_uri, 'error', 'access_denied')
			if (pending.state) {
				next = withQueryParam(next, 'state', pending.state)
			}
			window.location.assign(next)
		}
	}

	const paramsValid = requestId.length > 0 && !!pending
	const clientLabel =
		pending?.client_name?.trim() ||
		(pending ? `Client ${pending.client_id.slice(0, 8)}…` : 'MCP-Client')
	const redirectUri = pending?.redirect_uri ?? ''
	const loopbackRedirect = isLoopbackHttpRedirect(redirectUri)

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
			<Card className="w-full max-w-md border-border shadow-lg">
				<CardHeader className="space-y-3">
					<div className="flex justify-center">
						<NeulandPalm className="h-10 w-10" color="currentColor" />
					</div>
					<CardTitle className="text-center text-xl">
						MCP-Zugriff erlauben
					</CardTitle>
				</CardHeader>
				<CardContent>
					{requestId.length === 0 && (
						<Alert variant="destructive" className="mb-4">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Ungültige Anfrage</AlertTitle>
							<AlertDescription>
								Die OAuth-Parameter fehlen. Starte die Verbindung erneut aus
								deinem MCP-Client.
							</AlertDescription>
						</Alert>
					)}

					{requestId.length > 0 && pendingLoading && (
						<p className="text-center text-sm text-muted-foreground">Lade…</p>
					)}

					{requestId.length > 0 && !pendingLoading && !pending && (
						<Alert variant="destructive">
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>Anfrage abgelaufen</AlertTitle>
							<AlertDescription>
								Diese Autorisierung ist ungültig oder abgelaufen. Starte die
								Verbindung erneut aus deinem MCP-Client.
							</AlertDescription>
						</Alert>
					)}

					{paramsValid && meLoading && (
						<p className="text-center text-sm text-muted-foreground">Lade…</p>
					)}

					{paramsValid && !meLoading && !meData && (
						<>
							<p className="mb-4 text-center text-sm text-muted-foreground text-pretty">
								Melde dich mit deinem Campus-Life-Events-Konto an, um einer
								Anwendung Zugriff auf dein Konto zu geben.
							</p>
							<p className="mb-4 break-all text-center font-mono text-xs text-muted-foreground">
								{redirectUri}
							</p>
							<LoginForm
								showInviteHint={false}
								onSuccess={async () => {
									await queryClient.invalidateQueries({
										queryKey: ['auth', 'me'],
										refetchType: 'all'
									})
								}}
							/>
						</>
					)}

					{paramsValid && !meLoading && meData && (
						<>
							{error && (
								<Alert variant="destructive" className="mb-4">
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Fehler</AlertTitle>
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
							<p className="mb-2 text-center text-sm text-muted-foreground text-pretty">
								<strong>{clientLabel}</strong> möchte auf Campus Life Events
								zugreifen (Veranstaltungen und Club-Profil für dein Konto).
							</p>
							<p
								className={`break-all text-center font-mono text-xs text-muted-foreground ${loopbackRedirect ? 'mb-2' : 'mb-6'}`}
							>
								Rückleitung: {redirectUri}
							</p>
							{loopbackRedirect && (
								<p className="mb-6 text-center text-xs text-muted-foreground text-pretty">
									Die Rückleitung geht an dein lokales Gerät. Erlaube das nur,
									wenn du die Verbindung selbst gestartet hast.
								</p>
							)}
							<div className="flex flex-col gap-2">
								<Button
									type="button"
									className="w-full"
									disabled={consentLoading}
									onClick={onAllow}
								>
									{consentLoading ? 'Wird freigegeben…' : 'Erlauben'}
								</Button>
								<Button
									type="button"
									variant="outline"
									className="w-full"
									disabled={consentLoading}
									onClick={onDeny}
								>
									Ablehnen
								</Button>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function AuthorizeFallback() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
			<Card className="w-full max-w-sm border-border shadow-lg">
				<CardHeader>
					<CardTitle className="text-center text-xl">
						MCP-Zugriff erlauben
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-center text-sm text-muted-foreground">Lade…</p>
				</CardContent>
			</Card>
		</div>
	)
}

export default function OAuthAuthorizePage() {
	return (
		<Suspense fallback={<AuthorizeFallback />}>
			<OAuthAuthorizeInner />
		</Suspense>
	)
}
