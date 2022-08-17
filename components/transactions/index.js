import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { CSVLink } from 'react-csv'
import { TailSpin, ThreeDots } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle, BiLeftArrowCircle, BiRightArrowCircle } from 'react-icons/bi'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { transactions_by_events, transaction as getTransaction } from '../../lib/api/cosmos'
import { transactions as getTransactions, deposit_addresses } from '../../lib/api/index'
import { type } from '../../lib/object/id'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, name, ellipse, equals_ignore_case, sleep, params_to_obj, loader_color } from '../../lib/utils'

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
  const [total, setTotal] = useState(null)
  const [dataForExport, setDataForExport] = useState(null)
  const [numLoadedData, setNumLoadedData] = useState(0)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { txHash, status, type, account, fromTime, toTime } = { ...params }
      setFilters({
        txHash,
        status: ['success', 'failed'].includes(status?.toLowerCase()) ? status.toLowerCase() : undefined,
        type,
        account,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      // if (typeof fetchTrigger === 'number') {
      //   setFetchTrigger(moment().valueOf())
      // }
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    if (assets_data && pathname && filters) {
      triggering()
    }
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
            setTotal(null)
            setData(null)
            setDataForExport(null)
            setOffet(0)
          }
          const _data = !fetchTrigger ? [] : (data || []),
            size = n || LIMIT
          const from = fetchTrigger === true || fetchTrigger === 1 ? _data.length : 0
          let response
          if (height) {
            response = await transactions_by_events(`tx.height=${height}`, _data, true, assets_data)
          }
          else if (address?.length >= 65 || type(address) === 'evm_address') {
            const _response = await deposit_addresses({
              query: {
                match: { deposit_address: address },
              },
              size: 10,
              sort: [{ height: 'desc' }],
            })
            if (_response?.data?.length > 0) {
              if (type(address) === 'account') {
                response = await transactions_by_events(`transfer.sender='${address}'`, response?.data, false, assets_data, 10)
                response = await transactions_by_events(`message.sender='${address}'`, response?.data, false, assets_data, 10)
              }
              response = await transactions_by_events(`link.depositAddress='${address}'`, response?.data, false, assets_data, 10)
              response = await transactions_by_events(`transfer.recipient='${address}'`, response?.data, false, assets_data, 10)
              if (response?.data) {
                response.data.forEach(d => getTransaction(d?.txhash))
                await sleep(1 * 1000)
              }
            }
            else {
              response = await getTransactions({
                query: {
                  match: { addresses: address },
                },
                size,
                from,
                sort: [{ timestamp: 'desc' }],
                fields: ['txhash', 'height', 'types', 'tx.body.messages.sender', 'tx.body.messages.signer', 'code', 'tx.auth_info.fee.amount.*', 'timestamp'],
                _source: {
                  includes: 'logs'
                },
                track_total_hits: true,
              }, assets_data)
            }
          }
          else {
            const must = [], must_not = []
            if (address) {
              must.push({ match: { addresses: address } })
            }
            else if (filters) {
              const { txHash, status, type, account, time } = { ...filters }
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
              if (account) {
                must.push({ match: { addresses: account } })
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
              track_total_hits: true,
            }, assets_data)
          }
          if (response) {
            let total = response.total
            response = _.orderBy(_.uniqBy(_.concat(response.data?.map(d => {
              const {
                txhash,
                type,
                types,
                timestamp,
                activities,
              } = { ...d }
              return {
                ...d,
                txhash: Array.isArray(txhash) ? _.last(txhash) : txhash,
                type: _.head(types) || type,
                timestamp: Array.isArray(timestamp) ? _.last(timestamp) : timestamp,
                transfer: activities?.findIndex(a => equals_ignore_case(a?.sender, address)) > -1 ? 'out' :
                  activities?.findIndex(a => equals_ignore_case(a?.receiver, address) ||
                    (Array.isArray(a?.recipient) ?
                      a?.recipient?.findIndex(_a => equals_ignore_case(_a, address)) > -1 :
                      equals_ignore_case(a?.recipient, address)
                    )
                  ) > -1 ? 'in' : null
              }
            }) || [], _data), 'txhash'), ['timestamp', 'txhash'], ['desc', height ? 'asc' : 'desc'])
            setTotal(response.length > total ? response.length : total)
            setData(response)
            setFetching(false)
            setDataForExport(await toCSV(response))
          }
          else if (!fetchTrigger) {
            setTotal(0)
            setData([])
            setDataForExport([])
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

  const toCSV = async data => {
    setNumLoadedData(0)
    data = data?.filter(d => d).map(d => {
      return {
        ...d,
        amount: d.activities?.filter(a => a?.amount && a.amount !== d.fee && (
          !(address || filters?.account) ||
          equals_ignore_case(a?.recipient, address || filters?.account) ||
          equals_ignore_case(a?.sender, address || filters?.account)
        )) || [],
      }
    }) || []
    const need_price = (process.env.NEXT_PUBLIC_SUPPORT_EXPORT_ADDRESSES?.split(',') || []).includes(address || filters?.account) || ((address || filters?.account) && data?.length > 0 && data.filter(d => ['ExecutePendingTransfers', 'MsgSend'].includes(d.type)).length === data.length)
    if (need_price) {
      const assets_price = {}
      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        const { amount, timestamp } = { ...d }
        if (amount) {
          const time_string = moment(timestamp).format('DD-MM-YYYY')
          for (let j = 0; j < amount.length; j++) {
            const a = amount[j]
            const { denom } = { ...a }
            let { price } = { ...a }
            if (typeof price !== 'number') {
              if (typeof assets_price[denom]?.[time_string] === 'number') {
                price = assets_price[denom][time_string]
              }
              else {
                const response = await getAssetsPrice({ denom, timestamp })
                if (typeof response?.[0]?.price === 'number') {
                  price = response[0].price
                  assets_price[denom] = {
                    ...assets_price[denom],
                    [`${time_string}`]: price,
                  }
                }
              }
            }
            a.price = price
            amount[j] = a
          }
          d.amount = amount
          data[i] = d
        }
        setNumLoadedData(i + 1)
      }
    }
    data = data.flatMap(d => {
      if (need_price) {
        return d.amount.map(a => {
          const multipier = equals_ignore_case(a.sender, address || filters?.account) ? -1 : 1
          return {
            ...d,
            ...a,
            amount: typeof a.amount === 'number' ? a.amount * multipier : '',
            value: typeof a.amount === 'number' && typeof a.price === 'number' ? a.amount * a.price * multipier : '',
            type: d.type,
            timestamp_utc_string: moment(d.timestamp).format('DD-MM-YYYY HH:mm:ss A'),
          }
        })
      }
      else {
        return [{
          ...d,
          amount: d.amount.map(a => {
            const multipier = (address || filters?.account) && equals_ignore_case(a.sender, address || filters?.account) ? -1 : 1
            return `${number_format(a.amount * multipier, '0,0.00000000', true)} ${a.symbol || a.denom || ''}`.trim()
          }).join('\n'),
        }]
      }
    }) || []
    return data
  }

  const data_filtered = _.slice(data?.filter(d => !(filterTypes?.length > 0) || filterTypes.includes(d?.type) || (filterTypes.includes('undefined') && !d?.type)), 0, n || undefined)
  const need_price = (process.env.NEXT_PUBLIC_SUPPORT_EXPORT_ADDRESSES?.split(',') || []).includes(address || filters?.account) || ((address || filters?.account) && data?.length > 0 && data.filter(d => ['ExecutePendingTransfers', 'MsgSend'].includes(d.type)).length === data.length)

  return (
    data ?
      <div className="min-h-full grid gap-2">
        {!n && (
          <div className="flex items-center justify-between space-x-2 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              {typeof total === 'number' && (
                <div className="flex space-x-1 ml-2 sm:ml-0 sm:mb-1">
                  <span className="text-sm font-bold">
                    {number_format(total, '0,0')}
                  </span>
                  <span className="text-sm">
                    Results
                  </span>
                </div>
              )}
              <div className="block sm:flex sm:flex-wrap items-center justify-start overflow-x-auto space-x-1">
                {Object.entries({ ...types }).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equals_ignore_case(t, k)) : _.concat(filterTypes || [], k)))}
                    className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'bg-slate-200 dark:bg-slate-800 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'} rounded-lg cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1.5 ml-1 mb-1 py-0.5 px-1.5`}
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
            </div>
            {data?.length > 0 && (
              <>
                {dataForExport ?
                  dataForExport.length > 0 && (
                    <CSVLink
                      headers={[
                        { label: 'Tx Hash', key: 'txhash' },
                        { label: 'Block', key: 'height' },
                        { label: 'Type', key: 'type' },
                        { label: 'Status', key: 'status' },
                        need_price && { label: 'Sender', key: 'sender' },
                        need_price && { label: 'Recipient', key: 'recipient' },
                        { label: 'Amount', key: 'amount' },
                        need_price && { label: 'Symbol', key: 'symbol' },
                        need_price && { label: 'Price', key: 'price' },
                        need_price && { label: 'Value', key: 'value' },
                        { label: 'Fee', key: 'fee' },
                        { label: 'Time (ms)', key: 'timestamp' },
                        need_price && { label: 'Time (DD-MM-YYYY HH:mm:ss A)', key: 'timestamp_utc_string' },
                      ].filter(h => h)}
                      data={dataForExport}
                      filename={`transactions${Object.entries({ ...filters }).filter(([k, v]) => v).map(([k, v]) => `_${k === 'time' ? v.map(t => t.format('DD-MM-YYYY')).join('_') : v}`).join('') || (address || height ? `_${address || height}` : '')}.csv`}
                      className={`${fetching ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-600' : 'bg-blue-50 hover:bg-blue-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer text-blue-400 hover:text-blue-500 dark:text-slate-200 dark:hover:text-white'} rounded-lg mb-1 py-1 px-2.5`}
                    >
                      <span className="whitespace-nowrap font-bold">
                        Export CSV
                      </span>
                    </CSVLink>
                  ) :
                  <div className="flex items-center space-x-2">
                    <ThreeDots color={loader_color(theme)} width="20" height="20" />
                    <span className="text-slate-400 dark:text-slate-600 font-medium">
                      {number_format(numLoadedData, '0,0')} / {number_format(data.length, '0,0')}
                    </span>
                  </div>
                }
              </>
            )}
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
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="uppercase text-blue-600 dark:text-white font-bold"
                    >
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
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-white font-semibold"
                  >
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
                <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg capitalize text-xs lg:text-sm font-semibold lg:-mt-0.5 py-0.5 px-1.5">
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
                      <BiCheckCircle size={20} /> :
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
                const validator_data = validators_data?.find(v => equals_ignore_case(v?.broadcaster_address, props.value) || equals_ignore_case(v?.operator_address, props.value))
                const { operator_address, description } = { ...validator_data }
                const { moniker } = { ...description }
                return validator_data ?
                  <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-2`}>
                    <Link href={`/validator/${operator_address}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ValidatorProfile validator_description={description} />
                      </a>
                    </Link>
                    <div className="flex flex-col">
                      {moniker && (
                        <Link href={`/validator/${operator_address}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white font-bold"
                          >
                            {ellipse(moniker, 12)}
                          </a>
                        </Link>
                      )}
                      <div className="flex items-center space-x-1">
                        <Link href={`/validator/${operator_address}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 dark:text-slate-600 font-medium"
                          >
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
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white font-medium"
                        >
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
                <div className="text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end justify-center space-y-1.5">
                    {typeof props.value === 'number' ?
                      <div className="h-5 flex items-center text-xs lg:text-sm font-semibold space-x-1">
                        <span className="uppercase">
                          {number_format(props.value, '0,0.00000000')}
                        </span>
                        <span>
                          {ellipse(props.row.original.symbol, 4, 'ibc/')}
                        </span>
                      </div>
                      :
                      props.row.original.activities?.findIndex(a => a?.amount && a.amount !== props.row.original.fee) > -1 ?
                        props.row.original.activities.filter(a => a?.amount && a.amount !== props.row.original.fee).map((a, i) => (
                          <div
                            key={i}
                            className={`h-5 flex items-center ${(address || filters?.account) ? equals_ignore_case(a?.recipient, address || filters?.account) ? 'text-green-500 dark:text-green-600 font-bold' : equals_ignore_case(a?.sender, address || filters?.account) ? 'text-red-500 dark:text-red-600 font-bold' : '' : ''} text-xs lg:text-sm font-semibold space-x-1`}
                          >
                            <span className="uppercase">
                              {number_format(a.amount, '0,0.00000000')}
                            </span>
                            <span>
                              {ellipse(a.symbol || a.denom, 4, 'ibc/')}
                            </span>
                          </div>
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
        {data.length > 0 && !n && !height && !(address?.length >= 65) && (typeof total !== 'number' || data.length < total) && (
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