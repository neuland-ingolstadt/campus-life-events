'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteEvent, getEvent, updateEvent } from '@/client'
import { EventForm } from '@/components/event-form'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'

export default function EditEventPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const id = Number(params.id)
	const { data, isLoading } = useQuery({
		queryKey: ['event', id],
		queryFn: () => getEvent({ path: { id } })
	})
	const [saving, setSaving] = useState(false)

	async function onSave(values: any) {
		setSaving(true)
		try {
			await updateEvent({ path: { id }, body: values })
			router.push('/events')
		} finally {
			setSaving(false)
		}
	}

	async function onDelete() {
		await deleteEvent({ path: { id } })
		router.push('/events')
	}

	return (
		<div className="px-4 md:px-8 py-6">
			<div className="mb-6">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="/events">Events</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Event #{id} bearbeiten</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<div className="mt-4 flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Event #{id} bearbeiten
						</h1>
						<p className="text-muted-foreground mt-2">
							Aktualisiere Details und Sichtbarkeit. Deine Änderungen werden im
							Protokoll festgehalten.
						</p>
					</div>
					<Button variant="destructive" size="sm" onClick={onDelete}>
						Löschen
					</Button>
				</div>
			</div>
			{isLoading ? (
				<div className="h-40 bg-muted animate-pulse rounded" />
			) : (
				<EventForm
					event={data?.data as any}
					onSave={onSave}
					isLoading={saving}
				/>
			)}
		</div>
	)
}
