import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import LineChart from './charts/line'
import BarChart from './charts/bar'
import TopPath from './top/path'
import TopChainPair from './top/chain-pair'
import { transfers_stats as getTransfersStats, transfers_chart as getTransfersChart, cumulative_volume as getCumulativeVolume } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { number_format, params_to_obj } from '../../lib/utils'

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

  const [cumulativeStats, setCumulativeStats] = useState(null)
  const [dailyStats, setDailyStats] = useState(null)
  const [topPaths, setTopPaths] = useState(null)
  const [topChainPairs, setTopChainPairs] = useState(null)
  const [filters, setFilters] = useState(null)

  useEffect(
    () => {
      if (evm_chains_data && cosmos_chains_data && assets_data && asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

        const {
          type,
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...params }

        setFilters(
          {
            type: ['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type?.toLowerCase()) ? type.toLowerCase() : undefined,
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
          const response = await getCumulativeVolume(filters)
          setCumulativeStats(response)
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
          setDailyStats(await getTransfersChart(filters))
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
          const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

          const {
            fromTime,
            toTime,
          } = { ...filters }

          const response =
            await getTransfersStats(
              {
                ...filters,
                fromTime: fromTime || moment().subtract(NUM_STATS_DAYS, 'days').unix(),
                toTime: toTime || moment().unix(),
              }
            )

          setTopPaths(
            {
              ...response,
              data:
                (response?.data || [])
                  .map(d => {
                    const {
                      asset,
                    } = { ...d }
                    let {
                      source_chain,
                      destination_chain,
                    } = { ...d }

                    source_chain = getChain(source_chain, chains_data)?.id || source_chain
                    destination_chain = getChain(destination_chain, chains_data)?.id || destination_chain

                    return {
                      ...d,
                      source_chain,
                      destination_chain,
                      id: `${source_chain}_${destination_chain}_${asset}`,
                    }
                  }),
            }
          )

          setTopChainPairs(
            {
              ...response,
              data:
                (response?.data || [])
                  .map(d => {
                    let {
                      source_chain,
                      destination_chain,
                    } = { ...d }

                    source_chain = getChain(source_chain, chains_data)?.id || source_chain
                    destination_chain = getChain(destination_chain, chains_data)?.id || destination_chain

                    return {
                      ...d,
                      source_chain,
                      destination_chain,
                      id: `${source_chain}_${destination_chain}`,
                    }
                  }),
            }
          )
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [evm_chains_data, cosmos_chains_data, filters],
  )

  const {
    fromTime,
    toTime,
  } = { ...filters }

  const time_filtered = !!(fromTime && toTime)

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 pb-4">
      <div className="lg:col-span-2">
        <LineChart
          id="cumulative_volume"
          title="Cumulative Volume"
          description="Cumulative transfer volume by month"
          date_format="MMM YYYY"
          timeframe="month"
          value_field="cumulative_volume"
          is_cumulative={true}
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
          title={`${time_filtered ? 'Daily' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day`} Volume`}
          description={`Sum of volume transferred${filters?.fromTime || filters?.toTime ? '' : ` in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}`}
          chart_data={dailyStats}
        />
      </div>
      <div className="lg:col-span-2">
        <BarChart
          id="daily_transfers"
          title={`${time_filtered ? 'Daily' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day`} Transfers`}
          description={`The number of transfers${filters?.fromTime || filters?.toTime ? '' : ` in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}`}
          chart_data={dailyStats}
        />
      </div>
      <TopPath
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Paths`}
        description="Top transfer paths by volume"
        topData={topPaths}
        by="volume"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopChainPair
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Chain Pairs`}
        description="Top transfer chain pairs by volume"
        topData={topChainPairs}
        by="volume"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopPath
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Paths`}
        description="Top transfer paths by number of transfers"
        topData={topPaths}
        by="num_txs"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopChainPair
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Chain Pairs`}
        description="Top transfer chain pairs by number of transfers"
        topData={topChainPairs}
        by="num_txs"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
    </div>
  )
}