import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { TailSpin, ThreeDots, Puff } from 'react-loader-spinner'
import { FiCode } from 'react-icons/fi'

import LineChart from './charts/line'
import BarChart from './charts/bar'
import TvlTotal from './tvl/total'
import Tvl from './tvl'
import TopPath from './top/path'
import TopChainPair from './top/chain-pair'
import Transfers from './transfers'
import { transfers as getTransfers } from '../../lib/api/index'
import { currency } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const NUM_STATS_DAYS = 30

export default () => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const [cumulativeStats, setCumulativeStats] = useState(null)
  const [dailyStats, setDailyStats] = useState(null)
  const [topPaths, setTopPaths] = useState(null)
  const [topChainPairs, setTopChainPairs] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await getTransfers({
          aggs: {
            cumulative_volume: {
              date_histogram: {
                field: 'source.created_at.month',
                calendar_interval: 'month',
              },
              aggs: {
                volume: {
                  sum: {
                    field: 'source.value',
                  },
                },
                cumulative_volume: {
                  cumulative_sum: {
                    buckets_path: 'volume',
                  },
                },
              },
            },
          },
        })
        setCumulativeStats({
          ...response,
        })
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await getTransfers({
          query: {
            range: { 'source.created_at.ms': { gte: moment().subtract(NUM_STATS_DAYS, 'days').startOf('day').valueOf() } },
          },
          aggs: {
            stats: {
              terms: { field: 'source.created_at.day', size: 100 },
              aggs: {
                volume: {
                  sum: {
                    field: 'source.value',
                  },
                },
              },
            },
          },
        })
        setDailyStats({
          ...response,
        })
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await getTransfers({
          aggs: {
            source_chains: {
              terms: { field: 'source.original_sender_chain.keyword', size: 1000 },
              aggs: {
                destination_chains: {
                  terms: { field: 'source.original_recipient_chain.keyword', size: 1000 },
                  aggs: {
                    assets: {
                      terms: { field: 'source.denom.keyword', size: 1000 },
                      aggs: {
                        volume: {
                          sum: { field: 'source.value' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
        setTopPaths({
          ...response,
        })
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await getTransfers({
          aggs: {
            source_chains: {
              terms: { field: 'source.original_sender_chain.keyword', size: 1000 },
              aggs: {
                destination_chains: {
                  terms: { field: 'source.original_recipient_chain.keyword', size: 1000 },
                  aggs: {
                    volume: {
                      sum: { field: 'source.value' },
                    },
                  },
                },
              },
            },
          },
        })
        setTopChainPairs({
          ...response,
        })
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-8">
      <div className="lg:col-span-2">
        <LineChart
          id="cumulative_volume"
          title="Cumulative Volume"
          description="Cumulative transfers volume by month"
          date_format="MMM YYYY"
          timeframe="month"
          value_field="cumulative_volume"
          chart_data={cumulativeStats}
        />
      </div>
      <div className="lg:col-span-2">
        <BarChart
          id="total_transfers"
          title="Transfers"
          description="Number of transfers by month"
          date_format="MMM YYYY"
          timeframe="month"
          chart_data={cumulativeStats}
        />
      </div>
      <div className="lg:col-span-2">
        <LineChart
          id="daily_volumes"
          title={`${number_format(NUM_STATS_DAYS, '0,0')}-Day Volumes`}
          description={`The number of volumes transferred in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
          chart_data={dailyStats}
        />
      </div>
      <div className="lg:col-span-2">
        <BarChart
          id="daily_transfers"
          title={`${number_format(NUM_STATS_DAYS, '0,0')}-Day Transfers`}
          description={`The number of transfers in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
          chart_data={dailyStats}
        />
      </div>
      <TopPath
        title="Top Paths"
        description="Top transfers paths by volume"
        topData={topPaths}
        by="volume"
      />
      <TopChainPair
        title="Top Chain Pairs"
        description="Top transfers chain pairs by volume"
        topData={topChainPairs}
        by="volume"
      />
      <TopPath
        title="Top Paths"
        description="Top transfers paths by number of transfers"
        topData={topPaths}
        by="num_txs"
      />
      <TopChainPair
        title="Top Chain Pairs"
        description="Top transfers chain pairs by number of transfers"
        topData={topChainPairs}
        by="num_txs"
      />
      <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="normal-case text-base font-bold">
              TVL in {currency.toUpperCase()}
            </span>
          </div>
          <TvlTotal />
        </div>
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="normal-case text-base font-bold">
              TVL on AXELAR NETWORK
            </span>
          </div>
          <Tvl />
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-4 space-y-2 pt-1">
        <Link href="/transfers/search">
          <a className="flex items-center space-x-2">
            <FiCode size={20} />
            <span className="uppercase font-bold">
              Latest transfers
            </span>
          </a>
        </Link>
        <Transfers n={10} />
      </div>
    </div>
  )
}