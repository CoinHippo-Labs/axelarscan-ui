import { useState, useEffect, useRef } from 'react'

import Networks from './networks'

import { networks } from '../../../lib/menus'

export default function DropdownNetwork() {
  const network_id = process.env.NEXT_PUBLIC_ENVIRONMENT
  const network = networks[networks.findIndex(network => network.id === network_id)] || networks[0]

  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        hidden ||
        buttonRef.current.contains(event.target) ||
        dropdownRef.current.contains(event.target)
      ) {
        return false
      }
      setHidden(!hidden)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const handleDropdownClick = () => setHidden(!hidden)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        {network.icon}
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-3 mt-12`}
      >
        <div className="dropdown-content w-64 bottom-start">
          <Networks handleDropdownClick={handleDropdownClick} />
        </div>
      </div>
    </div>
  )
}