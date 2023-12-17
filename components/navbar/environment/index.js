import { useState, useEffect, useRef } from 'react'

import Items from './items'

export default () => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (hidden || buttonRef.current.contains(e.target) || dropdownRef.current.contains(e.target)) {
          return false
        }
        setHidden(!hidden)
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    },
    [hidden, buttonRef, dropdownRef],
  )

  const onClick = () => setHidden(!hidden)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="flex items-center justify-center"
      >
        <div className="capitalize text-slate-400 dark:text-slate-500 text-sm 3xl:text-base">
          {process.env.NEXT_PUBLIC_ENVIRONMENT}
        </div>
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 left-0 mt-6`}
      >
        <div className="dropdown-content w-32 bottom-start">
          <Items onClick={onClick} />
        </div>
      </div>
    </div>
  )
}