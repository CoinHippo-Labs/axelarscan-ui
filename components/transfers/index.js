import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { FiCode } from 'react-icons/fi'

import LineChart from './charts/line'
import BarChart from './charts/bar'
import TopPath from './top/path'
import TopChainPair from './top/chain-pair'
import Transfers from './transfers'
import { transfers as getTransfers, token_sents as getTokenSents } from '../../lib/api/index'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { currency } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const NUM_STATS_DAYS = 30

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(state =>
    (
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

  useEffect(() => {
    if (
      evm_chains_data &&
      cosmos_chains_data &&
      assets_data &&
      asPath
    ) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      const chains_data = _.concat(
        evm_chains_data,
        cosmos_chains_data,
      )

      const {
        sourceChain,
        destinationChain,
        asset,
        fromTime,
        toTime,
      } = { ...params }

      setFilters({
        sourceChain: getChain(
          sourceChain,
          chains_data,
        )?.id ||
          sourceChain,
        destinationChain: getChain(
          destinationChain,
          chains_data,
        )?.id ||
          destinationChain,
        asset: getAsset(
          asset,
          assets_data,
        )?.id ||
          asset,
        fromTime: fromTime &&
          moment(Number(fromTime)).unix(),
        toTime: toTime &&
          moment(Number(toTime)).unix(),
      })
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, asPath])

  useEffect(() => {
    const getData = async () => {
      if (filters) {
        const {
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...filters }

        const chains_data = _.concat(
          evm_chains_data,
          cosmos_chains_data,
        )

        const source_chain_data = getChain(
          sourceChain,
          chains_data,
        )
        const {
          chain_id,
        } = { ...source_chain_data }

        const asset_data = getAsset(
          asset,
          assets_data,
        )
        const {
          contracts,
          ibc,
        } = { ...asset_data }
        let {
          symbol,
        } = { ...asset_data }

        if (source_chain_data) {
          symbol =
            contracts?.find(c =>
              c?.chain_id === chain_id
            )?.symbol ||
            ibc?.find(c =>
              c?.original_chain_id === sourceChain ||
              c?.chain_id === sourceChain
            )?.symbol ||
            symbol
        }

        let response

        let _response = await getTransfers(
          {
            query: {
              bool: {
                must: [
                  { exists: { field: 'confirm_deposit' } },
                  sourceChain &&
                  { match: { 'source.original_sender_chain': sourceChain } },
                  destinationChain &&
                  { match: { 'source.original_recipient_chain': destinationChain } },
                  asset &&
                  { match: { 'source.denom': asset } },
                  fromTime &&
                  toTime &&
                  { range: { 'source.created_at.ms': { gte: fromTime * 1000, lte: toTime * 1000 } } },
                ]
                .filter(m => m),
              },
            },
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
          },
        )

        response = {
          ..._response,
        }

        _response = await getTokenSents(
          {
            query: {
              bool: {
                must: [
                  sourceChain &&
                  { match: { 'event.chain': sourceChain } },
                  destinationChain &&
                  { match: { 'event.returnValues.destinationChain': destinationChain } },
                  symbol &&
                  { match: { 'event.returnValues.symbol': symbol } },
                  fromTime &&
                  toTime &&
                  { range: { 'event.created_at.ms': { gte: fromTime, lte: toTime } } },
                ]
                .filter(m => m),
              },
            },
            aggs: {
              cumulative_volume: {
                date_histogram: {
                  field: 'event.created_at.month',
                  calendar_interval: 'month',
                },
                aggs: {
                  volume: {
                    sum: {
                      field: 'event.value',
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
          },
        )

        response = {
          ...response,
          data:
            Object.entries(
              _.groupBy(
                _.concat(
                  response.data || [],
                  _response?.data || [],
                ),
                'timestamp',
              )
            )
            .map(([k, v]) => {
              return {
                ..._.head(v),
                volume: _.sumBy(
                  v,
                  'volume',
                ),
                cumulative_volume: _.sumBy(
                  v,
                  'cumulative_volume',
                ),
                num_txs: _.sumBy(
                  v,
                  'num_txs',
                ),
              }
            }),
          total: (response.total || 0) + _response?.total,
        }

        setCumulativeStats(response)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [filters])

  useEffect(() => {
    const getData = async () => {
      if (filters) {
        const {
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...filters }

        const chains_data = _.concat(
          evm_chains_data,
          cosmos_chains_data,
        )

        const source_chain_data = getChain(
          sourceChain,
          chains_data,
        )
        const {
          chain_id,
        } = { ...source_chain_data }

        const asset_data = getAsset(
          asset,
          assets_data,
        )
        const {
          contracts,
          ibc,
        } = { ...asset_data }
        let {
          symbol,
        } = { ...asset_data }

        if (source_chain_data) {
          symbol =
            contracts?.find(c =>
              c?.chain_id === chain_id
            )?.symbol ||
            ibc?.find(c =>
              c?.original_chain_id === sourceChain ||
              c?.chain_id === sourceChain
            )?.symbol ||
            symbol
        }

        let response

        let _response = await getTransfers(
          {
            query: {
              bool: {
                must: [
                  { exists: { field: 'confirm_deposit' } },
                  sourceChain &&
                  { match: { 'source.original_sender_chain': sourceChain } },
                  destinationChain &&
                  { match: { 'source.original_recipient_chain': destinationChain } },
                  asset &&
                  { match: { 'source.denom': asset } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'source.created_at.ms': { gte: fromTime * 1000, lte: toTime * 1000 } } }
                  ) ||
                  {
                    range: {
                      'source.created_at.ms': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .valueOf(),
                      }
                    },
                  },
                ]
                .filter(m => m),
              },
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
          }
        )

        response = {
          ..._response,
        }

        _response = await getTokenSents(
          {
            query: {
              bool: {
                must: [
                  sourceChain &&
                  { match: { 'event.chain': sourceChain } },
                  destinationChain &&
                  { match: { 'event.returnValues.destinationChain': destinationChain } },
                  symbol &&
                  { match: { 'event.returnValues.symbol': symbol } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'event.created_at.ms': { gte: fromTime, lte: toTime } } }
                  ) ||
                  {
                    range: {
                      'event.block_timestamp': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .unix(),
                      },
                    },
                  },
                ]
                .filter(m => m),
              },
            },
            aggs: {
              stats: {
                terms: { field: 'event.created_at.day', size: 100 },
                aggs: {
                  volume: {
                    sum: {
                      field: 'event.value',
                    },
                  },
                },
              },
            },
          }
        )

        response = {
          ...response,
          data:
          Object.entries(
            _.groupBy(
              _.concat(
                response.data || [],
                _response?.data || [],
              ),
              'timestamp',
            )
          )
          .map(([k, v]) => {
            return {
              ..._.head(v),
              volume: _.sumBy(
                v,
                'volume',
              ),
              num_txs: _.sumBy(
                v,
                'num_txs',
              ),
            }
          }),
          total: (response.total || 0) + _response?.total,
        }

        setDailyStats(response)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [filters])

  useEffect(() => {
    const getData = async () => {
      if (
        evm_chains_data &&
        cosmos_chains_data &&
        filters
      ) {
        const {
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...filters }

        const chains_data = _.concat(
          evm_chains_data,
          cosmos_chains_data,
        )

        const source_chain_data = getChain(
          sourceChain,
          chains_data,
        )
        const {
          chain_id,
        } = { ...source_chain_data }

        const asset_data = getAsset(
          asset,
          assets_data,
        )
        const {
          contracts,
          ibc,
        } = { ...asset_data }
        let {
          symbol,
        } = { ...asset_data }

        if (source_chain_data) {
          symbol =
            contracts?.find(c =>
              c?.chain_id === chain_id
            )?.symbol ||
            ibc?.find(c =>
              c?.original_chain_id === sourceChain ||
              c?.chain_id === sourceChain
            )?.symbol ||
            symbol
        }

        let response

        let _response = await getTransfers(
          {
            query: {
              bool: {
                must: [
                  { exists: { field: 'confirm_deposit' } },
                  sourceChain &&
                  { match: { 'source.original_sender_chain': sourceChain } },
                  destinationChain &&
                  { match: { 'source.original_recipient_chain': destinationChain } },
                  asset &&
                  { match: { 'source.denom': asset } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'source.created_at.ms': { gte: fromTime * 1000, lte: toTime * 1000 } } }
                  ) ||
                  {
                    range: {
                      'source.created_at.ms': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .valueOf(),
                      }
                    },
                  },
                ]
                .filter(m => m),
              },
            },
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
          },
        )

        response = {
          ..._response,
        }

        _response = await getTokenSents(
          {
            query: {
              bool: {
                must: [
                  sourceChain &&
                  { match: { 'event.chain': sourceChain } },
                  destinationChain &&
                  { match: { 'event.returnValues.destinationChain': destinationChain } },
                  symbol &&
                  { match: { 'event.returnValues.symbol': symbol } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'event.created_at.ms': { gte: fromTime, lte: toTime } } }
                  ) ||
                  {
                    range: {
                      'event.block_timestamp': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .unix(),
                      },
                    },
                  },
                ]
                .filter(m => m),
              },
            },
            aggs: {
              source_chains: {
                terms: { field: 'event.chain.keyword', size: 1000 },
                aggs: {
                  destination_chains: {
                    terms: { field: 'event.returnValues.destinationChain.keyword', size: 1000 },
                    aggs: {
                      assets: {
                        terms: { field: 'event.denom.keyword', size: 1000 },
                        aggs: {
                          volume: {
                            sum: { field: 'event.value' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        )

        response = {
          ...response,
          data:
            Object.entries(
              _.groupBy(
                _.concat(
                  response.data || [],
                  _response?.data || [],
                )
                .map(d => {
                  const {
                    asset,
                  } = { ...d }
                  let {
                    source_chain,
                    destination_chain,
                  } = { ...d }

                  source_chain = getChain(
                    source_chain,
                    chains_data,
                  )?.id ||
                    source_chain

                  destination_chain = getChain(
                    destination_chain,
                    chains_data,
                  )?.id ||
                    destination_chain

                  return {
                    ...d,
                    source_chain,
                    destination_chain,
                    id: `${source_chain}_${destination_chain}_${asset}`,
                  }
                }),
                'id',
              )
            )
            .map(([k, v]) => {
              return {
                ..._.head(v),
                volume: _.sumBy(
                  v,
                  'volume',
                ),
                num_txs: _.sumBy(
                  v,
                  'num_txs',
                ),
              }
            }),
          total: (response.total || 0) + _response?.total,
        }

        setTopPaths(response)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [evm_chains_data, cosmos_chains_data, filters])

  useEffect(() => {
    const getData = async () => {
      if (
        evm_chains_data &&
        cosmos_chains_data &&
        filters
      ) {
        const {
          sourceChain,
          destinationChain,
          asset,
          fromTime,
          toTime,
        } = { ...filters }

        const chains_data = _.concat(
          evm_chains_data,
          cosmos_chains_data,
        )

        const source_chain_data = getChain(
          sourceChain,
          chains_data,
        )
        const {
          chain_id,
        } = { ...source_chain_data }

        const asset_data = getAsset(
          asset,
          assets_data,
        )
        const {
          contracts,
          ibc,
        } = { ...asset_data }
        let {
          symbol,
        } = { ...asset_data }

        if (source_chain_data) {
          symbol =
            contracts?.find(c =>
              c?.chain_id === chain_id
            )?.symbol ||
            ibc?.find(c =>
              c?.original_chain_id === sourceChain ||
              c?.chain_id === sourceChain
            )?.symbol ||
            symbol
        }

        let response

        let _response = await getTransfers(
          {
            query: {
              bool: {
                must: [
                  { exists: { field: 'confirm_deposit' } },
                  sourceChain &&
                  { match: { 'source.original_sender_chain': sourceChain } },
                  destinationChain &&
                  { match: { 'source.original_recipient_chain': destinationChain } },
                  asset &&
                  { match: { 'source.denom': asset } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'source.created_at.ms': { gte: fromTime * 1000, lte: toTime * 1000 } } }
                  ) ||
                  {
                    range: {
                      'source.created_at.ms': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .valueOf(),
                      }
                    },
                  },
                ]
                .filter(m => m),
              },
            },
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
          }
        )

        response = {
          ..._response,
        }

        _response = await getTokenSents(
          {
            query: {
              bool: {
                must: [
                  sourceChain &&
                  { match: { 'event.chain': sourceChain } },
                  destinationChain &&
                  { match: { 'event.returnValues.destinationChain': destinationChain } },
                  symbol &&
                  { match: { 'event.returnValues.symbol': symbol } },
                  (
                    fromTime &&
                    toTime &&
                    { range: { 'event.created_at.ms': { gte: fromTime, lte: toTime } } }
                  ) ||
                  {
                    range: {
                      'event.block_timestamp': {
                        gte: moment()
                          .subtract(
                            NUM_STATS_DAYS,
                            'days',
                          )
                          .startOf('day')
                          .unix(),
                      },
                    },
                  },
                ]
                .filter(m => m),
              },
            },
            aggs: {
              source_chains: {
                terms: { field: 'event.chain.keyword', size: 1000 },
                aggs: {
                  destination_chains: {
                    terms: { field: 'event.returnValues.destinationChain.keyword', size: 1000 },
                    aggs: {
                      volume: {
                        sum: { field: 'event.value' },
                      },
                    },
                  },
                },
              },
            },
          }
        )

        response = {
          ...response,
          data:
            Object.entries(
              _.groupBy(
                _.concat(
                  response.data || [],
                  _response?.data || [],
                )
                .map(d => {
                  let {
                    source_chain,
                    destination_chain,
                  } = { ...d }

                  source_chain = getChain(
                    source_chain,
                    chains_data,
                  )?.id ||
                    source_chain

                  destination_chain = getChain(
                    destination_chain,
                    chains_data,
                  )?.id ||
                    destination_chain

                  return {
                    ...d,
                    source_chain,
                    destination_chain,
                    id: `${source_chain}_${destination_chain}`,
                  }
                }),
                'id',
              )
            )
            .map(([k, v]) => {
              return {
                ..._.head(v),
                volume: _.sumBy(
                  v,
                  'volume',
                ),
                num_txs: _.sumBy(
                  v,
                  'num_txs',
                ),
              }
            }),
          total: (response.total || 0) + _response?.total,
        }

        setTopChainPairs(response)
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [evm_chains_data, cosmos_chains_data, filters])

  const {
    fromTime,
    toTime,
  } = { ...filters }

  const time_filtered =
    !!(
      fromTime &&
      toTime
    )

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 pb-4">
      <div className="lg:col-span-2">
        <LineChart
          id="cumulative_volume"
          title="Cumulative Volume"
          description="Cumulative transfers volume by month"
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
          title={`${time_filtered ? 'Daily' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day`} Volumes`}
          description={`The number of volumes transferred in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
          chart_data={dailyStats}
        />
      </div>
      <div className="lg:col-span-2">
        <BarChart
          id="daily_transfers"
          title={`${time_filtered ? 'Daily' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day`} Transfers`}
          description={`The number of transfers in the past ${number_format(NUM_STATS_DAYS, '0,0')} days`}
          chart_data={dailyStats}
        />
      </div>
      <TopPath
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Paths`}
        description="Top transfers paths by volume"
        topData={topPaths}
        by="volume"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopChainPair
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Chain Pairs`}
        description="Top transfers chain pairs by volume"
        topData={topChainPairs}
        by="volume"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopPath
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Paths`}
        description="Top transfers paths by number of transfers"
        topData={topPaths}
        by="num_txs"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <TopChainPair
        title={`${time_filtered ? '' : `${number_format(NUM_STATS_DAYS, '0,0')}-Day `}Top Chain Pairs`}
        description="Top transfers chain pairs by number of transfers"
        topData={topChainPairs}
        by="num_txs"
        num_days={NUM_STATS_DAYS}
        filters={filters}
      />
      <div className="sm:col-span-2 lg:col-span-4 space-y-2 pt-1">
        <Link href="/transfers/search">
          <a className="flex items-center space-x-2">
            <FiCode
              size={20}
            />
            <span className="uppercase font-bold">
              Latest transfers
            </span>
          </a>
        </Link>
        <Transfers
          n={10}
        />
      </div>
    </div>
  )
}