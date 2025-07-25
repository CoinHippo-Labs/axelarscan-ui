'use client'

import Link from 'next/link'
import clsx from 'clsx'

import { toBoolean } from '@/lib/string'

const baseStyles = {
  solid: 'group inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
  outline: 'group inline-flex ring-1 items-center justify-center rounded-full px-4 py-2 text-sm focus:outline-none',
}

const variantStyles = {
  solid: {
    zinc: 'bg-zinc-900 text-white hover:bg-zinc-700 hover:text-zinc-100 active:bg-zinc-800 active:text-zinc-300 focus-visible:outline-zinc-900',
    blue: 'bg-blue-600 text-white hover:text-zinc-100 hover:bg-blue-500 active:bg-blue-800 active:text-blue-100 focus-visible:outline-blue-600',
    white: 'bg-white text-zinc-900 hover:bg-blue-50 active:bg-blue-200 active:text-zinc-600 focus-visible:outline-white',
    default: 'bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    none: 'bg-transparent text-zinc-900 dark:text-zinc-100',
  },
  outline: {
    zinc: 'ring-zinc-200 text-zinc-700 hover:text-zinc-900 hover:ring-zinc-300 active:bg-zinc-100 active:text-zinc-600 focus-visible:outline-blue-600 focus-visible:ring-zinc-300',
    white: 'ring-zinc-700 text-white hover:ring-zinc-500 active:ring-zinc-700 active:text-zinc-400 focus-visible:outline-white',
  },
}

export function Button({ className, ...props }) {
  props.variant ??= 'solid'
  props.color ??= 'zinc'

  className = clsx(
    baseStyles[props.variant],
    props.variant === 'outline' && variantStyles.outline[props.color],
    props.variant === 'solid' && variantStyles.solid[props.color],
    toBoolean(props.circle, false) && '!p-2',
    className,
  )

  if (typeof props.href === 'undefined') {
    return <button className={className} {...props} />
  }

  return<Link className={className} {...props} />
}
