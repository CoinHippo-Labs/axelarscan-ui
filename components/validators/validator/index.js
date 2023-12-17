import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Info from './info'
import Uptimes from './uptimes'
import Heartbeats from './heartbeats'
import Votes from './votes'
import Spinner from '../../spinner'
import { getBalances } from '../../../lib/api/account'
import { searchTransactions } from '../../../lib/api/axelar'
import { searchUptimes, searchHeartbeats } from '../../../lib/api/validators'
import { searchPolls } from '../../../lib/api/polls'
import { getDelegations } from '../../../lib/api/lcd'
import { getAssetData } from '../../../lib/config'
import { NUM_BLOCKS_PER_HEARTBEAT, startBlock, endBlock } from '../../../lib/heartbeat'
import { formatUnits } from '../../../lib/number'
import { toArray, includesStringList, equalsIgnoreCase, normalizeQuote } from '../../../lib/utils'

const PAGE_SIZE = 200

export default () => {
  const {
    assets,
    status,
    maintainers,
    validators,
  } = useSelector(
    state => (
      {
        assets: state.assets,
        status: state.status,
        maintainers: state.maintainers,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const { assets_data } = { ...assets }
  const { status_data } = { ...status }
  const { maintainers_data } = { ...maintainers }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { query } = { ...router }
  let { address } = { ...query }
  address = normalizeQuote(address)

  const [data, setData] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [uptimes, setUptimes] = useState(null)
  const [heartbeats, setHeartbeats] = useState(null)
  const [votes, setVotes] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (address) {
          if (['axelarvalcons', 'axelar1'].findIndex(p => address.startsWith(p)) > -1 && validators_data) {
            const { operator_address } = { ...validators_data.find(v => includesStringList(address.toLowerCase(), [v.consensus_address, v.broadcaster_address])) }
            router.push(`/validator/${operator_address}`)
          }
          else if (address.startsWith('axelarvaloper') && validators_data && maintainers_data) {
            const validator_data = validators_data.find(v => equalsIgnoreCase(v.operator_address, address))
            const { operator_address, broadcaster_address, jailed } = { ...validator_data }
            const { data } = { ...(broadcaster_address && await getBalances({ address: broadcaster_address })) }
            const { total } = { ...await searchTransactions({ type: 'MsgUnjail', address, size: 0 }) }
            setData({
              ...validator_data,
              broadcaster_balance: _.head(toArray(data).filter(d => d.denom === 'uaxl')),
              num_jailed: (total || 0) + (jailed ? 1 : 0),
              supported_chains: Object.entries(maintainers_data).filter(([k, _v]) => _v.includes(operator_address)).map(([k, _v]) => k),
            })
          }
        }
      }
      getData()
    },
    [address, validators_data, maintainers_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (address?.startsWith('axelarvaloper') && assets_data) {
          let data
          let page_key = true

          while (page_key) {
            const response = await getDelegations(address, { 'pagination.key': page_key && typeof page_key === 'string' ? page_key : undefined })
            const { delegation_responses, pagination } = { ...response }
            data = _.uniqBy(
              _.concat(
                toArray(data),
                toArray(delegation_responses).map(d => {
                  const { balance, delegation } = { ...d }
                  const { denom, amount } = { ...balance }
                  const { shares } = { ...delegation }
                  const asset_data = getAssetData(denom, assets_data)
                  const { symbol, decimals } = { ...asset_data }
                  return {
                    ...delegation,
                    shares: formatUnits(shares, decimals),
                    ...balance,
                    symbol,
                    amount: formatUnits(amount, decimals),
                  }
                }),
              ),
              'delegator_address',
            )
            page_key = pagination?.next_key
            setDelegations(data)
          }
        }
      }
      getData()
    },
    [address, assets_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        const { latest_block_height } = { ...status_data }
        if (address?.startsWith('axelarvaloper') && latest_block_height && validators_data) {
          const { consensus_address } = { ...validators_data.find(v => equalsIgnoreCase(v.operator_address, address)) }
          const toBlock = latest_block_height - 1
          const fromBlock = toBlock - PAGE_SIZE
          const { data } = { ...await searchUptimes({ fromBlock, toBlock, size: PAGE_SIZE }) }
          setUptimes(
            _.range(0, PAGE_SIZE).map(i => {
              const height = toBlock - i
              const d = toArray(data).find(d => d.height === height)
              const { validators } = { ...d }
              return {
                ...d,
                height,
                status: toArray(validators).findIndex(a => equalsIgnoreCase(a, consensus_address)) > -1,
              }
            })
          )
        }
      }
      getData()
    },
    [address, status_data, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        const { latest_block_height } = { ...status_data }
        if (address?.startsWith('axelarvaloper') && latest_block_height && validators_data) {
          const { broadcaster_address } = { ...validators_data.find(v => equalsIgnoreCase(v.operator_address, address)) }
          const fromBlock = startBlock(latest_block_height - (PAGE_SIZE * NUM_BLOCKS_PER_HEARTBEAT))
          const toBlock = endBlock(latest_block_height)
          const { data } = { ...(broadcaster_address && await searchHeartbeats({ sender: broadcaster_address, fromBlock, toBlock, size: PAGE_SIZE })) }
          setHeartbeats(
            _.range(0, PAGE_SIZE).map(i => {
              const height = startBlock(toBlock - (i * NUM_BLOCKS_PER_HEARTBEAT))
              const d = toArray(data).find(d => d.period_height === height)
              const { sender } = { ...d }
              return {
                ...d,
                period_height: height,
                status: equalsIgnoreCase(sender, broadcaster_address),
              }
            })
          )
        }
      }
      getData()
    },
    [address, status_data, validators_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        const { latest_block_height } = { ...status_data }
        const { broadcaster_address, supported_chains } = { ...data }
        if (address?.startsWith('axelarvaloper') && latest_block_height && data) {
          const toBlock = latest_block_height
          const fromBlock = toBlock - 10000
          const { data } = { ...(broadcaster_address && await searchPolls({ voter: broadcaster_address, fromBlock, toBlock, size: PAGE_SIZE })) }
          setVotes(
            toArray(data).map(d =>
              Object.fromEntries(
                Object.entries(d).filter(([k, v]) => !k.startsWith('axelar1') || equalsIgnoreCase(k, broadcaster_address)).flatMap(([k, v]) =>
                  equalsIgnoreCase(k, broadcaster_address) ?
                    Object.entries({ ...v }).map(([_k, _v]) => [_k === 'id' ? 'txhash' : _k, _v]) :
                    [[k, v]]
                )
              )
            )
          )
        }
      }
      getData()
    },
    [address, status_data, data],
  )

  return (
    <div className="children px-3">
      {data ?
        <div className="max-w-7xl space-y-4 sm:space-y-6 mt-6 sm:mt-8 mx-auto">
          <Info data={{ ...data, delegations }} />
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Uptimes data={uptimes} />
            <Heartbeats data={heartbeats} />
            <Votes data={votes} />
          </div>
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}