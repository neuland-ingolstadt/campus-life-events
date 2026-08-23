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
import { AnimateIcon } from './animate-ui/icons/icon'
import { Moon } from './animate-ui/icons/moon'
import { Sun } from './animate-ui/icons/sun'
import { SunMoon } from './animate-ui/icons/sun-moon'

export function ThemeToggle({
	menuSide = 'bottom'
}: {
	menuSide?: 'top' | 'right' | 'bottom' | 'left'
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
		} else if (theme === 'light') {
			return <Sun className="h-4 w-4" />
		} else {
			return <SunMoon className="h-4 w-4" />
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<AnimateIcon
					animateOnHover
					className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center"
				>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
					>
						{renderIcon()}
						<span className="truncate group-data-[collapsible=icon]:hidden">
							Design: {activeLabel}
						</span>
					</Button>
				</AnimateIcon>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side={menuSide} className="w-40">
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
