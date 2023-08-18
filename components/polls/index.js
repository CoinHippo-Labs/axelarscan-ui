import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { IoCheckmarkCircle } from 'react-icons/io5'
import { BsArrowRightShort } from 'react-icons/bs'

import Filters from './filters'
import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import Image from '../image'
import TimeAgo from '../time/timeAgo'
import { searchPolls } from '../../lib/api/polls'
import { getChainData, getAssetData } from '../../lib/config'
import { formatUnits } from '../../lib/number'
import { split, toArray, includesStringList, numberFormat, getTitle, ellipse, equalsIgnoreCase, getQueryParams, toJson } from '../../lib/utils'

const PAGE_SIZE = 25

export default () => {
  const { chains, assets, validators } = useSelector(state => ({ chains: state.chains, assets: state.assets, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

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
        if (pathname && chains_data && filters && (!is_interval || !fetching)) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, chains_data, filters],
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
          const response = await searchPolls({ ...filters, size, from })

          if (response) {
            const { total } = { ...response }
            let { data } = { ...response }
            setTotal(total)
            data = _.orderBy(
              _.uniqBy(
                _.concat(toArray(data), _data).map(d => {
                  const {
                    sender_chain,
                    transaction_id,
                    transfer_id,
                    deposit_address,
                    event,
                    participants,
                  } = { ...d }
                  const { explorer } = { ...getChainData(sender_chain, chains_data) }
                  const { url, transaction_path } = { ...explorer }
                  const _d = {}
                  const votes = []

                  Object.entries({ ...d }).forEach(([k, v]) => {
                    if (k) {
                      if (k.startsWith('axelar')) {
                        votes.push(v)
                      }
                      else {
                        _d[k] = v
                      }
                    }
                  })

                  let vote_options =
                    Object.entries(_.groupBy(toArray(votes).map(v => { return { ...v, option: v.vote ? 'yes' : typeof v.vote === 'boolean' ? 'no' : 'unsubmitted' } }), 'option'))
                      .map(([k, v]) => {
                        return {
                          option: k,
                          value: toArray(v).length,
                          voters: toArray(toArray(v).map(_v => _v.voter)),
                        }
                      })
                      .filter(v => v.value)
                      .map(v => {
                        const { option } = { ...v }
                        return {
                          ...v,
                          i: option === 'yes' ? 0 : option === 'no' ? 1 : 2,
                        }
                      })
                  if (toArray(participants).length > 0 && vote_options.findIndex(v => v.option === 'unsubmitted') < 0 && _.sumBy(vote_options, 'value') < toArray(participants).length) {
                    vote_options.push({ option: 'unsubmitted', value: participants.length - _.sumBy(vote_options, 'value') })
                  }
                  vote_options = _.orderBy(vote_options, ['i'], ['asc'])

                  const _event = split(event, 'lower', '_').join('_')
                  const { id, height } = { ..._d }
                  return {
                    ...d,
                    id_number: !isNaN(id) ? Number(id) : id,
                    height: _.minBy(votes, 'height')?.height || height,
                    confirmation_vote: toArray(votes).find(v => v.confirmed),
                    votes: _.orderBy(votes, ['height', 'created_at'], ['desc', 'desc']),
                    vote_options,
                    _url: includesStringList(_event, ['operator', 'token_deployed']) ? `${url}${transaction_path?.replace('{tx}', transaction_id)}` : `/${includesStringList(_event, ['contract_call']) || !(includesStringList(_event, ['transfer']) || deposit_address) ? 'gmp' : 'transfer'}/${transaction_id ? transaction_id : transfer_id ? `?transfer_id=${transfer_id}` : ''}`,
                  }
                }),
                'id',
              ),
              ['id_number', 'created_at.ms'], ['desc', 'desc'],
            )
            setData(data)
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
        setTypes(_.countBy(toArray(_.uniqBy(data, 'id').map(d => d.event))))
      }
    },
    [data],
  )

  const dataFiltered = toArray(data).filter(d => toArray(typesFiltered).length < 1 || typesFiltered.includes(d.event))

  return (
    <div className="children">
      {data ?
        <div className="space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3 px-3">
            <div className="space-y-0.5">
              <div className="text-lg font-bold">
                EVM Polls
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
              <Filters />
              <div className="overflow-x-auto flex flex-wrap items-center justify-start sm:justify-end">
                {Object.entries({ ...types }).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() => setTypesFiltered(_.uniq(toArray(typesFiltered).includes(k) ? typesFiltered.filter(t => !equalsIgnoreCase(t, k)) : _.concat(toArray(typesFiltered), k)))}
                    className={`min-w-max ${toArray(typesFiltered).includes(k) ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm space-x-1 sm:ml-3 mr-3 sm:mr-0`}
                  >
                    <span>{split(getTitle(k), 'normal', ' ').join('')}</span>
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
          <div className="px-3">
            <Datatable
              columns={[
                {
                  Header: 'Poll ID',
                  accessor: 'id',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return (
                      <div className="flex items-center space-x-1 mb-6">
                        <Link
                          href={`/evm-poll/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 dark:text-blue-500 font-semibold"
                        >
                          {ellipse(value, 10)}
                        </Link>
                        <Copy value={value} />
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Chain',
                  accessor: 'sender_chain',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    const { name, image } = { ...getChainData(value, chains_data) }
                    return (
                      <Tooltip content={name}>
                        <div className="w-fit">
                          <Image
                            src={image}
                            width={24}
                            height={24}
                            className="3xl:w-8 3xl:h-8 rounded-full"
                          />
                        </div>
                      </Tooltip>
                    )
                  },
                },
                {
                  Header: 'Event',
                  accessor: 'event',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { sender_chain, confirmation_events } = { ...row.original }
                    let { _url } = { ...row.original }
                    const { id } = { ...getChainData(sender_chain, chains_data) }
                    return (
                      toArray(confirmation_events).length > 0 ?
                        <div className="flex flex-col space-y-1">
                          {toArray(confirmation_events).map((e, i) => {
                            const { type, txID } = { ...e }
                            let { asset, symbol, amount } = { ...e }

                            let _type
                            switch (type) {
                              case 'depositConfirmation':
                                _type = 'Transfer'
                                break
                              case 'ContractCallApproved':
                                _type = 'ContractCall'
                                break
                              case 'ContractCallApprovedWithMint':
                              case 'ContractCallWithMintApproved':
                                _type = 'ContractCallWithToken'
                                break
                              default:
                                _type = type || value
                                break
                            }

                            const event_url = _type !== 'tokenConfirmation' && txID ? `/${includesStringList(_type, ['ContractCall']) ? 'gmp' : 'transfer'}/${txID}` : _url
                            const amountObject = toJson(asset)
                            if (amountObject) {
                              asset = amountObject.denom
                              amount = amountObject.amount
                            }

                            const asset_data = getAssetData(asset || symbol, assets_data)
                            const { decimals, addresses } = { ...asset_data }
                            let { image } = { ...asset_data }

                            const token_data = addresses?.[id]
                            symbol = token_data?.symbol || asset_data?.symbol || symbol
                            image = token_data?.image || image

                            return (
                              <a
                                key={i}
                                href={event_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-fit min-w-max bg-slate-50 dark:bg-slate-900 rounded flex flex-col space-y-0.5 py-1 px-2"
                              >
                                <span className="capitalize text-xs font-medium">
                                  {split(getTitle(_type), 'normal', ' ').join('')}
                                </span>
                                {symbol && (
                                  <div className="flex items-center space-x-1">
                                    {image && (
                                      <Image
                                        src={image}
                                        width={20}
                                        height={20}
                                      />
                                    )}
                                    {!!(amount) && decimals && (
                                      <NumberDisplay
                                        value={formatUnits(amount, decimals)}
                                        format="0,0.000000"
                                        className="text-xs font-semibold"
                                      />
                                    )}
                                    <span className="text-xs font-semibold">
                                      {symbol}
                                    </span>
                                  </div>
                                )}
                              </a>
                            )
                          })}
                        </div> :
                        value && (
                          <a
                            href={_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-fit min-w-max bg-slate-50 dark:bg-slate-900 rounded capitalize text-xs font-medium py-1 px-2"
                          >
                            {split(getTitle(value), 'normal', ' ').join('')}
                          </a>
                        )
                    )
                  },
                },
                {
                  Header: 'Transaction ID',
                  accessor: 'transaction_id',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { sender_chain } = { ...row.original }
                    const { explorer } = { ...getChainData(sender_chain, chains_data) }
                    const { url, transaction_path } = { ...explorer }
                    return value && (
                      url ?
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', value)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-blue-500 font-medium"
                          >
                            {ellipse(value, 12)}
                          </a>
                          <Copy size={20} value={value} />
                        </div> :
                        <Copy
                          size={20}
                          value={value}
                          title={
                            <span className="cursor-pointer break-all text-slate-400 dark:text-slate-500 font-medium">
                              {ellipse(value, 12)}
                            </span>
                          }
                        />
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Height',
                  accessor: 'height',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { initiated_txhash, confirmation_vote } = { ...row.original }
                    const { id } = { ...confirmation_vote }
                    return value && (
                      <div>
                        <Link
                          href={`/block/${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 dark:text-blue-500 font-medium"
                        >
                          <NumberDisplay value={value} format="0,0" />
                        </Link>
                        {id && (
                          <Link
                            href={`/tx/${id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1"
                          >
                            <IoCheckmarkCircle size={18} className="text-green-400 dark:text-green-500" />
                            <span className="text-slate-400 dark:text-slate-500">
                              Confirmation
                            </span>
                          </Link>
                        )}
                        {initiated_txhash && (
                          <Link
                            href={`/tx/${initiated_txhash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1"
                          >
                            <IoCheckmarkCircle size={18} className="text-green-400 dark:text-green-500" />
                            <span className="text-slate-400 dark:text-slate-500">
                              Initiated
                            </span>
                          </Link>
                        )}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Status',
                  accessor: 'status',
                  disableSortBy: true,
                  Cell: props => {
                    const { success, failed, confirmation, votes } = { ...props.row.original }
                    const status = success ? 'completed' : failed ? 'failed' : confirmation || toArray(votes).findIndex(v => v.confirmed) > -1 ? 'confirmed' : 'pending'
                    return (
                      <Chip
                        color={['completed', 'confirmed'].includes(status) ? 'green' : status === 'failed' ? 'red' : 'blue'}
                        value={status}
                        className="chip capitalize text-xs font-medium py-1 px-2"
                      />
                    )
                  },
                },
                {
                  Header: 'Participations',
                  accessor: 'vote_options',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { id, participants, created_at } = { ...row.original }
                    const total_participants_power = _.sumBy(toArray(validators_data).filter(d => toArray(participants).includes(d.operator_address)), 'quadratic_voting_power')
                    const is_show_power = moment().diff(moment(created_at?.ms), 'days') < 3
                    return value && (
                      <Link
                        href={`/evm-poll/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        {value.map((v, i) => {
                          const { option, value, voters } = { ...v }
                          const total_voters_power = _.sumBy(toArray(validators_data).filter(d => toArray(voters).includes(d.broadcaster_address)), 'quadratic_voting_power')
                          const power_display = total_voters_power > 0 && total_participants_power > 0 ? `${numberFormat(total_voters_power, '0,0.0a')} (${numberFormat(total_voters_power * 100 / total_participants_power, '0,0.0')}%)` : ''
                          return (
                            <NumberDisplay
                              key={i}
                              value={value}
                              format="0,0"
                              suffix={` ${getTitle(option.substring(0, ['unsubmitted'].includes(option) ? 2 : 1))}${is_show_power && power_display ? `: ${power_display}` : ''}`}
                              noTooltip={true}
                              tooltipContent={is_show_power && power_display ? 'Quadratic Voting Power' : ''}
                              className={`${['no'].includes(option) ? 'bg-red-500 dark:bg-red-600 text-white' : ['yes'].includes(option) ? 'bg-green-500 dark:bg-green-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500'} rounded capitalize text-xs font-medium mr-2 py-1 px-2`}
                            />
                          )
                        })}
                      </Link>
                    )
                  },
                },
                {
                  Header: 'Created',
                  accessor: 'created_at.ms',
                  disableSortBy: true,
                  Cell: props => props.value && (
                    <div className="flex justify-end">
                      <TimeAgo time={props.value / 1000} className="text-slate-400 dark:text-slate-500 text-xs font-medium" />
                    </div>
                  ),
                  headerClassName: 'justify-end text-right',
                },
              ]}
              data={dataFiltered}
              defaultPageSize={PAGE_SIZE}
              noPagination={dataFiltered.length < PAGE_SIZE}
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
          </div>
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}