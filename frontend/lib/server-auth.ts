import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type AuthUser = { id: number; name: string }

export async function requireUser(): Promise<AuthUser> {
	const ck = await cookies()
	const cookieHeader = ck.toString()
	const base = process.env.BACKEND_URL || 'http://localhost:8080'
	const res = await fetch(`${base}/api/v1/auth/me`, {
		method: 'GET',
		cache: 'no-store',
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined
	})
	if (res.status === 401) {
		redirect('/login')
	}
	if (!res.ok) {
		redirect('/login')
	}
	return res.json()
}
