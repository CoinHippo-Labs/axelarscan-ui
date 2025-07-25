'use client'

import clsx from 'clsx'

export function Tag({ children, className }) {
  return (
    <div className={clsx('bg-blue-600 dark:bg-blue-500 rounded-xl font-display text-white text-xs font-medium px-2.5 py-1', className)}>
      {children}
    </div>
  )
}
