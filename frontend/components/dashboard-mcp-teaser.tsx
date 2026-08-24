'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function DashboardMcpTeaser() {
	const [open, setOpen] = useState(false)
	const [useHoverSurface, setUseHoverSurface] = useState(false)
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
		const apply = () => setUseHoverSurface(mq.matches)
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

	const clearScheduledClose = useCallback(() => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current)
			closeTimer.current = null
		}
	}, [])

	const scheduleClose = useCallback(() => {
		clearScheduledClose()
		closeTimer.current = setTimeout(() => {
			setOpen(false)
			closeTimer.current = null
		}, 200)
	}, [clearScheduledClose])

	useEffect(() => () => clearScheduledClose(), [clearScheduledClose])

	const hoverOpenProps = useHoverSurface
		? {
				onPointerEnter: () => {
					clearScheduledClose()
					setOpen(true)
				},
				onPointerLeave: scheduleClose
			}
		: {}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					{...hoverOpenProps}
					className={cn(
						'group inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 transition-colors hover:bg-muted/50',
						'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					)}
				>
					<span className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
						<Sparkles className="size-3.5" aria-hidden />
					</span>
					<span className="flex flex-col items-start leading-none">
						<span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
							Neu
						</span>
						<span className="text-xs font-semibold tracking-tight text-foreground/90">
							MCP
							<span className="font-normal text-muted-foreground"> · </span>
							<span>KI</span>
						</span>
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(22rem,calc(100vw-2rem))] p-4"
				align="end"
				sideOffset={10}
				{...(useHoverSurface
					? {
							onPointerEnter: clearScheduledClose,
							onPointerLeave: scheduleClose
						}
					: {})}
			>
				<div className="flex gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
						<Sparkles className="size-4" aria-hidden />
					</div>
					<div className="min-w-0 space-y-2">
						<p className="text-sm font-semibold leading-tight">
							KI-Tools (MCP) für Events &amp; Organisationsprofil
						</p>
						<p className="text-sm text-muted-foreground text-pretty">
							Nutze MCP in Cursor, Claude oder anderen Clients: Events
							verwalten, Organisationsinfos pflegen und mehr.
						</p>
						<Button asChild size="sm" className="mt-1">
							<Link href="/ai-setup">KI &amp; MCP</Link>
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
