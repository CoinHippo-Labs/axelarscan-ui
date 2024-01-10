import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip } from '@material-tailwind/react'
import { utils } from 'ethers'
const { getAddress } = { ...utils }
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort } from 'react-icons/bs'

import Filters from './filters'
import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import ValidatorProfile from '../profile/validator'
import AccountProfile from '../profile/account'
import TimeAgo from '../time/timeAgo'
import { searchTransactions } from '../../lib/api/validators'
import { searchDepositAddresses } from '../../lib/api/transfers'
import { getTransactions, getTransaction } from '../../lib/api/lcd'
import { getKeyType } from '../../lib/key'
import { getType, getSender, getRecipient } from '../../lib/transaction'
import { formatUnits } from '../../lib/number'
import { toArray, includesStringList, ellipse, equalsIgnoreCase, getQueryParams, normalizeQuote } from '../../lib/utils'

const PAGE_SIZE = 25

export default ({ n }) => {
  const { chains, assets, validators } = useSelector(state => ({ chains: state.chains, assets: state.assets, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath, query } = { ...router }
  const { height } = { ...query }
  let { address } = { ...query }
  address = normalizeQuote(address)

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
        setFilters({ ...getQueryParams(asPath) })
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      const trigger = is_interval => {
        if (pathname && filters && (!is_interval || !fetching)) {
          if (height || address) {
            setTypesFiltered(null)
          }
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), (pathname.includes('/search') || height || address ? 5 : 0.1) * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, height, address, filters],
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
          const size = n || pathname.includes('/search') ? 50 : PAGE_SIZE
          const from = [true, 1].includes(fetchTrigger) ? _data.length : 0

          let transactions_data
          let total_data
          if (height) {
            const { tx_responses, pagination } = { ...await getTransactions({ index: true, events: `tx.height=${height}` }) }
            transactions_data = toArray(tx_responses)
            total_data = pagination?.total
          }
          else if (address?.length >= 65 || getKeyType(address, chains_data) === 'evmAddress') {
            const { data } = { ...await searchDepositAddresses({ depositAddress: address }, { size: 10, sort: [{ height: 'desc' }] }) }
            if (toArray(data).filter(d => !equalsIgnoreCase(d.id, d.deposit_address)).length > 0 || getKeyType(address, chains_data) === 'evmAddress') {
              const { deposit_address } = { ..._.head(data) }
              address = equalsIgnoreCase(address, deposit_address) ? deposit_address : address
              let response
              switch (getKeyType(address, chains_data)) {
                case 'axelarAddress':
                  response = await getTransactions({ index: true, events: `transfer.sender='${address}'` })
                  transactions_data = _.concat(toArray(response?.tx_responses), toArray(transactions_data))
                  response = await getTransactions({ index: true, events: `message.sender='${address}'` })
                  transactions_data = _.concat(toArray(response?.tx_responses), toArray(transactions_data))
                  break
                case 'evmAddress':
                  address = getAddress(address)
                  const { data } = { ...await searchTransactions({ ...filters, address, size, from }) }
                  transactions_data = data
                  break
                default:
                  break
              }
              response = await getTransactions({ index: true, events: `link.depositAddress='${address}'` })
              transactions_data = _.concat(toArray(response?.tx_responses), toArray(transactions_data))
              response = await getTransactions({ index: true, events: `transfer.recipient='${address}'` })
              transactions_data = _.concat(toArray(response?.tx_responses), toArray(transactions_data))
              transactions_data = _.orderBy(_.uniqBy(transactions_data, 'txhash'), ['timestamp'], ['desc'])
              total_data = transactions_data.length
            }
            else {
              const { data, total } = { ...await searchTransactions({ ...filters, address, size, from }) }
              transactions_data = data
              total_data = total
            }
          }
          else {
            const { data, total } = { ...await searchTransactions({ ...filters, address, size, from }) }
            transactions_data = data
            total_data = total
          }

          if (transactions_data) {
            setTotal(toArray(transactions_data).length > total_data ? toArray(transactions_data).length : total_data)
            transactions_data = _.orderBy(
              _.uniqBy(
                _.concat(toArray(transactions_data), _data).map(d => {
                  return {
                    ...d,
                    type: getType(d),
                    sender: getSender(d, assets_data),
                    recipient: getRecipient(d, assets_data),
                  }
                }),
                'txhash',
              ),
              ['timestamp', 'txhash'], ['desc', height ? 'asc' : 'desc'],
            )
            setData(transactions_data)
          }
          else if (!fetchTrigger) {
            setData([])
            setTotal(0)
          }

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
        setTypes(_.countBy(toArray(_.uniqBy(data, 'txhash').map(d => d.type))))
      }
    },
    [data],
  )

  const dataFiltered = _.slice(toArray(data).filter(d => toArray(typesFiltered).length < 1 || typesFiltered.includes(d.type)), 0, n || undefined)
  const isTransactionsPage = includesStringList(pathname, ['/transactions', '/txs'])

  return (
    <div className={`${data ? '' : 'children'}`}>
      {data ?
        <div className="space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto">
          {!n && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3 px-3">
              <div className="space-y-0.5">
                <div className="text-lg font-bold">
                  {!(pathname.includes('/search') || height || address) ? 'Latest ' : ''}Transactions
                </div>
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
                {pathname.includes('/search') && <Filters />}
                <div className="overflow-x-auto flex flex-wrap items-center justify-start sm:justify-end">
                  {Object.entries({ ...types }).map(([k, v]) => (
                    <div
                      key={k}
                      onClick={() => setTypesFiltered(_.uniq(toArray(typesFiltered).includes(k) ? typesFiltered.filter(t => !equalsIgnoreCase(t, k)) : _.concat(toArray(typesFiltered), k)))}
                      className={`min-w-max ${toArray(typesFiltered).includes(k) ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm space-x-1 sm:ml-3 mr-3 sm:mr-0`}
                    >
                      <span>{k.replace('Request', '')}</span>
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
          )}
          <div className={`${!n ? 'px-3' : ''}`}>
            <Datatable
              columns={[
                {
                  Header: 'Tx Hash',
                  accessor: 'txhash',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <div className="flex items-center space-x-1 mb-6">
                        <Link
                          href={`/tx/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 dark:text-blue-500 font-semibold"
                        >
                          {ellipse(value, 6)}
                        </Link>
                        <Copy value={value} />
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Height',
                  accessor: 'height',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <Link
                        href={`/block/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 dark:text-blue-500 font-medium"
                      >
                        <NumberDisplay
                          value={value}
                          format="0,0"
                        />
                      </Link>
                    )
                  },
                },
                {
                  Header: 'Type',
                  accessor: 'type',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <div className="max-w-min bg-slate-50 dark:bg-slate-900 rounded capitalize text-xs font-medium py-1 px-2">
                        {value.replace('Request', '')}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Status',
                  accessor: 'code',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return (
                      <Chip
                        color={!value ? 'green' : 'red'}
                        value={!value ? 'success' : 'failed'}
                        className="chip text-2xs font-medium py-0 px-1.5"
                      />
                    )
                  },
                },
                {
                  Header: 'Sender',
                  accessor: 'sender',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { operator_address, broadcaster_address, description } = { ...toArray(validators_data).find(v => includesStringList(value, toArray([v.broadcaster_address, v.operator_address, v.delegator_address], 'lower'))) }
                    const { moniker } = { ...description }
                    return (
                      description && !equalsIgnoreCase(value, broadcaster_address) ?
                        <div className="min-w-max flex items-start space-x-2">
                          <Link
                            href={`/validator/${operator_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile description={description} />
                          </Link>
                          <div className="flex flex-col">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(moniker, 16)}
                            </Link>
                            <div className="flex items-center space-x-1">
                              <Link
                                href={`/validator/${operator_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-500"
                              >
                                {ellipse(operator_address, 6, 'axelarvaloper')}
                              </Link>
                              <Copy value={operator_address} />
                            </div>
                          </div>
                        </div> :
                        operator_address && !equalsIgnoreCase(value, broadcaster_address) ?
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/validator/${operator_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 font-medium"
                            >
                              {ellipse(operator_address, 6, 'axelarvaloper')}
                            </Link>
                            <Copy value={operator_address} />
                          </div> :
                          value ?
                            <AccountProfile address={value} url={true} /> :
                            '-'
                    )
                  },
                },
                {
                  Header: 'Recipient',
                  accessor: 'recipient',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { type } = { ...row.original }
                    return (
                      <div className="flex flex-col space-y-0.5">
                        {toArray(!includesStringList(type, ['HeartBeat', 'SubmitSignature', 'SubmitPubKey']) && value).map((v, i) => {
                          const { operator_address, broadcaster_address, description } = { ...toArray(validators_data).find(v => includesStringList(value, toArray([v.broadcaster_address, v.operator_address, v.delegator_address], 'lower') )) }
                          const { moniker } = { ...description }
                          return (
                            <div key={i}>
                              {description && !equalsIgnoreCase(value, broadcaster_address) ?
                                <div className="min-w-max flex items-start space-x-2">
                                  <Link
                                    href={`/validator/${operator_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ValidatorProfile description={description} />
                                  </Link>
                                  <div className="flex flex-col">
                                    <Link
                                      href={`/validator/${operator_address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 font-medium"
                                    >
                                      {ellipse(moniker, 16)}
                                    </Link>
                                    <div className="flex items-center space-x-1">
                                      <Link
                                        href={`/validator/${operator_address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 dark:text-slate-500"
                                      >
                                        {ellipse(operator_address, 6, 'axelarvaloper')}
                                      </Link>
                                      <Copy value={operator_address} />
                                    </div>
                                  </div>
                                </div> :
                                operator_address && !equalsIgnoreCase(value, broadcaster_address) ?
                                  <div className="flex items-center space-x-1">
                                    <Link
                                      href={`/validator/${operator_address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 font-medium"
                                    >
                                      {ellipse(operator_address, 6, 'axelarvaloper')}
                                    </Link>
                                    <Copy value={operator_address} />
                                  </div> :
                                  value ?
                                    <AccountProfile address={value} url={true} /> :
                                    '-'
                              }
                            </div>
                          )
                        })}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Fee',
                  accessor: 'tx.auth_info.fee',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { amount } = { ...value }
                    const _amount = formatUnits(_.head(amount)?.amount || '0')
                    return _amount && (
                      <NumberDisplay
                        value={_amount}
                        format="0,0.00000000"
                        suffix=" AXL"
                        className="text-xs font-semibold"
                      />
                    )
                  },
                },
                {
                  Header: 'Time',
                  accessor: 'timestamp',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <div className="flex justify-end">
                      <TimeAgo time={moment(props.value).unix()} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
                    </div>
                  ),
                  headerClassName: 'justify-end text-right',
                },
              ]
              .filter(c => height ? !['height'].includes(c.accessor) : address ? !['tx.auth_info.fee'].includes(c.accessor) : n ? !['height', 'recipient', 'tx.auth_info.fee'].includes(c.accessor) : true)}
              data={dataFiltered}
              defaultPageSize={n || height ? 10 : 50}
              noPagination={dataFiltered.length <= 10 || (!n && !(pathname.includes('/search') || height || address))}
              extra={
                !n && data.length >= (n || pathname.includes('/search') ? 50 : PAGE_SIZE) && (typeof total !== 'number' || data.length < total) && (
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
          </div>
        </div> :
        isTransactionsPage ?
          <div className="loading">
            <Spinner name="Blocks" />
          </div> :
          <div className={`${height || address ? '' : 'p-3'}`}>
            <Spinner name="ProgressBar" width={36} height={36} />
          </div>
      }
    </div>
  )
}