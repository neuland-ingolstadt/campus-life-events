'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createEvent } from '@/client'
import { EventForm } from '@/components/event-form'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/components/ui/breadcrumb'

export default function NewEventPage() {
	const router = useRouter()
	const [saving, setSaving] = useState(false)

	async function onSave(values: any) {
		setSaving(true)
		try {
			await createEvent({ body: values })
			router.push('/events')
		} finally {
			setSaving(false)
		}
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
							<BreadcrumbPage>Neues Event erstellen</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<div className="mt-4 mb-12">
					<h1 className="text-3xl font-bold tracking-tight">
						Neues Event erstellen
					</h1>
					<p className="text-muted-foreground mt-2">
						Fülle die folgenden Angaben aus, um dein Event zu veröffentlichen.
					</p>
				</div>
			</div>
			<EventForm onSave={onSave} isLoading={saving} />
		</div>
	)
}
