'use client'

import { format } from 'date-fns'
import { Activity, Calendar, User } from 'lucide-react'
import { useState } from 'react'
import type { AuditLogEntry } from '@/client/types.gen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'

interface AuditDetailsModalProps {
	entry: AuditLogEntry
	organizerName?: string
	children: React.ReactNode
}

function formatAuditType(type: AuditLogEntry['type']) {
	switch (type) {
		case 'CREATE':
			return 'Erstellt'
		case 'UPDATE':
			return 'Aktualisiert'
		case 'DELETE':
			return 'Gelöscht'
		default:
			return type
	}
}

function formatJsonData(data: unknown): string {
	if (data === null || data === undefined) {
		return 'Keine Daten'
	}
	return JSON.stringify(data, null, 2)
}

export function AuditDetailsModal({
	entry,
	organizerName,
	children
}: AuditDetailsModalProps) {
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Audit-Log Details
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 overflow-y-auto flex-1">
					{/* Entry Metadata */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">Zeitpunkt</p>
								<p className="text-sm text-muted-foreground">
									{format(new Date(entry.at), 'dd.MM.yyyy HH:mm:ss')}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<User className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">Verein</p>
								<p className="text-sm text-muted-foreground">
									{organizerName || `#${entry.organizer_id}`}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Activity className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">Aktion</p>
								<Badge variant="secondary" className="uppercase">
									{formatAuditType(entry.type)}
								</Badge>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<User className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">Geändert von</p>
								<p className="text-sm text-muted-foreground">
									{entry.user_id ? `User #${entry.user_id}` : 'Unbekannt'}
								</p>
							</div>
						</div>
					</div>

					{/* Event ID */}
					<div className="p-3 bg-muted/30 rounded-lg">
						<p className="text-sm font-medium">Event-ID: {entry.event_id}</p>
					</div>

					{/* JSON Data Comparison */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Old Data */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-red-500"></div>
								<h3 className="font-medium">Alte Werte</h3>
							</div>
							<div className="relative">
								<pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-64 overflow-y-auto border">
									{formatJsonData(entry.old_data)}
								</pre>
							</div>
						</div>

						{/* New Data */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-green-500"></div>
								<h3 className="font-medium">Neue Werte</h3>
							</div>
							<div className="relative">
								<pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-64 overflow-y-auto border">
									{formatJsonData(entry.new_data)}
								</pre>
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-4 border-t">
					<Button variant="outline" onClick={() => setOpen(false)}>
						Schließen
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
