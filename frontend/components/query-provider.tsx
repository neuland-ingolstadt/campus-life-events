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
						staleTime: 60 * 1000, // 1 minute
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
			}
		})

		// Add request interceptor to ensure credentials are included
		const requestId = client.interceptors.request.use(async (request) => {
			// Create a new request with credentials included
			const newRequest = new Request(request.url, {
				...request,
				credentials: 'include'
			})
			return newRequest
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
			client.interceptors.request.eject(requestId)
			client.interceptors.response.eject(responseId)
		}
	}, [])

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}
