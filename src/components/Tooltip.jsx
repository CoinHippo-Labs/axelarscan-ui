'use client'

import clsx from 'clsx'

export function Tooltip({ content, className, children, parentClassName }) {
  return (
    <div className={clsx('group relative flex justify-center', parentClassName)}>
      <div className="hidden group-hover:block absolute z-50 bg-black -top-10 px-2 py-1 rounded-lg">
        <div className={clsx('text-white text-sm font-normal', className)}>
          {content}
        </div>
      </div>
      {children}
    </div>
  )
}

export const TooltipComponent = Tooltip
