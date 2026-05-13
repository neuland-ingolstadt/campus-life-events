'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ElementType, useCallback, useMemo, useState } from 'react'
import { AuthStatus } from '@/components/auth-status'
import { ThemeToggle } from '@/components/theme-toggle'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'
import { me } from '@/lib/auth'
import { ChartColumnIncreasing } from './animate-ui/icons/chart-column-increasing'
import { Hammer } from './animate-ui/icons/hammer'
import { LayoutDashboard } from './animate-ui/icons/layout-dashboard'
import { PartyPopper } from './animate-ui/icons/party-popper'
import { Radio } from './animate-ui/icons/radio'
import { Send } from './animate-ui/icons/send'
import { Settings } from './animate-ui/icons/settings'
import { Users } from './animate-ui/icons/users'
import NeulandPalm from './neuland-palm'

export function DashboardSidebar() {
	const pathname = usePathname()
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const isAdmin = meData?.account_type === 'ADMIN'
	const canAccessNewsletter = meData?.can_access_newsletter ?? false
	const { isMobile, setOpenMobile } = useSidebar()
	const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set())

	const brandTitle = useMemo(() => {
		if (meData?.account_type === 'ADMIN') {
			return 'Campus Life'
		}
		if (meData?.organizer_kind === 'THI_DEPARTMENT') {
			return 'THI Services'
		}
		return 'Campus Life'
	}, [meData?.account_type, meData?.organizer_kind])

	const handleNavigation = useCallback(() => {
		if (isMobile) {
			setOpenMobile(false)
		}
	}, [isMobile, setOpenMobile])

	const handleItemClick = useCallback((itemTitle: string) => {
		setAnimatingItems((prev) => new Set(prev).add(itemTitle))
		setTimeout(() => {
			setAnimatingItems((prev) => {
				const newSet = new Set(prev)
				newSet.delete(itemTitle)
				return newSet
			})
		}, 600)
	}, [])

	const items = useMemo(() => {
		type NavItem = {
			title: string
			url: string
			icon: ElementType<{ className?: string; animate?: boolean }>
			isActive: (p: string) => boolean
		}
		const navItems: NavItem[] = [
			{
				title: 'Dashboard',
				url: '/',
				icon: LayoutDashboard,
				isActive: (p) => p === '/'
			},
			{
				title: 'Events',
				url: '/events',
				icon: PartyPopper,
				isActive: (p) => p.startsWith('/events')
			},
			{
				title: 'Organisationen',
				url: '/organizers',
				icon: Users,
				isActive: (p) => p.startsWith('/organizers')
			}
		]

		if (isAdmin) {
			navItems.push({
				title: 'Admin',
				url: '/admin',
				icon: Hammer,
				isActive: (p) => p.startsWith('/admin')
			})
		}

		if (canAccessNewsletter) {
			navItems.push({
				title: 'Newsletter',
				url: '/newsletter',
				icon: Send,
				isActive: (p) => p.startsWith('/newsletter')
			})
		}

		navItems.push(
			{
				title: 'iCal Abonnements',
				url: '/ical',
				icon: Radio,
				isActive: (p) => p.startsWith('/ical')
			},
			{
				title: 'Analysen',
				url: '/analytics',
				icon: ChartColumnIncreasing,
				isActive: (p) => p.startsWith('/analytics')
			},
			{
				title: 'Einstellungen',
				url: '/settings',
				icon: Settings,
				isActive: (p) => p.startsWith('/settings')
			}
		)

		return navItems
	}, [canAccessNewsletter, isAdmin])

	return (
		<Sidebar variant="sidebar">
			<SidebarHeader>
				<div className="flex justify-center py-2 md:hidden">
					<div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
				</div>
				<Link href="/" className="flex items-center gap-2 px-4 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<NeulandPalm className="h-6 w-6" color="currentColor" />
					</div>
					<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{brandTitle}</span>
						<span className="truncate text-xs text-muted-foreground">
							Event-Dashboard
						</span>
					</div>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={item.isActive(pathname)}
										size="lg"
									>
										<Link
											href={item.url}
											onClick={() => {
												handleItemClick(item.title)
												handleNavigation()
											}}
										>
											<item.icon
												className="h-5 w-5"
												animate={animatingItems.has(item.title)}
											/>
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="p-4 space-y-3">
				<AuthStatus />
				<div className="flex items-center justify-center">
					<ThemeToggle />
				</div>
			</SidebarFooter>
		</Sidebar>
	)
}
