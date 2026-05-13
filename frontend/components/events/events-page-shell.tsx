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
		<div className="flex min-h-screen min-w-0 max-w-full flex-col">
			<header
				className={cn(
					'flex h-16 min-w-0 shrink-0 items-center gap-2 border-b px-4',
					stickyHeader && 'sticky top-0 z-50 bg-background/95 backdrop-blur-sm'
				)}
				style={
					stickyHeader
						? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
						: undefined
				}
			>
				<SidebarTrigger className="-ml-1" />
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<h1 className="truncate text-lg font-semibold">{title}</h1>
				</div>
			</header>
			<div className="min-w-0 max-w-full flex-1 space-y-6 p-4 pt-6 md:p-8">
				{children}
			</div>
		</div>
	)
}
