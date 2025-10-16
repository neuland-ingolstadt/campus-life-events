import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text
} from '@react-email/components'
import { useCallback } from 'react'
import type { NewsletterDataResponse } from '@/client'

interface NewsletterMailProps {
	data: NewsletterDataResponse
	customText?: string
}

const NewsletterMail = ({ data, customText }: NewsletterMailProps) => {
	const {
		subject,
		next_week_events,
		following_week_events,
		all_organizers,
		next_week_start,
		week_after_start
	} = data

	const formatDate = useCallback((dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
	}, [])

	const formatTime = useCallback((dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}, [])

	const getWeekNumber = useCallback((dateStr: string) => {
		const date = new Date(dateStr)
		const start = new Date(date.getFullYear(), 0, 1)
		const days = Math.floor(
			(date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
		)
		return Math.ceil((days + start.getDay() + 1) / 7)
	}, [])

	const getDateRange = useCallback(
		(startDateStr: string, endDateStr: string) => {
			const startDate = new Date(startDateStr)
			const endDate = new Date(endDateStr)
			const startFormatted = startDate.toLocaleDateString('de-DE', {
				day: 'numeric',
				month: 'numeric'
			})
			const endFormatted = endDate.toLocaleDateString('de-DE', {
				day: 'numeric',
				month: 'numeric'
			})
			return `${startFormatted} - ${endFormatted}`
		},
		[]
	)

	const weekNumber = getWeekNumber(next_week_start)
	const weekAfterNumber = getWeekNumber(week_after_start)

	// Parse custom text into paragraphs
	const customTextParagraphs = customText
		? customText
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
		: []

	return (
		<Html>
			<Head />
			<Preview>{subject}</Preview>

			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								brand: '#215b9c',
								brandLight: 'rgba(255,255,255,0.2)'
							}
						}
					}
				}}
			>
				<Body className="bg-gray-100 font-sans text-gray-700 m-0 p-0">
					<Container className="max-w-[800px] mx-auto my-0 bg-white border border-gray-200">
						<Img
							src="https://nbg1.your-objectstorage.com/neuland/uploads/cl-tool/cl-header.webp"
							alt="Campus Life Header"
							className="w-full aspect-auto "
						/>

						{/* Header */}
						<Section className="bg-brand text-white p-8">
							<Text className="text-[25px] font-bold m-0">
								Campus Life Newsletter
							</Text>
							<Text className="text-[15px] mt-1 mb-0">
								Kalenderwoche {weekNumber}
							</Text>
						</Section>

						{/* Content */}
						<Section className="px-8 py-8">
							{/* Intro */}
							<div
								style={{
									backgroundColor: '#f8fafc',
									padding: '15px',
									borderRadius: '16px',
									marginBottom: '30px'
								}}
							>
								<Text className="m-0 mb-2 leading-relaxed text-gray-700">
									Hallo zusammen!
								</Text>
								<Text className="m-0 leading-relaxed text-gray-700">
									Hier sind die kommenden Veranstaltungen für euch
									zusammengestellt. Viel Spaß bei den Events!
								</Text>
							</div>

							{/* Custom Text */}
							{customTextParagraphs.length > 0 && (
								<div className="mb-8">
									<Heading
										as="h2"
										className="text-2xl text-brand my-8 pb-2 border-b-2 border-gray-200"
									>
										Ankündigungen
									</Heading>
									<div
										style={{
											backgroundColor: '#ffffff',
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											padding: '20px',
											marginTop: '15px'
										}}
									>
										{customTextParagraphs.map((paragraph, index) => (
											<Text
												key={paragraph}
												className={
													index === customTextParagraphs.length - 1
														? 'm-0 leading-relaxed text-gray-700'
														: 'm-0 mb-2 leading-relaxed text-gray-700'
												}
											>
												{paragraph}
											</Text>
										))}
									</div>
								</div>
							)}

							{/* Next Week Events */}
							<Heading
								as="h2"
								className="text-2xl text-brand my-8 pb-2 border-b-2 border-gray-200"
							>
								Events der Vereine (
								{getDateRange(next_week_start, week_after_start)})
							</Heading>

							{next_week_events.length > 0 ? (
								next_week_events.map((event) => {
									const startDate = new Date(event.start_date_time)
									const endDate = new Date(event.end_date_time)
									const isAllDay =
										startDate.getHours() === 0 &&
										startDate.getMinutes() === 0 &&
										endDate.getHours() === 0 &&
										endDate.getMinutes() === 0

									return (
										<div
											key={event.id}
											style={{
												backgroundColor: '#ffffff',
												border: '1px solid #e5e7eb',
												borderRadius: '12px',
												padding: '25px',
												marginBottom: '20px'
											}}
										>
											<Heading
												as="h3"
												className="text-xl font-bold text-brand mb-2 leading-tight"
											>
												{event.title_de}
											</Heading>

											{event.organizer_website ? (
												<Link
													href={event.organizer_website}
													className="text-sm text-gray-500 no-underline mb-4 block"
												>
													{event.organizer_name}
												</Link>
											) : (
												<Text className="text-sm text-gray-500 mb-4">
													{event.organizer_name}
												</Text>
											)}

											<div className="mb-4">
												<Text className="inline-block text-gray-500 text-sm mr-4 mb-2">
													<span className="inline-block align-middle mr-2">
														📅
													</span>
													<span className="font-medium align-middle">
														{formatDate(event.start_date_time)}
													</span>
												</Text>

												{!isAllDay && (
													<Text className="inline-block text-gray-500 text-sm mr-4 mb-2">
														<span className="inline-block align-middle mr-2">
															🕐
														</span>
														<span className="font-medium align-middle">
															{formatTime(event.start_date_time)} -{' '}
															{formatTime(event.end_date_time)}
														</span>
													</Text>
												)}

												{event.location && (
													<Text className="inline-block text-gray-500 text-sm mr-4 mb-2">
														<span className="inline-block align-middle mr-2">
															📍
														</span>
														<span className="font-medium align-middle">
															{event.location}
														</span>
													</Text>
												)}
											</div>

											{event.description_de && (
												<Text className="text-gray-700 leading-relaxed mt-4">
													{event.description_de}
												</Text>
											)}

											{event.event_url && (
												<Button
													href={event.event_url}
													className="inline-block bg-brand text-white py-2 px-4 rounded-md text-sm mt-4"
												>
													Mehr erfahren
												</Button>
											)}
										</div>
									)
								})
							) : (
								<Text className="text-gray-700">
									Keine Veranstaltungen diese Woche.
								</Text>
							)}

							{/* Following Week Events */}
							<Heading
								as="h2"
								className="text-2xl text-brand my-8 pb-2 border-b-2 border-gray-200"
							>
								Ausblick Kalenderwoche {weekAfterNumber}
							</Heading>

							{following_week_events.length > 0 ? (
								<div
									style={{
										backgroundColor: '#f8fafc',
										borderRadius: '16px',
										padding: '20px',
										marginBottom: '20px'
									}}
								>
									{following_week_events.map((event, index) => (
										<div
											key={event.id}
											style={{
												paddingTop: '12px',
												paddingBottom: '12px',
												borderBottom:
													index === following_week_events.length - 1
														? 'none'
														: '1px solid #e5e7eb'
											}}
										>
											<Text className="inline-block align-top font-bold text-brand text-sm w-[120px] m-0">
												{formatDate(event.start_date_time)}
											</Text>
											<div
												style={{
													display: 'inline-block',
													width: 'calc(100% - 140px)',
													verticalAlign: 'top',
													marginLeft: '20px'
												}}
											>
												<Text className="font-semibold text-gray-700 mb-1 text-[15px] m-0">
													{event.title_de}
												</Text>
												<Text className="text-[13px] text-gray-500 m-0">
													{formatTime(event.start_date_time)}
													{event.location && ` • ${event.location}`}
													{` • ${event.organizer_name}`}
												</Text>
											</div>
										</div>
									))}
								</div>
							) : (
								<Text className="text-gray-700">
									Keine Veranstaltungen geplant.
								</Text>
							)}

							{/* App Promo */}
							{/* <div style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '20px',
                                marginTop: '30px'
                            }}>
                                <Heading as="h3" className="m-0 mb-2 text-brand text-[22px] font-bold">
                                    Neuland Next App
                                </Heading>
                                <Heading as="h4" className="m-0 mb-1 text-gray-700 text-base font-semibold">
                                    Die Campus App für die THI
                                </Heading>
                                <Text className="m-0 mb-1 text-gray-700 leading-snug text-sm">
                                    Alle wichtigen Infos zum Studium in einer App: Stundenplan, Mensa, Sport, Events und vieles mehr! Verpasse nie wieder wichtige Termine, finde schnell deine Vorlesungen und entdecke spannende Events direkt auf deinem Smartphone.
                                </Text>
                                <Button
                                    href="https://neuland-ingolstadt.de"
                                    className="inline-block bg-brand text-white py-2 px-5 rounded-md font-bold text-sm mt-3"
                                >
                                    Mehr erfahren
                                </Button>
                            </div> */}
						</Section>

						{/* Footer */}
						<Section className="bg-gray-800 text-gray-300 py-8 px-8 text-center text-sm leading-relaxed">
							<Heading
								as="h3"
								className="text-xl font-bold text-white mt-0 mb-2"
							>
								Campus Life Events
							</Heading>
							<Text className="text-gray-300 mb-4">
								Der Newsletter für studentische Veranstaltungen
							</Text>

							<Text className="text-gray-300 mb-4">
								<strong>Die teilnehmenden Vereine und Hochschulgruppen:</strong>
								<br />
								{all_organizers.map((org) => org.name).join(' • ')}
							</Text>

							<Text className="text-gray-300 mb-4">
								Bei Rückfragen wenden Sie sich bitte an{' '}
								<Link
									href="mailto:campus-life@thi.de"
									className="text-blue-400 no-underline"
								>
									campus-life@thi.de
								</Link>
							</Text>

							<Text className="text-gray-300 mb-4">
								Kommunikation studentischer Vereine:{' '}
								<Link
									href="mailto:campus-life@thi.de"
									className="text-blue-400 no-underline"
								>
									Campus Life (Studierendenvertretung)
								</Link>
							</Text>

							<div
								style={{
									marginTop: '20px',
									fontSize: '12px',
									color: '#9ca3af'
								}}
							>
								<Text className="mb-3 text-gray-400 text-xs">
									<strong>
										Den Campus Life Newsletter nicht mehr empfangen?
									</strong>
									<br />
									Melden Sie sich unter{' '}
									<Link
										href="https://sympa.thi.de/"
										className="text-blue-400 no-underline"
									>
										https://sympa.thi.de/
									</Link>{' '}
									an (THI-Login rechts oben).
									<br />
									Dann auf <strong>Meine Listen</strong> (links) →{' '}
									<strong>students-campuslife</strong> →{' '}
									<strong>Abbestellen</strong> (links) →{' '}
									<strong>Bestätigen</strong>.
								</Text>

								<Text className="m-0 text-gray-400 text-xs">
									<strong>
										No longer receiving the Campus Life Newsletter?
									</strong>
									<br />
									Log in at{' '}
									<Link
										href="https://sympa.thi.de/"
										className="text-blue-400 no-underline"
									>
										https://sympa.thi.de/
									</Link>{' '}
									(THI login at the top right).
									<br />
									Then go to <strong>My lists</strong> (left) →{' '}
									<strong>students-campuslife</strong> →{' '}
									<strong>Unsubscribe</strong> (left) → <strong>Confirm</strong>
									.
								</Text>
							</div>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

NewsletterMail.PreviewProps = {
	data: {
		subject: 'Campus Life Newsletter - KW 42',
		next_week_start: '2025-10-20T00:00:00Z',
		week_after_start: '2025-10-27T00:00:00Z',
		next_week_events: [
			{
				id: 1,
				title_de: 'Herbstfest der Fachschaft Informatik',
				title_en: 'Computer Science Department Autumn Festival',
				description_de:
					'Gemütliches Beisammensein mit Glühwein, Bratwurst und Live-Musik. Alle Studierenden sind herzlich eingeladen!',
				description_en:
					'Cozy gathering with mulled wine, bratwurst and live music. All students are warmly invited!',
				start_date_time: '2025-10-21T18:00:00Z',
				end_date_time: '2025-10-21T23:00:00Z',
				location: 'Campus Aula',
				event_url: 'https://fachschaft-informatik.de/herbstfest',
				organizer_id: 1,
				organizer_name: 'Fachschaft Informatik',
				organizer_website: 'https://fachschaft-informatik.de',
				created_at: '2025-10-01T10:00:00Z',
				updated_at: '2025-10-15T14:30:00Z',
				publish_app: true,
				publish_in_ical: true,
				publish_newsletter: true,
				publish_web: true
			},
			{
				id: 2,
				title_de: 'Workshop: Bewerbungstraining',
				title_en: 'Workshop: Application Training',
				description_de:
					'Lernt, wie ihr euch erfolgreich für euren Traumjob bewerbt. Tipps für Lebenslauf, Anschreiben und Vorstellungsgespräch.',
				description_en:
					'Learn how to successfully apply for your dream job. Tips for CV, cover letter and job interviews.',
				start_date_time: '2025-10-23T14:00:00Z',
				end_date_time: '2025-10-23T17:00:00Z',
				location: 'Raum B201',
				event_url: 'https://career-service.thi.de/workshop',
				organizer_id: 2,
				organizer_name: 'Career Service',
				organizer_website: 'https://career-service.thi.de',
				created_at: '2025-09-15T09:00:00Z',
				updated_at: '2025-10-10T11:20:00Z',
				publish_app: true,
				publish_in_ical: true,
				publish_newsletter: true,
				publish_web: true
			},
			{
				id: 3,
				title_de: 'Ganztägiges Hackathon Event',
				title_en: 'All-Day Hackathon Event',
				description_de:
					'24-stündiger Hackathon mit spannenden Challenges und tollen Preisen. Anmeldung erforderlich!',
				description_en:
					'24-hour hackathon with exciting challenges and great prizes. Registration required!',
				start_date_time: '2025-10-25T00:00:00Z',
				end_date_time: '2025-10-26T00:00:00Z',
				location: 'Innovation Lab',
				event_url: 'https://hackathon.thi.de',
				organizer_id: 3,
				organizer_name: 'TechClub THI',
				organizer_website: null,
				created_at: '2025-09-20T16:45:00Z',
				updated_at: '2025-10-12T09:15:00Z',
				publish_app: true,
				publish_in_ical: true,
				publish_newsletter: true,
				publish_web: true
			}
		],
		following_week_events: [
			{
				id: 4,
				title_de: 'Filmabend: Blade Runner 2049',
				title_en: 'Movie Night: Blade Runner 2049',
				description_de:
					'Entspannter Filmabend mit Popcorn und Getränken. Der Sci-Fi Klassiker in bester Qualität.',
				description_en:
					'Relaxed movie night with popcorn and drinks. The sci-fi classic in best quality.',
				start_date_time: '2025-10-28T19:30:00Z',
				end_date_time: '2025-10-28T22:30:00Z',
				location: 'Kino Campus',
				event_url: null,
				organizer_id: 4,
				organizer_name: 'Filmclub THI',
				organizer_website: 'https://filmclub.thi.de',
				created_at: '2025-10-05T12:00:00Z',
				updated_at: '2025-10-14T08:45:00Z',
				publish_app: true,
				publish_in_ical: true,
				publish_newsletter: true,
				publish_web: true
			},
			{
				id: 5,
				title_de: 'Startup Pitch Night',
				title_en: 'Startup Pitch Night',
				description_de:
					'Studierende präsentieren ihre Startup-Ideen vor einer Jury aus Investoren und Unternehmern.',
				description_en:
					'Students present their startup ideas to a jury of investors and entrepreneurs.',
				start_date_time: '2025-10-30T18:00:00Z',
				end_date_time: '2025-10-30T21:00:00Z',
				location: 'Entrepreneurship Center',
				event_url: 'https://startup.thi.de/pitch-night',
				organizer_id: 5,
				organizer_name: 'Entrepreneurs Club',
				organizer_website: 'https://entrepreneurs.thi.de',
				created_at: '2025-09-30T14:20:00Z',
				updated_at: '2025-10-13T16:10:00Z',
				publish_app: true,
				publish_in_ical: true,
				publish_newsletter: true,
				publish_web: true
			}
		],
		all_organizers: [
			{
				id: 1,
				name: 'Fachschaft Informatik',
				newsletter: true,
				created_at: '2025-01-15T08:00:00Z',
				updated_at: '2025-09-20T10:30:00Z',
				description_de:
					'Die Fachschaft Informatik vertritt die Interessen aller Informatik-Studierenden.',
				description_en:
					'The Computer Science Department represents the interests of all computer science students.',
				website_url: 'https://fachschaft-informatik.de',
				instagram_url: 'https://instagram.com/fs_informatik_thi',
				linkedin_url: null,
				location: 'Campus THI, Gebäude A',
				registration_number: 'VR123456',
				non_profit: true
			},
			{
				id: 2,
				name: 'Career Service',
				newsletter: true,
				created_at: '2025-02-01T09:00:00Z',
				updated_at: '2025-08-15T14:45:00Z',
				description_de: 'Unterstützung beim Übergang vom Studium in den Beruf.',
				description_en: 'Support for the transition from studies to career.',
				website_url: 'https://career-service.thi.de',
				instagram_url: null,
				linkedin_url: 'https://linkedin.com/company/thi-career-service',
				location: 'Campus THI, Gebäude B',
				registration_number: null,
				non_profit: true
			},
			{
				id: 3,
				name: 'TechClub THI',
				newsletter: true,
				created_at: '2025-03-10T11:30:00Z',
				updated_at: '2025-10-01T13:20:00Z',
				description_de: 'Club für alle technikbegeisterten Studierenden.',
				description_en: 'Club for all technology-enthusiastic students.',
				website_url: null,
				instagram_url: 'https://instagram.com/techclub_thi',
				linkedin_url: null,
				location: 'Innovation Lab',
				registration_number: 'VR789012',
				non_profit: true
			},
			{
				id: 4,
				name: 'Filmclub THI',
				newsletter: true,
				created_at: '2025-04-05T15:15:00Z',
				updated_at: '2025-09-12T11:00:00Z',
				description_de:
					'Regelmäßige Filmvorführungen und Diskussionen über Kino und Kultur.',
				description_en:
					'Regular film screenings and discussions about cinema and culture.',
				website_url: 'https://filmclub.thi.de',
				instagram_url: null,
				linkedin_url: null,
				location: 'Kino Campus',
				registration_number: 'VR345678',
				non_profit: true
			},
			{
				id: 5,
				name: 'Entrepreneurs Club',
				newsletter: true,
				created_at: '2025-05-20T12:45:00Z',
				updated_at: '2025-09-25T17:30:00Z',
				description_de:
					'Netzwerk für gründungsinteressierte Studierende und Absolventen.',
				description_en:
					'Network for students and graduates interested in entrepreneurship.',
				website_url: 'https://entrepreneurs.thi.de',
				instagram_url: 'https://instagram.com/entrepreneurs_thi',
				linkedin_url: 'https://linkedin.com/company/entrepreneurs-thi',
				location: 'Entrepreneurship Center',
				registration_number: 'VR901234',
				non_profit: false
			}
		]
	} as NewsletterDataResponse,
	customText:
		'Dies ist eine wichtige Ankündigung für alle Studierenden!\n\nBitte beachtet die neuen Öffnungszeiten der Bibliothek während der Prüfungszeit.\n\nViel Erfolg bei euren kommenden Prüfungen!'
} as NewsletterMailProps

export default NewsletterMail
