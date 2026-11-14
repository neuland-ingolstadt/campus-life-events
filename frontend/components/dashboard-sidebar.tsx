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
		setAnimatingItems((previous) => new Set(previous).add(itemTitle))
		setTimeout(() => {
			setAnimatingItems((previous) => {
				const next = new Set(previous)
				next.delete(itemTitle)
				return next
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
		<Sidebar variant="sidebar" collapsible="icon">
			<SidebarHeader className="border-b border-sidebar-border px-2 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-2">
				<div className="flex justify-center py-2 md:hidden">
					<div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
				</div>
				<SidebarMenu className="group-data-[collapsible=icon]:items-center">
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							asChild
							tooltip={brandTitle}
							className="group-data-[collapsible=icon]:justify-center"
						>
							<Link href="/">
								<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
									<NeulandPalm className="h-5 w-5" color="currentColor" />
								</div>
								<div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
									<span className="truncate font-semibold tracking-tight">
										{brandTitle}
									</span>
									<span className="truncate text-xs text-sidebar-foreground/65">
										Event-Dashboard
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="px-2 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-2">
				<SidebarGroup className="p-0 group-data-[collapsible=icon]:items-center">
					<SidebarGroupLabel className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55">
						Navigation
					</SidebarGroupLabel>
					<SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
						<SidebarMenu className="group-data-[collapsible=icon]:items-center">
							{items.map((item) => (
								<SidebarMenuItem
									key={item.title}
									className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
								>
									<SidebarMenuButton
										asChild
										isActive={item.isActive(pathname)}
										size="lg"
										tooltip={item.title}
										className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
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
											<span className="group-data-[collapsible=icon]:hidden">
												{item.title}
											</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="space-y-3 border-t border-sidebar-border p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:space-y-2 group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-2">
				<AuthStatus />
				<div className="flex items-center justify-center">
					<ThemeToggle menuSide="right" />
				</div>
			</SidebarFooter>
		</Sidebar>
	)
}
