'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createEvent } from '@/client'
import type { CreateEventRequest, UpdateEventRequest } from '@/client/types.gen'
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

export default function NewEventPage() {
	const router = useRouter()
	const qc = useQueryClient()
	const [saving, setSaving] = useState(false)

	async function onSave(values: CreateEventRequest | UpdateEventRequest) {
		setSaving(true)
		try {
			await createEvent({
				body: values as CreateEventRequest,
				throwOnError: true
			})
			await qc.invalidateQueries({ queryKey: ['events'] })
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
					<h1 className="text-lg font-semibold">Neues Event erstellen</h1>
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
							<BreadcrumbPage>Neues Event</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="max-w-5xl">
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Neues Event erstellen
					</h2>
					<p className="text-muted-foreground mb-6">
						Fülle die folgenden Angaben aus, um dein Event zu veröffentlichen.
					</p>
					<EventForm onSave={onSave} isLoading={saving} />
				</div>
			</div>
		</div>
	)
}
