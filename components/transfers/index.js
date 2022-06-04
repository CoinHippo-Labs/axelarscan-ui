import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin, ThreeDots, Puff } from 'react-loader-spinner'
import { FiCode } from 'react-icons/fi'

import LineChart from './charts/line'
import BarChart from './charts/bar'
import Transfers from './transfers'
import { transfers as getTransfers } from '../../lib/api/index'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const [cumulativeVolume, setCumulativeVolume] = useState(null)

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
        setCumulativeVolume({ ...response })
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
    <div className="grid sm:grid-cols-2 gap-5">
      <LineChart
        title="Cumulative Volume"
        description="Cumulative transfers volume by month"
        chartData={cumulativeVolume}
      />
      <BarChart
        title="Transfers"
        description="Number of transfers by month"
        chartData={cumulativeVolume}
      />
      <div className="sm:col-span-2 space-y-2">
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