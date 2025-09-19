'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
	CalendarDays,
	Clock3,
	Pencil,
	Plus,
	RefreshCw,
	Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { deleteEvent, listEvents, listOrganizers } from '@/client'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import { dateRangeFilter } from '@/components/data-table/date-range-filter'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

interface Event {
	id: number
	title_de: string
	title_en?: string
	description_de?: string
	description_en?: string
	start_date_time: string
	end_date_time?: string
	organizer_id: number
}

interface Organizer {
	id: number
	name: string
}

export default function EventsPage() {
	const qc = useQueryClient()
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const userId = meData?.id as number | undefined

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['events'],
		queryFn: () => listEvents()
	})

	const { data: organizersData } = useQuery({
		queryKey: ['organizers'],
		queryFn: () => listOrganizers()
	})

	const getOrganizerName = useCallback(
		(organizerId: number) => {
			const organizer = organizersData?.data?.find(
				(org: Organizer) => org.id === organizerId
			)
			return organizer?.name || 'Unbekannter Verein'
		},
		[organizersData]
	)

	const events = useMemo(() => (data?.data ?? []) as Event[], [data])

	const onDelete = useCallback(
		async (id: number) => {
			await deleteEvent({ path: { id } })
			await qc.invalidateQueries({ queryKey: ['events'] })
		},
		[qc]
	)

	const columns: ColumnDef<Event>[] = useMemo(
		() => [
			{
				accessorKey: 'title_de',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Eventtitel" />
				),
				cell: ({ row }) => (
					<div className="max-w-[380px] space-y-1">
						<div className="font-medium text-sm leading-tight">
							{row.original.title_de}
						</div>
						{row.original.title_en &&
							row.original.title_en !== row.original.title_de && (
								<div className="text-xs text-muted-foreground leading-tight">
									{row.original.title_en}
								</div>
							)}
						{row.original.description_de && (
							<div className="text-xs text-muted-foreground line-clamp-1">
								{row.original.description_de}
							</div>
						)}
					</div>
				),
				size: 300
			},
			{
				accessorKey: 'start_date_time',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Startdatum" />
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2 text-sm">
						<CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						<div>
							<div className="font-medium">
								{format(new Date(row.original.start_date_time), 'MMM dd, yyyy')}
							</div>
							<div className="text-xs text-muted-foreground">
								{format(new Date(row.original.start_date_time), 'HH:mm')}
							</div>
						</div>
					</div>
				),
				sortingFn: (a, b, id) =>
					new Date(a.getValue(id) as string).getTime() -
					new Date(b.getValue(id) as string).getTime(),
				filterFn: dateRangeFilter,
				size: 150
			},
			{
				accessorKey: 'end_date_time',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Enddatum" />
				),
				cell: ({ row }) =>
					row.original.end_date_time ? (
						<div className="flex items-center gap-2 text-sm">
							<Clock3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
							<div>
								<div className="font-medium">
									{format(new Date(row.original.end_date_time), 'MMM dd, yyyy')}
								</div>
								<div className="text-xs text-muted-foreground">
									{format(new Date(row.original.end_date_time), 'HH:mm')}
								</div>
							</div>
						</div>
					) : (
						<span className="text-muted-foreground text-sm">—</span>
					),
				sortingFn: (a, b, id) => {
					const av = a.getValue(id) as string | null
					const bv = b.getValue(id) as string | null
					const at = av ? new Date(av).getTime() : 0
					const bt = bv ? new Date(bv).getTime() : 0
					return at - bt
				},
				size: 150
			},
			{
				id: 'organizer',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Verein" />
				),
				accessorFn: (row) => getOrganizerName(row.organizer_id),
				cell: ({ getValue }) => (
					<div className="text-sm font-medium">{getValue<string>()}</div>
				),
				sortingFn: 'alphanumeric',
				filterFn: (row, _id, value: number[]) => {
					if (!value?.length) return true
					return value.includes(row.original.organizer_id)
				},
				size: 150
			},
			{
				id: 'actions',
				header: 'Aktionen',
				enableHiding: false,
				cell: ({ row }) => {
					const e = row.original
					return (
						<div className="flex justify-center">
							{userId && userId === e.organizer_id ? (
								<div className="flex items-center gap-2">
									<Link href={`/events/${e.id}`}>
										<Button variant="outline" size="sm" className="h-8 px-2">
											<Pencil className="h-4 w-4 mr-1" /> Bearbeiten
										</Button>
									</Link>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="destructive"
												size="sm"
												className="h-8 px-2"
											>
												<Trash2 className="h-4 w-4 mr-1" /> Löschen
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Event löschen</AlertDialogTitle>
												<AlertDialogDescription>
													Bist du sicher, dass du "{e.title_de}" löschen
													möchtest? Diese Aktion kann nicht rückgängig gemacht
													werden.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Abbrechen</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => onDelete(e.id)}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													Löschen
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							) : (
								<span className="text-muted-foreground text-xs">—</span>
							)}
						</div>
					)
				},
				size: 200
			}
		],
		[userId, getOrganizerName, onDelete]
	)

	const organizerOptions = useMemo(() => {
		return (
			organizersData?.data?.map((org: Organizer) => ({
				label: org.name,
				value: org.id.toString()
			})) || []
		)
	}, [organizersData])

	if (isLoading) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">Events</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center">Lade Events...</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">Events</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center text-destructive">
						Fehler beim Laden der Events
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Events</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				{/* Header Section */}
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Events</h2>
						<p className="text-muted-foreground mt-1">
							Verwalte und organisiere Campus-Events mit erweiterten Filtern
						</p>
					</div>
					<div className="flex gap-2 items-center">
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							className="flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Aktualisieren
						</Button>
						{userId && (
							<Link href="/events/new">
								<Button size="sm" className="flex items-center gap-2">
									<Plus className="h-4 w-4" />
									Neues Event
								</Button>
							</Link>
						)}
					</div>
				</div>

				{/* Data Table */}
				<Card>
					<CardHeader>
						<CardTitle>Events ({events.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<DataTable
							tableId="events"
							columns={columns}
							data={events}
							enableFilter
							enablePagination
							initialPageSize={10}
							filterOptions={{
								searchFilter: {
									column: 'title_de',
									title: 'Titel'
								},
								selectFilters: [
									{
										column: 'organizer',
										title: 'Verein',
										options: organizerOptions
									}
								],
								dateRangeFilters: [
									{
										column: 'start_date_time',
										title: 'Zeitraum'
									}
								]
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
