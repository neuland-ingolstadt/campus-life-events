'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BookOpen, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { listAuditLogs, listOrganizersAdmin } from '@/client'
import type { AuditLogEntry, OrganizerWithInvite } from '@/client/types.gen'
import { Users } from '@/components/animate-ui/icons/users'
import { AuditDetailsModal } from '@/components/audit-details-modal'
import { CreateOrganizerDialog } from '@/components/create-organizer-dialog'
import { InviteAdminDialog } from '@/components/invite-admin-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

const AUDIT_SKELETON_KEYS = Array.from(
	{ length: 6 },
	(_, idx) => `audit-skeleton-${idx}`
)

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

export function AdminDashboardClient() {
	const qc = useQueryClient()
	const { data: meData, isLoading: meLoading } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me,
		retry: false
	})
	const isAdmin = meData?.account_type === 'ADMIN'

	const {
		data: organizers = [],
		isLoading: isOrganizersLoading,
		refetch: refetchOrganizers
	} = useQuery<OrganizerWithInvite[]>({
		queryKey: ['organizers-admin'],
		queryFn: async () => {
			const response = await listOrganizersAdmin({ throwOnError: true })
			return response.data ?? []
		},
		enabled: !!meData && isAdmin
	})

	const {
		data: auditLogs = [],
		isLoading: isAuditLoading,
		refetch: refetchAudit
	} = useQuery<AuditLogEntry[]>({
		queryKey: ['audit-logs', 'admin'],
		queryFn: async () => {
			const response = await listAuditLogs({
				query: { limit: 50 },
				throwOnError: true
			})
			return response.data ?? []
		},
		enabled: !!meData && isAdmin
	})

	const organizerMap = useMemo(() => {
		const map = new Map<number, string>()

		for (const org of organizers) {
			map.set(org.id, org.name)
		}
		return map
	}, [organizers])

	const onRefresh = () => {
		void Promise.all([refetchOrganizers(), refetchAudit()])
		toast.success('Aktualisierung erfolgreich')
	}

	// Show loading state while checking authentication
	if (meLoading) {
		return (
			<div className="flex flex-col min-h-screen">
				<header
					className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4"
					style={{
						backdropFilter: 'blur(8px)',
						WebkitBackdropFilter: 'blur(8px)'
					}}
				>
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<h1 className="text-lg font-semibold">Adminbereich</h1>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						Lade Adminbereich…
					</div>
				</div>
			</div>
		)
	}

	// Show error state if not authenticated or not admin
	if (!meData || !isAdmin) {
		return (
			<div className="flex flex-col min-h-screen">
				<header
					className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4"
					style={{
						backdropFilter: 'blur(8px)',
						WebkitBackdropFilter: 'blur(8px)'
					}}
				>
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<h1 className="text-lg font-semibold">Adminbereich</h1>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold mb-2">Zugriff verweigert</h2>
						<p className="text-muted-foreground mb-4">
							Du benötigst Administratorrechte, um diesen Bereich zu sehen.
						</p>
						<Link href="/">
							<Button>Zurück zum Dashboard</Button>
						</Link>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header
				className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4"
				style={{
					backdropFilter: 'blur(8px)',
					WebkitBackdropFilter: 'blur(8px)'
				}}
			>
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<h1 className="text-lg font-semibold">Adminbereich</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Verwaltung</h2>
						<p className="text-muted-foreground mt-1 max-w-2xl">
							Verwende diese Seite, um neue Vereine einzuladen, bestehende zu
							verwalten und Änderungen im System nachzuvollziehen.
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-2"
							onClick={onRefresh}
						>
							<RefreshCw className="h-4 w-4" /> Aktualisieren
						</Button>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Vereine verwalten</CardTitle>
								<p className="text-sm text-muted-foreground">
									Lade neue Vereine ein oder öffne die detaillierte Verwaltung.
								</p>
							</div>
							<Badge variant="outline" className="text-xs">
								{isOrganizersLoading || meLoading
									? '…'
									: `${organizers.length} Vereine`}
							</Badge>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<CreateOrganizerDialog
								onSuccess={() => {
									void refetchOrganizers()
									void qc.invalidateQueries({ queryKey: ['organizers'] })
								}}
							/>
							<Button
								asChild
								variant="secondary"
								className="flex items-center gap-2"
							>
								<Link href="/organizers/manage">
									<Users className="h-4 w-4" /> Vereine verwalten
								</Link>
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Admin-Team</CardTitle>
								<p className="text-sm text-muted-foreground">
									Lade weitere Administrator*innen zur Plattform ein oder
									verwalte das Team.
								</p>
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<InviteAdminDialog />
							<Button
								asChild
								variant="secondary"
								className="flex items-center gap-2"
							>
								<Link href="/admin/manage">
									<ShieldCheck className="h-4 w-4" /> Administrator*innen
									verwalten
								</Link>
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Analysen & Audit</CardTitle>
								<p className="text-sm text-muted-foreground">
									Behalte Änderungen im Blick oder öffne die Analyseübersicht.
								</p>
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<Button
								asChild
								variant="outline"
								className="flex items-center gap-2"
							>
								<Link href="/analytics">
									<BookOpen className="h-4 w-4" /> Zur Analyseübersicht
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
						<CardTitle>Neueste Audit-Log-Einträge</CardTitle>
						<p className="text-sm text-muted-foreground">
							Die letzten Änderungen an Events und Vereinen.
						</p>
					</CardHeader>
					<CardContent>
						{isAuditLoading || meLoading ? (
							<div className="space-y-2">
								{AUDIT_SKELETON_KEYS.map((key) => (
									<div
										key={key}
										className="h-10 animate-pulse rounded bg-muted"
									/>
								))}
							</div>
						) : auditLogs.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Keine Audit-Log-Einträge gefunden.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="text-left text-muted-foreground">
										<tr>
											<th className="py-2 pr-4 font-medium">Zeitpunkt</th>
											<th className="py-2 pr-4 font-medium">Verein</th>
											<th className="py-2 pr-4 font-medium">Aktion</th>
											<th className="py-2 pr-4 font-medium">Geändert von</th>
											<th className="py-2 pr-4 font-medium">Event-ID</th>
										</tr>
									</thead>
									<tbody>
										{auditLogs.map((entry) => (
											<AuditDetailsModal
												key={entry.id}
												entry={entry}
												organizerName={organizerMap.get(entry.organizer_id)}
											>
												<tr className="border-t cursor-pointer hover:bg-muted/50 transition-colors">
													<td className="py-2 pr-4 align-top whitespace-nowrap">
														{format(new Date(entry.at), 'dd.MM.yyyy HH:mm')}
													</td>
													<td className="py-2 pr-4 align-top">
														{organizerMap.get(entry.organizer_id) ||
															`#${entry.organizer_id}`}
													</td>
													<td className="py-2 pr-4 align-top">
														<Badge variant="secondary" className="uppercase">
															{formatAuditType(entry.type)}
														</Badge>
													</td>
													<td className="py-2 pr-4 align-top">
														{entry.user_id
															? `User #${entry.user_id}`
															: 'Unbekannt'}
													</td>
													<td className="py-2 pr-4 align-top">
														{entry.event_id}
													</td>
												</tr>
											</AuditDetailsModal>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
