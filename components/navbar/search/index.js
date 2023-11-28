import { useRouter } from 'next/router'
import { useState, useRef } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { useForm } from 'react-hook-form'
import { RedefinedResolver } from '@redefined/name-resolver-js'
import _ from 'lodash'
import { FiSearch } from 'react-icons/fi'

import Spinner from '../../spinner'
import { getENS } from '../../../lib/api/ens'
import { getLENS } from '../../../lib/api/lens'
import { getSPACEID } from '../../../lib/api/spaceid'
import { getUNSTOPPABLE } from '../../../lib/api/unstoppable'
import { searchTransfers, searchDepositAddresses } from '../../../lib/api/transfers'
import { searchGMP } from '../../../lib/api/gmp'
import { getKeyType } from '../../../lib/key'
import { split, toArray, equalsIgnoreCase, sleep } from '../../../lib/utils'
import { ENS_DATA, LENS_DATA, SPACEID_DATA, UNSTOPPABLE_DATA } from '../../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { chains, ens, lens, spaceid, unstoppable } = useSelector(state => ({ chains: state.chains, ens: state.ens, lens: state.lens, spaceid: state.spaceid, unstoppable: state.unstoppable }), shallowEqual)
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { lens_data } = { ...lens }
  const { spaceid_data } = { ...spaceid }
  const { unstoppable_data } = { ...unstoppable }

  const router = useRouter()
  const { query } = { ...router }
  const { address, tx } = { ...query }

  const [inputSearch, setInputSearch] = useState('')
  const [searching, setSearching] = useState(null)

  const inputSearchRef = useRef()
  const { handleSubmit } = useForm()

  const onSubmit = async () => {
    let input = inputSearch
    let input_type = getKeyType(input, chains_data)

    if (input_type) {
      setSearching(true)
      const { resolvedAddress } = { ...Object.values({ ...ens_data }).find(v => equalsIgnoreCase(v.name, input)) }
      const { ownedBy } = { ...Object.values({ ...lens_data }).find(v => equalsIgnoreCase(v.handle, input)) }
      const spaceid_domain = Object.values({ ...spaceid_data }).find(v => equalsIgnoreCase(v.name, input))
      const { owner } = { ...Object.values({ ...unstoppable_data }).find(v => equalsIgnoreCase(v.name, input)) }

      if (resolvedAddress) {
        const { id } = { ...resolvedAddress }
        input = id
        input_type = 'address'
      }
      else if (ownedBy) {
        input = ownedBy
        input_type = 'address'
      }
      else if (spaceid_domain) {
        const { address } = { ...spaceid_domain }
        input = address
        input_type = 'address'
      }
      else if (owner) {
        const { id } = { ...owner }
        input = id
        input_type = 'address'
      }
      else if (input_type === 'ns') {
        const resolver = new RedefinedResolver()
        const { response } = { ...await resolver.resolve(input) }
        const { address } = { ..._.head(response) }
        if (address) {
          input = address
        }
        input_type = 'address'
      }
      else if (['evmAddress', 'axelarAddress', 'cosmosAddress'].includes(input_type)) {
        if (input_type === 'axelarAddress') {
          input_type = 'account'
        }
        else {
          let response = await searchTransfers({ address: input, size: 0 })
          if (response?.total) {
            input_type = 'address'
          }
          else {
            response = await searchGMP({ address: input, size: 0 })
            if (response?.total) {
              input_type = 'address'
            }
            else {
              response = await searchDepositAddresses({ depositAddress: input, size: 0 })
              input_type = response?.total || input_type === 'axelarAddress' ? 'account' : 'address'
            }
          }
        }
      }
      else if (['txhash', 'tx'].includes(input_type)) {
        let response = await searchTransfers({ txHash: input, size: 0 })
        if (response?.total) {
          input_type = 'transfer'
        }
        else {
          response = await searchGMP({ txHash: input, size: 0 })
          if (response?.total) {
            input_type = 'gmp'
          }
          else {
            input_type = input_type === 'txhash' ? 'gmp' : 'tx'
          }
        }
      }

      if (input && input_type === 'address') {
        const getName = async (provider = 'ens') => {
          let addresses
          let data
          let type

          switch (provider) {
            case 'ens':
              addresses = toArray(input, 'lower').filter(a => !ens_data?.[a])
              data = await getENS(addresses)
              type = ENS_DATA
              break
            case 'lens':
              addresses = toArray(input, 'lower').filter(a => !lens_data?.[a])
              data = await getLENS(addresses)
              type = LENS_DATA
              break
            case 'spaceid':
              addresses = toArray(input, 'lower').filter(a => !spaceid_data?.[a])
              data = await getSPACEID(addresses, undefined, chains_data)
              type = SPACEID_DATA
              break
            case 'unstoppable':
              addresses = toArray(input, 'lower').filter(a => !unstoppable_data?.[a])
              data = await getUNSTOPPABLE(addresses)
              type = UNSTOPPABLE_DATA
              break
            default:
              break
          }

          if (data) {
            dispatch({ type, value: data })
          }
        }

        ['ens', 'lens', 'spaceid', 'unstoppable'].forEach(d => getName(d))
        await sleep(1 * 1000)
      }

      router.push(`/${input_type}/${input}`)
      setInputSearch('')
      inputSearchRef?.current?.blur()
      setSearching(false)
    }
  }

  const canSearch = inputSearch && toArray([address, tx]).findIndex(s => equalsIgnoreCase(s, inputSearch)) < 0

  return (
    <div className="navbar-search mr-1 sm:mx-2">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="relative">
          <input
            ref={inputSearchRef}
            type="search"
            placeholder="Search by Txhash / Address / ENS / Block"
            value={inputSearch}
            onChange={e => setInputSearch(split(e.target.value, 'normal', ' ').join(' '))}
            className={`w-56 sm:w-80 h-10 appearance-none focus:ring-0 rounded text-sm pl-3 ${canSearch ? 'pr-10' : 'pr-3'}`}
          />
          {canSearch && (
            <button
              disabled={searching}
              onClick={() => onSubmit()}
              className={`${searching ? 'bg-blue-400 dark:bg-blue-600' : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400'} absolute rounded-lg text-white right-0 p-1.5 mt-1.5 mr-2`}
            >
              {searching ? <Spinner width={10} height={10} color="white" /> : <FiSearch size={16} />}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}