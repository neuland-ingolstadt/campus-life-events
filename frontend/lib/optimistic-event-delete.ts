import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteEvent } from '@/client'
import type { Event as ApiEvent } from '@/client/types.gen'

const UNDO_MS = 7000

type EventsPageData = {
	items: ApiEvent[]
	total: number
}

type CacheSnapshot = ReadonlyArray<readonly [QueryKey, unknown]>

function isEventsPageData(data: unknown): data is EventsPageData {
	return (
		typeof data === 'object' &&
		data !== null &&
		'items' in data &&
		Array.isArray((data as EventsPageData).items)
	)
}

function eventsQueryPredicate(query: { queryKey: QueryKey }) {
	return query.queryKey[0] === 'events'
}

function removeEventFromData(data: unknown, eventId: number): unknown {
	if (Array.isArray(data)) {
		return data.filter(
			(event) =>
				!(
					typeof event === 'object' &&
					event !== null &&
					'id' in event &&
					(event as ApiEvent).id === eventId
				)
		)
	}

	if (isEventsPageData(data)) {
		const hadEvent = data.items.some((event) => event.id === eventId)
		return {
			...data,
			items: data.items.filter((event) => event.id !== eventId),
			total: hadEvent ? Math.max(0, data.total - 1) : data.total
		}
	}

	return data
}

function snapshotEventsQueries(queryClient: QueryClient): CacheSnapshot {
	return queryClient.getQueriesData({ predicate: eventsQueryPredicate })
}

function restoreEventsQueries(
	queryClient: QueryClient,
	snapshots: CacheSnapshot
) {
	for (const [queryKey, data] of snapshots) {
		queryClient.setQueryData(queryKey, data)
	}
}

function optimisticallyRemoveEvent(queryClient: QueryClient, eventId: number) {
	queryClient.setQueriesData({ predicate: eventsQueryPredicate }, (data) =>
		removeEventFromData(data, eventId)
	)
	queryClient.removeQueries({ queryKey: ['event', eventId] })
}

export function scheduleOptimisticEventDelete({
	queryClient,
	event,
	onRemoved
}: {
	queryClient: QueryClient
	event: ApiEvent
	onRemoved?: () => void
}) {
	const snapshots = snapshotEventsQueries(queryClient)
	let settled = false

	optimisticallyRemoveEvent(queryClient, event.id)
	onRemoved?.()

	const undo = () => {
		if (settled) {
			return
		}
		settled = true
		restoreEventsQueries(queryClient, snapshots)
		toast.success('Löschen rückgängig gemacht')
	}

	const commit = async () => {
		if (settled) {
			return
		}
		settled = true
		try {
			await deleteEvent({ path: { id: event.id }, throwOnError: true })
			await queryClient.invalidateQueries({
				predicate: eventsQueryPredicate
			})
		} catch {
			restoreEventsQueries(queryClient, snapshots)
			toast.error('Event konnte nicht gelöscht werden')
		}
	}

	toast.message('Event gelöscht', {
		description: event.title_de,
		duration: UNDO_MS,
		action: {
			label: 'Rückgängig',
			onClick: undo
		},
		onAutoClose: () => {
			void commit()
		},
		onDismiss: () => {
			void commit()
		}
	})
}
