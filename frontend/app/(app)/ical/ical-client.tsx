'use client'

import { Calendar, Copy, Globe } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface ICalClientProps {
	backendUrl: string
	userId: number | undefined
}

export function ICalClient({ backendUrl, userId }: ICalClientProps) {
	const globalIcalId = useId()
	const personalIcalId = useId()

	const copyToClipboard = (text: string, description: string) => {
		navigator.clipboard.writeText(text)
		toast.success(`${description} wurde in die Zwischenablage kopiert.`)
	}

	const globalIcalUrl = `${backendUrl}/api/v1/ical/events`
	const personalIcalUrl = `${backendUrl}/api/v1/ical/organizers/${userId}/events`

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">iCal Abonnements</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						iCal Abonnements
					</h2>
					<p className="text-muted-foreground mt-1">
						Abonniere Campus Life Events in deinem Kalender oder teile die Links
						mit deinen Mitgliedern!
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{/* Global Calendar */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Globe className="h-5 w-5 " />
								<CardTitle>Alle Events</CardTitle>
							</div>
							<CardDescription>
								Alle öffentlich verfügbaren Campus Life Events von allen
								Vereinen
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<label htmlFor={globalIcalId} className="text-sm font-medium">
									iCal URL:
								</label>
								<div className="flex gap-2">
									<input
										id={globalIcalId}
										type="text"
										value={globalIcalUrl}
										readOnly
										className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono"
									/>
									<Button
										variant="outline"
										className="h-10 px-3"
										onClick={() =>
											copyToClipboard(globalIcalUrl, 'Global iCal URL')
										}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Personal Calendar or Admin Info */}
					{userId ? (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									<CardTitle>Deine Vereins-Events</CardTitle>
								</div>
								<CardDescription>Events von deinem Verein</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label
										htmlFor={personalIcalId}
										className="text-sm font-medium"
									>
										iCal URL:
									</label>
									<div className="flex gap-2">
										<input
											id={personalIcalId}
											type="text"
											value={personalIcalUrl}
											readOnly
											className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono"
										/>
										<Button
											variant="outline"
											className="h-10 px-3"
											onClick={() =>
												copyToClipboard(personalIcalUrl, 'Personal iCal URL')
											}
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									<CardTitle>Vereins-spezifische Kalender</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-3 text-sm text-muted-foreground">
									<p>
										Als Administrator hast du keinen eigenen Vereins-Kalender.
										Vereine können ihre eigenen Kalender abonnieren, indem sie:
									</p>
									<ul className="space-y-2 list-disc list-inside ml-4">
										<li>Als Organisator angemeldet sind</li>
										<li>
											Diese Seite besuchen, um ihre Vereins-spezifische iCal URL
											zu erhalten
										</li>
									</ul>
									<p>
										Jeder Verein erhält eine einzigartige iCal URL, die nur die
										Events ihres eigenen Vereins enthält.
									</p>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* How to Use Section */}
				<Card>
					<CardHeader>
						<CardTitle>So fügst du den Kalender hinzu</CardTitle>
						<CardDescription>
							Schritt-für-Schritt Anleitung für verschiedene Kalender-Apps
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-2">
								<h4 className="font-medium">Google Calendar</h4>
								<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
									<li>Öffne Google Calendar</li>
									<li>Links: "Andere Kalender hinzufügen"</li>
									<li>Wähle "Von URL"</li>
									<li>Füge die iCal URL ein</li>
									<li>Klicke "Kalender hinzufügen"</li>
								</ol>
							</div>

							<div className="space-y-2">
								<h4 className="font-medium">Apple Calendar</h4>
								<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
									<li>Öffne die Kalender-App</li>
									<li>Menü: "Ablage" → "Neues Abonnement"</li>
									<li>Füge die iCal URL ein</li>
									<li>Klicke "Abonnieren"</li>
									<li>Wähle gewünschte Einstellungen</li>
								</ol>
							</div>

							<div className="space-y-2">
								<h4 className="font-medium">Outlook</h4>
								<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
									<li>Öffne Outlook</li>
									<li>Gehe zu "Kalender"</li>
									<li>Klicke "Kalender hinzufügen"</li>
									<li>Wähle "Aus dem Internet"</li>
									<li>Füge die iCal URL ein</li>
								</ol>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
