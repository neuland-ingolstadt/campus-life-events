'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Label,
	Line,
	LineChart,
	Pie,
	PieChart,
	PolarGrid,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
	XAxis,
	YAxis
} from 'recharts'
import { listAuditLogs, listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer,
	AuditLogEntry
} from '@/client/types.gen'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
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
	CREATE: 'var(--chart-2)',
	UPDATE: 'var(--chart-1)',
	DELETE: 'var(--chart-5)'
} as const

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

	const byTypeData = useMemo(
		() =>
			(Object.keys(byType) as Array<keyof typeof byType>).map((k) => ({
				name: k,
				value: byType[k]
			})),
		[byType]
	)

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

				{/* KPI gauges */}
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{[
						{
							key: 'total',
							title: 'Änderungen gesamt',
							value: total,
							color: 'var(--chart-2)',
							gradient: 'from-blue-500/5 to-cyan-500/5'
						},
						{
							key: 'create',
							title: 'Erstellungen',
							value: byType.CREATE || 0,
							color: 'var(--chart-3)',
							gradient: 'from-green-500/5 to-emerald-500/5'
						},
						{
							key: 'update',
							title: 'Aktualisierungen',
							value: byType.UPDATE || 0,
							color: 'var(--chart-4)',
							gradient: 'from-purple-500/5 to-pink-500/5'
						},
						{
							key: 'delete',
							title: 'Löschungen',
							value: byType.DELETE || 0,
							color: 'var(--chart-5)',
							gradient: 'from-red-500/5 to-orange-500/5'
						}
					].map((kpi) => (
						<Card
							key={kpi.key}
							className="flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
						>
							<div
								className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
							/>
							<CardHeader className="items-center pb-0 relative">
								<CardTitle className="text-center line-clamp-1">
									{kpi.title}
								</CardTitle>
								<CardDescription>Letzte {days} Tage</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 pb-0 relative">
								<ChartContainer
									config={{
										value: {
											label: kpi.title,
											theme: { light: 'var(--chart-1)', dark: 'var(--chart-1)' }
										}
									}}
									className="mx-auto aspect-square max-h-[220px]"
								>
									<RadialBarChart
										data={[
											{
												key: 'value',
												value: kpi.value,
												fill: 'var(--color-value)'
											}
										]}
										endAngle={100}
										innerRadius={70}
										outerRadius={120}
									>
										<PolarGrid
											gridType="circle"
											radialLines={false}
											stroke="none"
											className="first:fill-muted last:fill-background"
											polarRadius={[86, 74]}
										/>
										<RadialBar
											dataKey="value"
											fill="var(--color-value)"
											background
										/>
										<PolarRadiusAxis
											tick={false}
											tickLine={false}
											axisLine={false}
										>
											<Label
												content={({ viewBox }) => {
													if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
														return (
															<text
																x={viewBox.cx}
																y={viewBox.cy}
																textAnchor="middle"
																dominantBaseline="middle"
															>
																<tspan
																	x={viewBox.cx}
																	y={viewBox.cy}
																	className="fill-foreground text-3xl font-bold"
																>
																	{kpi.value.toLocaleString()}
																</tspan>
																<tspan
																	x={viewBox.cx}
																	y={(viewBox.cy || 0) + 20}
																	className="fill-muted-foreground"
																>
																	{kpi.title}
																</tspan>
															</text>
														)
													}
												}}
											/>
										</PolarRadiusAxis>
									</RadialBarChart>
								</ChartContainer>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Top 4 gauge stats removed */}

				<div className="grid gap-6 lg:grid-cols-2">
					{/* Timeline line chart */}
					<Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
						<div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<CardHeader className="relative">
							<CardTitle>Veränderungen im Zeitverlauf</CardTitle>
							<CardDescription>
								Tägliche Anzahl nach Typ gruppiert
							</CardDescription>
						</CardHeader>
						<CardContent className="relative">
							<ChartContainer
								config={{
									CREATE: { label: 'Create', color: COLORS.CREATE },
									UPDATE: { label: 'Update', color: COLORS.UPDATE },
									DELETE: { label: 'Delete', color: COLORS.DELETE }
								}}
								className="h-72 aspect-square mx-auto"
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
						</CardContent>
					</Card>

					{/* Top changed events */}
					<Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
						<div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<CardHeader className="relative">
							<CardTitle>Meist geänderte Events</CardTitle>
							<CardDescription>Meiste Aktivität im Zeitraum</CardDescription>
						</CardHeader>
						<CardContent className="relative">
							<ChartContainer
								config={{
									count: {
										label: 'Änderungen',
										theme: {
											light: 'var(--chart-1)',
											dark: 'var(--chart-1)'
										}
									}
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
									<Bar dataKey="count" fill="var(--color-count)" radius={4} />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{/* Distribution by type (fancy pie chart) */}
				<div className="grid gap-6 lg:grid-cols-3">
					<Card className="lg:col-span-1 group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
						<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<CardHeader className="relative">
							<CardTitle>Verteilung nach Typ</CardTitle>
							<CardDescription>Create / Update / Delete</CardDescription>
						</CardHeader>
						<CardContent className="relative">
							<ChartContainer
								config={{
									CREATE: { label: 'Create', color: COLORS.CREATE },
									UPDATE: { label: 'Update', color: COLORS.UPDATE },
									DELETE: { label: 'Delete', color: COLORS.DELETE }
								}}
								className="h-72 aspect-square mx-auto"
							>
								<PieChart>
									<Pie
										data={byTypeData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={50}
										outerRadius={80}
										paddingAngle={2}
										stroke="none"
									>
										{byTypeData.map((entry) => (
											<Cell
												key={entry.name}
												fill={`var(--color-${entry.name})`}
											/>
										))}
									</Pie>
									<ChartTooltip
										content={<ChartTooltipContent nameKey="name" />}
									/>
									<ChartLegend
										content={<ChartLegendContent nameKey="name" />}
									/>
								</PieChart>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Audit logs table */}
					<Card className="lg:col-span-2 group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
						<div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						<CardHeader className="relative">
							<CardTitle>Audit-Log</CardTitle>
							<CardDescription>Einträge im gewählten Zeitraum</CardDescription>
						</CardHeader>
						<CardContent className="relative">
							<DataTable<AuditRow, unknown>
								tableId="analytics-audit"
								columns={[
									{
										accessorKey: 'at',
										header: ({ column }) => (
											<DataTableColumnHeader
												column={column}
												title="Zeitpunkt"
											/>
										),
										cell: ({ row }) => (
											<span>{format(row.original.at, 'dd.MM.yyyy HH:mm')}</span>
										)
									},
									{
										accessorKey: 'type',
										header: ({ column }) => (
											<DataTableColumnHeader column={column} title="Typ" />
										),
										cell: ({ row }) => (
											<span>
												{row.original.type === 'CREATE'
													? 'Create'
													: row.original.type === 'UPDATE'
														? 'Update'
														: 'Delete'}
											</span>
										)
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
											<DataTableColumnHeader column={column} title="Verein" />
										)
									}
								]}
								data={auditRows}
								enablePagination
								initialPageSize={10}
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
