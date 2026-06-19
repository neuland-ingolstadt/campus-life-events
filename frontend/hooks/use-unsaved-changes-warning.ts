'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_MESSAGE =
	'Du hast ungespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?'

function isModifiedClick(event: MouseEvent) {
	return (
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	)
}

function getInternalNavigationAnchor(event: MouseEvent) {
	if (event.defaultPrevented || isModifiedClick(event)) {
		return null
	}

	const target = event.target
	if (!(target instanceof Element)) {
		return null
	}

	const anchor = target.closest('a[href]')
	if (!(anchor instanceof HTMLAnchorElement)) {
		return null
	}
	if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
		return null
	}

	const href = anchor.getAttribute('href')
	if (
		!href ||
		href.startsWith('#') ||
		href.startsWith('mailto:') ||
		href.startsWith('tel:')
	) {
		return null
	}

	const url = new URL(anchor.href, window.location.href)
	if (url.origin !== window.location.origin) {
		return null
	}
	if (
		url.pathname === window.location.pathname &&
		url.search === window.location.search
	) {
		return null
	}

	return anchor
}

export function useUnsavedChangesWarning(
	hasUnsavedChanges: boolean,
	message = DEFAULT_MESSAGE
) {
	const messageRef = useRef(message)
	messageRef.current = message

	useEffect(() => {
		if (!hasUnsavedChanges) {
			return
		}

		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault()
			event.returnValue = ''
		}

		const onClick = (event: MouseEvent) => {
			if (!getInternalNavigationAnchor(event)) {
				return
			}
			if (!window.confirm(messageRef.current)) {
				event.preventDefault()
				event.stopImmediatePropagation()
			}
		}

		window.addEventListener('beforeunload', onBeforeUnload)
		document.addEventListener('click', onClick, true)

		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload)
			document.removeEventListener('click', onClick, true)
		}
	}, [hasUnsavedChanges])
}
