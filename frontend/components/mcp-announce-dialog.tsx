'use client'

import { ArrowUp, Check, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'cle.mcp-announce.v1'
const PROMPT =
	'Erstelle mir ein Event am 25.12 und bewerbe es in der Neuland Next App …'

type Phase = 'typing' | 'sending' | 'thinking' | 'tools' | 'reply'

function persistDismissed() {
	try {
		localStorage.setItem(STORAGE_KEY, '1')
	} catch {
		return
	}
}

function wasDismissed() {
	try {
		return localStorage.getItem(STORAGE_KEY) === '1'
	} catch {
		return false
	}
}

function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false)

	useEffect(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)')
		const apply = () => setReduced(media.matches)
		apply()
		media.addEventListener('change', apply)
		return () => media.removeEventListener('change', apply)
	}, [])

	return reduced
}

function McpChatPreview({ playing }: { playing: boolean }) {
	const reducedMotion = usePrefersReducedMotion()
	const [phase, setPhase] = useState<Phase>(reducedMotion ? 'reply' : 'typing')
	const [typed, setTyped] = useState(reducedMotion ? PROMPT : '')

	useEffect(() => {
		if (!playing) {
			return
		}

		if (reducedMotion) {
			setTyped(PROMPT)
			setPhase('reply')
			return
		}

		let cancelled = false
		const timers = new Set<number>()

		const wait = (ms: number) =>
			new Promise<void>((resolve) => {
				const id = window.setTimeout(() => {
					timers.delete(id)
					resolve()
				}, ms)
				timers.add(id)
			})

		const run = async () => {
			await wait(360)
			if (cancelled) {
				return
			}

			while (!cancelled) {
				setTyped('')
				setPhase('typing')

				for (let index = 0; index <= PROMPT.length; index += 1) {
					if (cancelled) {
						return
					}

					setTyped(PROMPT.slice(0, index))
					const character = PROMPT.charAt(index - 1)
					const pause =
						character === '.'
							? 160
							: character === ','
								? 90
								: character === ' '
									? 28
									: 0
					await wait(16 + Math.random() * 26 + pause)
				}

				if (cancelled) {
					return
				}

				await wait(280)
				if (cancelled) {
					return
				}
				setPhase('sending')
				await wait(380)
				if (cancelled) {
					return
				}
				setPhase('thinking')
				await wait(720)
				if (cancelled) {
					return
				}
				setPhase('tools')
				await wait(980)
				if (cancelled) {
					return
				}
				setPhase('reply')
				await wait(4200)
			}
		}

		void run()

		return () => {
			cancelled = true
			for (const id of timers) {
				window.clearTimeout(id)
			}
		}
	}, [playing, reducedMotion])

	const showUserBubble = phase !== 'typing' && phase !== 'sending'
	const showThinking = phase === 'thinking'
	const showTools = phase === 'tools' || phase === 'reply'
	const showReply = phase === 'reply'
	const composerValue = phase === 'typing' || phase === 'sending' ? typed : ''

	return (
		<div
			aria-hidden="true"
			className="overflow-hidden rounded-xl border bg-background"
		>
			<div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
				<div className="flex min-w-0 items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<Sparkles className="size-3.5" />
					</span>
					<div className="min-w-0 leading-tight">
						<p className="truncate text-xs font-semibold">KI-Client</p>
						<p className="truncate text-[10px] text-muted-foreground">
							MCP · Campus Life Events
						</p>
					</div>
				</div>
				<span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
					<span className="relative flex size-1.5">
						{reducedMotion ? null : (
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
						)}
						<span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
					</span>
					verbunden
				</span>
			</div>

			<div className="flex h-[248px] flex-col justify-end gap-2 overflow-hidden bg-muted/15 p-3">
				<AnimatePresence>
					{showUserBubble ? (
						<motion.div
							key="user"
							initial={{ opacity: 0, y: 10, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
							className="ml-8 rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
						>
							<p className="text-[13px] leading-relaxed text-pretty">
								{PROMPT}
							</p>
						</motion.div>
					) : null}
				</AnimatePresence>

				<AnimatePresence>
					{showThinking ? (
						<motion.div
							key="thinking"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							className="mr-12 flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border bg-background px-3 py-2"
						>
							{[0, 1, 2].map((dot) => (
								<motion.span
									key={dot}
									className="size-1.5 rounded-full bg-muted-foreground/80"
									animate={{ opacity: [0.25, 1, 0.25], y: [0, -2.5, 0] }}
									transition={{
										duration: 0.7,
										repeat: Number.POSITIVE_INFINITY,
										delay: dot * 0.14
									}}
								/>
							))}
						</motion.div>
					) : null}
				</AnimatePresence>

				<AnimatePresence>
					{showTools ? (
						<motion.div
							key="tools"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -6 }}
							transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
							className="mr-6 overflow-hidden rounded-xl border bg-background"
						>
							<div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
								<p className="font-mono text-[11px] text-muted-foreground">
									create_my_event
								</p>
								<span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
									<Check className="size-3" />
									ok
								</span>
							</div>
							<div className="space-y-1 px-3 py-2 font-mono text-[11px] text-muted-foreground">
								<motion.p
									initial={{ opacity: 0, x: -4 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.12 }}
								>
									start_date_time: 2026-12-25
								</motion.p>
								<motion.p
									initial={{ opacity: 0, x: -4 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.28 }}
								>
									publish_app: true
								</motion.p>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>

				<AnimatePresence>
					{showReply ? (
						<motion.div
							key="reply"
							initial={{ opacity: 0, y: 10, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
							className="mr-8 rounded-2xl rounded-bl-md border bg-background px-3 py-2"
						>
							<p className="text-[13px] leading-relaxed text-pretty">
								Weihnachtsfeier am 25. Dezember ist angelegt und in der Neuland
								Next App veröffentlicht.
							</p>
						</motion.div>
					) : null}
				</AnimatePresence>
			</div>

			<div className="border-t bg-background p-2">
				<div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5">
					<p
						className={cn(
							'flex min-h-7 flex-1 items-center text-[13px] leading-5',
							composerValue ? 'text-foreground' : 'text-muted-foreground/70'
						)}
					>
						<span>
							{composerValue || 'Nachricht an Campus Life…'}
							{phase === 'typing' ? (
								<span className="ml-px inline-block h-[0.9em] w-[1.5px] bg-foreground align-[-0.05em] animate-pulse" />
							) : null}
						</span>
					</p>
					<motion.div
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
						animate={
							phase === 'sending' ? { scale: 0.88, y: -2 } : { scale: 1, y: 0 }
						}
						transition={{ duration: 0.2 }}
					>
						<ArrowUp className="size-3.5" />
					</motion.div>
				</div>
			</div>
		</div>
	)
}

export function McpAnnounceDialog() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (wasDismissed()) {
			return
		}

		const timeout = window.setTimeout(() => {
			setOpen(true)
		}, 480)

		return () => window.clearTimeout(timeout)
	}, [])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[26.5rem]">
				<DialogHeader className="space-y-2 px-6 pt-6 pb-4 text-left">
					<p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
						Neu
					</p>
					<DialogTitle className="text-xl tracking-tight">
						Events per Chat erstellen
					</DialogTitle>
					<DialogDescription className="text-pretty">
						Campus Life spricht jetzt MCP. Sag deiner KI, was sie tun soll –
						Events anlegen, in der Neuland Next App bewerben und mehr.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6">
					<McpChatPreview playing={open} />
				</div>

				<DialogFooter className="flex-col gap-2 px-6 py-4 sm:flex-col sm:space-x-0">
					<Button asChild className="w-full">
						<Link href="/ai-setup" onClick={persistDismissed}>
							Zur Anleitung
						</Link>
					</Button>
					<Button
						type="button"
						variant="ghost"
						className="w-full"
						onClick={() => setOpen(false)}
					>
						Später
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
