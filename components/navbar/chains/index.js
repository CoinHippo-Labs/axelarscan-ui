import { useState, useEffect, useRef } from 'react'

import Items from './items'
import menus from './menus'

export default () => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (
          hidden ||
          buttonRef.current.contains(e.target) ||
          dropdownRef.current.contains(e.target)
        ) {
          return false
        }

        setHidden(!hidden)
      }

      document
        .addEventListener(
          'mousedown',
          handleClickOutside,
        )

      return () =>
        document
          .removeEventListener(
            'mousedown',
            handleClickOutside,
          )
    },
    [hidden, buttonRef, dropdownRef],
  )

  const onClick = () => setHidden(!hidden)

  const environment = menus
    .find(e =>
      e?.id === process.env.NEXT_PUBLIC_ENVIRONMENT
    )

  const {
    id,
    title,
  } = { ...environment }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="flex items-center justify-center"
      >
        <div className="max-w-min bg-zinc-100 dark:bg-zinc-800 bg-opacity-75 dark:bg-opacity-75 shadow rounded whitespace-nowrap text-slate-700 dark:text-slate-200 text-2xs font-medium pb-0.5 px-1.5 mt-0.5">
          {title}
        </div>
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 mt-8`}
      >
        <div className="bottom-start">
          <Items
            current={id}
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  )
}