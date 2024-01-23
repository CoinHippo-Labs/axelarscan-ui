import { useEffect, useState } from 'react'
import { Switch } from '@headlessui/react'
import clsx from 'clsx'

export default ({ value, onChange, title }) => {
  const [enabled, setEnabled] = useState(value)

  useEffect(() => {
    setEnabled(value)
  }, [value, setEnabled])

  useEffect(() => {
    if (onChange) onChange(enabled)
  }, [enabled])

  return (
    <Switch.Group as="div" className="flex items-center gap-x-3">
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={clsx(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
          enabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-800',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 bg-white transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
            enabled ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </Switch>
      {title && (
        <Switch.Label as="span" className="text-sm">
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{title}</span>
        </Switch.Label>
      )}
    </Switch.Group>
  )
}
