import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5'
import { RiErrorWarningLine, RiTimerLine } from 'react-icons/ri'
import { BsArrowRightShort } from 'react-icons/bs'

import Spinner from '../../spinner'
import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import TimeSpent from '../../time/timeSpent'
import TimeAgo from '../../time/timeAgo'
import { searchTransfers } from '../../../lib/api/transfers'
import { getChainData, getAssetData } from '../../../lib/config'
import { toArray, getTitle, ellipse, equalsIgnoreCase, getQueryParams } from '../../../lib/utils'

const PAGE_SIZE = 25
const WRAP_PREFIXES = ['w', 'axl']

export default () => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, asPath, query } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [types, setTypes] = useState(null)
  const [typesFiltered, setTypesFiltered] = useState(null)

  useEffect(
    () => {
      if (asPath) {
        const filters = { ...getQueryParams(asPath) }
        const { senderAddress } = { ...filters }
        setFilters({ ...filters, senderAddress, address })
      }
    },
    [asPath, address],
  )

  useEffect(
    () => {
      if (address) {
        setFilters({ ...filters, address })
      }
    },
    [address],
  )

  useEffect(
    () => {
      const trigger = is_interval => {
        if (pathname && filters && (!is_interval || !fetching)) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), 15 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
            setTotal(null)
            setOffset(0)
          }

          const _data = toArray(fetchTrigger && data)
          const size = PAGE_SIZE
          const from = [true, 1].includes(fetchTrigger) ? _data.length : 0
          const { sortBy } = { ...filters }
          const sort = sortBy === 'value' ? { 'send.value': 'desc' } : undefined
          const response = await searchTransfers({ ...filters, size, from, sort })

          try {
            const { total } = { ...response }
            let { data } = { ...response }
            if (data) {
              setTotal(total)
              data = _.orderBy(_.uniqBy(_.concat(toArray(data), _data), 'id'), [sortBy === 'value' ? 'send.value' : 'send.created_at.ms'], ['desc'])
              setData(data)
            }
            else if (!fetchTrigger) {
              setData([])
              setTotal(0)
            }
          } catch (error) {}

          setFetching(false)
        }
      }
      getData()
    },
    [fetchTrigger],
  )

  useEffect(
    () => {
      if (data) {
        setTypes(_.countBy(toArray(_.uniqBy(data, 'id').map(d => normalizeType(d.type)))))
      }
    },
    [data],
  )

  const normalizeType = type => ['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'deposit_service' : type || 'deposit_address'
  const dataFiltered = toArray(data).filter(d => toArray(typesFiltered).length < 1 || typesFiltered.includes(normalizeType(d.type)))

  return (
    <div>
      {data ?
        <div className="space-y-2 sm:space-y-4 mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3">
            <div className="space-y-0.5">
              {typeof total === 'number' && (
                <NumberDisplay
                  value={total}
                  format="0,0"
                  suffix=" Results"
                  className="whitespace-nowrap text-slate-500 dark:text-slate-200 font-semibold"
                />
              )}
            </div>
            <div className="flex flex-col sm:items-end space-y-1">
              <div className="overflow-x-auto flex flex-wrap items-center justify-start sm:justify-end">
                {Object.entries({ ...types }).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() => setTypesFiltered(_.uniq(toArray(typesFiltered).includes(k) ? typesFiltered.filter(t => !equalsIgnoreCase(t, k)) : _.concat(toArray(typesFiltered), k)))}
                    className={`min-w-max ${toArray(typesFiltered).includes(k) ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm space-x-1 sm:ml-3 mr-3 sm:mr-0`}
                  >
                    <span>{getTitle(k)}</span>
                    <NumberDisplay
                      value={v}
                      format="0,0"
                      className="text-blue-400 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Datatable
            columns={[
              {
                Header: 'Tx Hash',
                accessor: 'send.txhash',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { send } = { ...row.original }
                  const { source_chain } = { ...send }
                  const { explorer } = { ...getChainData(source_chain, chains_data) }
                  return value && (
                    <div className="flex items-center space-x-1">
                      <Link
                        href={`/transfer/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 dark:text-blue-500 text-sm font-semibold"
                      >
                        {ellipse(value, 10)}
                      </Link>
                      <Copy value={value} />
                      <ExplorerLink value={value} explorer={explorer} />
                    </div>
                  )
                },
                headerClassName: 'whitespace-nowrap',
              },
              {
                Header: 'Method',
                accessor: 'type',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { send } = { ...row.original }
                  const { source_chain, denom, amount } = { ...send }
                  const asset_data = getAssetData(denom, assets_data)
                  const { addresses } = { ...asset_data }
                  let { symbol, image } = { ...addresses?.[source_chain] }

                  symbol = symbol || asset_data?.symbol
                  image = image || asset_data?.image

                  if (symbol) {
                    switch (value) {
                      case 'wrap':
                        const index = WRAP_PREFIXES.findIndex(p => symbol.toLowerCase().startsWith(p) && !equalsIgnoreCase(p, symbol))
                        if (index > -1) {
                          const prefix = WRAP_PREFIXES[index]
                          symbol = symbol.substring(prefix.length)
                        }
                        break
                      default:
                        break
                    }
                  }

                  return (
                    <div className="w-44 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-2 mb-6">
                      <div className="w-fit h-6 bg-slate-50 dark:bg-slate-900 rounded flex items-center font-medium py-1 px-2">
                        {getTitle(normalizeType(value))}
                      </div>
                      <div className="h-6 flex items-center space-x-2">
                        {image && (
                          <Image
                            src={image}
                            width={24}
                            height={24}
                          />
                        )}
                        {typeof amount === 'number' && (
                          <NumberDisplay
                            value={amount}
                            format="0,0.00"
                            suffix={` ${symbol}`}
                          />
                        )}
                      </div>
                    </div>
                  )
                },
              },
              {
                Header: 'Source',
                accessor: 'send.source_chain',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { send, wrap, erc20_transfer } = { ...row.original }
                  let { sender_address } = { ...send }
                  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address
                  const { name, image, explorer } = { ...getChainData(value, chains_data) }
                  return (
                    <div className="w-60 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-2 mb-6">
                      <div className="h-6 flex items-center space-x-2">
                        {image && (
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-semibold">
                          {name || getTitle(value)}
                        </span>
                      </div>
                      <div className="h-6 flex items-center">
                        <AccountProfile address={sender_address} noCopy={true} explorer={explorer} chain={value} />
                      </div>
                    </div>
                  )
                },
              },
              {
                Header: 'Destination',
                accessor: 'send.destination_chain',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { link, unwrap } = { ...row.original }
                  let { recipient_address } = { ...link }
                  recipient_address = unwrap?.recipient_address || recipient_address
                  const { name, image, explorer } = { ...getChainData(value, chains_data) }
                  return (
                    <div className="w-60 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-2 mb-6">
                      <div className="h-6 flex items-center space-x-2">
                        {image && (
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-semibold">
                          {name || getTitle(value)}
                        </span>
                      </div>
                      <div className="h-6 flex items-center">
                        <AccountProfile address={recipient_address} noCopy={true} explorer={explorer} chain={value} />
                      </div>
                    </div>
                  )
                },
              },
              {
                Header: 'Status',
                accessor: 'simplified_status',
                disableSortBy: true,
                Cell: props => {
                  const { value, row } = { ...props }
                  const { send, command, ibc_send, axelar_transfer, unwrap } = { ...row.original }
                  const { destination_chain, insufficient_fee } = { ...send }
                  const destination_chain_data = getChainData(destination_chain, chains_data)

                  let color
                  let icon
                  let transactionHash
                  let explorer
                  let extra
                  let timeSpent

                  switch (value) {
                    case 'failed':
                      color = 'text-red-400 dark:text-red-500'
                      icon = <IoCloseCircleOutline size={18} />
                      break
                    case 'received':
                      color = 'text-green-500 dark:text-green-400'
                      icon = <IoCheckmarkCircleOutline size={18} />
                      transactionHash = unwrap?.tx_hash_unwrap || axelar_transfer?.txhash || ibc_send?.recv_txhash || command?.transactionHash
                      explorer = destination_chain_data?.explorer
                      if (send) {
                        const toTime = (unwrap?.created_at?.ms / 1000) || (axelar_transfer?.created_at?.ms / 1000) || (ibc_send?.received_at?.ms / 1000) || (command?.transactionHash && command.block_timestamp)
                        if (toTime) {
                          timeSpent = (
                            <Tooltip placement="top-start" content="Total time spent">
                              <div className="w-fit h-6 flex items-center text-slate-300 dark:text-slate-600 space-x-1">
                                <RiTimerLine size={18} />
                                <TimeSpent
                                  fromTime={send.created_at?.ms / 1000}
                                  toTime={toTime}
                                  noTooltip={true}
                                  className="font-medium"
                                />
                              </div>
                            </Tooltip>
                          )
                        }
                      }
                      break
                    case 'approved':
                    default:
                      color = 'text-orange-400 dark:text-orange-500'
                      if (!extra && insufficient_fee) {
                        extra = (
                          <Tooltip placement="top-start" content="Insufficient transfer fee">
                            <div className="w-fit flex items-center text-red-500 dark:text-red-600 font-medium space-x-1">
                              <span>Transfer Fee</span>
                              <RiErrorWarningLine size={18} />
                            </div>
                          </Tooltip>
                        )
                      }
                      if (!extra) {
                        icon = <Spinner name="Rings" color="#f97316" />
                      }
                      break
                  }

                  return (
                    <div className="w-40 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-1 mb-6">
                      <div className={`h-6 flex items-center ${color} space-x-1`}>
                        <span className="font-medium">
                          {getTitle(value)}
                        </span>
                        {icon}
                        <ExplorerLink value={transactionHash} explorer={explorer} />
                      </div>
                      {extra}
                      {timeSpent}
                    </div>
                  )
                }
              },
              {
                Header: 'Created at',
                accessor: 'send.created_at.ms',
                disableSortBy: true,
                Cell: props => props.value && (
                  <div className="flex justify-end">
                    <TimeAgo time={moment(props.value).unix()} className="text-slate-400 dark:text-slate-500 text-sm font-medium" />
                  </div>
                ),
                headerClassName: 'justify-end text-right',
              },
            ]}
            data={dataFiltered}
            defaultPageSize={PAGE_SIZE}
            noPagination={dataFiltered.length <= 10}
            extra={
              data.length >= PAGE_SIZE && (typeof total !== 'number' || data.length < total) && (
                <div className="flex justify-center">
                  {!fetching ?
                    <button
                      onClick={
                        () => {
                          setOffset(data.length)
                          setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                        }
                      }
                      className="flex items-center text-black dark:text-white space-x-0.5"
                    >
                      <span className="font-medium">
                        Load more
                      </span>
                      <BsArrowRightShort size={18} />
                    </button> :
                    <Spinner name="ProgressBar" width={32} height={32} />
                  }
                </div>
              )
            }
            offset={offset}
            className="no-border no-shadow"
          />
        </div> :
        <div className="loading-in-tab">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}