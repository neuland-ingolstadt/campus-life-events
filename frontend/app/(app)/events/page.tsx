'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
		if (typeof window === 'undefined') {
			return []
		}

		try {
			const stored = localStorage.getItem('tableState-events')
			if (!stored) {
				return []
			}

			const parsed = JSON.parse(stored) as {
				columnFilters?: ColumnFiltersState
			}

			return parsed.columnFilters ?? []
		} catch (error) {
			console.error('Failed to parse stored table filters', error)
			return []
		}
	})
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

	const organizerFilterValues = useMemo(() => {
		const organizerFilter = columnFilters.find(
			(filter) => filter.id === 'organizer'
		)

		if (!organizerFilter) {
			return []
		}

		return Array.isArray(organizerFilter.value)
			? organizerFilter.value.map((value) => value?.toString())
			: []
	}, [columnFilters])

	const ownFilterActive = useMemo(() => {
		if (organizerId === undefined) {
			return false
		}

		return (
			organizerFilterValues.length === 1 &&
			organizerFilterValues[0] === organizerId.toString()
		)
	}, [organizerFilterValues, organizerId])

	useEffect(() => {
		if (organizerId === undefined) {
			setColumnFilters((previous) => {
				if (!previous.some((filter) => filter.id === 'organizer')) {
					return previous
				}

				return previous.filter((filter) => filter.id !== 'organizer')
			})
			return
		}

		if (!ownFilterActive) {
			return
		}

		setColumnFilters((previous) => {
			let hasChanged = false
			const next = previous.map((filter) => {
				if (filter.id !== 'organizer') {
					return filter
				}

				const values = Array.isArray(filter.value)
					? filter.value.map((value) => value?.toString())
					: []

				if (values.length === 1 && values[0] === organizerId.toString()) {
					return filter
				}

				hasChanged = true
				return { ...filter, value: [organizerId.toString()] }
			})

			return hasChanged ? next : previous
		})
	}, [organizerId, ownFilterActive])

	const handleOwnFilterChange = useCallback(
		(state: boolean) => {
			setColumnFilters((previous) => {
				const withoutOrganizer = previous.filter(
					(filter) => filter.id !== 'organizer'
				)

				if (!state || organizerId === undefined) {
					return withoutOrganizer
				}

				return [
					...withoutOrganizer,
					{ id: 'organizer', value: [organizerId.toString()] }
				]
			})
		},
		[organizerId]
	)

	const calendarEvents = useMemo(() => {
		if (organizerFilterValues.length === 0) {
			return events
		}

		return events.filter((event) =>
			organizerFilterValues.includes(event.organizer_id.toString())
		)
	}, [events, organizerFilterValues])

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
					toast.success('Aktualisierung erfolgreich')
				}}
				canCreate={organizerId !== undefined}
				canFilterOwn={organizerId !== undefined}
				ownFilterActive={ownFilterActive}
				onOwnFilterChange={handleOwnFilterChange}
			/>
			{viewMode === 'table' ? (
				<DataTable
					tableId="events"
					columns={columns}
					data={events}
					enableFilter
					enablePagination
					initialPageSize={10}
					columnFilters={columnFilters}
					onColumnFiltersChange={setColumnFilters}
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
					events={calendarEvents}
					organizers={organizersData || []}
					onDelete={onDelete}
				/>
			)}
		</EventsPageShell>
	)
}
