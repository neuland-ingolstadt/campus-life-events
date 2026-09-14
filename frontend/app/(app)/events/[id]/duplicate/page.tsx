import { redirect } from 'next/navigation'

export default async function DuplicateEventPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	redirect(`/events?duplicate=${id}`)
}
