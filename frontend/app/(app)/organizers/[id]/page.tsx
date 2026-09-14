'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditOrganizerRedirectPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const id = Number(params.id)

	useEffect(() => {
		if (!Number.isFinite(id)) {
			router.replace('/organizers')
			return
		}
		router.replace(`/organizers?edit=${id}`)
	}, [id, router])

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Organisation bearbeiten</h1>
				</div>
			</header>
			<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-56 w-full rounded-lg" />
			</div>
		</div>
	)
}
