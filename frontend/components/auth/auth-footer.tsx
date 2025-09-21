import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

export function AuthFooter() {
	return (
		<footer className="px-6 py-4 text-sm text-muted-foreground flex items-center justify-between gap-4 flex-wrap bg-black">
			<div className="flex items-center gap-4 flex-wrap">
				<span>
					© {`${new Date().getFullYear()} `}
					<Link
						href="https://neuland-ingolstadt.de"
						className="hover:underline"
					>
						Neuland Ingolstadt e.V.
					</Link>
				</span>
				<span>•</span>
				<Link
					href="https://neuland-ingolstadt.de/legal/impressum"
					className="hover:underline"
				>
					Impressum
				</Link>
				<span>•</span>
				<Link
					href="https://neuland-ingolstadt.de/legal/datenschutz"
					className="hover:underline"
				>
					Datenschutz
				</Link>
				<span>•</span>
				<Link href="https://studver.thi.de" className="hover:underline">
					StudVer
				</Link>
			</div>
			<div className="flex items-center">
				<ThemeToggle />
			</div>
		</footer>
	)
}
