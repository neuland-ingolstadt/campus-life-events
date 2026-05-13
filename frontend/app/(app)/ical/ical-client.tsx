'use client'

import { Building2, Calendar, Copy, PartyPopper } from 'lucide-react'
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
	const clIcalId = useId()
	const thiIcalId = useId()
	const personalIcalId = useId()

	const copyToClipboard = (text: string, description: string) => {
		navigator.clipboard.writeText(text)
		toast.success(`${description} wurde in die Zwischenablage kopiert.`)
	}

	const clIcalUrl = `${backendUrl}/api/ical/cl`
	const thiIcalUrl = `${backendUrl}/api/ical/thi`
	const personalIcalUrl = `${backendUrl}/api/ical/${userId}`

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
						Abonniere öffentliche Events in deinem Kalender: getrennt nach
						Campus Life (Studierendenorganisationen) und THI Services
						(Abteilungen & Einrichtungen).
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<Card className="transition-all duration-300 hover:shadow-lg border-primary/20">
						<CardHeader>
							<div className="flex items-center gap-2">
								<PartyPopper className="h-5 w-5 text-primary" />
								<CardTitle>Campus Life (CL)</CardTitle>
							</div>
							<CardDescription>
								Alle öffentlichen Events von Studierendenorganisationen und
								Hochschulgruppen
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<label htmlFor={clIcalId} className="text-sm font-medium">
									iCal URL
								</label>
								<div className="flex gap-2">
									<input
										id={clIcalId}
										type="text"
										value={clIcalUrl}
										readOnly
										className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono"
									/>
									<Button
										variant="outline"
										className="h-10 px-3 shrink-0"
										onClick={() =>
											copyToClipboard(clIcalUrl, 'Campus Life iCal URL')
										}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="transition-all duration-300 hover:shadow-lg border-primary/20">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Building2 className="h-5 w-5 text-primary" />
								<CardTitle>THI Services</CardTitle>
							</div>
							<CardDescription>
								Alle öffentlichen Events von THI-Abteilungen und
								Hochschuleinrichtungen
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<label htmlFor={thiIcalId} className="text-sm font-medium">
									iCal URL
								</label>
								<div className="flex gap-2">
									<input
										id={thiIcalId}
										type="text"
										value={thiIcalUrl}
										readOnly
										className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono"
									/>
									<Button
										variant="outline"
										className="h-10 px-3 shrink-0"
										onClick={() =>
											copyToClipboard(thiIcalUrl, 'THI Services iCal URL')
										}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{userId ? (
					<Card className="transition-all duration-300 hover:shadow-lg">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								<CardTitle>Events deiner Organisation</CardTitle>
							</div>
							<CardDescription>Events deiner Organisation</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<label htmlFor={personalIcalId} className="text-sm font-medium">
									iCal URL
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
										className="h-10 px-3 shrink-0"
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
					<Card className="transition-all duration-300 hover:shadow-lg">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								<CardTitle>Kalender pro Organisation</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3 text-sm text-muted-foreground">
								<p>
									Als Administrator hast du keinen eigenen
									Organisations-Kalender. Organisationen können ihre eigenen
									Kalender abonnieren, indem sie:
								</p>
								<ul className="space-y-2 list-disc list-inside ml-4">
									<li>Als Organisator angemeldet sind</li>
									<li>
										Diese Seite besuchen, um die organisationsspezifische
										iCal-URL zu erhalten
									</li>
								</ul>
								<p>
									Jede Organisation erhält eine einzigartige iCal-URL, die nur
									die Events dieser Organisation enthält.
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				<Card className="transition-all duration-300 hover:shadow-lg">
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
									<li>Links: Andere Kalender hinzufügen</li>
									<li>Wähle Von URL</li>
									<li>Füge die iCal URL ein</li>
									<li>Klicke Kalender hinzufügen</li>
								</ol>
							</div>

							<div className="space-y-2">
								<h4 className="font-medium">Apple Calendar</h4>
								<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
									<li>Öffne die Kalender-App</li>
									<li>Menü: Ablage → Neues Abonnement</li>
									<li>Füge die iCal URL ein</li>
									<li>Klicke Abonnieren</li>
									<li>Wähle gewünschte Einstellungen</li>
								</ol>
							</div>

							<div className="space-y-2">
								<h4 className="font-medium">Outlook</h4>
								<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
									<li>Öffne Outlook</li>
									<li>Gehe zu Kalender</li>
									<li>Klicke Kalender hinzufügen</li>
									<li>Wähle Aus dem Internet</li>
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
