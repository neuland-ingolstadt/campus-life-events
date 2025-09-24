'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createEvent, getEvent } from '@/client'
import type { CreateEventRequest, Event } from '@/client/types.gen'
import { EventForm } from '@/components/event-form'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'

export default function DuplicateEventPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const id = Number(params.id)
	const qc = useQueryClient()
	const { data, isLoading } = useQuery<Event>({
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

	const duplicateEvent = useMemo(() => {
		if (!data) {
			return undefined
		}

		return {
			...data,
			end_date_time: undefined
		}
	}, [data])

	const initialFormValues = useMemo(
		() => ({ start_date_time: undefined, end_date_time: undefined }),
		[]
	)

	async function onSave(values: CreateEventRequest) {
		setSaving(true)
		try {
			await createEvent({
				body: values,
				throwOnError: true
			})
			await qc.invalidateQueries({ queryKey: ['events'] })
			toast.success('Event erfolgreich dupliziert')
			router.push('/events')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Event duplizieren</h1>
				</div>
			</header>
			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="/events">Events</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Event duplizieren</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="max-w-5xl">
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Event duplizieren
					</h2>
					<p className="text-muted-foreground mb-6">
						Passe die Details an und veröffentliche die Kopie deines Events.
					</p>
					{isLoading ? (
						<div className="h-40 bg-muted animate-pulse rounded" />
					) : (
						<EventForm
							event={duplicateEvent}
							onSave={onSave}
							isLoading={saving}
							initialValues={initialFormValues}
						/>
					)}
				</div>
			</div>
		</div>
	)
}
