import { useState, useEffect, useRef } from 'react'

import { Img } from 'react-image'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'

import Assets from './assets'

export default function DropdownAsset({ assets, assetSelect, setAssetSelect }) {
  const asset = assets?.find(a => a?.id === assetSelect) || assets?.[0]

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
    <div className="relative ml-auto">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="flex items-center justify-start space-x-2"
      >
        {asset?.asset && (
          <>
            <Img
              src={asset.asset.image}
              alt=""
              className="w-7 h-7 rounded-full"
            />
            <span className="text-base font-semibold">
              {asset.asset.title}
            </span>
            <span className="text-gray-400 dark:text-gray-600 text-base">
              {asset.asset.symbol}
            </span>
            {hidden ?
              <MdExpandMore className="bg-gray-200 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 -ml-0.5 mb-0.5" />
              :
              <MdExpandLess className="bg-gray-100 dark:bg-gray-900 rounded text-gray-600 dark:text-gray-400 -ml-0.5 mb-0.5" />
            }
          </>
        )}
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-0 mt-7`}
      >
        <div className="dropdown-content w-48 bottom-start">
          <Assets
            assets={assets}
            handleDropdownClick={a => {
              setAssetSelect(a)
              handleDropdownClick()
            }}
          />
        </div>
      </div>
    </div>
  )
}