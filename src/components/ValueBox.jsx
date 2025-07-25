'use client'

import clsx from 'clsx'

import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { ellipse } from '@/lib/string'

export function ValueBox({
  title,
  value,
  url,
  prefix = '0x',
  ellipseLength = 10,
  noEllipse = false,
  noTooltip = true,
  className = 'border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-between gap-x-1.5 py-1.5 pl-2.5 pr-2',
}) {
  const displayValue = noEllipse ? value : ellipse(value, ellipseLength, prefix)
  const element = url ?
    <a
      href={url}
      target="_blank"
      className={clsx('text-blue-600 dark:text-blue-500 font-medium', noEllipse && 'truncate')}
    >
      {displayValue}
    </a> :
    <span className={clsx('text-zinc-700 dark:text-zinc-200 font-medium', noEllipse && 'truncate')}>
      {displayValue}
    </span>

  return value && (
    <div className="flex flex-col gap-y-1">
      <span className="text-sm text-zinc-400 dark:text-zinc-500">
        {title}
      </span>
      <div className={clsx(className)}>
        {noEllipse && !noTooltip ?
          <Tooltip content={displayValue}>
            {element}
          </Tooltip> :
          element
        }
        <Copy value={value} />
      </div>
    </div>
  )
}
