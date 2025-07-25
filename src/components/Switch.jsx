'use client'

import { useEffect, useState } from 'react'
import { Switch as HeadlessSwitch } from '@headlessui/react'
import clsx from 'clsx'

export function Switch({ value, onChange, title, groupClassName, outerClassName, innerClassName, labelClassName, titleClassName }) {
  const [enabled, setEnabled] = useState(value)

  useEffect(() => {
    setEnabled(value)
  }, [value, setEnabled])

  useEffect(() => {
    if (onChange) {
      onChange(enabled)
    }
  }, [onChange, enabled])

  return (
    <HeadlessSwitch.Group as="div" className={clsx('flex items-center gap-x-3', groupClassName)}>
      <HeadlessSwitch
        checked={enabled}
        onChange={setEnabled}
        className={clsx(
          'relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
          enabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-800',
          outerClassName,
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 bg-white transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-4' : 'translate-x-0',
            innerClassName,
          )}
        />
      </HeadlessSwitch>
      {title && (
        <HeadlessSwitch.Label as="span" className={clsx('text-sm', labelClassName)}>
          <span className={clsx('text-zinc-900 dark:text-zinc-100 font-medium', titleClassName)}>
            {title}
          </span>
        </HeadlessSwitch.Label>
      )}
    </HeadlessSwitch.Group>
  )
}
