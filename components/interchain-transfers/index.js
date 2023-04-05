import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { ProgressBar } from 'react-loader-spinner'

import BarChart from '../transfers/charts/bar'
import { transfers as searchTransfers, transfers_chart as getTransfersChart, cumulative_volume as getCumulativeVolume } from '../../lib/api/transfer'
import { search as searchGMP, chart as getGMPChart } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
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

        const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

        const {
          sourceChain,
          destinationChain,
          asset,
        } = { ...params }

        setFilters(
          {
            sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
            destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
            asset: getAsset(asset, assets_data)?.id || asset,
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
          const response = await searchGMP({ ...filters, size: 0 })

          const {
            total,
          } = { ...response }

          if (typeof total === 'number' || gmpsCumulative === null) {
            setGmpsCumulative(total || 0)
          }
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
          const response = await getGMPChart({ ...filters, fromTime: moment().subtract(NUM_STATS_MONTHS, 'months').utc().startOf('month').unix(), granularity: 'month' })

          const {
            data,
          } = { ...response }

          setGmpsMonthly({ ...response, data: _.slice(data, data?.length > NUM_STATS_MONTHS ? data.length - NUM_STATS_MONTHS - 1 : 0) })
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
          setGmpsDaily(await getGMPChart({ ...filters, fromTime: moment().subtract(NUM_STATS_DAYS, 'days').utc().startOf('day').unix() }))
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
          const response = await searchTransfers({ ...filters, size: 0 })

          const {
            total,
          } = { ...response }

          if (typeof total === 'number' || transfersCumulative === null) {
            setTransfersCumulative(total || 0)
          }
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
          setTransfersMonthly(await getCumulativeVolume({ ...filters, fromTime: moment().subtract(NUM_STATS_MONTHS, 'months').utc().startOf('month').unix() }))
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
          setTransfersDaily(await getTransfersChart({ ...filters, fromTime: moment().subtract(NUM_STATS_DAYS, 'days').utc().startOf('day').unix() }))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [filters],
  )

  return (
    <div className="grid lg:grid-cols-2 gap-5 pt-2 pb-4">
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-semibold">
            General Message Passing
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-slate-400 dark:text-slate-200 text-sm font-medium">
              Total cumulative lifetime:
            </span>
            {typeof gmpsCumulative === 'number' ?
              <span className="text-sm font-semibold">
                {number_format(gmpsCumulative, '0,0')}
              </span> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="20"
                height="20"
              />
            }
          </div>
        </div>
        <div>
          <BarChart
            id="monthly_gmps"
            title={`GMP Transfers (over last ${number_format(NUM_STATS_MONTHS, '0,0')} months)`}
            description="Number of transfers by month"
            date_format="MMM YYYY"
            timeframe="month"
            chart_data={gmpsMonthly}
          />
        </div>
        <div>
          <BarChart
            id="daily_gmps"
            title={`GMP Transfers (over last ${number_format(NUM_STATS_DAYS, '0,0')} days)`}
            description={`The number of transfers in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
            chart_data={gmpsDaily}
          />
        </div>
      </div>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-semibold">
            Token Transfers
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-slate-400 dark:text-slate-200 text-sm font-medium">
              Total cumulative lifetime:
            </span>
            {typeof transfersCumulative === 'number' ?
              <span className="text-sm font-semibold">
                {number_format(transfersCumulative, '0,0')}
              </span> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="20"
                height="20"
              />
            }
          </div>
        </div>
        <div>
          <BarChart
            id="monthly_transfers"
            title={`Token Transfers (over last ${number_format(NUM_STATS_MONTHS, '0,0')} months)`}
            description="Number of transfers by month"
            date_format="MMM YYYY"
            timeframe="month"
            chart_data={transfersMonthly}
          />
        </div>
        <div>
          <BarChart
            id="daily_transfers"
            title={`Token Transfers (over last ${number_format(NUM_STATS_DAYS, '0,0')} days)`}
            description={`The number of transfers in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
            chart_data={transfersDaily}
          />
        </div>
      </div>
    </div>
  )
}