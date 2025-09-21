'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getOrganizer, updateOrganizer } from '@/client'
import type { UpdateOrganizerRequest } from '@/client/types.gen'
import { OrganizerForm } from '@/components/organizer-form'
import { SidebarTrigger } from '@/components/ui/sidebar'

export default function EditOrganizerPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const id = Number(params.id)
	const qc = useQueryClient()

	const { data, isLoading } = useQuery({
		queryKey: ['organizers', id],
		queryFn: () => getOrganizer({ path: { id } }),
		enabled: Number.isFinite(id)
	})

	async function onSave(values: UpdateOrganizerRequest) {
		await updateOrganizer({ path: { id }, body: values })
		await qc.invalidateQueries({ queryKey: ['organizers'] })
		await qc.invalidateQueries({ queryKey: ['organizers', id] })
		await qc.invalidateQueries({ queryKey: ['organizers-admin'] })
		router.push('/organizers')
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Verein bearbeiten</h1>
				</div>
			</header>
			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				{isLoading ? (
					<div className="space-y-2">
						<div className="h-16 bg-muted animate-pulse rounded" />
						<div className="h-16 bg-muted animate-pulse rounded" />
						<div className="h-16 bg-muted animate-pulse rounded" />
					</div>
				) : (
					<OrganizerForm organizer={data?.data ?? null} onSave={onSave} />
				)}
			</div>
		</div>
	)
}
