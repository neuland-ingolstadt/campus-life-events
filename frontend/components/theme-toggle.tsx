'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { AnimateIcon } from './animate-ui/icons/icon'
import { Moon } from './animate-ui/icons/moon'
import { Sun } from './animate-ui/icons/sun'
import { SunMoon } from './animate-ui/icons/sun-moon'

export function ThemeToggle({
	menuSide = 'bottom',
	variant = 'sidebar'
}: {
	menuSide?: 'top' | 'right' | 'bottom' | 'left'
	variant?: 'sidebar' | 'page'
}) {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])
	if (!mounted) return null

	const themeLabels = {
		light: 'Hell',
		dark: 'Dunkel',
		system: 'System'
	} as const
	const activeTheme = theme ?? 'system'
	const activeLabel =
		themeLabels[activeTheme as keyof typeof themeLabels] ?? 'System'

	const renderIcon = () => {
		if (theme === 'dark') {
			return <Moon className="h-4 w-4" animation="balancing" />
		}
		if (theme === 'light') {
			return <Sun className="h-4 w-4" />
		}
		return <SunMoon className="h-4 w-4" />
	}

	const isPage = variant === 'page'

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<AnimateIcon
					animateOnHover
					className={cn(
						'rounded-md',
						isPage
							? 'justify-center'
							: 'w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center'
					)}
				>
					<Button
						variant="ghost"
						size={isPage ? 'icon' : 'sm'}
						aria-label={`Design: ${activeLabel}`}
						className={cn(
							isPage
								? 'size-9 text-foreground'
								: 'gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0'
						)}
					>
						{renderIcon()}
						{isPage ? null : (
							<span className="truncate group-data-[collapsible=icon]:hidden">
								Design: {activeLabel}
							</span>
						)}
					</Button>
				</AnimateIcon>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={isPage ? 'end' : 'start'}
				side={menuSide}
				className="w-40"
			>
				<DropdownMenuItem
					onClick={() => setTheme('light')}
					className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
				>
					<Sun className="mr-2 h-4 w-4" /> Hell
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('dark')}
					className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
				>
					<Moon className="mr-2 h-4 w-4" /> Dunkel
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('system')}
					className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
				>
					<SunMoon className="mr-2 h-4 w-4" /> System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
