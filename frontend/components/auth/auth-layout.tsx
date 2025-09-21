import type { ReactNode } from 'react'
import { AuthFooter } from './auth-footer'
import { AuthMobileHeader } from './mobile-header'

interface AuthLayoutProps {
	children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<div className="min-h-screen w-full flex flex-col">
			<AuthMobileHeader />
			<div className="flex-1 grid lg:grid-cols-2">{children}</div>
			<AuthFooter />
		</div>
	)
}
