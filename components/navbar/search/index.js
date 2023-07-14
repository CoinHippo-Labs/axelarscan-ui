import { useRouter } from 'next/router'
import { useState, useRef } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiSearch } from 'react-icons/fi'

import Spinner from '../../spinner'
import { getENS, domainFromENS } from '../../../lib/api/ens'
import { searchTransfers, searchDepositAddresses } from '../../../lib/api/transfers'
import { searchGMP } from '../../../lib/api/gmp'
import { getKeyType } from '../../../lib/key'
import { split, toArray, equalsIgnoreCase } from '../../../lib/utils'
import { ENS_DATA } from '../../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { chains, ens } = useSelector(state => ({ chains: state.chains, ens: state.ens }), shallowEqual)
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }

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

      if (resolvedAddress) {
        const { id } = { ...resolvedAddress }
        input = id
        input_type = 'address'
      }
      else if (input_type === 'ens') {
        const domain = await domainFromENS(input, ens_data)
        const { resolvedAddress } = { ...domain }
        const { id } = { ...resolvedAddress }
        if (id) {
          input = id
          dispatch({ type: ENS_DATA, value: { [input.toLowerCase()]: domain } })
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
            response = await searchGMP({ senderAddress: input, size: 0 })
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
        const addresses = toArray(input, 'lower').filter(a => !ens_data?.[a])
        const data = await getENS(addresses)
        if (data) {
          dispatch({ type: ENS_DATA, value: data })
        }
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