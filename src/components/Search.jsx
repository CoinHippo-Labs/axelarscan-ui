'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'
import { FiSearch } from 'react-icons/fi'

import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/Button'
import { useNameServicesStore } from '@/components/Profile'
import { useGlobalStore } from '@/components/Global'
import { searchGMP } from '@/lib/api/gmp'
import { searchTransfers } from '@/lib/api/token-transfer'
import { getENS } from '@/lib/api/name-services/ens'
import { getSpaceID } from '@/lib/api/name-services/spaceid'
import { getSlug } from '@/lib/navigation'
import { getITSAssetData } from '@/lib/config'
import { getInputType, split, toArray } from '@/lib/parser'
import { equalsIgnoreCase, find } from '@/lib/string'

export function Search() {
  const pathname = usePathname()
  const router = useRouter()
  const ref = useRef()
  const [input, setInput] = useState('')
  const [searching, setSearching] = useState(false)
  const { handleSubmit } = useForm()
  const { chains, itsAssets } = useGlobalStore()
  const { ens, spaceID, setENS, setSpaceID } = useNameServicesStore()

  const onSubmit = async () => {
    let _input = input
    let type = getInputType(_input, chains)

    if (type) {
      setSearching(true)

      const { resolvedAddress } = { ...Object.values({ ...ens }).find(v => equalsIgnoreCase(v.name, _input)) }
      const spaceIDDomain = Object.values({ ...spaceID }).find(v => equalsIgnoreCase(v.name, _input))

      // ens
      if (resolvedAddress) {
        _input = resolvedAddress.id
        type = 'address'
      }
      // space id
      else if (spaceIDDomain) {
        _input = spaceIDDomain.address
        type = 'address'
      }
      // domain name
      else if (type === 'domainName') {
        type = 'address'
      }
      // address
      else if (['axelarAddress', 'evmAddress', 'cosmosAddress'].includes(type)) {
        type = type === 'axelarAddress' ? 'account' : 'address'
      }
      // transaction
      else if (['txhash', 'tx'].includes(type)) {
        const gmpTotal = (await searchGMP({ txHash: _input, noRecover: true, size: 0 }))?.total

        if (gmpTotal > 0) {
          if (gmpTotal > 1) {
            _input = `search?txHash=${_input}`
          }

          type = 'gmp'
        }
        else {
          const transfersTotal = (await searchTransfers({ txHash: _input, noRecover: true, size: 0 }))?.total
        
          if (transfersTotal > 0) {
            if (transfersTotal > 1) {
              _input = `search?txHash=${_input}`
              type = 'transfers'
            }
            else {
              type = 'transfer'
            }
          }
          else {
            type = type === 'txhash' ? 'gmp' : 'tx'
          }
        }
      }

      if (_input && type === 'address') {
        // its asset
        if (getITSAssetData(_input, itsAssets)) {
          _input = `search?assetType=its&itsTokenAddress=${_input}`
          type = 'gmp'
        }
      }

      // get domain name
      if (_input && type === 'address') {
        await Promise.all(['ens', 'spaceid'].map(k => new Promise(async resolve => {
          const addresses = toArray(_input, { toCase: 'lower' })

          switch (k) {
            case 'ens':
              setENS(await getENS(addresses.filter(a => !ens?.[a])))
              break
            case 'spaceid':
              setSpaceID(await getSpaceID(addresses.filter(a => !spaceID?.[a]), undefined, chains))
              break
            default:
              break
          }

          resolve()
        })))
      }

      router.push(`/${type}/${_input}`)
      ref.current.blur()
      setInput('')

      setSearching(false)
    }
  }

  const tx = getSlug(pathname, 'tx')
  const address = getSlug(pathname, 'address')
  const searchable = !searching && !!input && !find(input, [tx, address])

  return itsAssets && (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="relative flex items-center">
        <input
          ref={ref}
          disabled={searching}
          placeholder="Search by Txhash / Address / Block"
          value={input}
          onChange={e => setInput(split(e.target.value, { delimiter: ' ' }).join(' '))}
          className={clsx(
            'w-full sm:w-80 min-w-56 h-10 bg-white dark:bg-zinc-900 appearance-none border-zinc-200 hover:border-blue-300 focus:border-blue-600 dark:border-zinc-700 dark:hover:border-blue-800 dark:focus:border-blue-500 focus:ring-0 rounded-lg text-sm pl-3',
            searching ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400',
            searching || searchable ? 'pr-10' : 'pr-3',
          )}
        />
        {searchable && (
          <Button
            color="blue"
            onClick={() => onSubmit()}
            className="absolute right-0 mr-2 !px-2"
          >
            <FiSearch />
          </Button>
        )}
        {searching && <Spinner className="absolute top-0 right-0 mt-1 mr-1 !px-1" />}
      </div>
    </form>
  )
}
