import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin, ThreeDots } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle, BiLeftArrowCircle, BiRightArrowCircle } from 'react-icons/bi'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { transactions_by_events } from '../../lib/api/cosmos'
import { transactions as getTransactions } from '../../lib/api/index'
import { number_format, name, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 100

export default ({ n }) => {
  const { preferences, assets, validators } = useSelector(state => ({ preferences: state.preferences, assets: state.assets, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }
  const { height, address } = { ...query }

  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { txHash, status, type, fromTime, toTime } = { ...params }
      setFilters({
        txHash,
        status: ['success', 'failed'].includes(status?.toLowerCase()) ? status.toLowerCase() : undefined,
        type,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      setFetchTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    triggering()
    const interval = setInterval(() => triggering(true), (height || address || ['/transactions/search'].includes(pathname) ? 3 : 0.1) * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [assets_data, pathname, height, address, filters])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (assets_data) {
        if (!controller.signal.aborted) {
          setFetching(true)
          if (!fetchTrigger) {
            setData(null)
            setOffet(0)
          }
          const _data = !fetchTrigger ? [] : (data || []),
            size = n || LIMIT
          const from = fetchTrigger === 'true' || fetchTrigger === 1 ? _data.length : 0
          let response
          if (height) {
            response = await transactions_by_events(`tx.height=${height}`, _data, true, assets_data)
          }
          else if (address?.length >= 65) {
            response = await transactions_by_events(`transfer.sender='${address}'`, response?.data, true, assets_data)
            response = await transactions_by_events(`transfer.recipient='${address}'`, response?.data, true, assets_data)
            response = await transactions_by_events(`message.sender='${address}'`, response?.data, true, assets_data)
            response = await transactions_by_events(`link.depositAddress='${address}'`, response?.data, true, assets_data)
          }
          else {
            const must = [], must_not = []
            if (address) {
              must.push({ match: { addresses: address } })
            }
            else if (filters) {
              const { txHash, status, type, time } = { ...filters }
              if (txHash) {
                must.push({ match: { txhash: txHash } })
              }
              if (status) {
                switch (status) {
                  case 'success':
                    must.push({ match: { code: 0 } })
                    break
                  default:
                    must_not.push({ match: { code: 0 } })
                    break
                }
              }
              if (type) {
                must.push({ match: { types: type } })
              }
              if (time?.length > 1) {
                must.push({ range: { timestamp: { gte: time[0].valueOf(), lte: time[1].valueOf() } } })
              }
            }
            response = await getTransactions({
              query: {
                bool: {
                  must,
                  must_not,
                },
              },
              size,
              from,
              sort: [{ timestamp: 'desc' }],
              fields: ['txhash', 'height', 'types', 'tx.body.messages.sender', 'tx.body.messages.signer', 'code', 'tx.auth_info.fee.amount.*', 'timestamp'],
              _source: {
                includes: 'logs'
              },
            }, assets_data)
          }
          if (response) {
            response = _.orderBy(_.uniqBy(_.concat(_data, response.data?.map(d => {
              const { txhash, timestamp, activities } = { ...d }
              return {
                ...d,
                txhash: Array.isArray(txhash) ? _.last(txhash) : txhash,
                timestamp: Array.isArray(timestamp) ? _.last(timestamp) : timestamp,
                transfer: activities?.findIndex(a => equals_ignore_case(a?.sender, address)) > -1 ? 'out' :
                  activities?.findIndex(a => equals_ignore_case(a?.receiver, address)) > -1 ? 'in' : null
              }
            }) || []), 'txhash'), ['timestamp'], ['desc'])
            setData(response)
          }
          else if (!fetchTrigger) {
            setData([])
          }
          setFetching(false)
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [fetchTrigger])

  useEffect(() => {
    if (data) {
      setTypes(_.countBy(_.uniqBy(data, 'txhash').map(t => t?.type).filter(t => t)))
    }
  }, [data])

  const data_filtered = _.slice(data?.filter(d => !(filterTypes?.length > 0) || filterTypes.includes(d?.type) || (filterTypes.includes('undefined') && !d?.type)), 0, n || undefined)

  return (
    data ?
      <div className="min-h-full grid gap-2">
        {!n && (
          <div className="block sm:flex sm:flex-wrap items-center justify-end overflow-x-auto space-x-1 mb-2">
            {Object.entries({ ...types }).map(([k, v]) => (
              <div
                key={k}
                onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equals_ignore_case(t, k)) : _.concat(filterTypes || [], k)))}
                className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'bg-slate-200 dark:bg-slate-800 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'} rounded-lg cursor-pointer whitespace-nowrap flex items-center space-x-1.5 text-xs ml-1 mb-1 py-0.5 px-1.5`}
                style={{ textTransform: 'none' }}
              >
                <span>
                  {k === 'undefined' ?
                    'Failed' :
                    k?.endsWith('Request') ? k.replace('Request', '') : k
                  }
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {number_format(v, '0,0')}
                </span>
              </div>
            ))}
          </div>
        )}
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'txhash',
              disableSortBy: true,
              Cell: props => (
                <div className="flex items-center space-x-1 mb-3">
                  <Link href={`/tx/${props.value}`}>
                    <a className="uppercase text-blue-600 dark:text-white font-bold">
                      {ellipse(props.value)}
                    </a>
                  </Link>
                  <Copy
                    value={props.value}
                    size={18}
                  />
                </div>
              ),
            },
            {
              Header: 'Block',
              accessor: 'height',
              disableSortBy: true,
              Cell: props => (
                <Link href={`/block/${props.value}`}>
                  <a className="text-blue-600 dark:text-white font-semibold">
                    {number_format(props.value, '0,0')}
                  </a>
                </Link>
              ),
            },
            {
              Header: 'Type',
              accessor: 'type',
              disableSortBy: true,
              Cell: props => (
                <div className={`max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs lg:text-sm font-semibold -mt-0.5 py-0.5 px-1.5`}>
                  {name(props.value) || '-'}
                </div>
              ),
            },
            {
              Header: 'Status',
              accessor: 'status',
              disableSortBy: true,
              Cell: props => (
                props.value && (
                  <div className={`${props.value === 'success' ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} uppercase flex items-center text-sm font-bold space-x-1`}>
                    {props.value === 'success' ?
                      <BiCheckCircle size={20} />
                      :
                      <BiXCircle size={20} />
                    }
                    <span>
                      {props.value}
                    </span>
                  </div>
                )
              ),
            },
            {
              Header: 'Sender',
              accessor: 'sender',
              disableSortBy: true,
              Cell: props => {
                const validator_data = validators_data?.find(v => equals_ignore_case(v?.broadcaster_address, props.value))
                const { operator_address, description } = { ...validator_data }
                const { moniker } = { ...description }
                return validator_data ?
                  <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${operator_address}`}>
                      <a>
                        <ValidatorProfile validator_description={description} />
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {moniker && (
                        <Link href={`/validator/${operator_address}`}>
                          <a className="text-blue-600 dark:text-white font-bold">
                            {ellipse(moniker, 12)}
                          </a>
                        </Link>
                      )}
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${operator_address}`}>
                          <a className="text-slate-400 dark:text-slate-600 font-medium">
                            {ellipse(operator_address, 8, process.env.NEXT_PUBLIC_PREFIX_VALIDATOR)}
                          </a>
                        </Link>
                        <Copy value={operator_address} />
                      </div>
                    </div>
                  </div>
                  :
                  props.value ?
                    <div className="flex items-center space-x-1">
                      <Link href={`/account/${props.value}`}>
                        <a className="text-blue-600 dark:text-white font-medium">
                          {ellipse(props.value, 8, process.env.NEXT_PUBLIC_PREFIX_ACCOUNT)}
                        </a>
                      </Link>
                      <Copy value={props.value} />
                    </div>
                    :
                    <span>
                      -
                    </span>
              },
            },
            {
              Header: 'Amount',
              accessor: 'amount',
              disableSortBy: true,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-1.5">
                    {typeof props.value === 'number' ?
                      <span className="uppercase text-xs lg:text-sm font-semibold">
                        {number_format(props.value, '0,0.00000000')} {props.row.original.symbol}
                      </span>
                      :
                      props.row.original.activities?.findIndex(a => a?.amount && a.amount !== props.row.original.fee) > -1 ?
                        props.row.original.activities.filter(a => a?.amount && a.amount !== props.row.original.fee).map((a, i) => (
                          <span
                            key={i}
                            className="uppercase text-xs lg:text-sm font-semibold"
                          >
                            {number_format(a.amount, '0,0.00000000')} {a.symbol || a.denom}
                          </span>
                        ))
                        :
                        <span>
                          -
                        </span>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Transfer',
              accessor: 'transfer',
              disableSortBy: true,
              Cell: props => (
                <div className="flex items-center space-x-1">
                  {props.value === 'in' ?
                    <BiLeftArrowCircle size={18} className="text-green-500 dark:text-green-600" /> :
                    props.value === 'out' ?
                      <BiRightArrowCircle size={18} className="text-red-500 dark:text-red-600" /> : null
                  }
                  <span className={`uppercase ${props.value === 'in' ? 'text-green-500 dark:text-green-600' : props.value === 'out' ? 'text-red-500 dark:text-red-600' : ''} font-semibold`}>
                    {props.value}
                  </span>
                </div>
              ),
            },
            {
              Header: 'Fee',
              accessor: 'fee',
              disableSortBy: true,
              Cell: props => (
                <div className="text-left sm:text-right">
                  <span className="text-xs lg:text-sm font-semibold">
                    {props.value > 0 ?
                      `${number_format(props.value, '0,0.00000000')} ${props.row.original.symbol?.toUpperCase() || ''}` :
                      'No Fee'
                    }
                  </span>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
            {
              Header: 'Time',
              accessor: 'timestamp',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  className="ml-auto"
                />
              ),
              headerClassName: 'justify-end text-right',
            },
          ].filter(c => ['/block/[height]'].includes(pathname) ? !['height', 'transfer'].includes(c.accessor) :
            ['/'].includes(pathname) ? !['height', 'sender', 'amount', 'transfer', 'fee'].includes(c.accessor) :
            ['/validator/[address]'].includes(pathname) ? !['sender', 'amount', 'transfer', 'fee'].includes(c.accessor) :
            ['/account/[address]'].includes(pathname) ? true :
            !['transfer'].includes(c.accessor)
          )}
          data={data_filtered}
          noPagination={data_filtered.length <= 10 || (!n && !(height || address || ['/transactions/search'].includes(pathname)))}
          defaultPageSize={n ? 10 : height || address ? 25 : 100}
          className="min-h-full no-border"
        />
        {data.length > 0 && !n && !height && !(address?.length >= 65) && (
          !fetching ?
            <button
              onClick={() => {
                setOffet(data.length)
                setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
              }}
              className="max-w-min hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg whitespace-nowrap font-medium hover:font-bold mx-auto py-1.5 px-2.5"
            >
              Load more
            </button>
            :
            <div className="flex justify-center p-1.5">
              <ThreeDots color={loader_color(theme)} width="24" height="24" />
            </div>
        )}
      </div>
      :
      <TailSpin color={loader_color(theme)} width="32" height="32" />
  )
}