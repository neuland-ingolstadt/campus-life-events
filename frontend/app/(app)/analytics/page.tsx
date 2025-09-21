'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis
} from 'recharts'
import { listAuditLogs, listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer,
	AuditLogEntry
} from '@/client/types.gen'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { SidebarTrigger } from '@/components/ui/sidebar'

const COLORS = {
	CREATE: 'hsl(var(--chart-1))',
	UPDATE: 'hsl(var(--chart-2))',
	DELETE: 'hsl(var(--chart-3))'
}

export default function AnalyticsPage() {
	const [days, setDays] = useState(30)
	const [search, setSearch] = useState('')

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
			const response = await listEvents({ throwOnError: true })
			return response.data ?? []
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

	const since = new Date()
	since.setDate(since.getDate() - days)

	const filtered = useMemo(() => {
		let rows = auditLogs.filter((r) => new Date(r.at) >= since)
		if (search.trim()) {
			const q = search.toLowerCase()
			rows = rows.filter((r) => {
				const ev = events.find((e) => e.id === r.event_id)
				const orgName = orgMap.get(r.organizer_id) ?? ''
				return (
					String(r.event_id).includes(q) ||
					ev?.title_de?.toLowerCase().includes(q) ||
					ev?.title_en?.toLowerCase().includes(q) ||
					orgName.toLowerCase().includes(q)
				)
			})
		}
		return rows
	}, [auditLogs, since, search, events, orgMap])

	const timeline = useMemo(() => {
		const buckets = new Map<
			string,
			{ date: string; CREATE: number; UPDATE: number; DELETE: number }
		>()
		for (const r of filtered) {
			const d = format(new Date(r.at), 'yyyy-MM-dd')
			if (!buckets.has(d))
				buckets.set(d, { date: d, CREATE: 0, UPDATE: 0, DELETE: 0 })
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
			.slice(0, 10)
	}, [filtered, events])

	const total = filtered.length

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Analysen</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				<div className="flex items-center justify-between gap-4">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Analysen</h2>
						<p className="text-sm text-muted-foreground">
							Einblicke aus dem Audit-Log der letzten {days} Tage
						</p>
					</div>
					<div className="flex gap-2 items-center">
						<Input
							placeholder="Events/Vereine suchen"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-[220px]"
						/>
						<Select
							value={String(days)}
							onValueChange={(v) => setDays(parseInt(v, 10))}
						>
							<SelectTrigger className="w-[140px]">
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
				</div>

				{/* KPI cards */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Änderungen gesamt</CardDescription>
							<CardTitle className="text-2xl">{total}</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Erstellungen</CardDescription>
							<CardTitle className="text-2xl">{byType.CREATE || 0}</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Aktualisierungen</CardDescription>
							<CardTitle className="text-2xl">{byType.UPDATE || 0}</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>Löschungen</CardDescription>
							<CardTitle className="text-2xl">{byType.DELETE || 0}</CardTitle>
						</CardHeader>
					</Card>
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					{/* Timeline line chart */}
					<Card>
						<CardHeader>
							<CardTitle>Veränderungen im Zeitverlauf</CardTitle>
							<CardDescription>
								Tägliche Anzahl nach Typ gruppiert
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									CREATE: { label: 'Erstellung', color: COLORS.CREATE },
									UPDATE: { label: 'Aktualisierung', color: COLORS.UPDATE },
									DELETE: { label: 'Löschung', color: COLORS.DELETE }
								}}
								className="h-72"
							>
								<LineChart data={timeline} margin={{ left: 8, right: 8 }}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="date"
										tickFormatter={(v) => format(new Date(v), 'MM/dd')}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										allowDecimals={false}
										tickLine={false}
										axisLine={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Line
										type="monotone"
										dataKey="CREATE"
										stroke={COLORS.CREATE}
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="UPDATE"
										stroke={COLORS.UPDATE}
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="DELETE"
										stroke={COLORS.DELETE}
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Top changed events */}
					<Card>
						<CardHeader>
							<CardTitle>Meist geänderte Events</CardTitle>
							<CardDescription>Meiste Aktivität im Zeitraum</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: { label: 'Änderungen', color: 'hsl(var(--chart-4))' }
								}}
								className="h-72"
							>
								<BarChart data={byEvent} margin={{ left: 8, right: 8 }}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="title"
										tickLine={false}
										axisLine={false}
										interval={0}
										angle={-20}
										height={70}
										tick={{ fontSize: 10 }}
									/>
									<YAxis
										allowDecimals={false}
										tickLine={false}
										axisLine={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="hsl(var(--chart-4))" radius={4} />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
