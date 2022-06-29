import { useState, useEffect, useRef } from 'react'

import Items from './items'
import menus from './menus'

export default () => {
  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = e => {
      if (hidden || buttonRef.current.contains(e.target) || dropdownRef.current.contains(e.target)) return false
      setHidden(!hidden)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const onClick = () => setHidden(!hidden)

  const environment = menus?.find(e => e?.id === process.env.NEXT_PUBLIC_ENVIRONMENT)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="w-8 h-16 flex items-center justify-center"
      >
        {environment && (
          environment.icon ?
            environment.icon
            :
            <span className="font-bold">
              {environment.title}
            </span>
        )}
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-1.5 mt-12`}
      >
        <div className="dropdown-content w-72 bottom-start">
          <Items onClick={onClick} />
        </div>
      </div>
    </div>
  )
}