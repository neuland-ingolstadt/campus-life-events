'use client'

import { ArrowLeft, KeyRound, Sparkles, Terminal } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion'
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
				publish_web: { type: 'boolean' }
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
				publish_web: { type: 'boolean' }
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
						<TableHead>Description</TableHead>
						<TableHead className="w-[260px]">Arguments</TableHead>
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
												required: {required.join(', ')}
											</Badge>
										) : (
											<Badge variant="outline" className="w-fit">
												no required args
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
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</TableCell>
							</TableRow>
						)
					})}

					{rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={3}>
								<div className="py-6 text-sm text-muted-foreground">
									No tools match your search.
								</div>
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	)
}

export default function McpSetupPage() {
	const [toolFilter, setToolFilter] = useState('')

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2 min-w-0">
					<h1 className="text-lg font-semibold truncate">MCP Setup</h1>
				</div>
			</header>

			<div className="flex-1 space-y-8 p-4 md:p-8 pt-6 mb-12 max-w-4xl">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-4" />
					Dashboard
				</Link>

				<div className="rounded-xl border bg-muted/10 p-6 md:p-8">
					<div className="flex items-start gap-4">
						<div className="mt-0.5 rounded-lg bg-violet-500/10 p-2">
							<Sparkles className="size-6 text-violet-500" />
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
								um Events zu verwalten, Profilfelder zu pflegen und (falls
								erlaubt) Newsletter-Daten abzurufen.
							</p>
							<div className="flex flex-wrap gap-2 pt-1">
								<Badge variant="outline">JSON-RPC over HTTPS</Badge>
								<Badge variant="outline">Bearer Token</Badge>
								<Badge variant="outline">Protocol: 2025-03-26</Badge>
							</div>
						</div>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Setup</CardTitle>
						<CardDescription>
							Kurz &amp; bündig: Token holen, Endpunkt eintragen, loslegen.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm">
						<Accordion type="multiple" defaultValue={['token', 'cursor']}>
							<AccordionItem value="token">
								<AccordionTrigger>
									<div className="flex items-center gap-2">
										<KeyRound className="size-4 text-muted-foreground" />
										<span>API-Token erzeugen</span>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-3 text-muted-foreground text-pretty">
									<ul className="list-disc pl-5 space-y-1">
										<li>
											Unter{' '}
											<Link
												href="/settings"
												className="font-medium text-primary underline underline-offset-4"
											>
												Einstellungen
											</Link>{' '}
											→ <strong className="text-foreground">API-Token</strong>{' '}
											ein neues Token erstellen.
										</li>
										<li>
											Den Klartext{' '}
											<strong className="text-foreground">
												sofort kopieren
											</strong>{' '}
											(wird nur einmal angezeigt).
										</li>
										<li>
											Token gilt 30 Tage und kann in derselben Ansicht
											widerrufen werden.
										</li>
									</ul>
									<div className="rounded-lg border bg-muted/30 p-3">
										<code className="text-xs break-all">
											Authorization: Bearer DEIN_TOKEN
										</code>
									</div>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="endpoint">
								<AccordionTrigger>
									<div className="flex items-center gap-2">
										<Terminal className="size-4 text-muted-foreground" />
										<span>MCP-Endpunkt</span>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-3 text-muted-foreground text-pretty">
									<p>
										JSON-RPC über HTTPS POST. Der Endpunkt ist fix und lautet{' '}
										<code className="text-xs bg-muted px-1 rounded">/mcp</code>.
									</p>
									<div className="rounded-lg border bg-muted/30 p-3">
										<code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
											{MCP_URL}
										</code>
									</div>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="cursor">
								<AccordionTrigger>
									<span>Cursor konfigurieren</span>
								</AccordionTrigger>
								<AccordionContent className="space-y-3 text-muted-foreground text-pretty">
									<p>
										Du kannst die Konfiguration in{' '}
										<code className="text-xs bg-muted px-1 rounded">
											.cursor/mcp.json
										</code>{' '}
										ablegen oder in den Cursor Settings eintragen.
									</p>
									<div className="rounded-lg border bg-muted/30 p-3 overflow-x-auto">
										<pre className="text-xs leading-relaxed">
											{`{
  "mcpServers": {
    "campus-life-events": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer DEIN_API_TOKEN",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-03-26"
      }
    }
  }
}`}
										</pre>
									</div>
									<p className="text-xs">
										Wichtig: Token nicht committen. Wenn die Datei Secrets
										enthält, sollte sie in der{' '}
										<code className="text-xs bg-muted px-1 rounded">
											.gitignore
										</code>{' '}
										stehen.
									</p>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="other">
								<AccordionTrigger>Claude &amp; andere Clients</AccordionTrigger>
								<AccordionContent className="space-y-2 text-muted-foreground text-pretty">
									<p>
										Wenn dein Setup HTTP-basierte MCP-Server unterstützt,
										verwende dieselbe{' '}
										<code className="text-xs bg-muted px-1 rounded">url</code>{' '}
										und dieselben{' '}
										<code className="text-xs bg-muted px-1 rounded">
											headers
										</code>
										.
									</p>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Available tools</CardTitle>
						<CardDescription>
							Die Tool-Liste entspricht dem Backend (siehe{' '}
							<code className="text-xs bg-muted px-1 rounded">
								backend/src/routes/mcp.rs
							</code>
							). Welche Tools du siehst, hängt vom Account-Typ ab (Organizer vs
							Admin).
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<p className="text-sm font-medium">Search</p>
								<p className="text-xs text-muted-foreground">
									Filter by tool name, description, or argument keys.
								</p>
							</div>
							<div className="w-full sm:max-w-sm">
								<Input
									value={toolFilter}
									onChange={(e) => setToolFilter(e.target.value)}
									placeholder="e.g. event, newsletter, invite…"
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

				<div className="flex flex-wrap gap-3">
					<Button asChild>
						<Link href="/settings">API-Token</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="/">Dashboard</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
