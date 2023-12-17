import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import ENSProfile from './ens'
import Image from '../image'
import Copy from '../copy'
import { getUNSTOPPABLE } from '../../lib/api/unstoppable'
import { toArray, ellipse } from '../../lib/utils'
import { UNSTOPPABLE_DATA } from '../../reducers/types'

export default (
  {
    address,
    copySize = 18,
    copyAddress = true,
    width = 24,
    height = 24,
    noCopy = false,
    noImage = false,
    url,
    fallback,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { unstoppable } = useSelector(state => ({ unstoppable: state.unstoppable }), shallowEqual)
  const { unstoppable_data } = { ...unstoppable }

  const [imageUnavailable, setImageUnavailable] = useState(null)

  useEffect(
    () => {
      const setDefaultData = (addresses, data) => {
        addresses.forEach(a => {
          if (!data?.[a]) {
            data = { ...data, [a]: {} }
          }
        })
        return data
      }

      const getData = async () => {
        if (address) {
          const addresses = toArray(address, 'lower').filter(a => !unstoppable_data?.[a])

          if (addresses.length > 0) {
            let data = setDefaultData(addresses, unstoppable_data)
            dispatch({ type: UNSTOPPABLE_DATA, value: { ...data } })

            data = await getUNSTOPPABLE(addresses)
            setDefaultData(addresses, data)
            dispatch({ type: UNSTOPPABLE_DATA, value: { ...data } })
          }
        }
      }

      getData()
    },
    [address, unstoppable_data],
  )

  const { name } = { ...unstoppable_data?.[address?.toLowerCase()] }
  const src = '/logos/others/unstoppable.png'

  const unstoppableComponent = name && (
    <span
      title={name}
      className={className || 'cursor-pointer normal-case text-base 3xl:text-2xl font-medium'}
    >
      <span className="xl:hidden">
        {ellipse(name, 10)}
      </span>
      <span className="hidden xl:block">
        {ellipse(name, 10)}
      </span>
    </span>
  )

  return (
    unstoppableComponent ?
      <div className="flex items-center">
        {!noImage && (
          typeof imageUnavailable === 'boolean' ?
            <Image
              src={imageUnavailable ? '/logos/others/unstoppable.png' : src}
              width={width}
              height={height}
              className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : ''} rounded-full mr-2 3xl:mr-3`}
            /> :
            <img
              src={src}
              alt=""
              onLoad={() => setImageUnavailable(false)}
              onError={() => setImageUnavailable(true)}
              className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : 'w-5 h-5'} rounded-full mr-2 3xl:mr-3`}
            />
        )}
        {url ?
          <div className="flex items-center space-x-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              {unstoppableComponent}
            </a>
            {!noCopy && (
              <Copy
                size={copySize}
                value={copyAddress ? address : name}
              />
            )}
          </div> :
          noCopy ?
            unstoppableComponent :
            <Copy
              size={copySize}
              value={copyAddress ? address : name}
              title={unstoppableComponent}
            />
        }
      </div> :
      <ENSProfile
        address={address}
        copySize={copySize}
        copyAddress={copyAddress}
        width={width}
        height={height}
        noCopy={noCopy}
        noImage={noImage}
        url={url}
        fallback={fallback}
        from="unstoppable"
        className={className}
      />
  )
}