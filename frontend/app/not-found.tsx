import { ArrowRight, Bug, Compass } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UnifiedFooter } from '@/components/unified-footer'

export default function NotFound() {
	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-gradient-radial from-primary/25 via-primary/10 to-transparent opacity-70 blur-3xl dark:from-primary/15 dark:via-primary/10" />
				<div className="absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-60 blur-3xl dark:from-primary/15 dark:via-primary/5" />
				<div className="absolute left-[-10rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-gradient-to-tr from-sky-400/25 via-primary/10 to-transparent opacity-50 blur-3xl dark:from-sky-500/15 dark:via-primary/10" />
			</div>
			<main className="relative flex flex-1 items-center justify-center px-6 py-16 sm:px-8 md:py-24">
				<div className="w-full max-w-3xl space-y-12 text-center">
					<div className="flex flex-col items-center gap-6">
						<div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-lg backdrop-blur">
							<Bug className="h-7 w-7" />
						</div>
						<Badge
							variant="outline"
							className="border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
						>
							Fehler 404
						</Badge>
						<div className="space-y-4">
							<h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
								<span className="bg-gradient-to-r from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent">
									Seite nicht gefunden
								</span>
							</h1>
							<p className="text-lg text-muted-foreground sm:text-xl">
								Die angeforderte Seite existiert nicht.
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-4">
							<Button asChild size="lg">
								<Link href="/">
									<Compass className="h-4 w-4" />
									Zur Startseite
								</Link>
							</Button>
							<Button asChild size="lg" variant="outline">
								<Link href="/login">
									<ArrowRight className="h-4 w-4" />
									Zum Login
								</Link>
							</Button>
						</div>
					</div>

					<p className="text-sm text-muted-foreground">
						Wenn du glaubst, dass es sich um einen Fehler handelt, kontaktiere
						uns.
					</p>
				</div>
			</main>
			<UnifiedFooter variant="auth" showThemeToggle />
		</div>
	)
}
