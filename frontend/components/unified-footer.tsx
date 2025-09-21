import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

type FooterVariant = 'auth' | 'public' | 'app'

interface UnifiedFooterProps {
	variant?: FooterVariant
	showThemeToggle?: boolean
}

export function UnifiedFooter({
	variant = 'public',
	showThemeToggle = false
}: UnifiedFooterProps) {
	const currentYear = new Date().getFullYear()

	const links = {
		impressum: 'https://neuland-ingolstadt.de/legal/impressum',
		privacy: 'https://neuland-ingolstadt.de/legal/datenschutz',
		studver: 'https://studver.thi.de'
	}

	const getFooterClasses = () => {
		switch (variant) {
			case 'auth':
				return 'px-6 py-4 text-sm text-muted-foreground flex items-center justify-between gap-4 flex-wrap bg-black'
			case 'public':
				return 'border-t bg-card mt-auto'
			case 'app':
				return 'border-t px-6 py-4 text-sm text-muted-foreground flex items-center gap-4 flex-wrap'
			default:
				return 'border-t px-6 py-4 text-sm text-muted-foreground flex items-center gap-4 flex-wrap'
		}
	}

	const getContentClasses = () => {
		switch (variant) {
			case 'auth':
				return 'flex items-center gap-4 flex-wrap'
			case 'public':
				return 'container mx-auto px-4 py-6'
			case 'app':
				return 'flex items-center gap-4 flex-wrap'
			default:
				return 'flex items-center gap-4 flex-wrap'
		}
	}

	const getInnerContentClasses = () => {
		switch (variant) {
			case 'auth':
				return 'flex items-center gap-4 flex-wrap'
			case 'public':
				return 'max-w-4xl mx-auto'
			case 'app':
				return 'flex items-center gap-4 flex-wrap'
			default:
				return 'flex items-center gap-4 flex-wrap'
		}
	}

	const getLinksClasses = () => {
		switch (variant) {
			case 'auth':
				return 'flex items-center gap-4 flex-wrap'
			case 'public':
				return 'flex items-center gap-6 text-sm text-muted-foreground'
			case 'app':
				return 'flex items-center gap-4 flex-wrap'
			default:
				return 'flex items-center gap-4 flex-wrap'
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

		if (variant === 'public') {
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
					<Link
						href={links.privacy}
						className={linkClass}
						target="_blank"
						rel="noopener noreferrer"
					>
						Datenschutz
					</Link>
					<Link
						href={links.studver}
						className={linkClass}
						target="_blank"
						rel="noopener noreferrer"
					>
						StudVer
					</Link>
				</div>
			)
		}

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

	if (variant === 'public') {
		return (
			<footer className={getFooterClasses()}>
				<div className={getContentClasses()}>
					<div className={getInnerContentClasses()}>
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							{renderCopyright()}
							{renderLinks()}
						</div>
					</div>
				</div>
			</footer>
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
