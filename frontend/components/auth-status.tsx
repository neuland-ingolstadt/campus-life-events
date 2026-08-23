'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OrganizerKindBadge } from '@/components/organizer-kind-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { logout, me } from '@/lib/auth'
import { LogOut } from './animate-ui/icons/log-out'

export function AuthStatus() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { state, isMobile } = useSidebar()
	const isIconCollapsed = !isMobile && state === 'collapsed'
	const { data: user } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})

	async function onLogout() {
		await logout()
		queryClient.clear()
		router.push('/login')
	}

	if (!user) {
		if (isIconCollapsed) {
			return (
				<Button
					size="icon"
					variant="ghost"
					onClick={() => router.push('/login')}
					className="mx-auto size-8"
					aria-label="Anmelden"
				>
					<User className="h-4 w-4" />
				</Button>
			)
		}

		return (
			<Card className="border-dashed">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Avatar className="h-8 w-8">
								<AvatarFallback className="bg-muted">
									<User className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<span className="text-sm font-medium text-muted-foreground">
									Nicht angemeldet
								</span>
								<span className="text-xs text-muted-foreground/70">
									Melde dich an, um fortzufahren
								</span>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={() => router.push('/login')}
							className="shrink-0"
						>
							Anmelden
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	const isAdmin = user.account_type === 'ADMIN'
	const initials = user.display_name
		.split(' ')
		.map((name: string) => name.charAt(0))
		.join('')
		.toUpperCase()
		.slice(0, 2)

	if (isIconCollapsed) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="mx-auto size-8 rounded-md p-0"
						aria-label={user.display_name}
					>
						<Avatar className="h-8 w-8">
							<AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
								{initials}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="right" align="end" className="w-56">
					<DropdownMenuLabel className="space-y-1 font-normal">
						<p className="truncate text-sm font-semibold">
							{user.display_name}
						</p>
						{isAdmin ? (
							<Badge
								variant="secondary"
								className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
							>
								<Shield className="mr-1 h-3 w-3" />
								Admin
							</Badge>
						) : user.organizer_id ? (
							<OrganizerKindBadge
								kind={user.organizer_kind ?? 'STUDENT_ASSOCIATION'}
								showIcon
								className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
							/>
						) : (
							<Badge
								variant="outline"
								className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
							>
								<User className="mr-1 h-3 w-3" />
								Benutzer
							</Badge>
						)}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={onLogout}
						className="cursor-pointer text-destructive focus:text-destructive"
					>
						<LogOut className="h-4 w-4" />
						Abmelden
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		)
	}

	return (
		<TooltipProvider>
			<Card className="border-sidebar-border bg-sidebar text-sidebar-foreground">
				<CardContent className="px-3 py-0 md:py-2">
					<div className="flex items-center gap-3">
						<Avatar className="h-10 w-10">
							<AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
								{initials}
							</AvatarFallback>
						</Avatar>

						<div className="flex-1 min-w-0">
							<div className="mb-1">
								<span className="text-sm font-semibold truncate block">
									{user.display_name}
								</span>
							</div>
							<div className="flex items-center gap-2">
								{isAdmin ? (
									isMobile ? (
										<Badge
											variant="secondary"
											className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
										>
											<Shield className="h-3 w-3 mr-1" />
											Admin
										</Badge>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<Badge
													variant="secondary"
													className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
												>
													<Shield className="h-3 w-3 mr-1" />
													Admin
												</Badge>
											</TooltipTrigger>
											<TooltipContent>
												<p>Administrator-Berechtigung</p>
											</TooltipContent>
										</Tooltip>
									)
								) : user.organizer_id ? (
									isMobile ? (
										<OrganizerKindBadge
											kind={user.organizer_kind ?? 'STUDENT_ASSOCIATION'}
											showIcon
											className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
										/>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex">
													<OrganizerKindBadge
														kind={user.organizer_kind ?? 'STUDENT_ASSOCIATION'}
														showIcon
														className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
													/>
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													{user.organizer_kind === 'THI_DEPARTMENT'
														? 'THI Services / Hochschuleinrichtung'
														: 'Hochschulgruppe (Campus Life)'}
												</p>
											</TooltipContent>
										</Tooltip>
									)
								) : (
									<Badge
										variant="outline"
										className="border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
									>
										<User className="h-3 w-3 mr-1" />
										Benutzer
									</Badge>
								)}
							</div>
						</div>

						{isMobile ? (
							<Button
								size="sm"
								variant="ghost"
								onClick={onLogout}
								className="shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
							>
								<LogOut className="h-4 w-4" />
							</Button>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										variant="ghost"
										onClick={onLogout}
										className="shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
									>
										<LogOut className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Abmelden</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	)
}
