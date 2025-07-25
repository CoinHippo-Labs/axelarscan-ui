'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import clsx from 'clsx'

export function Logo(props) {
  const { resolvedTheme } = useTheme()

  return (
    <div {...props} className={clsx('flex items-center', props.className)}>
      <Image
        src={`/logos/logo${resolvedTheme === 'dark' ? '_white' : ''}.png`}
        alt=""
        width={24}
        height={24}
        unoptimized
        className="min-w-4 mr-3"
      />
      <span className="hidden md:block uppercase text-sm font-bold">
        Axelarscan
      </span>
    </div>
  )
}
