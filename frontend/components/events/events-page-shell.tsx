'use client'

import type { ReactNode } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

interface EventsPageShellProps {
	readonly title: string
	readonly children: ReactNode
	readonly stickyHeader?: boolean
}

export function EventsPageShell({
	title,
	children,
	stickyHeader
}: EventsPageShellProps) {
	return (
		<div className="flex flex-col min-h-screen">
			<header
				className={cn(
					'flex h-16 shrink-0 items-center gap-2 border-b px-4',
					stickyHeader && 'sticky top-0 z-50 bg-background/95 backdrop-blur-sm'
				)}
				style={
					stickyHeader
						? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
						: undefined
				}
			>
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">{title}</h1>
				</div>
			</header>
			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">{children}</div>
		</div>
	)
}
