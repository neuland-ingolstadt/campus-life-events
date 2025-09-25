'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@/components/animate-ui/icons/icon';

type SunProps = IconProps<keyof typeof animations>;

const animations = {
  default: (() => {
    const animation: Record<string, Variants> = {
      circle: {},
    };

    for (let i = 1; i <= 8; i++) {
      animation[`line${i}`] = {
        initial: { opacity: 1, scale: 1 },
        animate: {
          opacity: [0, 1],
          pathLength: [0, 1],
          transition: {
            duration: 0.6,
            ease: 'easeInOut',
            delay: (i - 1) * 0.15,
          },
        },
      };
    }

    return animation;
  })() satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: SunProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

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
      initial="initial"
      animate={controls}
      {...props}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="12"
        y1="4"
        x2="12"
        y2="2"
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="17.7"
        y1="6.3"
        x2="19.1"
        y2="4.9"
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="20"
        y1="12"
        x2="22"
        y2="12"
        variants={variants.line3}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="17.7"
        y1="17.7"
        x2="19.1"
        y2="19.1"
        variants={variants.line4}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="12"
        y1="20"
        x2="12"
        y2="22"
        variants={variants.line5}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="6.3"
        y1="17.7"
        x2="4.9"
        y2="19.1"
        variants={variants.line6}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="4"
        y1="12"
        x2="2"
        y2="12"
        variants={variants.line7}
        initial="initial"
        animate={controls}
      />
      <motion.line
        x1="6.3"
        y1="6.3"
        x2="4.9"
        y2="4.9"
        variants={variants.line8}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Sun(props: SunProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Sun,
  Sun as SunIcon,
  type SunProps,
  type SunProps as SunIconProps,
};
