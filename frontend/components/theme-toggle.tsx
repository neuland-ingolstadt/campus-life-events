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

export function ThemeToggle() {
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
			return <Moon className="mr-2 h-4 w-4" animation="balancing" />
		} else if (theme === 'light') {
			return <Sun className="mr-2 h-4 w-4" />
		} else {
			return <SunMoon className="mr-2 h-4 w-4" />
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<AnimateIcon
					animateOnHover
					className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md"
				>
					<Button
						variant="ghost"
						size="sm"
						className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						{renderIcon()}
						<span className="truncate">Design: {activeLabel}</span>
					</Button>
				</AnimateIcon>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-40">
				<DropdownMenuItem
					onClick={() => setTheme('light')}
					className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer dark:focus:bg-gray-800 dark:focus:text-gray-100"
				>
					<Sun className="mr-2 h-4 w-4" /> Hell
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('dark')}
					className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer dark:focus:bg-gray-800 dark:focus:text-gray-100"
				>
					<Moon className="mr-2 h-4 w-4" /> Dunkel
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('system')}
					className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer dark:focus:bg-gray-800 dark:focus:text-gray-100"
				>
					<SunMoon className="mr-2 h-4 w-4" /> System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
