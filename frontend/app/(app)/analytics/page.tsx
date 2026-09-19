'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { listAuditLogs, listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer,
	AuditLogEntry
} from '@/client/types.gen'
import { AuditDetailsModal } from '@/components/audit-details-modal'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { formatInCampusTimeZone } from '@/lib/date-time'

const COLORS = {
	CREATE: 'var(--chart-2)',
	UPDATE: 'var(--chart-1)',
	DELETE: 'var(--chart-5)'
} as const

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

export default function AnalyticsPage() {
	const [days, setDays] = useState(30)

	const { data: auditLogs = [] } = useQuery<AuditLogEntry[]>({
		queryKey: ['audit-logs', days],
		queryFn: async () => {
			const response = await listAuditLogs({
				query: { limit: 5000 },
				throwOnError: true
			})
			return response.data ?? []
		}
	})
	const { data: events = [] } = useQuery<ApiEvent[]>({
		queryKey: ['events'],
		queryFn: async () => {
			const response = await listEvents({
				query: { limit: 5000 },
				throwOnError: true
			})
			return response.data?.items ?? []
		}
	})
	const { data: organizers = [] } = useQuery<ApiOrganizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})
	const orgMap = useMemo(
		() => new Map(organizers.map((o) => [o.id, o.name])),
		[organizers]
	)
	const auditById = useMemo(
		() => new Map(auditLogs.map((entry) => [entry.id, entry])),
		[auditLogs]
	)

	const since = useMemo(() => {
		const value = new Date()
		value.setDate(value.getDate() - days)
		return value
	}, [days])

	const filtered = useMemo(() => {
		return auditLogs.filter((r) => new Date(r.at) >= since)
	}, [auditLogs, since])

	const timeline = useMemo(() => {
		const buckets = new Map<
			string,
			{ date: string; CREATE: number; UPDATE: number; DELETE: number }
		>()
		for (const r of filtered) {
			const d = formatInCampusTimeZone(new Date(r.at), 'yyyy-MM-dd')
			if (!buckets.has(d)) {
				buckets.set(d, { date: d, CREATE: 0, UPDATE: 0, DELETE: 0 })
			}
			const bucket = buckets.get(d)
			if (!bucket) continue
			bucket[r.type] += 1
		}
		return Array.from(buckets.values()).sort((a, b) =>
			a.date.localeCompare(b.date)
		)
	}, [filtered])

	const byType = useMemo(() => {
		const acc: Record<AuditLogEntry['type'], number> = {
			CREATE: 0,
			UPDATE: 0,
			DELETE: 0
		}
		for (const r of filtered) {
			acc[r.type] += 1
		}
		return acc
	}, [filtered])

	const byEvent = useMemo(() => {
		const acc = new Map<number, number>()
		for (const r of filtered) {
			acc.set(r.event_id, (acc.get(r.event_id) ?? 0) + 1)
		}
		return Array.from(acc.entries())
			.map(([id, count]) => ({
				id,
				count,
				title: events.find((e) => e.id === id)?.title_de || `Event Nr. ${id}`
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8)
	}, [filtered, events])

	const total = filtered.length

	const auditRows = useMemo(
		() =>
			filtered.map((r) => {
				const ev = events.find((e) => e.id === r.event_id)
				return {
					id: r.id,
					at: new Date(r.at),
					type: r.type,
					eventTitle: ev?.title_de || ev?.title_en || `Event Nr. ${r.event_id}`,
					organizer: orgMap.get(r.organizer_id) || String(r.organizer_id)
				}
			}),
		[filtered, events, orgMap]
	)

	type AuditRow = (typeof auditRows)[number]

	const kpis = [
		{ key: 'total', label: 'Änderungen', value: total },
		{ key: 'create', label: 'Erstellt', value: byType.CREATE },
		{ key: 'update', label: 'Aktualisiert', value: byType.UPDATE },
		{ key: 'delete', label: 'Gelöscht', value: byType.DELETE }
	] as const

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Analysen</h1>
				</div>
			</header>

			<div className="mb-12 flex-1 space-y-8 p-4 pt-6 md:p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Analysen</h2>
						<p className="mt-1 text-muted-foreground">
							Aktivität aus dem Audit-Log der letzten {days} Tage
						</p>
					</div>
					<Select
						value={String(days)}
						onValueChange={(v) => setDays(parseInt(v, 10))}
					>
						<SelectTrigger className="w-full sm:w-[150px]">
							<SelectValue placeholder="Zeitraum" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7">Letzte 7 Tage</SelectItem>
							<SelectItem value="14">Letzte 14 Tage</SelectItem>
							<SelectItem value="30">Letzte 30 Tage</SelectItem>
							<SelectItem value="90">Letzte 90 Tage</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{kpis.map((kpi) => (
						<div
							key={kpi.key}
							className="flex flex-col justify-between rounded-lg border bg-card p-5"
						>
							<p className="text-sm font-medium">{kpi.label}</p>
							<p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">
								{kpi.value.toLocaleString('de-DE')}
							</p>
						</div>
					))}
				</section>

				<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
					<div className="space-y-3">
						<div>
							<h3 className="text-lg font-semibold">Aktivität</h3>
							<p className="text-sm text-muted-foreground">
								Tägliche Änderungen nach Typ
							</p>
						</div>
						<div className="rounded-lg border bg-card p-4 sm:p-5">
							{timeline.length === 0 ? (
								<p className="py-16 text-center text-sm text-muted-foreground">
									Keine Aktivität in diesem Zeitraum.
								</p>
							) : (
								<ChartContainer
									config={{
										CREATE: { label: 'Erstellt', color: COLORS.CREATE },
										UPDATE: { label: 'Aktualisiert', color: COLORS.UPDATE },
										DELETE: { label: 'Gelöscht', color: COLORS.DELETE }
									}}
									className="h-72 w-full"
								>
									<LineChart data={timeline} margin={{ left: 4, right: 8 }}>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="date"
											tickFormatter={(v) =>
												formatInCampusTimeZone(new Date(v), 'dd.MM.')
											}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											allowDecimals={false}
											tickLine={false}
											axisLine={false}
											width={28}
										/>
										<ChartTooltip content={<ChartTooltipContent />} />
										<ChartLegend content={<ChartLegendContent />} />
										<Line
											type="monotone"
											dataKey="CREATE"
											stroke="var(--color-CREATE)"
											strokeWidth={2}
											dot={false}
										/>
										<Line
											type="monotone"
											dataKey="UPDATE"
											stroke="var(--color-UPDATE)"
											strokeWidth={2}
											dot={false}
										/>
										<Line
											type="monotone"
											dataKey="DELETE"
											stroke="var(--color-DELETE)"
											strokeWidth={2}
											dot={false}
										/>
									</LineChart>
								</ChartContainer>
							)}
						</div>
					</div>

					<div className="space-y-3">
						<div>
							<h3 className="text-lg font-semibold">Häufig geändert</h3>
							<p className="text-sm text-muted-foreground">
								Events mit den meisten Einträgen
							</p>
						</div>
						<div className="rounded-lg border bg-card p-4 sm:p-5">
							{byEvent.length === 0 ? (
								<p className="py-8 text-center text-sm text-muted-foreground">
									Noch nichts zu zeigen.
								</p>
							) : (
								<ol className="space-y-3">
									{byEvent.map((item, index) => (
										<li
											key={item.id}
											className="flex items-baseline justify-between gap-3"
										>
											<div className="flex min-w-0 items-baseline gap-2.5">
												<span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
													{index + 1}
												</span>
												<span className="truncate text-sm font-medium">
													{item.title}
												</span>
											</div>
											<span className="shrink-0 text-sm tabular-nums text-muted-foreground">
												{item.count}
											</span>
										</li>
									))}
								</ol>
							)}
						</div>
					</div>
				</section>

				<section className="space-y-3">
					<div>
						<h3 className="text-lg font-semibold">Audit-Log</h3>
						<p className="text-sm text-muted-foreground">
							{auditRows.length.toLocaleString('de-DE')} Einträge im gewählten
							Zeitraum
						</p>
					</div>
					<div className="rounded-lg border bg-card p-4 sm:p-5">
						<DataTable<AuditRow, unknown>
							tableId="analytics-audit"
							columns={[
								{
									accessorKey: 'at',
									header: ({ column }) => (
										<DataTableColumnHeader column={column} title="Zeitpunkt" />
									),
									cell: ({ row }) => {
										const entry = auditById.get(row.original.id)
										const label = (
											<span className="tabular-nums">
												{formatInCampusTimeZone(
													row.original.at,
													'dd.MM.yyyy HH:mm'
												)}
											</span>
										)
										if (!entry) {
											return label
										}
										return (
											<AuditDetailsModal
												entry={entry}
												organizerName={row.original.organizer}
											>
												<button
													type="button"
													className="rounded-sm text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													{label}
												</button>
											</AuditDetailsModal>
										)
									}
								},
								{
									accessorKey: 'type',
									header: ({ column }) => (
										<DataTableColumnHeader column={column} title="Typ" />
									),
									cell: ({ row }) => formatAuditType(row.original.type)
								},
								{
									accessorKey: 'eventTitle',
									header: ({ column }) => (
										<DataTableColumnHeader column={column} title="Event" />
									)
								},
								{
									accessorKey: 'organizer',
									header: ({ column }) => (
										<DataTableColumnHeader
											column={column}
											title="Organisation"
										/>
									)
								}
							]}
							data={auditRows}
							enablePagination
							initialPageSize={10}
						/>
					</div>
				</section>
			</div>
		</div>
	)
}
