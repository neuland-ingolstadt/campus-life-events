import type { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Campus Life Events',
	description: 'Discover and share campus events'
}

export default function PublicLayout({
	children
}: {
	children: React.ReactNode
}) {
	return <>{children}</>
}
