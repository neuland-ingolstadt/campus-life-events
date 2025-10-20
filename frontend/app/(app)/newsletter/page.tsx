'use client'

import { toPlainText } from '@react-email/render'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getISOWeek, getISOWeeksInYear } from 'date-fns'
import { Copy, Download, Mail, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { me } from '@/lib/auth'
import {
	fetchNewsletterData,
	generateNewsletterHTML,
	sendNewsletterPreviewEmail
} from '@/lib/newsletter'

export default function NewsletterPage() {
	const {
		data: meData,
		isLoading: isMeLoading,
		error: meError
	} = useQuery({ queryKey: ['auth', 'me'], queryFn: me })

	const canAccessNewsletter = meData?.can_access_newsletter ?? false

	const [newsletterStartWeek, setnewsletterStartWeek] = useState(
		() => (getISOWeek(new Date()) % getISOWeeksInYear(new Date())) + 1
	)
	const [newsletterYear, setnewsletterYear] = useState(() =>
		getISOWeek(new Date()) === getISOWeeksInYear(new Date())
			? new Date().getFullYear() + 1
			: new Date().getFullYear()
	)

	const {
		data: newsletterData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['newsletter-data', newsletterYear, newsletterStartWeek],
		queryFn: () => fetchNewsletterData(newsletterYear, newsletterStartWeek),
		enabled: canAccessNewsletter
	})

	const [generatedHtml, setGeneratedHtml] = useState<string>('')
	const [customText, setCustomText] = useState<string>('')

	const previewMutation = useMutation({
		mutationFn: async ({
			subject,
			html
		}: {
			subject: string
			html: string
		}) => {
			await sendNewsletterPreviewEmail(subject, html)
		},
		onSuccess: () => {
			toast.success('Vorschau-E-Mail wurde gesendet.')
		},
		onError: (err: unknown) => {
			const message =
				err instanceof Error
					? err.message
					: 'Senden der Vorschau-E-Mail ist fehlgeschlagen.'
			toast.error(message)
		}
	})

	useEffect(() => {
		const timeoutId = setTimeout(async () => {
			if (newsletterData) {
				const html = await generateNewsletterHTML(newsletterData, customText)
				setGeneratedHtml(html)
			}
		}, 50) // Debounce to avoid excessive renders

		return () => clearTimeout(timeoutId)
	}, [newsletterData, customText])

	const handleDownload = () => {
		if (newsletterData) {
			const blob = new Blob([generatedHtml], { type: 'text/html' })
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
				const htmlBlob = new Blob([generatedHtml], { type: 'text/html' })
				const plainText = toPlainText(generatedHtml)
				const textBlob = new Blob([plainText], { type: 'text/plain' })

				const clipboardItem = new ClipboardItem({
					'text/html': htmlBlob,
					'text/plain': textBlob
				})

				await navigator.clipboard.write([clipboardItem])
				toast.success('HTML copied to clipboard!')
			} catch (err) {
				console.error('Failed to copy: ', err)
				toast.error('Failed to copy to clipboard')
			}
		}
	}

	const handleSendPreview = () => {
		if (newsletterData) {
			const fullHtml = generateNewsletterHTML(newsletterData, customText)
			previewMutation.mutate({
				subject: newsletterData.subject,
				html: fullHtml
			})
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
						<CardTitle>Newsletter Woche auswählen</CardTitle>
						<CardDescription>
							Wähle das Jahr und die Kalenderwoche für den Newsletter aus.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-row gap-4">
						<Select
							value={`${newsletterYear}`}
							onValueChange={(value: unknown) => {
								const newYear = Number(value)
								const maxWeek = getISOWeeksInYear(
									new Date().setFullYear(newYear)
								)
								if (newsletterStartWeek > maxWeek) {
									setnewsletterStartWeek(maxWeek)
								}
								setnewsletterYear(newYear)
							}}
						>
							<SelectTrigger className="h-8">
								<SelectValue placeholder={newsletterYear} />
							</SelectTrigger>
							<SelectContent side="top">
								{[
									new Date().getFullYear() - 1,
									new Date().getFullYear(),
									new Date().getFullYear() + 1
								].map((jahr) => (
									<SelectItem key={jahr} value={jahr.toString()}>
										{jahr}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={`${newsletterStartWeek}`}
							onValueChange={(value: unknown) => {
								setnewsletterStartWeek(Number(value))
							}}
						>
							<SelectTrigger className="h-8">
								<SelectValue placeholder={newsletterStartWeek} />
							</SelectTrigger>
							<SelectContent side="top">
								{Array.from(
									{
										length: getISOWeeksInYear(
											new Date().setFullYear(newsletterYear)
										)
									},
									(_, i) => i + 1
								).map((woche) => (
									<SelectItem key={woche} value={woche.toString()}>
										KW {woche}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</CardContent>
				</Card>
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
						<Button
							className="w-full"
							onClick={handleSendPreview}
							disabled={!generatedHtml || previewMutation.isPending}
						>
							<Send className="h-4 w-4 mr-2" />
							{previewMutation.isPending
								? 'Versende Vorschau...'
								: 'Vorschau per E-Mail senden'}
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
