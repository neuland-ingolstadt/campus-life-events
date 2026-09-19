'use client'

import {
	keepPreviousData,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type {
	ColumnFiltersState,
	OnChangeFn,
	PaginationState,
	SortingState
} from '@tanstack/react-table'
import { startOfDay } from 'date-fns'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState
} from 'react'
import { toast } from 'sonner'
import {
	getEvent,
	listEvents,
	listOrganizers,
	listRecreationCandidates
} from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'
import { DataTable } from '@/components/data-table/data-table'
import {
	EventDetailSheet,
	type EventSheetMode
} from '@/components/events/event-detail-sheet'
import { EventsEmptyState } from '@/components/events/events-empty-state'
import { EventsHeader } from '@/components/events/events-header'
import { EventsMobileList } from '@/components/events/events-mobile-list'
import { EventsPageShell } from '@/components/events/events-page-shell'
import { useEventColumns } from '@/components/events/use-event-columns'
import { me } from '@/lib/auth'
import { scheduleOptimisticEventDelete } from '@/lib/optimistic-event-delete'

const DATE_FILTER_ID = 'start_date_time'

const EventsCalendar = dynamic(
	() =>
		import('@/components/events-calendar').then(
			(module) => module.EventsCalendar
		),
	{
		ssr: false,
		loading: () => (
			<div
				className="flex h-[600px] items-center justify-center rounded-md border text-muted-foreground"
				role="status"
			>
				Kalender wird geladen...
			</div>
		)
	}
)

type DateFilterValue = { from?: string | Date; to?: string | Date } | undefined

function toValidDate(value: string | Date | undefined): Date | undefined {
	if (!value) {
		return undefined
	}

	const parsed = value instanceof Date ? value : new Date(value)

	if (Number.isNaN(parsed.getTime())) {
		return undefined
	}

	return parsed
}

function createUpcomingEventsFilter(): ColumnFiltersState[number] {
	return {
		id: DATE_FILTER_ID,
		value: {
			from: startOfDay(new Date()),
			to: undefined
		}
	}
}

function normalizeColumnFilters(
	filters: ColumnFiltersState | undefined
): ColumnFiltersState {
	if (!Array.isArray(filters)) {
		return []
	}

	return filters.reduce<ColumnFiltersState>((acc, filter) => {
		if (filter.id !== DATE_FILTER_ID) {
			const value = filter.value

			if (Array.isArray(value)) {
				acc.push({ ...filter, value: [...value] })
				return acc
			}

			if (value && typeof value === 'object') {
				acc.push({ ...filter, value: { ...value } })
				return acc
			}

			acc.push({ ...filter })
			return acc
		}

		const value = filter.value as DateFilterValue
		const from = toValidDate(value?.from)
		const to = toValidDate(value?.to)

		if (!from && !to) {
			return acc
		}

		acc.push({
			...filter,
			value: {
				from,
				to
			}
		})

		return acc
	}, [])
}

export type EventsDashboardProps = {
	readonly pageTitle: string
	readonly tableId: string
	readonly eventsHeaderDescription?: string
}

export function EventsDashboard({
	pageTitle,
	tableId,
	eventsHeaderDescription
}: EventsDashboardProps) {
	'use no memo'
	const qc = useQueryClient()
	const router = useRouter()
	const searchParams = useSearchParams()
	const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
	const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null)
	const [sheetMode, setSheetMode] = useState<EventSheetMode>('view')
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	})
	const [sorting, setSorting] = useState<SortingState>([
		{ id: 'start_date_time', desc: false }
	])
	const defaultDateFilter = useMemo(() => createUpcomingEventsFilter(), [])
	const [columnFiltersState, setColumnFiltersState] =
		useState<ColumnFiltersState>(() =>
			normalizeColumnFilters([defaultDateFilter])
		)
	const setColumnFilters = useCallback(
		(
			updater:
				| ColumnFiltersState
				| ((previous: ColumnFiltersState) => ColumnFiltersState)
		) => {
			setPagination((previous) => ({ ...previous, pageIndex: 0 }))
			setColumnFiltersState((previous) => {
				const next = typeof updater === 'function' ? updater(previous) : updater

				return normalizeColumnFilters(next)
			})
		},
		[]
	)
	const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => {
			setPagination((previous) => ({ ...previous, pageIndex: 0 }))
			setSorting((previous) =>
				typeof updater === 'function' ? updater(previous) : updater
			)
		},
		[]
	)
	const columnFilters = columnFiltersState
	const eventQueryFilters = useMemo(() => {
		const title = columnFilters.find((filter) => filter.id === 'title_de')
		const organizer = columnFilters.find((filter) => filter.id === 'organizer')
		const visibility = columnFilters.find(
			(filter) => filter.id === 'visibility'
		)
		const dateRange = columnFilters.find(
			(filter) => filter.id === DATE_FILTER_ID
		)
		const range = dateRange?.value as DateFilterValue
		const sort = sorting[0]

		return {
			query:
				typeof title?.value === 'string' ? title.value || undefined : undefined,
			organizer_id: Array.isArray(organizer?.value)
				? Number(organizer.value[0]) || undefined
				: undefined,
			visibility: Array.isArray(visibility?.value)
				? (visibility.value[0] as
						| 'public'
						| 'internal'
						| 'host_only'
						| undefined)
				: undefined,
			starts_from: toValidDate(range?.from)?.toISOString(),
			starts_to: toValidDate(range?.to)?.toISOString(),
			sort: (sort?.id === 'end_date_time' || sort?.id === 'title_de'
				? sort.id
				: 'start_date_time') as
				| 'start_date_time'
				| 'end_date_time'
				| 'title_de',
			direction: (sort?.desc ? 'desc' : 'asc') as 'asc' | 'desc'
		}
	}, [columnFilters, sorting])
	const deferredEventQueryFilters = useDeferredValue(eventQueryFilters)

	const { data: meData } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})
	const organizerId = meData?.organizer_id ?? undefined
	const isAdmin = meData?.account_type === 'ADMIN'

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['events', pagination, deferredEventQueryFilters],
		placeholderData: keepPreviousData,
		queryFn: async () => {
			const response = await listEvents({
				query: {
					...deferredEventQueryFilters,
					limit: pagination.pageSize,
					offset: pagination.pageIndex * pagination.pageSize
				},
				throwOnError: true
			})
			return response.data
		}
	})
	const { data: calendarData } = useQuery({
		queryKey: ['events', 'calendar', deferredEventQueryFilters],
		enabled: viewMode === 'calendar',
		queryFn: async () => {
			const response = await listEvents({
				query: {
					...deferredEventQueryFilters,
					limit: 5000
				},
				throwOnError: true
			})
			return response.data
		}
	})

	const { data: organizersRaw } = useQuery<ApiOrganizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})

	const { data: recreationCandidatesData } = useQuery({
		queryKey: ['events', 'recreation-candidates', organizerId],
		enabled: organizerId !== undefined,
		queryFn: async () => {
			const response = await listRecreationCandidates({ throwOnError: true })
			return response.data
		}
	})
	const recreationCandidates = recreationCandidatesData?.items ?? []

	const organizersData = useMemo(() => organizersRaw, [organizersRaw])

	const getOrganizerName = useCallback(
		(value: number) => {
			const organizer = organizersRaw?.find(
				(org: ApiOrganizer) => org.id === value
			)
			return organizer?.name || 'Unbekannte Organisation'
		},
		[organizersRaw]
	)

	const events = data?.items ?? []
	const calendarEvents = calendarData?.items ?? []

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
		if (organizerId === undefined || !ownFilterActive) {
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
	}, [organizerId, ownFilterActive, setColumnFilters])

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
		[organizerId, setColumnFilters]
	)

	const onDelete = useCallback(
		(event: ApiEvent) => {
			scheduleOptimisticEventDelete({
				queryClient: qc,
				event,
				onRemoved: () => {
					if (selectedEvent?.id === event.id) {
						setSheetOpen(false)
						setSelectedEvent(null)
						setSheetMode('view')
					}
				}
			})
		},
		[qc, selectedEvent?.id]
	)

	const openEvent = useCallback((event: ApiEvent) => {
		setSelectedEvent(event)
		setSheetMode('view')
		setSheetOpen(true)
	}, [])

	const openCreate = useCallback(() => {
		setSelectedEvent(null)
		setSheetMode('create')
		setSheetOpen(true)
	}, [])

	const openDuplicate = useCallback((event: ApiEvent) => {
		setSelectedEvent(event)
		setSheetMode('duplicate')
		setSheetOpen(true)
	}, [])

	const openRecreate = useCallback(
		(eventId: number) => {
			const candidate = recreationCandidates.find(
				(item) => item.event.id === eventId
			)
			if (candidate) {
				openDuplicate(candidate.event)
			}
		},
		[openDuplicate, recreationCandidates]
	)

	useEffect(() => {
		if (searchParams.get('create') !== '1') {
			return
		}
		if (organizerId === undefined) {
			return
		}
		openCreate()
		router.replace('/events', { scroll: false })
	}, [searchParams, organizerId, openCreate, router])

	useEffect(() => {
		if (searchParams.get('own') !== '1') {
			return
		}
		if (organizerId === undefined) {
			return
		}
		handleOwnFilterChange(true)
		router.replace('/events', { scroll: false })
	}, [searchParams, organizerId, handleOwnFilterChange, router])

	useEffect(() => {
		const duplicateId = Number(searchParams.get('duplicate'))
		if (!Number.isFinite(duplicateId) || duplicateId <= 0) {
			return
		}

		const localMatch =
			events.find((event) => event.id === duplicateId) ??
			calendarEvents.find((event) => event.id === duplicateId)

		if (localMatch) {
			openDuplicate(localMatch)
			router.replace('/events', { scroll: false })
			return
		}

		let cancelled = false

		void (async () => {
			try {
				const response = await getEvent({
					path: { id: duplicateId },
					throwOnError: true
				})
				if (cancelled || !response.data) {
					return
				}
				openDuplicate(response.data)
				router.replace('/events', { scroll: false })
			} catch {
				if (!cancelled) {
					toast.error('Event zum Duplizieren nicht gefunden')
					router.replace('/events', { scroll: false })
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [searchParams, events, calendarEvents, openDuplicate, router])

	const columns = useEventColumns({
		getOrganizerName,
		organizerId
	})

	const organizerOptions = useMemo(() => {
		return (
			organizersData?.map((org: ApiOrganizer) => ({
				label: org.name,
				value: org.id.toString()
			})) || []
		)
	}, [organizersData])

	if (error && !data) {
		return (
			<EventsPageShell title={pageTitle}>
				<div className="text-center text-destructive">
					Fehler beim Laden der Events
				</div>
			</EventsPageShell>
		)
	}

	return (
		<EventsPageShell title={pageTitle} stickyHeader>
			<EventsHeader
				tableId={tableId}
				heading={pageTitle}
				description={
					eventsHeaderDescription ??
					'Verwalte und organisiere Events mit erweiterten Filtern'
				}
				viewMode={viewMode}
				onViewModeChange={(mode) => setViewMode(mode)}
				onRefresh={() => {
					void refetch()
					toast.success('Aktualisierung erfolgreich')
				}}
				canCreate={organizerId !== undefined}
				onCreate={openCreate}
				recreationCandidates={recreationCandidates}
				onRecreate={openRecreate}
				canFilterOwn={organizerId !== undefined}
				ownFilterActive={ownFilterActive}
				onOwnFilterChange={handleOwnFilterChange}
			/>
			{viewMode === 'table' ? (
				<DataTable
					tableId={tableId}
					columns={columns}
					data={events}
					isLoading={isLoading}
					onClick={openEvent}
					emptyContent={<EventsEmptyState />}
					enableFilter
					enablePagination
					initialPageSize={10}
					pagination={pagination}
					onPaginationChange={setPagination}
					pageCount={Math.ceil((data?.total ?? 0) / pagination.pageSize)}
					manualPagination
					sorting={sorting}
					onSortingChange={handleSortingChange}
					manualSorting
					manualFiltering
					columnFilters={columnFilters}
					onColumnFiltersChange={setColumnFilters}
					renderMobileRows={({ rows }) => (
						<EventsMobileList
							events={rows.map((row) => row.original)}
							getOrganizerName={getOrganizerName}
							organizerId={organizerId}
							onOpen={openEvent}
						/>
					)}
					filterOptions={{
						searchFilter: {
							column: 'title_de',
							title: 'Titel'
						},
						selectFilters: [
							{
								column: 'organizer',
								title: 'Organisation',
								mode: 'single',
								options: organizerOptions
							},
							{
								column: 'visibility',
								title: 'Sichtbarkeit',
								options: [
									{ label: 'Bewerben', value: 'public' },
									{ label: 'Intern', value: 'internal' },
									{ label: 'Privat', value: 'host_only' }
								]
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
					organizerId={organizerId}
					isAdmin={isAdmin}
					onOpen={openEvent}
				/>
			)}
			<EventDetailSheet
				event={selectedEvent}
				open={sheetOpen}
				onOpenChange={(open) => {
					setSheetOpen(open)
					if (!open) {
						setSelectedEvent(null)
						setSheetMode('view')
					}
				}}
				mode={sheetMode}
				onModeChange={setSheetMode}
				organizerName={
					selectedEvent ? getOrganizerName(selectedEvent.organizer_id) : ''
				}
				isOwnOrganizer={
					selectedEvent !== null &&
					organizerId !== undefined &&
					organizerId === selectedEvent.organizer_id
				}
				canManage={
					sheetMode === 'create' ||
					(selectedEvent !== null &&
						(isAdmin ||
							(organizerId !== undefined &&
								organizerId === selectedEvent.organizer_id)))
				}
				onDelete={onDelete}
				onSaved={setSelectedEvent}
			/>
		</EventsPageShell>
	)
}
