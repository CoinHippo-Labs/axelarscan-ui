'use client'

import clsx from 'clsx'

import { Number } from '@/components/Number'
import { isNumber, toNumber } from '@/lib/number'

export function ProgressBar({ value, className, valueClassName }) {
  if (isNumber(value)) {
    value = toNumber(value)
  }

  return isNumber(value) && (
    <div className="w-full bg-zinc-50 dark:bg-zinc-800">
      <div className={clsx('bg-blue-600 dark:bg-blue-500 font-medium text-center leading-none p-0.5', className)} style={{ width: `${value}%` }}>
        <Number
          value={value}
          format="0,0.0a"
          suffix="%"
          noTooltip={true}
          className={clsx('text-xs', value < 33 ? 'text-zinc-700 dark:text-zinc-300' : 'text-white', valueClassName)}
        />
      </div>
    </div>
  )
}
