import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'

import BarChart from '../transfers/charts/bar'
import { transfers_chart as getTransfersChart, cumulative_volume as getTransferCumulativeVolume } from '../../lib/api/transfer'
import { chart as getGMPChart, stats as getGMPStats, cumulative_volume as getGMPCumulativeVolume } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, params_to_obj, loader_color } from '../../lib/utils'

const NUM_STATS_MONTHS = 6
const NUM_STATS_DAYS = 30

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
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
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    pathname,
    asPath,
  } = { ...router }

  const [gmpsCumulative, setGmpsCumulative] = useState(null)
  const [gmpsStats, setGmpsStats] = useState(null)
  const [gmpsMonthly, setGmpsMonthly] = useState(null)
  const [gmpsDaily, setGmpsDaily] = useState(null)
  const [transfersCumulative, setTransfersCumulative] = useState(null)
  const [transfersMonthly, setTransfersMonthly] = useState(null)
  const [transfersDaily, setTransfersDaily] = useState(null)
  const [filters, setFilters] = useState(null)

  useEffect(
    () => {
      if (evm_chains_data && cosmos_chains_data && assets_data && asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const {
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...params }

        setFilters(
          {
            sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
            destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
            asset: getAsset(asset, assets_data)?.id || asset,
            fromTime: fromTime && moment(Number(fromTime)).unix(),
            toTime: toTime && moment(Number(toTime)).unix(),
          }
        )
      }
    },
    [evm_chains_data, cosmos_chains_data, assets_data, asPath],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          setGmpsCumulative(await getGMPCumulativeVolume({ ...filters }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 1 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters && evm_chains_data && cosmos_chains_data) {
          const response = await getGMPStats({ ...filters })

          const {
            messages,
          } = { ...response }

          setGmpsStats(
            {
              num_txs: _.sumBy(messages, 'num_txs'),
              num_contracts:
                _.uniqBy(
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
                                .flatMap(d => {
                                  const {
                                    contracts,
                                  } = { ...d }

                                  return (
                                    (contracts || [])
                                      .map(c => {
                                        const {
                                          key,
                                          num_txs,
                                        } = { ...c }

                                        return {
                                          id: `${d.key}_${key}`,
                                          num_txs,
                                        }
                                      })
                                  )
                                })
                            )
                          })
                      )
                    }),
                  'id',
                ).length,
            }
          )
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters, evm_chains_data, cosmos_chains_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          const {
            toTime,
          } = { ...filters }
          let {
            fromTime,
          } = { ...filters }

          const n_months = fromTime ? Math.ceil(moment(toTime * 1000).diff(moment(fromTime * 1000), 'months', true)) : NUM_STATS_MONTHS

          fromTime = fromTime || moment().subtract(NUM_STATS_MONTHS, 'months').utc().startOf('month').unix()

          const response = await getGMPChart({ ...filters, fromTime, granularity: 'month' })

          const {
            data,
          } = { ...response }

          setGmpsMonthly({ ...response, data: _.slice(data, data?.length > n_months ? data.length - n_months - 1 : 0) })
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          let {
            fromTime,
          } = { ...filters }

          fromTime = fromTime || moment().subtract(NUM_STATS_DAYS, 'days').utc().startOf('day').unix()

          setGmpsDaily(await getGMPChart({ ...filters, fromTime }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          setTransfersCumulative(await getTransferCumulativeVolume({ ...filters }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 1 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          let {
            fromTime,
          } = { ...filters }

          fromTime = fromTime || moment().subtract(NUM_STATS_MONTHS, 'months').utc().startOf('month').unix()

          setTransfersMonthly(await getTransferCumulativeVolume({ ...filters, fromTime }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters) {
          let {
            fromTime,
          } = { ...filters }

          fromTime = fromTime || moment().subtract(NUM_STATS_DAYS, 'days').utc().startOf('day').unix()

          setTransfersDaily(await getTransfersChart({ ...filters, fromTime }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  const {
    fromTime,
    toTime,
  } = { ...filters }

  const time_filtered = !!(fromTime && toTime)

  const gmpsCumulativeTransactions = _.sumBy(gmpsCumulative?.data, 'num_txs')
  const gmpsCumulativeVolumes = _.last(gmpsCumulative?.data)?.cumulative_volume
  const transfersCumulativeTransactions = _.sumBy(transfersCumulative?.data, 'num_txs')
  const transfersCumulativeVolumes = _.last(transfersCumulative?.data)?.cumulative_volume

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data).filter(c => c)

  const metrics = [
    {
      title: 'interchain transfers',
      value: gmpsCumulativeTransactions + transfersCumulativeTransactions,
      loading: typeof gmpsCumulativeTransactions !== 'number' || !transfersCumulative?.data,
    },
    {
      title: 'volume',
      value: gmpsCumulativeVolumes + transfersCumulativeVolumes,
      prefix: currency_symbol,
      loading: typeof gmpsCumulativeVolumes !== 'number' || !transfersCumulative?.data,
    },
    {
      title: 'connected chains',
      value: chains_data.filter(c => !c.maintainer_id || !c.no_inflation || c.gateway_address).length,
      loading: chains_data.length < 1,
    },
    {
      title: 'interchain contracts',
      value: gmpsStats?.num_contracts,
      loading: !gmpsStats,
    },
  ]

  return (
    <div className="space-y-6 pt-6 pb-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m, i) => {
          const {
            title,
            value,
            prefix,
            loading,
          } = { ...m }

          const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-6 px-5'
          const valueClassName = 'uppercase text-3xl lg:text-xl xl:text-3xl font-semibold space-x-1'
          const titleClassName = 'text-slate-500 dark:text-slate-200 text-base font-normal ml-1 lg:ml-0.5 xl:ml-1'

          return (
            <div
              key={i}
              className={metricClassName}
            >
              <div className={valueClassName}>
                {!loading ?
                  <span>
                    {prefix}{!isNaN(value) ? number_format(value, '0,0') : value}
                  </span> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="32"
                    height="32"
                  />
                }
              </div>
              <span className={titleClassName}>
                {title}
              </span>
            </div>
          )
        })}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-semibold">
              General Message Passing
            </h1>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-3">
                <span className="text-slate-400 dark:text-slate-200 text-sm font-medium">
                  Total cumulative{time_filtered ? '' : ' lifetime'}:
                </span>
                {gmpsCumulative?.data ?
                  <span className="text-sm font-semibold">
                    {number_format(gmpsCumulativeTransactions, '0,0')}
                  </span> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="20"
                    height="20"
                  />
                }
              </div>
              {
                gmpsCumulativeVolumes > 0 &&
                (
                  <span className="text-sm font-semibold">
                    {currency_symbol}
                    {number_format(gmpsCumulativeVolumes, '0,0')}
                  </span>
                )
              }
            </div>
          </div>
          <div>
            <BarChart
              id="monthly_gmps"
              title={`GMP Transfers (${time_filtered ? 'Monthly' : `over last ${number_format(NUM_STATS_MONTHS, '0,0')} months`})`}
              description="Number of transfers by month"
              date_format="MMM YYYY"
              timeframe="month"
              chart_data={gmpsMonthly}
            />
          </div>
          <div>
            <BarChart
              id="daily_gmps"
              title={`GMP Transfers (${time_filtered ? 'Daily' : `over last ${number_format(NUM_STATS_DAYS, '0,0')} days`})`}
              description={`The number of transfers${time_filtered ? '' : ` in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}`}
              chart_data={gmpsDaily}
            />
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-semibold">
              Token Transfers
            </h1>
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-3">
                <span className="text-slate-400 dark:text-slate-200 text-sm font-medium">
                  Total cumulative{time_filtered ? '' : ' lifetime'}:
                </span>
                {transfersCumulative?.data ?
                  <span className="text-sm font-semibold">
                    {number_format(transfersCumulativeTransactions, '0,0')}
                  </span> :
                  <ProgressBar
                    borderColor={loader_color(theme)}
                    width="20"
                    height="20"
                  />
                }
              </div>
              {
                transfersCumulativeVolumes > 0 &&
                (
                  <span className="text-sm font-semibold">
                    {currency_symbol}
                    {number_format(transfersCumulativeVolumes, '0,0')}
                  </span>
                )
              }
            </div>
          </div>
          <div>
            <BarChart
              id="monthly_transfers"
              title={`Token Transfers (${time_filtered ? 'Monthly' : `over last ${number_format(NUM_STATS_MONTHS, '0,0')} months`})`}
              description="Number of transfers by month"
              date_format="MMM YYYY"
              timeframe="month"
              chart_data={transfersMonthly}
            />
          </div>
          <div>
            <BarChart
              id="daily_transfers"
              title={`Token Transfers (${time_filtered ? 'Daily' : `over last ${number_format(NUM_STATS_DAYS, '0,0')} days`})`}
              description={`The number of transfers${time_filtered ? '' : ` in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}`}
              chart_data={transfersDaily}
            />
          </div>
        </div>
      </div>
    </div>
  )
}