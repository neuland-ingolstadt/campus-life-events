'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { deleteEvent, getEvent, updateEvent } from '@/client'
import type { Event, UpdateEventRequest } from '@/client/types.gen'
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
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

export default function EditEventPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const id = Number(params.id)
	const qc = useQueryClient()
	const { data: meData } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})
	const { data, isLoading, isError } = useQuery<Event>({
		queryKey: ['event', id],
		queryFn: async () => {
			const response = await getEvent({
				path: { id },
				throwOnError: true
			})
			return response.data
		}
	})
	const [saving, setSaving] = useState(false)

	const canEdit = useMemo(() => {
		if (!data || !meData) {
			return false
		}
		if (meData.account_type === 'ADMIN') {
			return true
		}
		const oid = meData.organizer_id
		if (oid === null || oid === undefined) {
			return false
		}
		return oid === data.organizer_id
	}, [data, meData])

	useEffect(() => {
		if (isLoading || !data || !meData) {
			return
		}
		if (!canEdit) {
			toast.error(
				'Dieses Event kannst du nicht bearbeiten. Nur die eigene Organisation oder Admins.'
			)
			router.replace('/events')
		}
	}, [isLoading, data, meData, canEdit, router])

	async function onSave(values: UpdateEventRequest) {
		setSaving(true)
		try {
			await updateEvent({
				path: { id },
				body: values,
				throwOnError: true
			})
			await qc.invalidateQueries({ queryKey: ['events'] })
			await qc.invalidateQueries({ queryKey: ['event', id] })
			toast.success('Event erfolgreich aktualisiert')
			router.push('/events')
		} finally {
			setSaving(false)
		}
	}

	async function onDelete() {
		await deleteEvent({ path: { id }, throwOnError: true })
		await qc.invalidateQueries({ queryKey: ['events'] })
		await qc.invalidateQueries({ queryKey: ['event', id] })
		router.push('/events')
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Event bearbeiten</h1>
				</div>
				<div className="ml-auto">
					{canEdit ? (
						<Button variant="destructive" size="sm" onClick={onDelete}>
							Löschen
						</Button>
					) : null}
				</div>
			</header>
			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				{/* Breadcrumbs */}
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="/events">Events</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Event bearbeiten</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="max-w-5xl">
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Event bearbeiten
					</h2>
					<p className="text-muted-foreground mb-6">
						Aktualisiere Details und Sichtbarkeit. Deine Änderungen werden im
						Protokoll festgehalten.
					</p>
					{isLoading || !meData ? (
						<div className="h-40 bg-muted animate-pulse rounded" />
					) : isError ? (
						<p className="text-destructive text-sm">
							Event nicht gefunden oder kein Zugriff.
						</p>
					) : !canEdit ? (
						<div className="h-40 bg-muted animate-pulse rounded" />
					) : (
						<EventForm event={data} onSave={onSave} isLoading={saving} />
					)}
				</div>
			</div>
		</div>
	)
}
