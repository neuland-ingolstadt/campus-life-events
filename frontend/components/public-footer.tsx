import Link from 'next/link'

export function PublicFooter() {
	return (
		<footer className="border-t bg-card mt-auto">
			<div className="container mx-auto px-4 py-6">
				<div className="max-w-4xl mx-auto">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} Neuland Ingolstadt e.V.
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<Link
								href="/imprint"
								className="hover:text-foreground transition-colors"
							>
								Impressum
							</Link>
							<Link
								href="/privacy"
								className="hover:text-foreground transition-colors"
							>
								Datenschutz
							</Link>
							<Link
								href="https://studver.thi.de"
								className="hover:text-foreground transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								StudVer
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
