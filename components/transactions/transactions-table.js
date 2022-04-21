import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa'
import { BsFillArrowLeftCircleFill, BsFillArrowRightCircleFill } from 'react-icons/bs'

import TransactionsFilter from './transactions-filter'
import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'

import { transactions as getTransactions } from '../../lib/api/opensearch'
import { paramsToObject, numberFormat, getName, ellipseAddress, sleep } from '../../lib/utils'

const LATEST_SIZE = 100
const MAX_PAGE = 50

export default function TransactionsTable({ data, noLoad, location, className = '' }) {
  const { preferences, denoms, validators } = useSelector(state => ({ preferences: state.preferences, denoms: state.denoms, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { denoms_data } = { ...denoms }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [page, setPage] = useState(0)
  const [moreLoading, setMoreLoading] = useState(false)
  const [transactions, setTransactions] = useState(null)
  const [actions, setActions] = useState({})
  const [filterActions, setFilterActions] = useState([])
  const [types, setTypes] = useState(null)
  const [txsTrigger, setTxsTrigger] = useState(null)
  const [txsFilter, setTxsFilter] = useState(null)

  useEffect(() => {
    if (asPath && !txsFilter) {
      const query = paramsToObject(asPath?.indexOf('?') > -1 && asPath?.substring(asPath.indexOf('?') + 1))
      if (query) {
        let filter
        if (query.tx_hash) {
          filter = { ...filter, tx_hash: query.tx_hash }
        }
        if (query.from && query.to) {
          filter = { ...filter, time: [moment(Number(query.from)), moment(Number(query.to))] }
        }
        if (['success', 'failed'].includes(query.status?.toLowerCase())) {
          filter = { ...filter, status: query.status.toLowerCase() }
        }
        if (query.type) {
          filter = { ...filter, type: query.type }
        }
        if (filter) {
          setTxsFilter(filter)
        }
      }
      setTxsTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (denoms_data) {
        if (!controller.signal.aborted) {
          if ((!location || location === 'search') && page && !is_interval) {
            setMoreLoading(true)
          }

          if (!is_interval && txsTrigger && typeof txsTrigger !== 'boolean') {
            setTransactions(null)

            if (transactions && transactions.data?.length < 1) {
              await sleep(0.5 * 1000)
            }
          }

          let _data = page === 0 ? [] : _.cloneDeep(transactions?.data), _page = page
          let size = location === 'index' ? 10 : location === 'search' ? 250 : LATEST_SIZE
          const must = [], must_not = []
          let searchParams
          if (txsFilter) {
            if (txsFilter.tx_hash) {
              must.push({ match: { txhash: txsFilter.tx_hash } })
              searchParams = { ...searchParams, tx_hash: txsFilter.tx_hash }
            }
            if (txsFilter.time?.length > 1) {
              must.push({ range: { timestamp: { gte: txsFilter.time[0].valueOf(), lte: txsFilter.time[1].valueOf() } } })
              searchParams = { ...searchParams, from: txsFilter.time[0].valueOf(), to: txsFilter.time[1].valueOf() }
            }
            if (txsFilter.status) {
              if (txsFilter.status === 'success') {
                must.push({ match: { code: 0 } })
              }
              else {
                must_not.push({ match: { code: 0 } })
              }
              searchParams = { ...searchParams, status: txsFilter.status }
            }
            if (txsFilter.type) {
              must.push({ match: { types: txsFilter.type } })
              searchParams = { ...searchParams, type: txsFilter.type }
            }
          }

          if (searchParams) {
            router.push(`${pathname}?${Object.entries(searchParams).map(([k, v]) => `${k}=${v}`).join('&')}`)
          }

          const query = {
            bool: {
              must,
              must_not,
            },
          }

          while (_page <= page) {
            if (!controller.signal.aborted) {
              const params = {
                size,
                from: _page * size,
                sort: [{ timestamp: 'desc' }],
                query,
                fields: ['txhash', 'height', 'types', 'tx.body.messages.sender', 'code', 'tx.auth_info.fee.amount.*', 'timestamp'],
                _source: {
                  includes: 'logs'
                },
              }
              let response = await getTransactions(params, denoms_data)
              while (response && !response.data && size >= 1) {
                size /= 10
                params.size = size
                response = await getTransactions(params, denoms_data)
              }
              _data = _.orderBy(_.uniqBy(_.concat(_data || [], response?.data || []), 'txhash'), ['timestamp'], ['desc'])
              _page++
            }
          }

          setTransactions({ data: _data || [] })

          if ((!location || location === 'search') && page && !is_interval) {
            setMoreLoading(false)
          }
        }
      }
    }

    if (data) {
      setTransactions(data)
    }
    else if (!noLoad) {
      getData()
    }

    if (!noLoad && (!location || ['index'].includes(location))) {
      const interval = setInterval(() => getData(true), 5 * 1000)
      return () => {
        controller?.abort()
        clearInterval(interval)
      }
    }
  }, [data, page, denoms_data, txsTrigger])

  useEffect(async () => {
    if (location === 'search') {
      const response = await getTransactions({
        size: 0,
        aggs: {
          types: {
            terms: { field: 'types.keyword', size: 100 },
          },
        },
      })

      setTypes(_.orderBy(response?.data || []))
    }
  }, [])

  useEffect(() => {
    if (!noLoad && !location && transactions?.data) {
      setActions(_.countBy(_.uniqBy(transactions.data, 'txhash').map(tx => tx.type)))
    }
  }, [transactions])

  return (
    <>
      {!noLoad && !location && (
        <div className="block sm:flex sm:flex-wrap items-center justify-end overflow-x-auto space-x-1 mb-2">
          {Object.entries(actions).map(([key, value]) => (
            <div
              key={key}
              onClick={() => setFilterActions(_.uniq(filterActions.includes(key) ? filterActions.filter(_action => _action !== key) : _.concat(filterActions, key)))}
              className={`max-w-min btn btn-rounded cursor-pointer whitespace-nowrap flex items-center space-x-1.5 bg-trasparent ${filterActions.includes(key) ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100'} ml-1 mb-1 px-2`}
              style={{ textTransform: 'none', fontSize: '.7rem' }}
            >
              <span>{key === 'undefined' ? 'Failed' : key?.endsWith('Request') ? key.replace('Request', '') : key}</span>
              <span className="text-2xs text-indigo-600 dark:text-indigo-400 font-bold"> {numberFormat(value, '0,0')}</span>
            </div>
          ))}
        </div>
      )}
      {location === 'search' && (
        <div className="flex items-center justify-end -mt-12 mb-4 mr-2">
          <TransactionsFilter
            applied={Object.values(txsFilter || {}).filter(v => v).length > 0}
            disabled={!types}
            types={types}
            initialFilter={txsFilter}
            updateFilter={f => {
              setTxsFilter(f)
              setTxsTrigger(moment().valueOf())
              setPage(0)
            }}
          />
        </div>
      )}
      <Datatable
        columns={[
          {
            Header: 'Tx Hash',
            accessor: 'txhash',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center space-x-1 mb-4">
                  <Link href={`/tx/${props.value}`}>
                    <a className="uppercase text-blue-600 dark:text-white font-medium">
                      {ellipseAddress(Array.isArray(props.value) ? _.last(props.value) : props.value)}
                    </a>
                  </Link>
                  <Copy text={Array.isArray(props.value) ? _.last(props.value) : props.value} />
                </div>
                :
                <div className="skeleton w-48 h-4 mb-4" />
            ),
          },
          {
            Header: 'Height',
            accessor: 'height',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-500 dark:text-gray-400 font-medium">
                    {numberFormat(props.value, '0,0')}
                  </a>
                </Link>
                :
                <div className="skeleton w-16 h-4" />
            ),
          },
          {
            Header: 'Action',
            accessor: 'type',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                props.value ?
                  <span className={`bg-gray-100 dark:bg-gray-${location === 'index' ? 900 : 800} rounded-lg capitalize text-gray-900 dark:text-gray-100 font-semibold px-2 py-1`}>
                    {getName(props.value)}
                  </span>
                  :
                  '-'
                :
                <div className="skeleton w-28 h-4" />
            ),
          },
          {
            Header: 'Status',
            accessor: 'status',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center space-x-1">
                  {props.value === 'success' ?
                    <FaCheckCircle size={16} className="text-green-500 dark:text-white" />
                    :
                    props.value === 'pending' ?
                      <FaClock size={16} className="text-gray-500" />
                      :
                      <FaTimesCircle size={16} className="text-red-500 dark:text-white" />
                  }
                  <span className="capitalize">{props.value}</span>
                </div>
                :
                <div className="skeleton w-20 h-4" />
            ),
          },
          {
            Header: 'Sender',
            accessor: 'sender',
            disableSortBy: true,
            Cell: props => {
              const validator_data = validators_data?.find(v => v?.broadcaster_address === props.value)

              return !props.row.original.skeleton ?
                validator_data ?
                  <div className={`min-w-max flex items-${props.value ? 'start' : 'center'} space-x-2 -mt-0.5`}>
                    <Link href={`/validator/${validator_data.operator_address}`}>
                      <a>
                        {validator_data.description?.image ?
                          <img
                            src={validator_data.description.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          :
                          <div className="skeleton w-6 h-6 rounded-full" />
                        }
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {validator_data.description?.moniker && (
                        <Link href={`/validator/${validator_data.operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-medium">
                            {ellipseAddress(validator_data.description.moniker, 16) || validator_data.operator_address}
                          </a>
                        </Link>
                      )}
                      <span className="flex items-center space-x-1">
                        <Link href={`/validator/${validator_data.operator_address}`}>
                          <a className="text-gray-400 dark:text-gray-600 font-light">
                            {process.env.NEXT_PUBLIC_PREFIX_VALIDATOR}{ellipseAddress(validator_data.operator_address?.replace(process.env.NEXT_PUBLIC_PREFIX_VALIDATOR, ''), 8)}
                          </a>
                        </Link>
                        <Copy text={validator_data.operator_address} />
                      </span>
                    </div>
                  </div>
                  :
                  props.value ?
                    <div className="flex items-center space-x-1">
                      <Link href={`/account/${props.value}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {ellipseAddress(props.value)}
                        </a>
                      </Link>
                      <Copy text={props.value} />
                    </div>
                    :
                    '-'
                :
                <div className="flex items-start space-x-2 -mt-0.5">
                  <div className="skeleton w-6 h-6 rounded-full" />
                  <div className="flex flex-col space-y-1.5">
                    <div className="skeleton w-24 h-4" />
                    <div className="skeleton w-32 h-3" />
                  </div>
                </div>
            },
          },
          {
            Header: 'Amount',
            accessor: 'value',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right">
                  {typeof props.value === 'number' ?
                    <span className="flex items-center justify-end space-x-1">
                      <span>{numberFormat(props.value, '0,0.00000000')}</span>
                      <span className="uppercase font-medium">{ellipseAddress(props.row.original.symbol, 12)}</span>
                    </span>
                    :
                    props.row.original.activities?.findIndex(a => a.amount) > -1 ?
                      props.row.original.activities.filter(a => a.amount).map((a, i) => (
                        <div key={i} className="flex items-center justify-end space-x-1">
                          <span>{numberFormat(a.amount, '0,0.00000000')}</span>
                          <span className="uppercase font-medium">{ellipseAddress(a.symbol || a.denom, 10)}</span>
                        </div>
                      ))
                      :
                      '-'
                  }
                </div>
                :
                <div className="skeleton w-20 h-4 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Transfer',
            accessor: 'transfer',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="flex items-center space-x-1.5">
                  {props.value === 'in' ?
                    <BsFillArrowLeftCircleFill size={16} className="text-green-500 dark:text-white" />
                    :
                    props.value === 'out' ?
                      <BsFillArrowRightCircleFill size={16} className="text-blue-500 dark:text-white" />
                      :
                      null
                  }
                  <span className="uppercase font-medium">{props.value}</span>
                </div>
                :
                <div className="skeleton w-20 h-4" />
            ),
          },
          {
            Header: 'Fee',
            accessor: 'fee',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="text-right">
                  {typeof props.value === 'number' ?
                    <span className="flex items-center justify-end space-x-1">
                      <span>{props.value ? numberFormat(props.value, '0,0.00000000') : 'No Fee'}</span>
                      {props.value > 0 && (
                        <span className="uppercase font-medium">{props.row.original.symbol}</span>
                      )}
                    </span>
                    :
                    '-'
                  }
                </div>
                :
                <div className="skeleton w-16 h-4 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Time',
            accessor: 'timestamp',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <Popover
                  placement="top"
                  title={<span className="normal-case">TX Time</span>}
                  content={<div className="w-36 text-xs">{moment(Array.isArray(props.value) ? _.last(props.value) : props.value).format('MMM D, YYYY h:mm:ss A')}</div>}
                  titleClassName="h-8"
                  className="ml-auto"
                >
                  <div className="text-right">
                    <span className="normal-case text-gray-400 dark:text-gray-600 font-normal">
                      {Number(moment().diff(moment(Array.isArray(props.value) ? _.last(props.value) : props.value), 'second')) > 59 ?
                        moment(Array.isArray(props.value) ? _.last(props.value) : props.value).fromNow()
                        :
                        <>{moment().diff(moment(Array.isArray(props.value) ? _.last(props.value) : props.value), 'second')}s ago</>
                      }
                    </span>
                  </div>
                </Popover>
                :
                <div className="skeleton w-24 h-4 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ].filter(column => ['blocks'].includes(location) ? !['height', 'transfer'].includes(column.accessor) : ['index'].includes(location) ? !['height', 'sender', 'value', 'transfer', 'fee'].includes(column.accessor) : ['validator'].includes(location) ? !['sender', 'value', 'transfer', 'fee'].includes(column.accessor) : ['account'].includes(location) ? true : !['transfer'].includes(column.accessor))}
        data={transactions ?
          transactions.data?.filter(tx => !(!noLoad && !location) || !(filterActions?.length > 0) || filterActions.includes(tx.type) || (filterActions.includes('undefined') && !tx.type)).map((transaction, i) => { return { ...transaction, i } }) || []
          :
          [...Array(!location ? 25 : 10).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={(!location && !noLoad) || ['index'].includes(location)}
        defaultPageSize={!location ? LATEST_SIZE > 100 ? 50 : 50 : 10}
        className={`${(!location && !noLoad) || ['index'].includes(location) ? 'min-h-full' : ''} ${className}`}
      />
      {transactions && !(transactions.data?.length > 0) && (
        <div className={`bg-${(!location || location === 'search') ? 'white' : 'gray-50'} dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2`}>
          No Transactions
        </div>
      )}
      {(!location || location === 'search') && !noLoad && !moreLoading && page < MAX_PAGE && (
        <div
          onClick={() => {
            setPage(page + 1)
            setTxsTrigger(true)
          }}
          className="btn btn-default btn-rounded max-w-max bg-trasparent bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white font-semibold mb-8 mx-auto"
        >
          Load More
        </div>
      )}
      {moreLoading && (
        <div className="flex justify-center mb-8">
          <Loader type="ThreeDots" color={theme === 'dark' ? 'white' : '#3B82F6'} width="32" height="32" />
        </div>
      )}
    </>
  )
}