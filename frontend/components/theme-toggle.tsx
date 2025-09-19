'use client'

import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
	const { theme, setTheme, systemTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])
	if (!mounted) return null

	const current = theme === 'system' ? systemTheme : theme
	const Icon = current === 'dark' ? Moon : current === 'light' ? Sun : Laptop
	const themeLabels = {
		light: 'Hell',
		dark: 'Dunkel',
		system: 'System'
	} as const
	const activeTheme = theme ?? 'system'
	const activeLabel =
		themeLabels[activeTheme as keyof typeof themeLabels] ?? 'System'

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="w-full justify-start">
					<Icon className="mr-2 h-4 w-4" />
					<span className="truncate">Design: {activeLabel}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-40">
				<DropdownMenuItem onClick={() => setTheme('light')}>
					<Sun className="mr-2 h-4 w-4" /> Hell
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('dark')}>
					<Moon className="mr-2 h-4 w-4" /> Dunkel
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('system')}>
					<Laptop className="mr-2 h-4 w-4" /> System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
