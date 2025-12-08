import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/query-provider'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
	title: 'Campus Life Events',
	description: 'Verwalte Campus-Events und Vereine',
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
		noimageindex: true
	},
	openGraph: {
		title: 'Campus Life Events',
		description:
			'Verwalte Campus-Events und Vereine an der THI. Ein Projekt von Neuland Ingolstadt e.V.',
		type: 'website',
		locale: 'de_DE'
	},
	twitter: {
		card: 'summary',
		title: 'Campus Life Events',
		description:
			'Verwalte Campus-Events und Vereine an der THI. Ein Projekt von Neuland Ingolstadt e.V.'
	},
	other: {
		'X-UA-Compatible': 'IE=edge'
	}
}

export default function RootLayout({
	children
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="de" suppressHydrationWarning>
			<body className="antialiased min-h-screen bg-background text-foreground">
				<QueryProvider>
					<ThemeProvider>{children}</ThemeProvider>
				</QueryProvider>
			</body>
		</html>
	)
}
