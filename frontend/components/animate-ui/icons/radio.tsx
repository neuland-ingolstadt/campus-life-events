'use client'

import { motion, type Variants } from 'motion/react'

import {
	getVariants,
	type IconProps,
	IconWrapper,
	useAnimateIconContext
} from '@/components/animate-ui/icons/icon'

type RadioProps = IconProps<keyof typeof animations>

const animations = {
	default: (() => {
		const animation: Record<string, Variants> = {}

		for (let i = 1; i <= 2; i++) {
			animation[`path${i}`] = {
				initial: { opacity: 1, scale: 1 },
				animate: {
					opacity: 0,
					scale: 0,
					transition: {
						opacity: {
							duration: 0.2,
							ease: 'easeInOut',
							repeat: 1,
							repeatType: 'reverse',
							repeatDelay: 0.2,
							delay: 0.2 * (i - 1)
						},
						scale: {
							duration: 0.2,
							ease: 'easeInOut',
							repeat: 1,
							repeatType: 'reverse',
							repeatDelay: 0.2,
							delay: 0.2 * (i - 1)
						}
					}
				}
			}
		}

		return animation
	})() satisfies Record<string, Variants>
} as const

function IconComponent({ size, ...props }: RadioProps) {
	const { controls } = useAnimateIconContext()
	const variants = getVariants(animations)

	return (
		<motion.svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<motion.path
				d="M16.247 7.761a6 6 0 0 1 0 8.478"
				variants={variants.path1}
				initial="initial"
				animate={controls}
			/>
			<motion.path
				d="M19.075 4.933a10 10 0 0 1 0 14.134"
				variants={variants.path2}
				initial="initial"
				animate={controls}
			/>
			<motion.path
				d="M7.753 16.239a6 6 0 0 1 0-8.478"
				variants={variants.path1}
				initial="initial"
				animate={controls}
			/>
			<motion.path
				d="M4.925 19.067a10 10 0 0 1 0-14.134"
				variants={variants.path2}
				initial="initial"
				animate={controls}
			/>
			<motion.circle
				cx="12"
				cy="12"
				r="2"
				variants={variants.circle}
				initial="initial"
				animate={controls}
			/>
		</motion.svg>
	)
}

function Radio(props: RadioProps) {
	return <IconWrapper icon={IconComponent} {...props} />
}

export {
	animations,
	Radio,
	Radio as RadioIcon,
	type RadioProps,
	type RadioProps as RadioIconProps
}
