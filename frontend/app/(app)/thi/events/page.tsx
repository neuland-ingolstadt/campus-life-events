'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ThiEventsRedirectPage() {
	const router = useRouter()
	useEffect(() => {
		router.replace('/events')
	}, [router])
	return (
		<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
			Weiterleitung…
		</div>
	)
}
