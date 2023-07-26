import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import ENSProfile from './ens'
import Image from '../image'
import Copy from '../copy'
import { getSPACEID } from '../../lib/api/spaceid'
import { toArray, ellipse } from '../../lib/utils'
import { SPACEID_DATA } from '../../reducers/types'

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
    chain,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const { chains, spaceid } = useSelector(state => ({ chains: state.chains, spaceid: state.spaceid }), shallowEqual)
  const { chains_data } = { ...chains }
  const { spaceid_data } = { ...spaceid }

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
          const addresses = toArray(address, 'lower').filter(a => !spaceid_data?.[a])

          if (addresses.length > 0) {
            let data = setDefaultData(addresses, spaceid_data)
            dispatch({ type: SPACEID_DATA, value: { ...data } })

            data = await getSPACEID(addresses, chain, chains_data)
            setDefaultData(addresses, data)
            dispatch({ type: SPACEID_DATA, value: { ...data } })
          }
        }
      }

      getData()
    },
    [address, spaceid_data],
  )

  const { name } = { ...spaceid_data?.[address?.toLowerCase()] }
  const src = '/logos/others/spaceid.png'

  const spaceidComponent = name && (
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
    spaceidComponent ?
      <div className="flex items-center">
        {!noImage && (
          typeof imageUnavailable === 'boolean' ?
            <Image
              src={imageUnavailable ? '/logos/others/spaceid.png' : src}
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
              {spaceidComponent}
            </a>
            {!noCopy && (
              <Copy
                size={copySize}
                value={copyAddress ? address : name}
              />
            )}
          </div> :
          noCopy ?
            spaceidComponent :
            <Copy
              size={copySize}
              value={copyAddress ? address : name}
              title={spaceidComponent}
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
        className={className}
      />
  )
}