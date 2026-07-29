import Link from 'next/link'
import NeulandPalm from '@/components/neuland-palm'

export function AuthMobileHeader() {
	return (
		<div className="flex border-b bg-neutral-100 p-4 dark:bg-[#010101] lg:hidden">
			<Link
				href="/"
				className="flex items-center gap-3 hover:opacity-80 transition-opacity"
			>
				<NeulandPalm className="h-8 w-8" color="currentColor" />
				<div className="flex flex-col">
					<h1 className="text-lg font-semibold">Campus Life Events</h1>
					<p className="text-xs text-muted-foreground">
						powered by Neuland Ingolstadt e.V.
					</p>
				</div>
			</Link>
		</div>
	)
}
