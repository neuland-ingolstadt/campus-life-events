import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
	title: 'Campus Life Events',
	description: 'Verwalte Campus-Events und Vereine'
}

export default function RootLayout({
	children
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="de" suppressHydrationWarning>
			<body className="antialiased min-h-screen bg-background text-foreground">
				<ThemeProvider>{children}</ThemeProvider>
			</body>
		</html>
	)
}
