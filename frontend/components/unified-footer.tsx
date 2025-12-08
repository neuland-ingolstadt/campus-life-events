import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

type FooterVariant = 'auth' | 'app'

interface UnifiedFooterProps {
	variant?: FooterVariant
	showThemeToggle?: boolean
}

export function UnifiedFooter({
	variant = 'auth',
	showThemeToggle = false
}: UnifiedFooterProps) {
	const currentYear = 2025

	const links = {
		impressum: 'https://neuland-ingolstadt.de/legal/impressum',
		privacy: 'https://neuland-ingolstadt.de/legal/datenschutz',
		studver: 'https://studverthi.de',
		status: 'http://status.neuland.app/status/app'
	}

	const getFooterClasses = () => {
		switch (variant) {
			case 'auth':
				return 'px-6 py-4 text-sm text-muted-foreground flex items-center justify-between gap-4 flex-wrap bg-black'
			case 'app':
				return 'border-t px-6 py-4 text-sm text-muted-foreground flex items-center gap-4 flex-wrap'
			default:
				return 'border-t px-6 py-4 text-sm text-muted-foreground flex items-center gap-4 flex-wrap'
		}
	}

	const getContentClasses = () => {
		switch (variant) {
			case 'auth':
				return 'flex items-center gap-3 flex-wrap'
			case 'app':
				return 'flex items-center gap-3 flex-wrap'
			default:
				return 'flex items-center gap-3 flex-wrap'
		}
	}

	const getLinksClasses = () => {
		switch (variant) {
			case 'auth':
				return 'flex items-center gap-3 flex-wrap'
			case 'app':
				return 'flex items-center gap-3 flex-wrap'
			default:
				return 'flex items-center gap-3 flex-wrap'
		}
	}

	const getLinkClasses = () => {
		return 'hover:underline'
	}

	const renderCopyright = () => {
		if (variant === 'auth') {
			return (
				<span>
					© {`${currentYear} `}
					<Link
						href="https://neuland-ingolstadt.de"
						className="hover:underline"
					>
						Neuland Ingolstadt e.V.
					</Link>
				</span>
			)
		}

		return (
			<div className="text-sm text-muted-foreground">
				© {currentYear} Neuland Ingolstadt e.V.
			</div>
		)
	}

	const renderLinks = () => {
		const linkClass = getLinkClasses()

		return (
			<div className={getLinksClasses()}>
				<Link
					href={links.impressum}
					className={linkClass}
					target="_blank"
					rel="noopener noreferrer"
				>
					Impressum
				</Link>
				<span>•</span>
				<Link
					href={links.privacy}
					className={linkClass}
					target="_blank"
					rel="noopener noreferrer"
				>
					Datenschutz
				</Link>
				<span>•</span>
				<Link
					href={links.studver}
					className={linkClass}
					target="_blank"
					rel="noopener noreferrer"
				>
					StudVer
				</Link>
				<span>•</span>
				<Link
					href={links.status}
					className={linkClass}
					target="_blank"
					rel="noopener noreferrer"
				>
					System Status
				</Link>
			</div>
		)
	}

	const renderThemeToggle = () => {
		if (!showThemeToggle) return null

		return (
			<div className="flex items-center">
				<ThemeToggle />
			</div>
		)
	}

	return (
		<footer className={getFooterClasses()}>
			<div className={getContentClasses()}>
				{renderCopyright()}
				{renderLinks()}
			</div>
			{renderThemeToggle()}
		</footer>
	)
}
