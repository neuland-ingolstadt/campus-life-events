'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Laptop,
	MonitorSmartphone,
	Sparkles,
	Terminal,
	Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
	listOauthSessions,
	revokeAllOauthSessions,
	revokeOauthSession
} from '@/client'
import type { OAuthSessionSummaryResponse } from '@/client/types.gen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MCP_URL = 'https://cl.neuland.ing/mcp'

type ToolSchema = {
	name: string
	description: string
	inputSchema: {
		type: 'object'
		required?: string[]
		properties?: Record<
			string,
			{ type?: string; format?: string; description?: string }
		>
		additionalProperties: boolean
	}
}

const ORGANIZER_TOOLS: ToolSchema[] = [
	{
		name: 'my_club_info',
		description: "Fetch the current club's (organizer) full profile.",
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'list_clubs_basic',
		description:
			'List all clubs (organizers) with basic info (name + descriptions).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'my_events',
		description: 'List all events for the current club (organizer).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'create_my_event',
		description:
			'Create an event for the current club. Datetimes as ISO-8601 UTC strings.',
		inputSchema: {
			type: 'object',
			required: ['title_de', 'title_en', 'start_date_time', 'end_date_time'],
			properties: {
				title_de: { type: 'string' },
				title_en: { type: 'string' },
				description_de: { type: 'string' },
				description_en: { type: 'string' },
				start_date_time: { type: 'string', format: 'date-time' },
				end_date_time: { type: 'string', format: 'date-time' },
				event_url: { type: 'string' },
				location: { type: 'string' },
				publish_app: { type: 'boolean' },
				publish_newsletter: { type: 'boolean' },
				publish_in_ical: { type: 'boolean' },
				publish_web: { type: 'boolean' },
				host_only: { type: 'boolean' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'get_my_event',
		description: 'Get one event by id if it belongs to your club.',
		inputSchema: {
			type: 'object',
			required: ['id'],
			properties: { id: { type: 'integer' } },
			additionalProperties: false
		}
	},
	{
		name: 'update_my_event',
		description:
			'Update an event by id (your club only). Include at least one field besides id.',
		inputSchema: {
			type: 'object',
			required: ['id'],
			properties: {
				id: { type: 'integer' },
				title_de: { type: 'string' },
				title_en: { type: 'string' },
				description_de: { type: 'string' },
				description_en: { type: 'string' },
				start_date_time: { type: 'string', format: 'date-time' },
				end_date_time: { type: 'string', format: 'date-time' },
				event_url: { type: 'string' },
				location: { type: 'string' },
				publish_app: { type: 'boolean' },
				publish_newsletter: { type: 'boolean' },
				publish_in_ical: { type: 'boolean' },
				publish_web: { type: 'boolean' },
				host_only: { type: 'boolean' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'delete_my_event',
		description: 'Delete an event by id (your club only).',
		inputSchema: {
			type: 'object',
			required: ['id'],
			properties: { id: { type: 'integer' } },
			additionalProperties: false
		}
	},
	{
		name: 'list_my_events_filtered',
		description:
			"List your club's events with optional upcoming filter and pagination.",
		inputSchema: {
			type: 'object',
			properties: {
				upcoming_only: { type: 'boolean' },
				limit: { type: 'integer' },
				offset: { type: 'integer' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'newsletter_upcoming_summary',
		description:
			'Newsletter dataset for the next two weeks (requires newsletter permission on the organizer). Optional week_start YYYY-MM-DD (Monday of week).',
		inputSchema: {
			type: 'object',
			properties: { week_start: { type: 'string', description: 'YYYY-MM-DD' } },
			additionalProperties: false
		}
	},
	{
		name: 'update_my_club_profile',
		description: 'Update your club profile fields (at least one required).',
		inputSchema: {
			type: 'object',
			properties: {
				name: { type: 'string' },
				description_de: { type: 'string' },
				description_en: { type: 'string' },
				website_url: { type: 'string' },
				instagram_url: { type: 'string' },
				location: { type: 'string' },
				linkedin_url: { type: 'string' },
				registration_number: { type: 'string' },
				non_profit: { type: 'boolean' }
			},
			additionalProperties: false
		}
	}
]

const ADMIN_TOOLS: ToolSchema[] = [
	{
		name: 'list_clubs_basic',
		description:
			'List all clubs (organizers) with basic info (name + descriptions).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'list_admins_with_invites',
		description:
			'List all admin accounts including invite status and setup-token expiry (admin only).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'list_clubs_with_invites',
		description:
			'List all clubs (organizers) including invite status and setup-token expiry (admin only).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false }
	},
	{
		name: 'invite_club',
		description:
			'Invite a new club (organizer): creates organizer + setup token and sends invite email if SMTP is configured (admin only).',
		inputSchema: {
			type: 'object',
			required: ['name', 'email'],
			properties: {
				name: { type: 'string' },
				email: { type: 'string' }
			},
			additionalProperties: false
		}
	},
	{
		name: 'newsletter_upcoming_summary',
		description:
			'Newsletter dataset for the next two weeks (requires newsletter permission on the organizer). Optional week_start YYYY-MM-DD (Monday of week).',
		inputSchema: {
			type: 'object',
			properties: { week_start: { type: 'string', description: 'YYYY-MM-DD' } },
			additionalProperties: false
		}
	}
]

function formatDeDate(iso: string) {
	return new Date(iso).toLocaleString('de-DE')
}

function sessionLabel(session: OAuthSessionSummaryResponse) {
	const name = session.client_name?.trim()
	if (name) return name
	return `Gerät ${session.client_id.slice(0, 8)}…`
}

function errorMessage(err: unknown, fallback: string): string {
	if (err instanceof Error) return err.message
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

function ToolTable({ tools, filter }: { tools: ToolSchema[]; filter: string }) {
	const normalized = filter.trim().toLowerCase()

	const rows = useMemo(() => {
		if (!normalized) return tools
		return tools.filter((t) => {
			const props = Object.keys(t.inputSchema.properties ?? {}).join(' ')
			return `${t.name} ${t.description} ${props}`
				.toLowerCase()
				.includes(normalized)
		})
	}, [tools, normalized])

	return (
		<div className="rounded-lg border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[220px]">Tool</TableHead>
						<TableHead>Beschreibung</TableHead>
						<TableHead className="w-[260px]">Argumente</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((tool) => {
						const required = tool.inputSchema.required ?? []
						const properties = Object.keys(tool.inputSchema.properties ?? {})

						return (
							<TableRow key={tool.name}>
								<TableCell className="align-top">
									<div className="flex flex-col gap-2">
										<code className="text-xs sm:text-sm font-medium bg-muted px-2 py-1 rounded w-fit">
											{tool.name}
										</code>
										{required.length > 0 ? (
											<Badge variant="secondary" className="w-fit">
												erforderlich: {required.join(', ')}
											</Badge>
										) : (
											<Badge variant="outline" className="w-fit">
												keine erforderlichen Argumente
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell className="align-top">
									<p className="text-sm text-muted-foreground text-pretty whitespace-normal">
										{tool.description}
									</p>
								</TableCell>
								<TableCell className="align-top">
									{properties.length > 0 ? (
										<div className="flex flex-wrap gap-1.5 whitespace-normal">
											{properties.slice(0, 10).map((key) => (
												<Badge key={key} variant="outline">
													{key}
												</Badge>
											))}
											{properties.length > 10 ? (
												<Badge variant="outline">
													+{properties.length - 10}
												</Badge>
											) : null}
										</div>
									) : (
										<span className="text-sm text-muted-foreground">-</span>
									)}
								</TableCell>
							</TableRow>
						)
					})}

					{rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={3}>
								<div className="py-6 text-sm text-muted-foreground">
									Keine Tools entsprechen deiner Suche.
								</div>
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	)
}

function OAuthSessionsCard() {
	const qc = useQueryClient()
	const sessionsQuery = useQuery({
		queryKey: ['auth', 'oauth-sessions'],
		queryFn: async () => {
			const response = await listOauthSessions({ throwOnError: true })
			return (response.data ?? []) as OAuthSessionSummaryResponse[]
		}
	})

	const revokeMutation = useMutation({
		mutationFn: (id: number) =>
			revokeOauthSession({ path: { id }, throwOnError: true }),
		onSuccess: () => {
			toast.success('Gerät entfernt')
			void qc.invalidateQueries({ queryKey: ['auth', 'oauth-sessions'] })
		},
		onError: (err) => {
			toast.error(errorMessage(err, 'Gerät konnte nicht entfernt werden'))
		}
	})

	const revokeAllMutation = useMutation({
		mutationFn: () => revokeAllOauthSessions({ throwOnError: true }),
		onSuccess: () => {
			toast.success('Alle Anmeldungen entfernt')
			void qc.invalidateQueries({ queryKey: ['auth', 'oauth-sessions'] })
		},
		onError: (err) => {
			toast.error(
				errorMessage(err, 'Sitzungen konnten nicht widerrufen werden')
			)
		}
	})

	const sessions = sessionsQuery.data ?? []

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1.5">
						<CardTitle className="text-xl flex items-center gap-2">
							<MonitorSmartphone className="size-5" />
							Aktive Anmeldungen
						</CardTitle>
						<CardDescription>
							Mehrere Personen können dasselbe Club-Konto parallel nutzen. Jede
							MCP-Verbindung (z. B. Cursor auf einem Laptop) erscheint hier als
							eigene Anmeldung und lässt sich einzeln beenden.
						</CardDescription>
					</div>
					{sessions.length > 0 ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0 text-destructive border-destructive/50 hover:bg-destructive/10"
							disabled={revokeAllMutation.isPending}
							onClick={() => {
								if (
									window.confirm(
										'Alle MCP-Anmeldungen für dieses Konto wirklich beenden?'
									)
								) {
									revokeAllMutation.mutate()
								}
							}}
						>
							{revokeAllMutation.isPending ? 'Entferne…' : 'Alle entfernen'}
						</Button>
					) : null}
				</div>
			</CardHeader>
			<CardContent>
				{sessionsQuery.isLoading ? (
					<p className="text-sm text-muted-foreground">Lade Anmeldungen…</p>
				) : sessionsQuery.isError ? (
					<p className="text-sm text-destructive">
						{errorMessage(
							sessionsQuery.error,
							'Sitzungen konnten nicht geladen werden'
						)}
					</p>
				) : sessions.length === 0 ? (
					<div className="rounded-lg border border-dashed p-6 text-center space-y-2">
						<Laptop className="mx-auto size-8 text-muted-foreground" />
						<p className="text-sm font-medium">
							Noch keine aktiven Anmeldungen
						</p>
						<p className="text-sm text-muted-foreground text-pretty">
							Sobald jemand MCP über OAuth verbindet, erscheint das Gerät hier.
						</p>
					</div>
				) : (
					<ul className="divide-y rounded-md border">
						{sessions.map((session) => (
							<li
								key={session.id}
								className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 space-y-1">
									<p className="font-medium truncate">
										{sessionLabel(session)}
									</p>
									<p className="text-xs text-muted-foreground">
										verbunden {formatDeDate(session.created_at)}
										{session.last_used_at
											? ` · zuletzt ${formatDeDate(session.last_used_at)}`
											: ' · noch nicht verwendet'}
										{' · gültig bis '}
										{formatDeDate(session.refresh_expires_at)}
									</p>
									<p className="text-[11px] font-mono text-muted-foreground truncate">
										{session.client_id}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="text-destructive border-destructive/50 hover:bg-destructive/10 shrink-0"
									disabled={
										revokeMutation.isPending &&
										revokeMutation.variables === session.id
									}
									onClick={() => {
										if (
											window.confirm(
												`Anmeldung „${sessionLabel(session)}“ wirklich entfernen?`
											)
										) {
											revokeMutation.mutate(session.id)
										}
									}}
								>
									<Trash2 className="size-3.5 mr-1.5" />
									{revokeMutation.isPending &&
									revokeMutation.variables === session.id
										? 'Entferne…'
										: 'Entfernen'}
								</Button>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}

export default function McpSetupPage() {
	const [toolFilter, setToolFilter] = useState('')

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2 min-w-0">
					<h1 className="text-lg font-semibold truncate">KI &amp; MCP</h1>
				</div>
			</header>

			<div className="flex-1 space-y-8 p-4 md:p-8 pt-6 mb-12 max-w-4xl">
				<div className="rounded-xl border bg-muted/10 p-6 md:p-8">
					<div className="flex items-start gap-4">
						<div className="mt-0.5 rounded-lg bg-secondary p-2">
							<Sparkles className="size-6 text-secondary-foreground" />
						</div>
						<div className="space-y-2 min-w-0">
							<h2 className="text-2xl md:text-3xl font-bold tracking-tight">
								KI-Tools für Events &amp; Organisationsprofil
							</h2>
							<p className="text-muted-foreground text-pretty">
								Mit{' '}
								<a
									href="https://modelcontextprotocol.io"
									target="_blank"
									rel="noopener noreferrer"
									className="underline underline-offset-4 hover:text-foreground"
								>
									Model Context Protocol (MCP)
								</a>{' '}
								kannst du in Clients wie Cursor oder Claude direkt Tools nutzen,
								um Events zu verwalten, Profilfelder zu pflegen und
								Newsletter-Daten abzurufen. Mehrere Geräte und Personen können
								parallel angemeldet sein.
							</p>
						</div>
					</div>
				</div>

				<OAuthSessionsCard />

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Setup</CardTitle>
						<CardDescription>
							Endpunkt eintragen, im Browser anmelden, loslegen.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm text-muted-foreground text-pretty">
						<p>
							Trage in deinem MCP-Client (z. B. Cursor, Claude, OpenCode) nur
							die URL ein. Beim ersten Verbindungsversuch öffnet sich der Login;
							melde dich mit deinem Campus-Life-Events-Konto an und erlaube den
							Zugriff. Jede Verbindung legt eine eigene Anmeldung an – andere
							Geräte bleiben aktiv. Ein API-Token ist nicht nötig und wird am
							Endpunkt nicht akzeptiert.
						</p>
						<div className="rounded-lg border bg-muted/30 p-3">
							<div className="flex items-center gap-2 mb-2">
								<Terminal className="size-4 shrink-0" />
								<span className="text-xs font-medium text-foreground">
									MCP-Endpunkt
								</span>
							</div>
							<code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all text-foreground">
								{MCP_URL}
							</code>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Available tools</CardTitle>
						<CardDescription>
							Die Tool-Liste entspricht dem Backend. Welche Tools du siehst,
							hängt vom Account-Typ ab (Organizer vs Admin).
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Suchen</p>
								<p className="text-xs text-muted-foreground">
									Nach Tool-Namen, Beschreibung oder Argument-Schlüsseln
									filtern.
								</p>
							</div>
							<div className="w-full sm:max-w-sm">
								<Input
									value={toolFilter}
									onChange={(e) => setToolFilter(e.target.value)}
									placeholder="z. B. event, newsletter, invite…"
								/>
							</div>
						</div>
						<Tabs defaultValue="organizer">
							<TabsList>
								<TabsTrigger value="organizer">
									Organizer ({ORGANIZER_TOOLS.length})
								</TabsTrigger>
								<TabsTrigger value="admin">
									Admin ({ADMIN_TOOLS.length})
								</TabsTrigger>
							</TabsList>
							<TabsContent value="organizer">
								<ToolTable tools={ORGANIZER_TOOLS} filter={toolFilter} />
							</TabsContent>
							<TabsContent value="admin">
								<ToolTable tools={ADMIN_TOOLS} filter={toolFilter} />
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
