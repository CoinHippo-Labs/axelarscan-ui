import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin } from 'react-loader-spinner'
import { HiArrowSmRight } from 'react-icons/hi'

import Image from '../image'
import { ProgressBar } from '../progress-bars'
import { search as searchGMP } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { number_format, capitalize, ellipse, equals_ignore_case, _total_time_string, params_to_obj, loader_color } from '../../lib/utils'

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
  const { preferences, evm_chains, cosmos_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [timeframeSelected, setTimeframeSelected] = useState(false)
  const [statuses, setStatuses] = useState(null)
  const [methods, setMethods] = useState(null)
  const [chainPairs, setChainPairs] = useState(null)
  const [contracts, setContracts] = useState(null)
  const [timeSpents, setTimeSpents] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [filters, setFilters] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && asPath) {
      const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

      const chains_data = _.concat(
        evm_chains_data,
        cosmos_chains_data,
      )

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
        setFilters({
          txHash,
          sourceChain: getChain(sourceChain, chains_data)?._id ||
            sourceChain,
          destinationChain: getChain(destinationChain, chains_data)?._id ||
            destinationChain,
          method: [
            'callContract',
            'callContractWithToken',
          ].includes(method) ?
            method :
            undefined,
          status: [
            'approving',
            'called',
            'forecalled',
            'approved',
            'executed',
            'error',
            'insufficient_fee',
          ].includes(status?.toLowerCase()) ?
            status.toLowerCase() :
            undefined,
          senderAddress,
          sourceAddress,
          contractAddress,
          relayerAddress,
          time: fromTime &&
            [
              moment(Number(fromTime)),
              toTime ?
                moment(Number(toTime)) :
                moment(),
            ],
        })

        // if (typeof fetchTrigger === 'number') {
        //   setFetchTrigger(moment().valueOf())
        // }
      }
    }
  }, [evm_chains_data, cosmos_chains_data, asPath, timeframeSelected])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(
        is_interval ?
          moment().valueOf() :
          typeof fetchTrigger === 'number' ?
            null :
            0
      )
    }

    if (
      pathname &&
      filters
    ) {
      triggering()
    }

    return () => clearInterval(
      setInterval(() =>
        triggering(true),
        (['/gmp/stats'].includes(pathname) ?
          1 :
          0.25
        ) * 60 * 1000
      )
    )
  }, [pathname, filters])

  useEffect(() => {
    if (
      asPath &&
      !timeframeSelected &&
      filters
    ) {
      if (!filters.time) {
        const qs = new URLSearchParams()

        Object.entries({ ...filters })
          .filter(([k, v]) => v)
          .forEach(([k, v]) => {
            let key,
              value

            switch (k) {
              case 'time':
                break
              default:
                key = k
                value = v
                break
            }

            if (key) {
              qs.append(
                key,
                value,
              )
            }
          })

        qs.append('fromTime', moment().subtract(DEFAULT_TIMEFRAME_DAYS, 'days').valueOf())
        qs.append('toTime', moment().valueOf())

        const qs_string = qs.toString()

        router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)
      }
    }
  }, [asPath, timeframeSelected, filters])

  useEffect(() => {
    const getData = () => {
      if (filters) {
        if (!fetchTrigger) {
          setStatuses(null)
          setMethods(null)
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

        let event,
          fromTime,
          toTime

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
          fromTime = time[0].unix()
          toTime = time[1].unix() ||
            moment().unix()
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

        getStatuses(params)
        getMethods(params)
        getChainPairs(params)
        getContracts(params)
        getTimeSpents(params)
      }
    }

    getData()
  }, [fetchTrigger])

  const getStatuses = async params => {
    let data, response

    response = await searchGMP({
      ...params,
      status: 'called',
      size: 0,
    })
    data = {
      ...data,
      called: response?.total || 0,
    }

    response = await searchGMP({
      ...params,
      status: 'approving',
      size: 0,
    })
    data = {
      ...data,
      approving: response?.total || 0,
    }

    data = {
      ...data,
      invalid: data.approving < data.called ?
        data.called - data.approving :
        0,
    }

    response = await searchGMP({
      ...params,
      status: 'executed',
      size: 0,
    })
    data = {
      ...data,
      executed: response?.total,
    }

    response = await searchGMP({
      ...params,
      status: 'error',
      size: 0,
    })
    data = {
      ...data,
      error: response?.total,
    }

    setStatuses(
      _.orderBy(
        Object.entries(data)
          .map(([k, v]) => {
            return {
              key: k,
              name: k === 'invalid' ?
                'Invalid Data' :
                k === 'approving' ?
                  'Wait for Approval' :
                  k === 'error' ?
                    'Error Execution' :
                      capitalize(k),
              color: k === 'invalid' ?
                'bg-slate-500' :
                k === 'approving' ?
                  'bg-yellow-500' :
                  k === 'executed' ?
                    'bg-green-500' :
                    k === 'error' ?
                      'bg-red-500' :
                        undefined,
              value: v,
            }
          }),
        ['value'],
        ['desc'],
      )
    )
  }

  const getMethods = async params => {
    const response = await searchGMP({
      ...params,
      aggs: {
        events: {
          terms: { field: 'call.event.keyword' },
        },
      },
      size: 0,
    })

    const {
      buckets,
    } = { ...response?.aggs?.events }

    const data = buckets?.map(b => {
      const {
        key,
        doc_count,
      } = { ...b }

      return {
        key: key?.replace('ContractCall', 'callContract'),
        value: doc_count,
      }
    }) || []

    setMethods(
      _.orderBy(
        data,
        ['value'],
        ['desc'],
      )
    )
  }

  const getChainPairs = async params => {
    const response = await searchGMP({
      ...params,
      aggs: {
        source_chains: {
          terms: { field: 'call.chain.keyword', size: 1000 },
          aggs: {
            destination_chains: {
              terms: { field: 'call.returnValues.destinationChain.keyword', size: 1000 },
            },
          },
        },
      },
      size: 0,
    })

    const data = response?.data || []

    setChainPairs(
      _.orderBy(
        data.map(d => {
          const {
            id,
            source_chain,
            destination_chain,
            num_txs,
          } = { ...d }

          return {
            key: id,
            source_chain,
            destination_chain,
            value: num_txs,
          }
        }),
        ['value'],
        ['desc'],
      )
    )
  }

  const getContracts = async params => {
    const response = await searchGMP({
      ...params,
      aggs: {
        chains: {
          terms: { field: 'call.returnValues.destinationChain.keyword', size: 1000 },
          aggs: {
            contracts: {
              terms: { field: 'call.returnValues.destinationContractAddress.keyword', size: 1000 },
            },
          },
        },
      },
      size: 0,
    })

    const {
      buckets,
    } = { ...response?.aggs?.chains }

    const data = Object.entries(
      _.groupBy(
        buckets?.filter(b => chains_data?.findIndex(c => equals_ignore_case(c?.id, b?.key)) > -1)
          .map(b => {
            const {
              key,
              doc_count,
              contracts,
            } = { ...b }

            return {
              key: key?.toLowerCase(),
              value: doc_count,
              contracts: contracts?.buckets?.map(_b => {
                return {
                  key: _b?.key,
                  value: _b?.doc_count,
                }
              }) || [],
            }
          }) || [],
        'key',
      )
    ).map(([k, v]) => {
      return {
        key: k,
        value: _.sumBy(
          v,
          'value',
        ),
        contracts: _.orderBy(
          Object.entries(
            _.groupBy(
              v?.flatMap(_v => _v?.contracts),
              'key',
            ),
          ).map(([_k, _v]) => {
            return {
              key: _k,
              value: _.sumBy(
                _v,
                'value',
              ),
            }
          }),
          ['value'],
          ['desc'],
        ),
      }
    }).map(d => {
      const {
        contracts,
      } = { ...d }

      return {
        ...d,
        num_contracts: contracts?.length || 0,
      }
    })

    setContracts(
      _.orderBy(
        data,
        ['num_contracts'],
        ['desc'],
      )
    )
  }

  const getTimeSpents = async params => {
    const n_refine = 1
    let response

    for (let i = -1; i < n_refine; i++) {
      response = await searchGMP({
        ...params,
        // filter less than percentile 95
        query: i >= 0 ?
          {
            bool: {
              should: response?.aggs?.chains?.buckets?.map(b => {
                const {
                  key,
                  total,
                } = { ...b }
                if (total?.values?.['95.0'] && (!params?.sourceChain || equals_ignore_case(key, params.sourceChain))) {
                  return {
                    bool: {
                      must: [
                        { match: { 'call.chain': key } },
                        { range: { 'time_spent.total': { lt: total.values['95.0'] } } },
                      ],
                    },
                  }
                }
                else {
                  return null
                }
              }).filter(s => s) || [],
              minimum_should_match: 1,
            },
          } : undefined,
        aggs: {
          chains: {
            terms: { field: 'call.chain.keyword', size: 1000 },
            aggs: {
              approve: {
                percentiles: { field: 'time_spent.call_approved' },
              },
              execute: {
                percentiles: { field: 'time_spent.approved_executed' },
              },
              total: {
                percentiles: { field: 'time_spent.total' },
              },
            },
          },
        },
        size: 0,
      })
    }

    const data = response?.aggs?.chains?.buckets?.map(b => {
      const {
        key,
        doc_count,
        approve,
        execute,
        total,
      } = { ...b }

      return {
        key,
        approve: approve?.values?.['50.0'],
        execute: execute?.values?.['50.0'],
        total: total?.values?.['50.0'],
        value: doc_count,
      }
    }) || []

    setTimeSpents(
      _.orderBy(
        data,
        ['value'],
        ['desc'],
      )
    )
  }

  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )
  const total = _.sumBy(
    statuses?.filter(s => !['called'].includes(s?.key)) || [],
    'value',
  )

  const metricClassName = 'bg-white dark:bg-black border dark:border-slate-600 shadow dark:shadow-slate-600 rounded-lg space-y-1 p-4'
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
          const selected = (!n_day && !(filters?.time?.length > 0)) ||
            (
              filters?.time?.length > 0 &&
              Math.abs(filters.time[0].diff(moment().subtract(n_day, 'days'), 'minutes')) < 30 &&
              Math.abs((filters.time[1] || moment()).diff(moment(), 'minutes')) < 30
            )
          const qs = new URLSearchParams()
          Object.entries({ ...filters }).filter(([k, v]) => v).forEach(([k, v]) => {
            let key, value
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
                className={`${selected ? 'bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold' : 'bg-slate-100 dark:bg-slate-900 text-blue-400 hover:text-blue-500 dark:text-blue-600 dark:hover:text-blue-500 font-medium'} rounded-lg whitespace-nowrap mr-1.5 py-0.5 px-1.5`}
              >
                {title}
              </a>
            </Link>
          )
        })}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Messages
          </span>
          <div className="text-3xl font-bold">
            {statuses ?
              number_format(
                total,
                '0,0',
              ) :
              <TailSpin
                color={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
          <div className="text-slate-400 dark:text-slate-600 text-sm font-medium">
            messages passed through the network
          </div>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
            Methods
          </span>
          <div className="space-y-1">
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
                      {number_format(m?.value, '0,0')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <ProgressBar
                      width={m?.value * 100 / total}
                      color={`${colors[i % colors.length]}`}
                      className="h-1.5 rounded-lg"
                    />
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                      {number_format(
                        m?.value / total,
                        '0,0.000%',
                      )}
                    </span>
                  </div>
                </div>
              )) :
              <TailSpin
                color={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
        <div className={`sm:col-span-2 ${metricClassName}`}>
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
                        {number_format(m?.value, '0,0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <ProgressBar
                        width={m?.value * 100 / total}
                        color={`${m?.color || colors[i % colors.length]}`}
                        className="h-1.5 rounded-lg"
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {number_format(m?.value / total, '0,0.000%')}
                      </span>
                    </div>
                  </div>
                )) :
              <TailSpin
                color={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        <div className={`${metricClassName}`}>
          <div className="text-slate-500 dark:text-slate-300 text-base font-semibold pb-1.5">
            Chain Pairs
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-y-1 gap-x-10">
            {chainPairs && statuses ?
              chainPairs.map((p, i) => {
                const {
                  source_chain,
                  destination_chain,
                  value,
                } = { ...p }

                const source_chain_data = getChain(
                  source_chain,
                  chains_data,
                )
                const destination_chain_data = getChain(
                  destination_chain,
                  chains_data,
                )

                return (
                  <div
                    key={i}
                    className="space-y-0"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={source_chain_data?.image}
                          className="w-5 h-5 rounded-full"
                        />
                        <HiArrowSmRight size={20} />
                        {destination_chain_data ?
                          <Image
                            src={destination_chain_data?.image}
                            className="w-5 h-5 rounded-full"
                          /> :
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                            {ellipse(
                              destination_chain,
                              8,
                            )}
                          </span>
                        }
                      </div>
                      <span className="font-bold">
                        {number_format(
                          value,
                          '0,0',
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <ProgressBar
                        width={value * 100 / total}
                        color={`${colors[i % colors.length]}`}
                        className="h-1.5 rounded-lg"
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {number_format(
                          value / total,
                          '0,0.000%',
                        )}
                      </span>
                    </div>
                  </div>
                )
              }) :
              <TailSpin
                color={loader_color(theme)}
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

                const chain_data = getChain(
                  key,
                  chains_data,
                )

                const {
                  name,
                  image,
                } = { ...chain_data }

                const value = num_contracts
                const total = _.sumBy(
                  contracts,
                  'num_contracts',
                )

                return (
                  <div
                    key={i}
                    className="space-y-0"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2">
                        {image && (
                          <Image
                            src={image}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-base font-bold">
                          {name || key}
                        </span>
                      </div>
                      <span className="font-bold">
                        {number_format(
                          value,
                          '0,0',
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <ProgressBar
                        width={value * 100 / total}
                        color={`${colors[i % colors.length]}`}
                        className="h-1.5 rounded-lg"
                      />
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {number_format(
                          value / total,
                          '0,0.000%',
                        )}
                      </span>
                    </div>
                  </div>
                )
              }) :
              <TailSpin
                color={loader_color(theme)}
                width="36"
                height="36"
              />
            }
          </div>
        </div>
        <div className={`${metricClassName}`}>
          <div className="text-slate-500 dark:text-slate-300 text-base font-semibold pb-1.5">
            The Median Time Spent
          </div>
          <div className="space-y-2">
            {timeSpents ?
              timeSpents.map((t, i) => {
                const {
                  key,
                  approve,
                  execute,
                } = { ...t }

                const source_chain_data = getChain(
                  key,
                  chains_data,
                )

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
                        {source_chain_data?.image && (
                          <Image
                            src={source_chain_data.image}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
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
                          Approve ({approve ?
                            _total_time_string(approve) :
                            '-'
                          })
                        </div>
                        <div className="whitespace-nowrap text-xs font-semibold text-right">
                          Execute ({execute ?
                            _total_time_string(execute) :
                            '-'
                          })
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
                          Total ({t?.total ?
                            _total_time_string(t.total) :
                            '-'
                          })
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) :
              <TailSpin
                color={loader_color(theme)}
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