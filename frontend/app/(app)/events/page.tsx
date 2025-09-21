'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { deleteEvent, listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'
import { DataTable } from '@/components/data-table/data-table'
import { EventsHeader } from '@/components/events/events-header'
import { EventsPageShell } from '@/components/events/events-page-shell'
import { useEventColumns } from '@/components/events/use-event-columns'
import { EventsCalendar } from '@/components/events-calendar'
import { me } from '@/lib/auth'

export default function EventsPage() {
	'use no memo'
	const qc = useQueryClient()
	const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const organizerId = meData?.organizer_id ?? undefined
	const isAdmin = meData?.account_type === 'ADMIN'

	const { data, isLoading, error, refetch } = useQuery<ApiEvent[]>({
		queryKey: ['events'],
		queryFn: async () => {
			const response = await listEvents({ throwOnError: true })
			return response.data ?? []
		}
	})

	const { data: organizersData } = useQuery<ApiOrganizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})

	const getOrganizerName = useCallback(
		(value: number) => {
			const organizer = organizersData?.find(
				(org: ApiOrganizer) => org.id === value
			)
			return organizer?.name || 'Unbekannter Verein'
		},
		[organizersData]
	)

	const events = useMemo(() => data ?? [], [data])

	const onDelete = useCallback(
		async (id: number) => {
			await deleteEvent({ path: { id } })
			await qc.invalidateQueries({ queryKey: ['events'] })
		},
		[qc]
	)

	const columns = useEventColumns({
		getOrganizerName,
		organizerId,
		isAdmin,
		onDelete
	})

	const organizerOptions = useMemo(() => {
		return (
			organizersData?.map((org: ApiOrganizer) => ({
				label: org.name,
				value: org.id.toString()
			})) || []
		)
	}, [organizersData])

	if (isLoading) {
		return (
			<EventsPageShell title="Events">
				<div className="text-center">Lade Events...</div>
			</EventsPageShell>
		)
	}

	if (error) {
		return (
			<EventsPageShell title="Events">
				<div className="text-center text-destructive">
					Fehler beim Laden der Events
				</div>
			</EventsPageShell>
		)
	}

	return (
		<EventsPageShell title="Events" stickyHeader>
			<EventsHeader
				viewMode={viewMode}
				onViewModeChange={(mode) => setViewMode(mode)}
				onRefresh={() => {
					void refetch()
				}}
				canCreate={organizerId !== undefined}
			/>
			{viewMode === 'table' ? (
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
			) : (
				<EventsCalendar
					events={events}
					organizers={organizersData || []}
					onDelete={onDelete}
				/>
			)}
		</EventsPageShell>
	)
}
