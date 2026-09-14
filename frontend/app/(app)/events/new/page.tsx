import { redirect } from 'next/navigation'

export default function NewEventPage() {
	redirect('/events?create=1')
}
