'use client'

import { ArrowLeft, KeyRound, Sparkles, Terminal } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'

const MCP_URL = 'https://cl.neuland.ing/mcp'

export default function McpSetupPage() {
	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2 min-w-0">
					<h1 className="text-lg font-semibold truncate">MCP Setup</h1>
				</div>
			</header>

			<div className="flex-1 space-y-8 p-4 md:p-8 pt-6 mb-12 max-w-3xl">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-4" />
					Dashboard
				</Link>

				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Sparkles className="size-8 text-violet-500 shrink-0" />
						<h2 className="text-3xl font-bold tracking-tight">
							Events &amp; Verein per KI verwalten
						</h2>
					</div>
					<p className="text-muted-foreground text-pretty">
						Über das{' '}
						<a
							href="https://modelcontextprotocol.io"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-4 hover:text-foreground"
						>
							Model Context Protocol (MCP)
						</a>{' '}
						kannst du in unterstützten KI-Clients (z.&nbsp;B. Cursor oder
						Claude) Tools nutzen: Events anlegen und bearbeiten, Vereinsprofil
						pflegen, Newsletter-Daten abrufen und mehr. Verbindung und
						Authentifizierung laufen über HTTPS und einen persönlichen
						API-Token.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-xl">
							<KeyRound className="size-5" />
							1. API-Token erzeugen
						</CardTitle>
						<CardDescription>
							Nur Vereinskonten (Organizer) können MCP mit diesen Tokens nutzen.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm text-pretty">
						<ol className="list-decimal pl-5 space-y-2">
							<li>
								Öffne{' '}
								<Link
									href="/settings"
									className="font-medium text-primary underline underline-offset-4"
								>
									Einstellungen
								</Link>
								.
							</li>
							<li>
								Unter <strong>API-Token</strong> auf{' '}
								<strong>Neues Token</strong> klicken, optional eine Bezeichnung
								eintragen (z.&nbsp;B. &quot;Cursor Laptop&quot;).
							</li>
							<li>
								Den angezeigten Klartext{' '}
								<strong>sofort kopieren und sicher aufbewahren</strong> — er
								wird nur einmal angezeigt. Gültigkeit: 30&nbsp;Tage ab
								Erstellung; widerrufen kannst du Token in derselben Ansicht.
							</li>
						</ol>
						<p className="text-muted-foreground">
							Bei jedem MCP-Aufruf sendet der Client den Header{' '}
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								Authorization: Bearer DEIN_TOKEN
							</code>
							.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-xl">
							<Terminal className="size-5" />
							2. MCP-Endpunkt
						</CardTitle>
						<CardDescription>
							JSON-RPC über HTTPS POST — unser MCP-Endpunkt ist fix und lautet{' '}
							<code className="text-xs bg-muted px-1 rounded">/mcp</code>.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<p className="text-muted-foreground">MCP-URL:</p>
						<div className="rounded-lg border bg-muted/30 p-3">
							<code className="text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
								{MCP_URL}
							</code>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">3. Cursor</CardTitle>
						<CardDescription>
							Projektdatei{' '}
							<code className="text-xs bg-muted px-1 rounded">
								.cursor/mcp.json
							</code>{' '}
							oder MCP-Eintrag in den Cursor Settings.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm text-pretty">
						<ol className="list-decimal pl-5 space-y-2">
							<li>
								Die Konfiguration unten kannst du{' '}
								<strong>1:1 übernehmen</strong>. Du musst nur den Token
								einsetzen:
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded mx-1">
									headers.Authorization
								</code>
								auf{' '}
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
									Bearer …
								</code>{' '}
								mit dem kopierten Token.
							</li>
							<li>
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
									Accept
								</code>{' '}
								und{' '}
								<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
									MCP-Protocol-Version
								</code>{' '}
								wie im Beispiel — damit ist das Verhalten dasselbe wie bei einem
								Standard-MCP-over-HTTP-Client.
							</li>
							<li>Cursor neu laden bzw. MCP-Server aktivieren.</li>
						</ol>
						<p className="text-muted-foreground">Beispiel (Token einsetzen):</p>
						<pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border leading-relaxed">
							{`{
  "mcpServers": {
    "campus-life-events-local": {
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
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-xl">
							4. Claude &amp; andere Clients
						</CardTitle>
						<CardDescription>
							Je nach Produkt (Claude Desktop, Claude Code, API) unterscheidet
							sich die Konfiguration.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-pretty text-muted-foreground">
						<p>
							Wenn dein Setup{' '}
							<strong className="text-foreground font-medium">
								HTTP-basierte MCP-Server
							</strong>{' '}
							unterstützt, dieselbe{' '}
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								url
							</code>{' '}
							und dieselben{' '}
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								headers
							</code>{' '}
							wie oben verwenden.
						</p>
						<p>
							Token nicht committen;{' '}
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								.cursor/mcp.json
							</code>{' '}
							gehört in die{' '}
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								.gitignore
							</code>
							, wenn sie Secrets enthält.
						</p>
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
