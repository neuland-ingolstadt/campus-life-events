'use client'

import { useQuery } from '@tanstack/react-query'
import {
	BarChart3,
	Calendar,
	CalendarDays,
	Home,
	Settings,
	Shield,
	Users
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
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
import NeulandPalm from './neuland-palm'

export function DashboardSidebar() {
	const pathname = usePathname()
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const isAdmin = meData?.account_type === 'ADMIN'
	const { isMobile, setOpenMobile } = useSidebar()
	const handleNavigation = useCallback(() => {
		if (isMobile) {
			setOpenMobile(false)
		}
	}, [isMobile, setOpenMobile])

	const items = useMemo(() => {
		const base = [
			{
				title: 'Dashboard',
				url: '/',
				icon: Home
			},
			{
				title: 'Events',
				url: '/events',
				icon: Calendar
			},
			{
				title: 'Vereine',
				url: '/organizers',
				icon: Users
			},
			{
				title: 'iCal Abonnements',
				url: '/ical',
				icon: CalendarDays
			},
			{
				title: 'Analysen',
				url: '/analytics',
				icon: BarChart3
			},
			{
				title: 'Einstellungen',
				url: '/settings',
				icon: Settings
			}
		]

		if (isAdmin) {
			base.splice(3, 0, {
				title: 'Admin',
				url: '/admin',
				icon: Shield
			})
		}

		return base
	}, [isAdmin])

	return (
		<Sidebar variant="sidebar">
			<SidebarHeader>
				{/* Mobile bottom sheet handle */}
				<div className="flex justify-center py-2 md:hidden">
					<div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
				</div>
				<div className="flex items-center gap-2 px-4 py-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<NeulandPalm className="h-6 w-6" color="currentColor" />
					</div>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">Campus Life</span>
						<span className="truncate text-xs text-muted-foreground">
							Event-Dashboard
						</span>
					</div>
				</div>
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
										isActive={pathname === item.url}
										size="lg"
									>
										<Link href={item.url} onClick={handleNavigation}>
											<item.icon className="h-5 w-5" />
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
