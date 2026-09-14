'use client'

import { Copy, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { publicEventShareUrl } from '@/lib/public-event-url'

interface ShareButtonsProps {
	eventId: number
	eventTitle: string
}

export function ShareButtons({ eventId, eventTitle }: ShareButtonsProps) {
	const shareUrl = publicEventShareUrl(eventId)

	const handleCopyLink = () => {
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Link wurde in die Zwischenablage kopiert!')
	}

	const handleWhatsAppShare = () => {
		window.open(
			`https://wa.me/?text=${encodeURIComponent(`${eventTitle} - ${shareUrl}`)}`
		)
	}

	const handleNativeShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: eventTitle,
					url: shareUrl
				})
			} catch (_err) {
				handleCopyLink()
			}
		} else {
			handleCopyLink()
		}
	}

	return (
		<>
			<Button className="w-full" onClick={handleCopyLink}>
				<Copy className="h-4 w-4 mr-2" />
				Link kopieren
			</Button>
			<Button variant="outline" className="w-full" onClick={handleNativeShare}>
				<Share2 className="h-4 w-4 mr-2" />
				Teilen
			</Button>
			<Button
				variant="outline"
				className="w-full"
				onClick={handleWhatsAppShare}
			>
				<MessageCircle className="h-4 w-4 mr-2" />
				WhatsApp
			</Button>
		</>
	)
}
