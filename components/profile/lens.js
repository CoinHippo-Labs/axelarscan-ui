import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import UNSTOPPABLEProfile from './unstoppable'
import Image from '../image'
import Copy from '../copy'
import { getLENS } from '../../lib/api/lens'
import { toArray, ellipse } from '../../lib/utils'
import { LENS_DATA } from '../../reducers/types'

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
  const { lens } = useSelector(state => ({ lens: state.lens }), shallowEqual)
  const { lens_data } = { ...lens }

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
          const addresses = toArray(address, 'lower').filter(a => !lens_data?.[a])

          if (addresses.length > 0) {
            let data = setDefaultData(addresses, lens_data)
            dispatch({ type: LENS_DATA, value: { ...data } })

            data = await getLENS(addresses)
            setDefaultData(addresses, data)
            dispatch({ type: LENS_DATA, value: { ...data } })
          }
        }
      }

      getData()
    },
    [address, lens_data],
  )

  const { handle, picture } = { ...lens_data?.[address?.toLowerCase()] }
  const src = picture?.original?.url

  const lensComponent = handle && (
    <span
      title={handle}
      className={className || 'cursor-pointer normal-case text-base 3xl:text-2xl font-medium'}
    >
      <span className="xl:hidden">
        {ellipse(handle, 10)}
      </span>
      <span className="hidden xl:block">
        {ellipse(handle, 10)}
      </span>
    </span>
  )

  return (
    lensComponent ?
      <div className="flex items-center">
        {!noImage && (
          typeof imageUnavailable === 'boolean' ?
            <Image
              src={imageUnavailable ? '/logos/others/lens.png' : src}
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
              {lensComponent}
            </a>
            {!noCopy && (
              <Copy
                size={copySize}
                value={copyAddress ? address : name}
              />
            )}
          </div> :
          noCopy ?
            lensComponent :
            <Copy
              size={copySize}
              value={copyAddress ? address : name}
              title={lensComponent}
            />
        }
      </div> :
      <UNSTOPPABLEProfile
        address={address}
        copySize={copySize}
        copyAddress={copyAddress}
        width={width}
        height={height}
        noCopy={noCopy}
        noImage={noImage}
        url={url}
        fallback={fallback}
        className={className}
      />
  )
}