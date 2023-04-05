import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'
import { CSVLink } from 'react-csv'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle, BiLeftArrowCircle, BiRightArrowCircle } from 'react-icons/bi'

import Datatable from '../datatable'
import ValidatorProfile from '../validator-profile'
import AccountProfile from '../account-profile'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { transactions_by_events, getTransaction } from '../../lib/api/lcd'
import { transactions as getTransactions, deposit_addresses } from '../../lib/api/index'
import { type } from '../../lib/object/id'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, name, remove_chars, ellipse, equalsIgnoreCase, sleep, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 100

export default (
  {
    n,
  },
) => {
  const {
    preferences,
    assets,
    validators,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets, validators:
        state.validators,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    validators_data,
  } = { ...validators }

  const router = useRouter()
  const {
    pathname,
    query,
    asPath,
  } = { ...router }
  const {
    height,
  } = { ...query }
  let {
    address,
  } = { ...query }

  address = remove_chars(address)

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

  useEffect(
    () => {
      if (asPath) {
        const params =
          params_to_obj(
            asPath.indexOf('?') > -1 &&
            asPath
              .substring(
                asPath.indexOf('?') + 1,
              )
          )

        const {
          txHash,
          type,
          status,
          account,
          fromTime,
          toTime,
        } = { ...params }

        setFilters(
          {
            txHash,
            type,
            status:
              [
                'success',
                'failed',
              ].includes(status?.toLowerCase()) ?
                status.toLowerCase() :
                undefined,
            account,
            time:
              fromTime &&
              toTime &&
              [
                moment(
                  Number(fromTime)
                ),
                moment(
                  Number(toTime)
                ),
              ],
          }
          )
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      const triggering = is_interval => {
        setFetchTrigger(
          is_interval ?
            moment()
              .valueOf() :
            typeof fetchTrigger === 'number' ?
              null :
              0
        )
      }

      if (
        assets_data &&
        pathname &&
        filters
      ) {
        triggering()
      }

      const interval =
        setInterval(() =>
          triggering(true),
          (
            height ||
            address ||
            [
              '/transactions/search',
            ].includes(pathname) ?
              3 :
              0.1
          ) * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [assets_data, pathname, height, address, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (assets_data) {
            setFetching(true)

            if (!fetchTrigger) {
              setTotal(null)
              setData(null)
              setDataForExport(null)
              setOffet(0)
            }

            const _data =
              !fetchTrigger ?
                [] :
                data ||
                []

            const size =
              n ||
              ['/transactions/search'].includes(pathname) ?
                filters?.type ?
                  25 :
                  50 :
                LIMIT

            const from =
              fetchTrigger === true ||
              fetchTrigger === 1 ?
                _data.length :
                0

            let response

            if (height) {
              response =
                await transactions_by_events(
                  `tx.height=${height}`,
                  _data,
                  true,
                  assets_data,
                )
            }
            else if (
              address?.length >= 65 ||
              type(address) === 'evm_address'
            ) {
              const _response =
                await deposit_addresses(
                  {
                    query: {
                      match: { deposit_address: address },
                    },
                    size: 10,
                    sort: [{ height: 'desc' }],
                  },
                )

              const {
                data,
              } = { ..._response }

              if (
                _response?.data?.length > 0 ||
                type(address) === 'evm_address'
              ) {
                const {
                  deposit_address,
                } = { ..._.head(_response.data) }

                if (
                  equalsIgnoreCase(
                    address,
                    deposit_address,
                  )
                ) {
                  address = deposit_address
                }

                if (type(address) === 'account') {
                  response =
                    await transactions_by_events(
                      `transfer.sender='${address}'`,
                      response?.data,
                      false,
                      assets_data,
                      10,
                    )

                  response =
                    await transactions_by_events(
                      `message.sender='${address}'`,
                      response?.data,
                      false,
                      assets_data,
                      10,
                    )
                }

                if (type(address) === 'evm_address') {
                  address = utils.getAddress(address)
                }

                response =
                  await transactions_by_events(
                    `link.depositAddress='${address}'`,
                    response?.data,
                    false,
                    assets_data,
                    10,
                  )

                response =
                  await transactions_by_events(
                    `transfer.recipient='${address}'`,
                    response?.data,
                    false,
                    assets_data,
                    10,
                  )

                const {
                  data,
                } = { ...response }

                if (data) {
                  data
                    .forEach(d => {
                      const {
                        txhash,
                      } = { ...d }

                      getTransaction(txhash)
                    })

                  await sleep(1 * 1000)
                }
              }
              else {
                response =
                  await getTransactions(
                    {
                      query: {
                        match: { addresses: address },
                      },
                      size,
                      from,
                      sort: [{ timestamp: 'desc' }],
                      fields:
                        [
                          'txhash',
                          'height',
                          'types',
                          'code',
                          'tx.body.messages.sender',
                          'tx.body.messages.signer',
                          'tx.auth_info.fee.amount.*',
                          'timestamp',
                        ],
                      _source: {
                        includes: 'logs',
                      },
                      track_total_hits: true,
                    },
                    assets_data,
                  )
              }
            }
            else {
              const must = [],
                must_not = []

              if (address) {
                must.push({ match: { addresses: address } })
              }
              else if (filters) {
                const {
                  txHash,
                  type,
                  status,
                  account,
                  time,
                } = { ...filters }

                if (txHash) {
                  must.push({ match: { txhash: txHash } })
                }
                if (type) {
                  must.push({ match: { types: type } })
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
                if (account) {
                  must.push({ match: { addresses: account } })
                }
                if (time?.length > 1) {
                  must.push({
                    range: {
                      timestamp: {
                        gte:
                          time[0]
                            .valueOf(),
                        lte:
                          time[1]
                            .valueOf(),
                      },
                    },
                  })
                }
              }

              response =
                await getTransactions(
                  {
                    query: {
                      bool: {
                        must,
                        must_not,
                      },
                    },
                    size,
                    from,
                    sort: [{ timestamp: 'desc' }],
                    fields:
                      [
                        'txhash',
                        'height',
                        'types',
                        'code',
                        'tx.body.messages.sender',
                        'tx.body.messages.signer',
                        'tx.body.messages.delegator_address',
                        'tx.body.messages.validator_address',
                        'tx.auth_info.fee.amount.*',
                        'timestamp',
                      ],
                    _source: {
                      includes: [
                        'logs',
                        'tx',
                      ],
                    },
                    track_total_hits: true,
                  },
                  assets_data,
                )
              }

            if (response) {
              const {
                total,
              } = { ...response }

              response =
                _.orderBy(
                  _.uniqBy(
                    _.concat(
                      (response.data || [])
                        .map(d => {
                          const {
                            txhash,
                            type,
                            types,
                            timestamp,
                            activities,
                          } = { ...d }

                          return {
                            ...d,
                            txhash:
                              Array.isArray(txhash) ?
                                _.last(txhash) :
                                txhash,
                            type:
                              _.head(types) ||
                              type,
                            timestamp:
                              Array.isArray(timestamp) ?
                                _.last(timestamp) :
                                timestamp,
                            transfer:
                              (activities || [])
                                .findIndex(a =>
                                  equalsIgnoreCase(
                                    a?.sender,
                                    address,
                                  )
                                ) > -1 ?
                                'out' :
                                (activities || [])
                                  .findIndex(a =>
                                    equalsIgnoreCase(
                                      a?.receiver,
                                      address,
                                    ) ||
                                    (Array.isArray(a?.recipient) ?
                                      (a?.recipient || [])
                                        .findIndex(_a =>
                                          equalsIgnoreCase(
                                            _a,
                                            address,
                                          )
                                        ) > -1 :
                                      equalsIgnoreCase(
                                        a?.recipient,
                                        address,
                                      )
                                    )
                                  ) > -1 ?
                                    'in' :
                                    null
                          }
                        }),
                      _data,
                    ),
                    'txhash',
                  ),
                  [
                    'timestamp',
                    'txhash',
                  ],
                  [
                    'desc',
                    height ?
                      'asc' :
                      'desc',
                  ],
                )

              setTotal(
                response.length > total ?
                  response.length :
                  total
              )
              setData(response)
              setFetching(false)
              setDataForExport(
                await toCSV(response)
              )
            }
            else if (!fetchTrigger) {
              setTotal(0)
              setData([])
              setDataForExport([])
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
        setTypes(
          _.countBy(
            _.uniqBy(
              data,
              'txhash',
            )
            .map(t => t?.type)
            .filter(t => t)
          )
        )
      }
    },
    [data],
  )

  const toCSV = async data => {
    setNumLoadedData(0)

    const {
      account,
    } = { ...filters }

    data =
      (data || [])
        .filter(d => d)
        .map(d => {
          const {
            fee,
            activities,
          } = { ...d }

          return {
            ...d,
            amount:
              (activities || [])
                .filter(a =>
                  a?.amount &&
                  a.amount !== fee &&
                  (
                    !(
                      address ||
                      account
                    ) ||
                    equalsIgnoreCase(
                      a?.recipient,
                      address ||
                      account,
                    ) ||
                    equalsIgnoreCase(
                      a?.sender,
                      address ||
                      account,
                    )
                  )
                ),
          }
        })

    const need_price =
      (
        (process.env.NEXT_PUBLIC_SUPPORT_EXPORT_ADDRESSES || '')
          .split(',')
          .filter(a => a)
      ).includes(
        address ||
        account
      ) ||
      (
        (
          address ||
          account
        ) &&
        data.length > 0 &&
        data
          .filter(d =>
            [
              'ExecutePendingTransfers',
              'MsgSend',
            ].includes(d.type)
          )
          .length ===
        data.length
      )

    if (need_price) {
      const assets_price = {}

      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        const {
          amount,
          timestamp,
        } = { ...d }

        if (amount) {
          const time_string =
            moment(timestamp)
              .format('DD-MM-YYYY')

          for (let j = 0; j < amount.length; j++) {
            const a = amount[j]

            const {
              denom,
            } = { ...a }
            let {
              price,
            } = { ...a }

            if (typeof price !== 'number') {
              if (typeof assets_price[denom]?.[time_string] === 'number') {
                price = assets_price[denom][time_string]
              }
              else {
                const response =
                  await getAssetsPrice(
                    {
                      denom,
                      timestamp,
                    },
                  )

                if (typeof _.head(response)?.price === 'number') {
                  price = _.head(response).price

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

    data =
      data
        .flatMap(d => {
          if (need_price) {
            return d.amount
              .map(a => {
                const multipier =
                  equalsIgnoreCase(
                    a.sender,
                    address ||
                    filters?.account,
                  ) ?
                    -1 :
                    1

                return {
                  ...d,
                  ...a,
                  amount:
                    typeof a.amount === 'number' ?
                      a.amount * multipier :
                      '',
                  value:
                    typeof a.amount === 'number' &&
                    typeof a.price === 'number' ?
                      a.amount * a.price * multipier :
                      '',
                  type: d.type,
                  timestamp_utc_string:
                    moment(d.timestamp)
                      .format('DD-MM-YYYY HH:mm:ss A'),
                }
              })
          }
          else {
            return [
              {
                ...d,
                amount:
                  d.amount
                    .map(a => {
                      const multipier =
                        (
                          address ||
                          filters?.account
                        ) &&
                        equalsIgnoreCase(
                          a.sender,
                          address ||
                          filters?.account,
                        ) ?
                          -1 :
                          1

                      return (
                        `${
                          number_format(
                            a.amount * multipier,
                            '0,0.00000000',
                            true,
                          )
                        } ${
                          a.symbol ||
                          a.denom ||
                          ''
                        }`
                        .trim()
                      )
                    })
                    .join('\n'),
              },
            ]
          }
        })

    return data
  }

  const data_filtered =
    _.slice(
      (data || [])
        .filter(d =>
          !(filterTypes?.length > 0) ||
          filterTypes.includes(d?.type) ||
          (
            filterTypes.includes('undefined') &&
            !d?.type
          )
        ),
      0,
      n ||
      undefined,
    )

  const {
    account,
  } = { ...filters }

  const need_price =
    (
      (process.env.NEXT_PUBLIC_SUPPORT_EXPORT_ADDRESSES || '')
        .split(',')
        .filter(a => a)
    ).includes(
      address ||
      account
    ) ||
    (
      (
        address ||
        account
      ) &&
      data?.length > 0 &&
      data
        .filter(d =>
          [
            'ExecutePendingTransfers',
            'MsgSend',
          ].includes(d.type)
        )
        .length ===
      data.length
    )

  return (
    data ?
      <div className="w-full space-y-2">
        {
          !n &&
          (
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                {
                  typeof total === 'number' &&
                  (
                    <div className="flex items-center space-x-1.5 ml-2 sm:ml-0 sm:mb-1">
                      <span className="tracking-wider text-sm font-semibold">
                        {number_format(
                          total,
                          '0,0',
                        )}
                      </span>
                      <span className="tracking-wider text-sm">
                        Results
                      </span>
                    </div>
                  )
                }
                <div className="overflow-x-auto block sm:flex sm:flex-wrap items-center justify-start sm:space-x-2.5">
                  {Object.entries({ ...types })
                    .map(([k, v]) => (
                      <div
                        key={k}
                        onClick={() =>
                          setFilterTypes(
                            _.uniq(
                              filterTypes?.includes(k) ?
                                filterTypes
                                  .filter(t =>
                                    !equalsIgnoreCase(
                                      t,
                                      k,
                                    )
                                  ) :
                              _.concat(
                                filterTypes ||
                                [],
                                k,
                              )
                            )
                          )
                        }
                        className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'font-bold' : 'text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white hover:font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1 mr-1 mb-1`}
                        style={
                          {
                            textTransform: 'none',
                          }
                        }
                      >
                        <span>
                          {k === 'undefined' ?
                            'Failed' :
                            k?.endsWith('Request') ?
                              k
                                .replace(
                                  'Request',
                                  '',
                                ) :
                              k
                          }
                        </span>
                        <span className="text-blue-500 dark:text-white">
                          {number_format(
                            v,
                            '0,0',
                          )}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
              {
                data.length > 0 &&
                (
                  dataForExport ?
                    dataForExport.length > 0 &&
                    (
                      <CSVLink
                        headers={
                          [
                            { label: 'Tx Hash', key: 'txhash' },
                            { label: 'Block', key: 'height' },
                            { label: 'Type', key: 'type' },
                            { label: 'Status', key: 'status' },
                            { label: 'Sender', key: 'sender' },
                            { label: 'Recipient', key: 'recipient' },
                            { label: 'Amount', key: 'amount' },
                            need_price &&
                            { label: 'Symbol', key: 'symbol' },
                            need_price &&
                            { label: 'Price', key: 'price' },
                            need_price &&
                            { label: 'Value', key: 'value' },
                            { label: 'Fee', key: 'fee' },
                            { label: 'Time (ms)', key: 'timestamp' },
                            { label: 'Time (DD-MM-YYYY HH:mm:ss A)', key: 'timestamp_utc_string' },
                          ]
                          .filter(h => h)
                        }
                        data={dataForExport}
                        filename={
                          `transactions${
                            Object.entries({ ...filters })
                              .filter(([k, v]) => v)
                              .map(([k, v]) =>
                                `_${
                                  k === 'time' ?
                                    v
                                      .map(t =>
                                        t.format('DD-MM-YYYY')
                                      )
                                      .join('_') :
                                    v
                                }`
                              )
                              .join('') ||
                            (
                              address ||
                              height ?
                                `_${
                                  address ||
                                  height
                                }` :
                                ''
                            )
                          }.csv`
                        }
                        className={`${fetching ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-600' : 'bg-slate-50 hover:bg-slate-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400'} rounded mb-1 py-1 px-2.5`}
                      >
                        <span className="whitespace-nowrap font-semibold">
                          Export CSV
                        </span>
                      </CSVLink>
                    ) :
                    <div className="flex items-center space-x-2">
                      <ProgressBar
                        borderColor={loader_color(theme)}
                        width="24"
                        height="24"
                      />
                      <div className="tracking-wider text-slate-400 dark:text-slate-600 space-x-1.5">
                        <span>
                          {number_format(
                            numLoadedData,
                            '0,0',
                          )}
                        </span>
                        <span>
                          /
                        </span>
                        <span>
                          {number_format(
                            data.length,
                            '0,0',
                          )}
                        </span>
                      </div>
                    </div>
                )
              }
            </div>
          )
        }
        <Datatable
          columns={
            [
              {
                Header: 'Tx Hash',
                accessor: 'txhash',
                disableSortBy: true,
                Cell: props => (
                  <div className="flex items-center space-x-0.5 mb-3">
                    <Link href={`/tx/${props.value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 text-xs font-normal hover:font-medium"
                      >
                        {ellipse(
                          props.value,
                          6,
                        )}
                      </a>
                    </Link>
                    <Copy
                      value={props.value}
                    />
                  </div>
                ),
              },
              {
                Header: 'Height',
                accessor: 'height',
                disableSortBy: true,
                Cell: props => (
                  <Link href={`/block/${props.value}`}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 text-xs font-normal hover:font-medium"
                    >
                      {number_format(
                        props.value,
                        '0,0',
                      )}
                    </a>
                  </Link>
                ),
              },
              {
                Header: 'Type',
                accessor: 'type',
                disableSortBy: true,
                Cell: props => (
                  <div className="max-w-min bg-zinc-100 dark:bg-zinc-900 rounded capitalize text-xs font-medium py-0.5 px-2">
                    {props.value ?
                      name(
                        props.value
                          .replace(
                            'Request',
                            '',
                          )
                      ) :
                      '-'
                    }
                  </div>
                ),
              },
              {
                Header: 'Status',
                accessor: 'status',
                disableSortBy: true,
                Cell: props => (
                  props.value && (
                    <div className={`${props.value === 'success' ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-400'} uppercase flex items-center text-xs font-semibold space-x-1`}>
                      {props.value === 'success' ?
                        <BiCheckCircle
                          size={20}
                        /> :
                        <BiXCircle
                          size={20}
                        />
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
                  const {
                    value,
                  } = { ...props }

                  const validator_data = (validators_data || [])
                    .find(v =>
                      equalsIgnoreCase(
                        v?.broadcaster_address,
                        value,
                      ) ||
                      equalsIgnoreCase(
                        v?.operator_address,
                        value,
                      )
                    )
                  const {
                    operator_address,
                    description,
                  } = { ...validator_data }
                  const {
                    moniker,
                  } = { ...description }

                  return (
                    operator_address ?
                      <div className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-1.5`}>
                        <Link href={`/validator/${operator_address}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ValidatorProfile
                              validator_description={description}
                            />
                          </a>
                        </Link>
                        <div className="flex flex-col">
                          {
                            moniker &&
                            (
                              <Link href={`/validator/${operator_address}`}>
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                >
                                  {ellipse(
                                    moniker,
                                    12,
                                  )}
                                </a>
                              </Link>
                            )
                          }
                          <div className="flex items-center space-x-1">
                            <Link href={`/validator/${operator_address}`}>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 dark:text-slate-600 text-xs"
                              >
                                {ellipse(
                                  operator_address,
                                  6,
                                  process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                )}
                              </a>
                            </Link>
                            <Copy
                              value={operator_address}
                            />
                          </div>
                        </div>
                      </div> :
                      value ?
                        <AccountProfile
                          address={value}
                          ellipse_size={6}
                          url={true}
                        /> :
                        <span>
                          -
                        </span>
                  )
                },
              },
              {
                Header: 'Recipient',
                accessor: 'recipient',
                disableSortBy: true,
                Cell: props => {
                  const {
                    type,
                  } = { ...props.row.original }

                  const values =
                    [
                      'HeartBeat',
                      'SubmitSignature',
                      'SubmitPubKey',
                    ].findIndex(t =>
                      type?.includes(t)
                    ) > -1 ?
                      [] :
                      props.value

                  return (
                    <div className="flex flex-col space-y-0.5">
                      {(Array.isArray(values) ?
                        values :
                        [values]
                      )
                      .map((value, i) => {
                        const validator_data = (validators_data || [])
                          .find(v =>
                            equalsIgnoreCase(
                              v?.broadcaster_address,
                              value,
                            ) ||
                            equalsIgnoreCase(
                              v?.operator_address,
                              value,
                            )
                          )
                        const {
                          operator_address,
                          description,
                        } = { ...validator_data }
                        const {
                          moniker,
                        } = { ...description }

                        return (
                          operator_address ?
                            <div
                              key={i}
                              className={`min-w-max flex items-${moniker ? 'start' : 'center'} space-x-1.5`}
                            >
                              <Link href={`/validator/${operator_address}`}>
                                <a
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ValidatorProfile
                                    validator_description={description}
                                  />
                                </a>
                              </Link>
                              <div className="flex flex-col">
                                {
                                  moniker &&
                                  (
                                    <Link href={`/validator/${operator_address}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                      >
                                        {ellipse(
                                          moniker,
                                          12,
                                        )}
                                      </a>
                                    </Link>
                                  )
                                }
                                <div className="flex items-center space-x-1">
                                  <Link href={`/validator/${operator_address}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 dark:text-slate-600 text-xs"
                                    >
                                      {ellipse(
                                        operator_address,
                                        6,
                                        process.env.NEXT_PUBLIC_PREFIX_VALIDATOR,
                                      )}
                                    </a>
                                  </Link>
                                  <Copy
                                    value={operator_address}
                                  />
                                </div>
                              </div>
                            </div> :
                            value ?
                              <div
                                key={i}
                                className="flex items-center space-x-1"
                              >
                                <AccountProfile
                                  address={value}
                                  ellipse_size={6}
                                  url={true}
                                />
                              </div> :
                              <span
                                key={i}
                              >
                                -
                              </span>
                        )
                      })}
                    </div>
                  )
                },
              },
              {
                Header: 'Amount',
                accessor: 'amount',
                disableSortBy: true,
                Cell: props => {
                  const {
                    symbol,
                    fee,
                    activities,
                  } = { ...props.row.original }

                  return (
                    <div className="flex flex-col items-start sm:items-end justify-center text-left sm:text-right space-y-1.5">
                      {typeof props.value === 'number' ?
                        <div className="h-5 flex items-center text-xs font-medium space-x-1">
                          <span className="uppercase">
                            {number_format(
                              props.value,
                              '0,0.00000000',
                            )}
                          </span>
                          <span>
                            {ellipse(
                              symbol,
                              4,
                              'ibc/',
                            )}
                          </span>
                        </div> :
                        (activities || [])
                          .findIndex(a =>
                            a?.amount &&
                            a.amount !== fee
                          ) > -1 ?
                          activities
                            .filter(a =>
                              a?.amount &&
                              a.amount !== fee
                            )
                            .map((a, i) => {
                              const {
                                sender,
                                recipient,
                                amount,
                                symbol,
                                denom,
                              } = { ...a }

                              return (
                                <div
                                  key={i}
                                  className={`h-5 flex items-center ${address || account ? equalsIgnoreCase(recipient, address || account) ? 'text-green-400 dark:text-green-300' : equalsIgnoreCase(sender, address || account) ? 'text-red-500 dark:text-red-400' : '' : ''} text-xs font-medium space-x-1`}
                                >
                                  <span className="uppercase">
                                    {number_format(
                                      amount,
                                      '0,0.00000000',
                                    )}
                                  </span>
                                  <span>
                                    {ellipse(
                                      symbol ||
                                      denom,
                                      4,
                                      'ibc/',
                                    )}
                                  </span>
                                </div>
                              )
                            }) :
                          <span>
                            -
                          </span>
                      }
                    </div>
                  )
                },
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Transfer',
                accessor: 'transfer',
                disableSortBy: true,
                Cell: props => (
                  <div className="flex items-center space-x-1 mt-0.5">
                    {props.value === 'in' ?
                      <BiLeftArrowCircle
                        size={16}
                        className="text-green-400 dark:text-green-300"
                      /> :
                      props.value === 'out' ?
                        <BiRightArrowCircle
                          size={16}
                          className="text-red-500 dark:text-red-400"
                        /> :
                        null
                    }
                    <span className={`uppercase ${props.value === 'in' ? 'text-green-400 dark:text-green-300' : props.value === 'out' ? 'text-red-500 dark:text-red-400' : ''} text-xs font-medium`}>
                      {props.value}
                    </span>
                  </div>
                ),
              },
              {
                Header: 'Fee',
                accessor: 'fee',
                disableSortBy: true,
                Cell: props => {
                  const {
                    symbol,
                  } = { ...props.row.original }

                  return (
                    <div className="text-xs font-medium text-left sm:text-right mt-0.5">
                      {props.value > 0 ?
                        `${
                          number_format(
                            props.value,
                            '0,0.00000000',
                          )
                        } ${
                          symbol?.toUpperCase() ||
                          ''
                        }` :
                        'No Fee'
                      }
                    </div>
                  )
                },
                headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
              },
              {
                Header: 'Time',
                accessor: 'timestamp',
                disableSortBy: true,
                Cell: props => (
                  <TimeAgo
                    time={props.value}
                    className="text-xs ml-auto"
                  />
                ),
                headerClassName: 'justify-end text-right',
              },
            ]
            .filter(c =>
              [
                '/block/[height]',
              ].includes(pathname) ?
                ![
                  'height',
                  'transfer',
                ].includes(c.accessor) :
                [
                  '/',
                ].includes(pathname) ?
                  ![
                    'height',
                    'recipient',
                    'amount',
                    'transfer',
                    'fee',
                  ].includes(c.accessor) :
                  [
                    '/validator/[address]',
                  ].includes(pathname) ?
                    ![
                      'sender',
                     'recipient',
                      'amount',
                      'transfer',
                      'fee',
                    ].includes(c.accessor) :
                    [
                      '/account/[address]',
                    ].includes(pathname) ?
                      true :
                      ![
                        'transfer',
                      ].includes(c.accessor)
            )
          }
          data={data_filtered}
          noPagination={
            data_filtered.length <= 10 ||
            (
              !n &&
              !(
                height ||
                address ||
                [
                  '/transactions/search',
                ].includes(pathname)
              )
            )
          }
          defaultPageSize={
            n ?
              10 :
              height ||
              address ?
                25 :
                50
          }
          className="min-h-full no-border"
        />
        {
          data.length > 0 &&
          !n &&
          !height &&
          !(address?.length >= 65) &&
          (
            typeof total !== 'number' ||
            data.length < total
          ) &&
          (
            <div className="w-full flex justify-center">
              {!fetching ?
                <button
                  onClick={() => {
                    setOffet(data.length)
                    setFetchTrigger(
                      typeof fetchTrigger === 'number' ?
                        true :
                        1
                    )
                  }}
                  className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
                >
                  Load more
                </button> :
                <div className="flex justify-center">
                  <ColorRing
                    color={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                </div>
              }
            </div>
          )
        }
      </div> :
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}