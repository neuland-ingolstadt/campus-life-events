'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { client } from '@/client/client.gen'

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
						gcTime: 5 * 60 * 1000,
						retry: 1
					}
				}
			})
	)

	useEffect(() => {
		// Ensure client has credentials and relative base URL (in case auto-gen resets)
		client.setConfig({
			baseUrl: '',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include'
		})

		// Redirect to login on 401 responses
		const responseId = client.interceptors.response.use(async (res) => {
			if (
				typeof window !== 'undefined' &&
				res.status === 401 &&
				window.location.pathname !== '/login'
			) {
				window.location.href = '/login'
			}
			return res
		})

		return () => {
			client.interceptors.response.eject(responseId)
		}
	}, [])

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}
