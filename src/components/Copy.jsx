import { useEffect, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import clsx from 'clsx'
import { LuClipboard, LuClipboardCheck } from 'react-icons/lu'

export function Copy({ size = 18, value, onCopy, children, className }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timeout = copied ? setTimeout(() => setCopied(false), 1 * 1000) : undefined
    return () => clearTimeout(timeout)
  }, [copied])

  return copied ?
    <div className={clsx('flex items-center gap-x-1 3xl:gap-x-2', children && 'min-w-max')}>
      {children}
      <LuClipboardCheck size={size} className={clsx('3xl:w-6 3xl:h-6 text-green-500 dark:text-green-400', className)} />
    </div> :
    <CopyToClipboard
      text={value}
      onCopy={() => {
        setCopied(true)
        if (onCopy) onCopy()
      }}
    >
      <div className={clsx('flex items-center gap-x-1 3xl:gap-x-2', children && 'min-w-max')}>
        {children}
        <LuClipboard size={size} className={clsx('3xl:w-6 3xl:h-6 cursor-pointer text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-500', className)} />
      </div>
    </CopyToClipboard>
}
