'use client'

import { useQuery } from '@tanstack/react-query'
import { Copy, Download, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EventsPageShell } from '@/components/events/events-page-shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { me } from '@/lib/auth'
import { fetchNewsletterData, generateNewsletterHTML } from '@/lib/newsletter'

export default function NewsletterPage() {
	const {
		data: meData,
		isLoading: isMeLoading,
		error: meError
	} = useQuery({ queryKey: ['auth', 'me'], queryFn: me })

	const canAccessNewsletter = meData?.can_access_newsletter ?? false

	const {
		data: newsletterData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['newsletter-data'],
		queryFn: fetchNewsletterData,
		enabled: canAccessNewsletter
	})

	const [generatedHtml, setGeneratedHtml] = useState<string>('')
	const [customText, setCustomText] = useState<string>('')

	useEffect(() => {
		if (newsletterData) {
			const html = generateNewsletterHTML(newsletterData, customText)
			setGeneratedHtml(html)
		}
	}, [newsletterData, customText])

	const handleDownload = () => {
		if (newsletterData) {
			const fullHtml = generateNewsletterHTML(newsletterData, customText)
			const blob = new Blob([fullHtml], { type: 'text/html' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `campus-life-newsletter-${new Date().toISOString().split('T')[0]}.html`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		}
	}

	const handleCopy = async () => {
		if (newsletterData) {
			try {
				const fullHtml = generateNewsletterHTML(newsletterData, customText)
				await navigator.clipboard.writeText(fullHtml)
				alert('HTML copied to clipboard!')
			} catch (err) {
				console.error('Failed to copy: ', err)
				alert('Failed to copy to clipboard')
			}
		}
	}

	if (isMeLoading) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert>
					<AlertDescription>Lade Berechtigungen…</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	if (meError) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert variant="destructive">
					<AlertDescription>
						Failed to load permissions: {meError.message}
					</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	if (!meData) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert>
					<AlertDescription>
						Bitte melde dich an, um auf den Newsletterbereich zuzugreifen.
					</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	if (!canAccessNewsletter) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert>
					<AlertDescription>
						Dieser Verein hat keinen Zugriff auf den Newsletterbereich.
					</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	if (isLoading) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-96" />
				</div>
				<div className="grid gap-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card
							key={`skeleton-card-${
								// biome-ignore lint/suspicious/noArrayIndexKey: it's just a skeleton
								i
							}`}
						>
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
							</CardContent>
						</Card>
					))}
				</div>
			</EventsPageShell>
		)
	}

	if (error) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert variant="destructive">
					<AlertDescription>
						Failed to load newsletter data: {error.message}
					</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	if (!newsletterData) {
		return (
			<EventsPageShell title="Newsletter" stickyHeader>
				<Alert>
					<AlertDescription>No newsletter data available.</AlertDescription>
				</Alert>
			</EventsPageShell>
		)
	}

	return (
		<EventsPageShell title="Newsletter" stickyHeader>
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
				<p className="text-muted-foreground">
					Vorschau und Download des wöchentlichen Newsletters
				</p>
			</div>
			<div className="grid gap-6 max-w-6xl">
				<Card>
					<CardHeader>
						<CardTitle>Aktionen</CardTitle>
						<CardDescription>
							Newsletter HTML herunterladen oder kopieren
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							variant="outline"
							className="w-full"
							onClick={handleDownload}
							disabled={!generatedHtml}
						>
							<Download className="h-4 w-4 mr-2" />
							HTML herunterladen
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={handleCopy}
							disabled={!generatedHtml}
						>
							<Copy className="h-4 w-4 mr-2" />
							In Zwischenablage kopieren
						</Button>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5" />
							Benutzerdefinierter Text
						</CardTitle>
						<CardDescription>
							Füge benutzerdefinierten Text hinzu, der vor den wöchentlichen
							Events erscheint
						</CardDescription>
					</CardHeader>
					<CardContent>
						<textarea
							value={customText}
							onChange={(e) => setCustomText(e.target.value)}
							placeholder="Hinweise, besondere Ankündigungen, etc. (optional)"
							className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5" />
							Newsletter Vorschau
						</CardTitle>
						<CardDescription>Betreff: {newsletterData.subject}</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						{generatedHtml ? (
							<iframe
								srcDoc={generatedHtml}
								className="w-full h-[1000px] border-0 rounded-b-lg"
								style={{ minWidth: '800px' }}
								title="Newsletter Preview"
							/>
						) : (
							<Skeleton className="h-96 w-full" />
						)}
					</CardContent>
				</Card>
			</div>
		</EventsPageShell>
	)
}
