'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RedefinedResolver } from '@redefined/name-resolver-js'
import clsx from 'clsx'
import _ from 'lodash'
import { FiSearch } from 'react-icons/fi'

import { Button } from '@/components/Button'
import { useGlobalStore, useNameServicesStore } from '@/app/providers'
import { searchGMP } from '@/lib/api/gmp'
import { searchTransfers } from '@/lib/api/token-transfer'
import { getENS } from '@/lib/api/name-services/ens'
import { getLENS } from '@/lib/api/name-services/lens'
import { getSpaceID } from '@/lib/api/name-services/spaceid'
import { getUnstoppable } from '@/lib/api/name-services/unstoppable'
import { getSlug } from '@/lib/navigation'
import { getInputType, split, toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'

export function Search() {
  const pathname = usePathname()
  const router = useRouter()

  const ref = useRef()
  const [input, setInput] = useState('')
  const [searching, setSearching] = useState(false)
  const { handleSubmit } = useForm()
  const { chains } = useGlobalStore()
  const { ens, lens, spaceID, unstoppable, setENS, setLENS, setSpaceID, setUnstoppable } = useNameServicesStore()

  const onSubmit = async () => {
    let _input = input
    let type = getInputType(_input, chains)

    if (type) {
      setSearching(true)
      const { resolvedAddress } = { ...Object.values({ ...ens }).find(v => equalsIgnoreCase(v.name, _input)) }
      const { ownedBy } = { ...Object.values({ ...lens }).find(v => equalsIgnoreCase(v.handle, _input)) }
      const spaceIDDomain = Object.values({ ...spaceID }).find(v => equalsIgnoreCase(v.name, _input))
      const { owner } = { ...Object.values({ ...unstoppable }).find(v => equalsIgnoreCase(v.name, _input)) }

      if (resolvedAddress) {
        const { id } = { ...resolvedAddress }
        _input = id
        type = 'address'
      }
      else if (ownedBy) {
        _input = ownedBy
        type = 'address'
      }
      else if (spaceIDDomain) {
        const { address } = { ...spaceIDDomain }
        _input = address
        type = 'address'
      }
      else if (owner) {
        const { id } = { ...owner }
        _input = id
        type = 'address'
      }
      else if (type === 'domainName') {
        const resolver = new RedefinedResolver()
        const { response } = { ...await resolver.resolve(_input) }
        const { address } = { ..._.head(response) }
        if (address) _input = address
        type = 'address'
      }
      else if (['evmAddress', 'axelarAddress', 'cosmosAddress'].includes(type)) type = type === 'axelarAddress' ? 'account' : 'address'
      else if (['txhash', 'tx'].includes(type)) {
        if ((await searchGMP({ txHash: _input, size: 0 }))?.total) type = 'gmp'
        else if ((await searchTransfers({ txHash: _input, size: 0 }))?.total) type = 'transfer'
        else type = type === 'txhash' ? 'gmp' : 'tx'
      }

      if (_input && type === 'address') {
        await Promise.all(['ens', 'lens', 'spaceid', 'unstoppable'].map(k => new Promise(async resolve => {
          const addresses = toArray(_input, { toCase: 'lower' })
          switch (k) {
            case 'ens':
              setENS(await getENS(addresses.filter(a => !ens?.[a])))
              break
            case 'lens':
              setLENS(await getLENS(addresses.filter(a => !lens?.[a])))
              break
            case 'spaceid':
              setSpaceID(await getSpaceID(addresses.filter(a => !spaceID?.[a]), undefined, chains))
              break
            case 'unstoppable':
              setUnstoppable(await getUnstoppable(addresses.filter(a => !unstoppable?.[a])))
              break
            default:
              break
          }
          resolve()
        })))
      }

      router.push(`/${type}/${_input}`)
      setInput('')
      ref.current.blur()
      setSearching(false)
    }
  }

  const tx = getSlug(pathname, 'tx')
  const address = getSlug(pathname, 'address')
  const searchable = !searching && input && toArray([tx, address]).findIndex(s => equalsIgnoreCase(s, input)) < 0

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="relative flex items-center">
        <input
          ref={ref}
          disabled={searching}
          placeholder="Search by Txhash / Address / Block"
          value={input}
          onChange={e => setInput(split(e.target.value, { delimiter: ' ' }).join(' '))}
          className={clsx(
            'w-full sm:w-80 h-10 bg-zinc-50 dark:bg-zinc-800 appearance-none border-zinc-200 dark:border-zinc-700 focus:ring-0 rounded-lg text-sm pl-3',
            searching ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400',
            searchable ? 'pr-10' : 'pr-3',
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
      </div>
    </form>
  )
}
