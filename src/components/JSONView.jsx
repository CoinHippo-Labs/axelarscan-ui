'use client'

import { useTheme } from 'next-themes'
import ReactJSONView from 'react18-json-view'
import clsx from 'clsx'

import { toJson } from '@/lib/parser'

import 'react18-json-view/src/style.css'

export function JSONView({
  value,
  tab = 4,
  useJSONView = true,
  className,
}) {
  const { resolvedTheme } = useTheme()

  return typeof toJson(value) === 'object' && (
    <div className={clsx('max-w-xs sm:max-w-4xl max-h-96 overflow-y-auto whitespace-pre text-zinc-900 dark:text-zinc-100 text-sm', className)}>
      {useJSONView ?
        <ReactJSONView
          src={toJson(value)}
          dark={resolvedTheme === 'dark'}
          theme="winter-is-coming"
        /> :
        JSON.stringify(toJson(value), null, tab)
      }
    </div>
  )
}
