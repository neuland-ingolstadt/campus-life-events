'use client'

import type { LucideIcon } from 'lucide-react'
import { Calendar, Plus, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

type QuickAction = {
	title: string
	description: string
	icon: LucideIcon
	href: string
	hideForAdmin?: boolean
}

type QuickActionsProps = {
	userEventsCount: number
	isAdmin?: boolean
	className?: string
}

export function QuickActions({
	userEventsCount,
	isAdmin,
	className
}: QuickActionsProps) {
	const actions: QuickAction[] = [
		{
			title: 'Neues Event',
			description: 'Ein neues Event erstellen',
			icon: Plus,
			href: '/events/new',
			hideForAdmin: true
		},
		{
			title: isAdmin ? 'Alle Events' : 'Meine Events',
			description: isAdmin
				? 'Zur Eventübersicht wechseln'
				: `${userEventsCount} gesamt`,
			icon: Calendar,
			href: '/events'
		},
		{
			title: isAdmin ? 'Adminbereich' : 'Vereinsprofil',
			description: isAdmin
				? 'Verwaltung & Audit-Log öffnen'
				: 'Vereinsprofil verwalten',
			icon: isAdmin ? Shield : User,
			href: isAdmin ? '/admin' : '/organizers',
			hideForAdmin: isAdmin ? false : undefined
		}
	].filter((action) => !(isAdmin && action.hideForAdmin))

	return (
		<div className={className}>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{actions.map((action) => (
					<Link key={action.title} href={action.href} className="block">
						<Card className="cursor-pointer">
							<CardContent className="px-4 py-4">
								<div className="flex items-start gap-3 sm:gap-4">
									<div className="rounded-full from-primary/90 to-primary bg-gradient-to-br text-primary-foreground ring-1 ring-border h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center flex-shrink-0">
										<action.icon className="h-5 w-5" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium leading-tight">
											{action.title}
										</div>
										<div className="text-xs text-muted-foreground mt-1">
											{action.description}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	)
}

export default QuickActions
