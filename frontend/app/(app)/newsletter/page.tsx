'use client'

import { toPlainText } from '@react-email/render'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
	addDays,
	format,
	getISOWeek,
	getISOWeekYear,
	startOfWeek
} from 'date-fns'
import {
	Calendar as CalendarIcon,
	Copy,
	Download,
	Mail,
	Send
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EventsPageShell } from '@/components/events/events-page-shell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
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

	const [weekStart, setWeekStart] = useState<string | undefined>(undefined)
	const [pickerDate, setPickerDate] = useState<Date | undefined>(undefined)

	const {
		data: newsletterData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['newsletter-data', weekStart],
		queryFn: () => fetchNewsletterData(weekStart),
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

	const calendarSelectedDate =
		pickerDate ??
		(newsletterData
			? startOfWeek(new Date(newsletterData.next_week_start), {
					weekStartsOn: 1
				})
			: undefined)

	const activeWeekStartDate = newsletterData
		? new Date(newsletterData.next_week_start)
		: undefined
	const activeWeekEndDate = newsletterData
		? addDays(new Date(newsletterData.week_after_start), -1)
		: undefined
	const activeWeekNumber = activeWeekStartDate
		? getISOWeek(activeWeekStartDate)
		: undefined
	const activeWeekYear = activeWeekStartDate
		? getISOWeekYear(activeWeekStartDate)
		: undefined
	const activeWeekRangeLabel =
		activeWeekStartDate && activeWeekEndDate
			? `${format(activeWeekStartDate, 'dd.MM.yyyy')} – ${format(activeWeekEndDate, 'dd.MM.yyyy')}`
			: undefined

	const handleWeekSelect = (date: Date | undefined) => {
		if (!date) {
			return
		}
		const monday = startOfWeek(date, { weekStartsOn: 1 })
		setPickerDate(monday)
		setWeekStart(format(monday, 'yyyy-MM-dd'))
	}

	const handleResetWeek = () => {
		setWeekStart(undefined)
		setPickerDate(undefined)
	}

	useEffect(() => {
		setGeneratedHtml('')
		const timeoutId = setTimeout(async () => {
			if (newsletterData) {
				const html = await generateNewsletterHTML(newsletterData, customText)
				setGeneratedHtml(html)
			}
		}, 50) // Debounce to avoid excessive renders

		return () => clearTimeout(timeoutId)
	}, [newsletterData, customText])

	const handleDownload = () => {
		if (newsletterData && generatedHtml) {
			const blob = new Blob([generatedHtml], { type: 'text/html' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const startDate = newsletterData.next_week_start.split('T')[0]
			a.download = `campus-life-newsletter-${startDate}.html`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		}
	}

	const handleCopy = async () => {
		if (newsletterData && generatedHtml) {
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
						<CardTitle className="flex items-center gap-2">
							<CalendarIcon className="h-5 w-5" />
							Kalenderwoche auswählen
						</CardTitle>
						<CardDescription>
							Wähle eine Kalenderwoche für die Newsletter-Vorschau.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className="w-full justify-start sm:w-auto"
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{activeWeekNumber && activeWeekYear
											? `KW ${activeWeekNumber} ${activeWeekYear}`
											: 'Kalenderwoche wählen'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={calendarSelectedDate}
										onSelect={handleWeekSelect}
										weekStartsOn={1}
										defaultMonth={calendarSelectedDate}
									/>
								</PopoverContent>
							</Popover>
							<Button
								variant="ghost"
								className="w-full sm:w-auto"
								onClick={handleResetWeek}
								disabled={weekStart === undefined && !pickerDate}
							>
								Zur nächsten Woche
							</Button>
						</div>
						{activeWeekRangeLabel && (
							<p className="text-sm text-muted-foreground">
								Aktueller Zeitraum: {activeWeekRangeLabel}
							</p>
						)}
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
