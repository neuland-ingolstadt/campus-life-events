import type { Metadata } from 'next'
import { QueryProvider } from '@/components/query-provider'

export const metadata: Metadata = {
	title: 'Campus Life Events',
	description: 'Discover and share campus events'
}

export default function PublicLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="de">
			<body className="antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	)
}
