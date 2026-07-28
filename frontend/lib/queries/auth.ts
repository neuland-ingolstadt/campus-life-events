import { queryOptions } from '@tanstack/react-query'
import { me } from '@/lib/auth'

export const authKeys = {
	all: ['auth'] as const,
	me: () => [...authKeys.all, 'me'] as const
}

export function currentUserQuery() {
	return queryOptions({
		queryKey: authKeys.me(),
		queryFn: me,
		retry: false
	})
}
