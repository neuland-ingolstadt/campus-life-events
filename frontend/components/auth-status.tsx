'use client'

import { useQuery } from '@tanstack/react-query'
import { Shield, User, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { logout, me } from '@/lib/auth'
import { AnimateIcon } from './animate-ui/icons/icon'
import { LogOut } from './animate-ui/icons/log-out'

export function AuthStatus() {
	const router = useRouter()
	const isMobile = useIsMobile()
	const { data: user, refetch } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})

	async function onLogout() {
		await logout()
		await refetch()
		router.push('/login')
	}

	if (!user) {
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

	return (
		<TooltipProvider>
			<Card className="border-0 bg-gradient-to-br from-muted/20 via-background to-muted/40 dark:from-background dark:to-muted/20 shadow-md ring-1 ring-border/60 dark:ring-border/40">
				<CardContent className="px-3 py-0 md:py-2">
					<div className="flex items-center gap-3">
						<Avatar className="h-10 w-10 ring-2 ring-primary/20">
							<AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
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
											className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
										>
											<Shield className="h-3 w-3 mr-1" />
											Admin
										</Badge>
									) : (
										<Tooltip>
											<TooltipTrigger asChild>
												<Badge
													variant="secondary"
													className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
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
									<Badge
										variant="outline"
										className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
									>
										<Users className="h-3 w-3 mr-1" />
										Verein
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
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
									<AnimateIcon animateOnHover animateOnTap>
										<Button
											size="sm"
											variant="ghost"
											onClick={onLogout}
											className="shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
										>
											<LogOut className="h-4 w-4" />
										</Button>
									</AnimateIcon>
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
