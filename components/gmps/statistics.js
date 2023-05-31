import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar as ProgressBarSpinner } from 'react-loader-spinner'
import { HiArrowSmRight } from 'react-icons/hi'

import BarChart from './charts/bar'
import LineChart from './charts/line'
import Image from '../image'
import SelectChain from '../select/chains'
import { ProgressBar } from '../progress-bars'
import { search as searchGMP, stats, chart, cumulative_volume as getCumulativeVolume } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { number_format, capitalize, ellipse, equalsIgnoreCase, _total_time_string, params_to_obj, loader_color } from '../../lib/utils'

const DEFAULT_TIMEFRAME_DAYS = 7
const TIMEFRAME_OPTIONS = [
  {
    title: 'All-Time',
    n_day: null,
  },
  {
    title: 'Last 90 days',
    n_day: 90,
  },
  {
    title: 'Last 30 days',
    n_day: 30,
  },
  {
    title: 'Last 7 days',
    n_day: 7,
  },
]

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
      },
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }

  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const [timeframeSelected, setTimeframeSelected] = useState(false)
  const [dailyStats, setDailyStats] = useState(null)
  const [cumulativeStats, setCumulativeStats] = useState(null)
  const [methods, setMethods] = useState(null)
  const [statuses, setStatuses] = useState(null)
  const [chainPairs, setChainPairs] = useState(null)
  const [fromChainForPairs, setFromChainForPairs] = useState(null)
  const [toChainForPairs, setToChainForPairs] = useState(null)
  const [contracts, setContracts] = useState(null)
  const [timeSpents, setTimeSpents] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [filters, setFilters] = useState(null)

  useEffect(
    () => {
      if (evm_chains_data && cosmos_chains_data && asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const {
          txHash,
          sourceChain,
          destinationChain,
          method,
          status,
          senderAddress,
          sourceAddress,
          contractAddress,
          relayerAddress,
          fromTime,
          toTime,
        } = { ...params }

        if (!timeframeSelected) {
          setTimeframeSelected(true)
        }
        else {
          setFilters(
            {
              txHash,
              sourceChain: getChain(sourceChain, chains_data)?._id || sourceChain,
              destinationChain: getChain(destinationChain, chains_data)?._id || destinationChain,
              method: ['callContract', 'callContractWithToken'].includes(method) ? method : undefined,
              status:
                [
                  'called',
                  'confirming',
                  'express_executed',
                  'confirmed',
                  'approving',
                  'approved',
                  'executing',
                  'executed',
                  'error',
                  'insufficient_fee',
                  'not_enough_gas_to_execute',
                  'no_created_at',
                ]
                .includes(status?.toLowerCase()) ?
                  status.toLowerCase() :
                  undefined,
              senderAddress,
              sourceAddress,
              contractAddress,
              relayerAddress,
              time: fromTime && [moment(Number(fromTime)), toTime ? moment(Number(toTime)) : moment()],
            }
          )
        }
      }
    },
    [evm_chains_data, cosmos_chains_data, asPath, timeframeSelected],
  )

  useEffect(
    () => {
      const triggering = is_interval => {
        setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
      }

      if (pathname && filters) {
        triggering()
      }

      const interval = setInterval(() => triggering(true), (['/gmp/stats'].includes(pathname) ? 1 : 0.25) * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, filters],
  )

  useEffect(
    () => {
      if (asPath && !timeframeSelected && filters) {
        if (!filters.time) {
          const qs = new URLSearchParams()

          Object.entries({ ...filters })
            .filter(([k, v]) => v)
            .forEach(([k, v]) => {
              let key
              let value

              switch (k) {
                case 'time':
                  break
                default:
                  key = k
                  value = v
                  break
              }

              if (key) {
                qs.append(key, value)
              }
            })

          qs.append('fromTime', moment().subtract(DEFAULT_TIMEFRAME_DAYS, 'days').valueOf())
          qs.append('toTime', moment().valueOf())

          const qs_string = qs.toString()
          router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)
        }
      }
    },
    [asPath, timeframeSelected, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          if (!fetchTrigger) {
            setMethods(null)
            setStatuses(null)
            setChainPairs(null)
            setContracts(null)
            setTimeSpents(null)
          }

          const {
            txHash,
            sourceChain,
            destinationChain,
            method,
            status,
            senderAddress,
            sourceAddress,
            contractAddress,
            relayerAddress,
            time,
          } = { ...filters }

          let event
          let fromTime
          let toTime

          switch (method) {
            case 'callContract':
              event = 'ContractCall'
              break
            case 'callContractWithToken':
              event = 'ContractCallWithToken'
              break
            default:
              event = undefined
              break
          }

          if (time?.length > 0) {
            fromTime =time[0].unix()
            toTime = time[1].unix() || moment().unix()
          }

          const params = {
            txHash,
            sourceChain,
            destinationChain,
            event,
            status,
            senderAddress,
            sourceAddress,
            contractAddress,
            relayerAddress,
            fromTime,
            toTime,
          }

          setDailyStats(await chart({ ...params, granularity: timeframe }))

          let response = await stats({ ...params, includes: 'status' })

          const {
            messages,
            statuses,
          } = { ...response }

          setMethods(
            (messages || [])
              .map(m => {
                const {
                  key,
                  num_txs,
                } = { ...m }

                return {
                  key: (key || '').replace('ContractCall', 'callContract'),
                  num_txs,
                }
              })
          )

          setStatuses(
            _.orderBy(
              Object.entries({ ...statuses })
                .map(([k, v]) => {
                  return {
                    key: k,
                    name:
                      k === 'invalid' ?
                        'Invalid Data' :
                        k === 'confirming' ?
                          'Wait for Confirmation' :
                          k === 'approving' ?
                            'Wait for Approval' :
                            [
                              'approved',
                              'executing',
                            ]
                            .includes(k) ?
                              'Wait for Execute' :
                              k === 'error' ?
                                'Error Execution' :
                                capitalize(k),
                    color:
                      k === 'invalid' ?
                        'bg-slate-500' :
                        k === 'confirming' ?
                          'bg-yellow-400' :
                          k === 'approving' ?
                            'bg-yellow-500' :
                            [
                              'approved',
                              'executing',
                            ]
                            .includes(k) ?
                              'bg-blue-500' :
                              k === 'executed' ?
                                'bg-green-500' :
                                k === 'error' ?
                                  'bg-red-500' :
                                    undefined,
                    num_txs: v,
                  }
                }),
              ['num_txs'],
              ['desc'],
            )
          )

          setChainPairs(
            _.orderBy(
              Object.entries(
                _.groupBy(
                  (messages || [])
                    .flatMap(m => {
                      const {
                        source_chains,
                      } = { ...m }

                      return (
                        (source_chains || [])
                          .flatMap(s => {
                            const {
                              destination_chains,
                            } = { ...s }

                            return (
                              (destination_chains || [])
                                .map(d => {
                                  const {
                                    num_txs,
                                  } = { ...d }

                                  return {
                                    key: `${s.key}_${d.key}`,
                                    source_chain: s.key,
                                    destination_chain: d.key,
                                    num_txs,
                                  }
                                })
                            )
                          })
                      )
                    }),
                  'key',
                ),
              )
              .map(([k, v]) => {
                return {
                  key: k,
                  ..._.head(v),
                  num_txs: _.sumBy(v, 'num_txs'),
                }
              }),
              ['num_txs'],
              ['desc'],
            )
          )

          setContracts(
            _.orderBy(
              Object.entries(
                _.groupBy(
                  (messages || [])
                    .flatMap(m => {
                      const {
                        source_chains,
                      } = { ...m }

                      return (
                        (source_chains || [])
                          .flatMap(s => {
                            const {
                              destination_chains,
                            } = { ...s }

                            return (destination_chains || [])
                              .flatMap(d => {
                                const {
                                  contracts,
                                } = { ...d }

                                return (contracts || [])
                                  .map(c => {
                                    const {
                                      key,
                                      num_txs,
                                    } = { ...c }

                                    return {
                                      key: d.key,
                                      contract: key,
                                      num_txs,
                                    }
                                  })
                              })
                          })
                      )
                    }),
                  'key',
                ),
              )
              .map(([k, v]) => {
                return {
                  key: k,
                  num_contracts: _.uniqBy(v, 'contract').length,
                  num_txs: _.sumBy(v, 'num_txs'),
                }
              }),
              ['num_contracts'],
              ['desc'],
            )
          )

          setCumulativeStats(await getCumulativeVolume({ ...params, granularity: timeframe }))

          response = await stats({ ...params, avg_times: true })

          const {
            time_spents,
          } = { ...response }

          setTimeSpents(time_spents || [])
        }
      }

      getData()
    },
    [fetchTrigger],
  )

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const total = _.sumBy((statuses || []).filter(s => !['called'].includes(s?.key)), 'num_txs')
  const diff_time_filter = filters?.time?.length > 0 && Math.abs((filters.time[1] || moment()).diff(filters.time[0], 'days'))
  const timeframe = (filters && !(filters.time?.length > 0)) || diff_time_filter > 90 ? 'month' : 'day'

  const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-3 px-5 xl:px-4'
  const colors = [
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-red-500',
  ]

  return (
    <>
      <div className="flex items-center mb-2">
        {TIMEFRAME_OPTIONS.map((o, i) => {
          const {
            title,
            n_day,
          } = { ...o }

          const selected =
            (!n_day && !(filters?.time?.length > 0)) ||
            (
              filters?.time?.length > 0 &&
              Math.abs(filters.time[0].diff(moment().subtract(n_day, 'days'), 'minutes')) < 30 &&
              Math.abs((filters.time[1] || moment()).diff(moment(), 'minutes')) < 30
            )

          const qs = new URLSearchParams()

          Object.entries({ ...filters })
            .filter(([k, v]) => v)
            .forEach(([k, v]) => {
              let key
              let value

              switch (k) {
                case 'time':
                  break
                default:
                  key = k
                  value = v
                  break
              }

              if (key) {
                qs.append(key, value)
              }
            })

          switch (n_day) {
            case null:
              break
            default:
              qs.append('fromTime', moment().subtract(n_day, 'days').valueOf())
              qs.append('toTime', moment().valueOf())
              break
          }

          const qs_string = qs.toString()

          return (
            <Link
              key={i}
              href={`${pathname}${qs_string ? `?${qs_string}` : ''}`}
            >
              <a
                onClick={() => setTimeframeSelected(true)}
                className={`${selected ? 'bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold' : 'bg-slate-100 dark:bg-slate-900 text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium'} rounded-lg whitespace-nowrap mr-1.5 py-0.5 px-1.5`}
              >
                {title}
              </a>
            </Link>
          )
        })}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className={`sm:col-span-2 ${metricClassName}`}>
          <BarChart
            id="total_gmp"
            title="Messages"
            description={`Number of messages passed by ${timeframe}`}
            date_format={timeframe === 'month' ? 'MMM YYYY' : undefined}
            timeframe={timeframe}
            chart_data={dailyStats}
          />
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Messages
          </span>
          <div className="text-3xl font-bold">
            {statuses ?
              number_format(total, '0,0') :
              <ProgressBarSpinner
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
          <div className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            messages passed through the network
          </div>
          <div className="h-4" />
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Methods
          </span>
          <div className="space-y-1 mt-1">
            {methods && statuses ?
              methods.map((m, i) => (
                <div
                  key={i}
                  className="space-y-0"
                >
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-base font-bold">
                      {m?.key}
                    </span>
                    <span className="font-bold">
                      {number_format(m?.num_txs, '0,0')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <ProgressBar
                      width={m?.num_txs * 100 / total}
                      color={`${colors[i % colors.length]}`}
                      className="h-1.5 rounded-lg"
                    />
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {number_format(m?.num_txs * 100 / total, '0,0.000')}%
                    </span>
                  </div>
                </div>
              )) :
              <ProgressBarSpinner
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
        {/*
          <div className={`lg:col-span-2 ${metricClassName}`}>
            <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
              Statuses
            </span>
            <div className="grid sm:grid-cols-2 gap-y-1 gap-x-5">
              {statuses ?
                statuses
                  .filter(s => !['called'].includes(s?.key))
                  .map((m, i) => (
                    <div
                      key={i}
                      className="space-y-0"
                    >
                      <div className="flex items-center justify-between space-x-2">
                        <span className="text-base font-bold">
                          {m?.name}
                        </span>
                        <span className="font-bold">
                          {number_format(m?.num_txs, '0,0')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <ProgressBar
                          width={m?.num_txs * 100 / total}
                          color={`${m?.color || colors[i % colors.length]}`}
                          className="h-1.5 rounded-lg"
                        />
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {number_format(m?.num_txs * 100 / total, '0,0.000')}%
                        </span>
                      </div>
                    </div>
                  )) :
                <ProgressBarSpinner
                  borderColor={loader_color(theme)}
                  width="36"
                  height="36"
                />
              }
            </div>
          </div>
        */}
        <div className={`sm:col-span-2 ${metricClassName}`}>
          <LineChart
            id="volume"
            title="Volume (USD)"
            description={`Volume by ${timeframe}`}
            date_format={timeframe === 'month' ? 'MMM YYYY' : undefined}
            timeframe={timeframe}
            value_field="volume"
            is_cumulative={false}
            chart_data={cumulativeStats}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        <div className={`${metricClassName}`}>
          <div className="flex items-center justify-between space-x-2">
            <div className="whitespace-nowrap text-slate-500 dark:text-slate-300 text-base font-semibold pb-1.5">
              Top Chain Pairs
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <div className="flex items-center space-x-1">
                <span>
                  From
                </span>
                <SelectChain
                  value={fromChainForPairs}
                  onSelect={c => setFromChainForPairs(c)}
                />
              </div>
              <div className="flex items-center space-x-1">
                <span>
                  To
                </span>
                <SelectChain
                  value={toChainForPairs}
                  onSelect={c => setToChainForPairs(c)}
                />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-1 lg:grid-cols-1 gap-y-3 gap-x-10">
            {chainPairs && statuses ?
              _.slice(chainPairs.filter(p => (!fromChainForPairs || equalsIgnoreCase(p?.source_chain, fromChainForPairs)) && (!toChainForPairs || equalsIgnoreCase(p?.destination_chain, toChainForPairs))), 0, 10)
                .map((p, i) => {
                  const {
                    source_chain,
                    destination_chain,
                    num_txs,
                  } = { ...p }

                  const source_chain_data = getChain(source_chain, chains_data)
                  const destination_chain_data = getChain(destination_chain, chains_data)

                  return (
                    <div
                      key={i}
                      className="space-y-0"
                    >
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2">
                          <Image
                            src={source_chain_data?.image}
                            className="w-6 h-6 rounded-full"
                          />
                          <HiArrowSmRight
                            size={20}
                          />
                          {destination_chain_data ?
                            <Image
                              src={destination_chain_data?.image}
                              className="w-6 h-6 rounded-full"
                            /> :
                            <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                              {ellipse(destination_chain, 8) || 'Invalid Chain'}
                            </span>
                          }
                        </div>
                        <span className="font-bold">
                          {number_format(num_txs, '0,0')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-2">
                        <ProgressBar
                          width={num_txs * 100 / total}
                          color={`${colors[i % colors.length]}`}
                          className="h-1.5 rounded-lg"
                        />
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {number_format(num_txs * 100 / total, '0,0.000')}%
                        </span>
                      </div>
                    </div>
                  )
                }) :
              <ProgressBarSpinner
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
        <div className={`${metricClassName}`}>
          <div className="text-slate-500 dark:text-slate-300 text-base font-semibold pb-1.5">
            Destination Contracts
          </div>
          <div className="space-y-3">
            {contracts ?
              contracts.map((c, i) => {
                const {
                  key,
                  num_contracts,
                } = { ...c }

                const chain_data = getChain(key, chains_data)

                const {
                  name,
                  image,
                } = { ...chain_data }

                const total = _.sumBy(contracts, 'num_contracts')

                return (
                  <div
                    key={i}
                    className="space-y-0"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-6 h-6 rounded-full"
                            />
                          )
                        }
                        <span className="text-base font-bold">
                          {name || key || 'Invalid Chain'}
                        </span>
                      </div>
                      <span className="font-bold">
                        {number_format(num_contracts, '0,0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <ProgressBar
                        width={num_contracts * 100 / total}
                        color={`${colors[i % colors.length]}`}
                        className="h-1.5 rounded-lg"
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {number_format(num_contracts * 100 / total, '0,0.000')}%
                      </span>
                    </div>
                  </div>
                )
              }) :
              <ProgressBarSpinner
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
        <div className={`${metricClassName}`}>
          <div className="text-slate-500 dark:text-slate-300 text-base font-semibold pb-1.5">
            Median Time Spent
          </div>
          <div className="space-y-2">
            {timeSpents ?
              timeSpents.map((t, i) => {
                const {
                  key,
                  approve,
                  execute,
                } = { ...t }

                const source_chain_data = getChain(key, chains_data)

                return (
                  <div
                    key={i}
                    className="bg-slate-50 dark:bg-slate-900 rounded-lg flex flex-col sm:grid grid-cols-3 gap-2 space-y-1 sm:space-y-0 p-3"
                  >
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-400 dark:text-slate-500 text-xs">
                        From chain
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {
                          source_chain_data?.image &&
                          (
                            <Image
                              src={source_chain_data.image}
                              className="w-5 h-5 rounded-full"
                            />
                          )
                        }
                        <span className="text-sm font-bold">
                          {source_chain_data?.name || key}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col space-y-1.5">
                      <span className="text-slate-400 dark:text-slate-500 text-xs sm:text-right">
                        Time spent
                      </span>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                        <div className="w-full col-span-2">
                          <ProgressBar
                            width={approve * 100 / (approve + execute)}
                            color="bg-yellow-500"
                            backgroundClassName="h-1.5 bg-green-500"
                            className="h-1.5"
                          />
                        </div>
                        <div className="whitespace-nowrap text-xs font-semibold text-left">
                          Approve ({approve ? _total_time_string(approve) : '-'})
                        </div>
                        <div className="whitespace-nowrap text-xs font-semibold text-right">
                          Execute ({execute ? _total_time_string(execute) : '-'})
                        </div>
                        <div className="col-span-2" />
                        <div className="w-full col-span-2">
                          <ProgressBar
                            width={100}
                            color="bg-blue-500"
                            className="h-1.5"
                          />
                        </div>
                        <div className="col-span-2 whitespace-nowrap text-xs font-semibold text-right">
                          Total ({t?.total ? _total_time_string(t.total) : '-'})
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) :
              <ProgressBarSpinner
                borderColor={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
      </div>
    </>
  )
}