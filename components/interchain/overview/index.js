import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import { useState, useEffect } from 'react'
import _ from 'lodash'
import moment from 'moment'

import Summary from './summary'
import Charts from './charts'
import Tops from './tops'
import TimeSpents from './time-spents'
import Spinner from '../../spinner'
import { GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, GMPTopUsers } from '../../../lib/api/gmp'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers, transfersTopUsers } from '../../../lib/api/transfers'
import { getAssetData } from '../../../lib/config'
import { toArray, getQueryParams, createMomentFromUnixtime } from '../../../lib/utils'

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

const getGranularity = (fromTime, toTime) => {
  if (fromTime) {
    const diff = createMomentFromUnixtime(toTime).diff(createMomentFromUnixtime(fromTime), 'days')
    if (diff >= 180) {
      return 'month'
    }
    else if (diff >= 60) {
      return 'week'
    }
    else {
      return 'day'
    }
  }
  return 'month'
}

export default () => {
  const { assets } = useSelector(state => ({ assets: state.assets }), shallowEqual)
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { asPath } = { ...router }

  const [data, setData] = useState(null)
  const [timeSpentData, setTimeSpentData] = useState(null)
  const [filters, setFilters] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)

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
        if (assets_data && filters && (!is_interval || !fetching)) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [assets_data, filters],
  )

  useEffect(
    () => {
      const metrics = ['GMPStats'/*, 'GMPStatsAVGTimes'*/, 'GMPChart', 'GMPTotalVolume', 'GMPTotalFee', 'GMPTotalActiveUsers', 'GMPTopUsers', 'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTotalFee', 'transfersTotalActiveUsers', 'transfersTopUsers', 'transfersTopUsersByVolume']

      const getGMPStatsAVGTimes = async params => {
        const { filters, symbol } = { ...params }
        setTimeSpentData({
          ...timeSpentData,
          [generateFiltersKey(filters)]: { GMPStatsAVGTimes: types.includes('gmp') && await GMPStats({ ...filters, symbol, avg_times: true }) },
        })
      }

      const getData = async () => {
        if (filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
            setTimeSpentData(null)
          }

          const { asset } = { ...filters }
          const symbol = _.uniq(toArray(toArray(asset).map(a => getAssetData(a, assets_data))).flatMap(a => _.uniq(toArray(_.concat(a.symbol, Object.values({ ...a.addresses }).map(_a => _a.symbol))))))

          getGMPStatsAVGTimes({ filters, symbol })
          setData({
            ...data,
            [generateFiltersKey(filters)]: Object.fromEntries(
              (await Promise.all(
                toArray(
                  metrics.map(m =>
                    new Promise(
                      async resolve => {
                        const isSearchITSOnTransfers = types.includes('token_transfers') && m.startsWith('transfers') && filters.assetType === 'its'
                        switch (m) {
                          case 'GMPStats':
                            resolve([m, types.includes('gmp') && await GMPStats({ ...filters, symbol })])
                            break
                          case 'GMPStatsAVGTimes':
                            resolve([m, types.includes('gmp') && await GMPStats({ ...filters, symbol, avg_times: true })])
                            break
                          case 'GMPChart':
                            resolve([m, types.includes('gmp') && await GMPChart({ ...filters, symbol, granularity })])
                            break
                          case 'GMPTotalVolume':
                            resolve([m, types.includes('gmp') && await GMPTotalVolume({ ...filters, symbol })])
                            break
                          case 'GMPTotalFee':
                            resolve([m, types.includes('gmp') && await GMPTotalFee({ ...filters, symbol })])
                            break
                          case 'GMPTotalActiveUsers':
                            resolve([m, types.includes('gmp') && await GMPTotalActiveUsers({ ...filters, symbol })])
                            break
                          case 'GMPTopUsers':
                            resolve([m, types.includes('gmp') && await GMPTopUsers({ ...filters, symbol, size: 100 })])
                            break
                          case 'transfersStats':
                            if (isSearchITSOnTransfers) resolve([m, { data: [] }])
                            else resolve([m, types.includes('token_transfers') && await transfersStats({ ...filters })])
                            break
                          case 'transfersChart':
                            if (isSearchITSOnTransfers) resolve([m, { data: [] }])
                            else {
                              let value = types.includes('token_transfers') && await transfersChart({ ...filters, granularity })
                              const values = [[m, value]]
                              if (value?.data && granularity === 'month') {
                                const airdrops = [
                                  { date: '08-01-2023', fromTime: undefined, toTime: undefined, chain: 'sei', environment: 'mainnet' },
                                ]

                                for (const airdrop of airdrops) {
                                  const { date, chain, environment } = { ...airdrop }
                                  let { fromTime, toTime } = { ...airdrop }
                                  fromTime = fromTime || moment(date).startOf('month').unix()
                                  toTime = toTime || moment(date).endOf('month').unix()

                                  if (ENVIRONMENT === environment && (!filters?.fromTime || Number(filters.fromTime) < fromTime) && (!filters?.toTime || Number(filters.toTime) > toTime)) {
                                    const _value = await transfersChart({ ...filters, chain, fromTime, toTime, granularity })
                                    if (toArray(_value?.data).length > 0) {
                                      for (const v of _value.data) {
                                        const { timestamp, volume } = { ...v }
                                        if (timestamp && volume > 0) {
                                          const index = value.data.findIndex(_v => _v.timestamp === timestamp)
                                          if (index > -1 && value.data[index].volume >= volume) {
                                            value.data[index] = { ...value.data[index], volume: value.data[index].volume - volume }
                                          }
                                        }
                                      }
                                      values.push([m.replace('transfers', 'transfersAirdrop'), _value])
                                    }
                                  }
                                }
                              }
                              resolve(values)
                            }
                            break
                          case 'transfersTotalVolume':
                            if (isSearchITSOnTransfers) resolve([m, 0])
                            else resolve([m, types.includes('token_transfers') && await transfersTotalVolume({ ...filters })])
                            break
                          case 'transfersTotalFee':
                            if (isSearchITSOnTransfers) resolve([m, 0])
                            else resolve([m, types.includes('token_transfers') && await transfersTotalFee({ ...filters })])
                            break
                          case 'transfersTotalActiveUsers':
                            if (isSearchITSOnTransfers) resolve([m, 0])
                            else resolve([m, types.includes('token_transfers') && await transfersTotalActiveUsers({ ...filters })])
                            break
                          case 'transfersTopUsers':
                            if (isSearchITSOnTransfers) resolve([m, { data: [] }])
                            else resolve([m, types.includes('token_transfers') && await transfersTopUsers({ ...filters, size: 100 })])
                            break
                          case 'transfersTopUsersByVolume':
                            if (isSearchITSOnTransfers) resolve([m, { data: [] }])
                            else resolve([m, types.includes('token_transfers') && await transfersTopUsers({ ...filters, orderBy: 'volume', size: 100 })])
                            break
                          default:
                            resolve()
                            break
                        }
                      }
                    )
                  )
                )
              ))
              .map(d => {
                if (Array.isArray(d)) {
                  if (Array.isArray(_.head(d))) {
                    return d
                  }
                }
                return [d]
              })
              .flatMap(d => d)
            ),
          })
          setFetching(false)
        }
      }
      getData()
    },
    [fetchTrigger],
  )

  const generateFiltersKey = filters => JSON.stringify(filters)

  const { transfersType, fromTime, toTime } = { ...filters }
  const types = toArray(transfersType || ['gmp', 'token_transfers'])
  const granularity = getGranularity(fromTime, toTime)
  const _data = data?.[generateFiltersKey(filters)]
  const _timeSpentData = timeSpentData?.[generateFiltersKey(filters)]

  return (
    <div>
      {_data ?
        <div className="space-y-6">
          <Summary data={_data} filters={filters} />
          <Charts data={_data} granularity={granularity} />
          <Tops data={_data} types={types} />
          {types.includes('gmp') && <TimeSpents data={_timeSpentData} />}
        </div> :
        <div className="loading-in-tab">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}