'use client'

import { Copy, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ShareButtonsProps {
	eventTitle: string
}

export function ShareButtons({ eventTitle }: ShareButtonsProps) {
	const handleCopyLink = () => {
		navigator.clipboard.writeText(window.location.href)
		toast.success('Link wurde in die Zwischenablage kopiert!')
	}

	const handleWhatsAppShare = () => {
		window.open(
			`https://wa.me/?text=${encodeURIComponent(`${eventTitle} - ${window.location.href}`)}`
		)
	}

	const handleNativeShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: eventTitle,
					url: window.location.href
				})
			} catch (_err) {
				// Fallback to copy if share is cancelled
				handleCopyLink()
			}
		} else {
			// Fallback for browsers that don't support Web Share API
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
