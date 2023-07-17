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
import { GMPStats, GMPChart, GMPTotalVolume, GMPTopUsers } from '../../../lib/api/gmp'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTopUsers } from '../../../lib/api/transfers'
import { getAssetData } from '../../../lib/config'
import { toArray, getQueryParams, createMomentFromUnixtime } from '../../../lib/utils'

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
        if (assets_data && filters) {
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
      const metrics = ['GMPStats', 'GMPStatsAVGTimes', 'GMPChart', 'GMPTotalVolume', 'GMPTopUsers', 'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTopUsers', 'transfersTopUsersByVolume']

      const getData = async () => {
        if (filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
          }

          const { asset } = { ...filters }
          const symbol = _.uniq(toArray(toArray(asset).map(a => getAssetData(a, assets_data))).flatMap(a => _.uniq(toArray(_.concat(a.symbol, Object.values({ ...a.addresses }).map(_a => _a.symbol))))))

          setData(
            Object.fromEntries(
              await Promise.all(
                toArray(
                  metrics.map(m =>
                    new Promise(
                      async resolve => {
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
                          case 'GMPTopUsers':
                            resolve([m, types.includes('gmp') && await GMPTopUsers({ ...filters, symbol })])
                            break
                          case 'transfersStats':
                            resolve([m, types.includes('token_transfers') && await transfersStats({ ...filters })])
                            break
                          case 'transfersChart':
                            resolve([m, types.includes('token_transfers') && await transfersChart({ ...filters, granularity })])
                            break
                          case 'transfersTotalVolume':
                            resolve([m, types.includes('token_transfers') && await transfersTotalVolume({ ...filters })])
                            break
                          case 'transfersTopUsers':
                            resolve([m, types.includes('token_transfers') && await transfersTopUsers({ ...filters })])
                            break
                          case 'transfersTopUsersByVolume':
                            resolve([m, types.includes('token_transfers') && await transfersTopUsers({ ...filters, orderBy: 'volume' })])
                            break
                          default:
                            resolve()
                            break
                        }
                      }
                    )
                  )
                )
              )
            )
          )
          setFetching(false)
        }
      }
      getData()
    },
    [fetchTrigger],
  )

  const { transfersType, fromTime, toTime } = { ...filters }
  const types = toArray(transfersType || ['gmp', 'token_transfers'])
  const granularity = getGranularity(fromTime, toTime)

  return (
    <div>
      {data ?
        <div className="space-y-6">
          <Summary data={data} filters={filters} />
          <Charts data={data} granularity={granularity} />
          <Tops data={data} types={types} />
          {types.includes('gmp') && <TimeSpents data={data} />}
        </div> :
        <div className="loading-in-tab">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}