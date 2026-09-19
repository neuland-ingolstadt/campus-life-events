import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { Event as ApiEvent } from '@/client/types.gen'

type EventsPageData = {
	items: ApiEvent[]
	total: number
}

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

function replaceEventInData(data: unknown, updated: ApiEvent): unknown {
	if (Array.isArray(data)) {
		return data.map((event) =>
			typeof event === 'object' &&
			event !== null &&
			'id' in event &&
			(event as ApiEvent).id === updated.id
				? updated
				: event
		)
	}

	if (isEventsPageData(data)) {
		return {
			...data,
			items: data.items.map((event) =>
				event.id === updated.id ? updated : event
			)
		}
	}

	return data
}

export function patchEventInQueryCaches(
	queryClient: QueryClient,
	updated: ApiEvent
) {
	queryClient.setQueryData(['event', updated.id], updated)
	queryClient.setQueriesData({ predicate: eventsQueryPredicate }, (data) =>
		replaceEventInData(data, updated)
	)
}
