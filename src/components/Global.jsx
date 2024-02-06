'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import moment from 'moment'

import { getChains, getAssets, getITSAssets, getTokensPrice, getInflation, getNetworkParameters, getTVL } from '@/lib/api/axelarscan'
import { getValidators } from '@/lib/api/validator'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTotalFee, transfersTotalActiveUsers, transfersTopUsers } from '@/lib/api/token-transfer'
import { getContracts, getConfigurations, GMPStats, GMPChart, GMPTotalVolume, GMPTotalFee, GMPTotalActiveUsers, GMPTopUsers } from '@/lib/api/gmp'
import { ENVIRONMENT } from '@/lib/config'
import { toArray } from '@/lib/parser'

export const useGlobalStore = create()(set => ({
  chains: null,
  assets: null,
  itsAssets: null,
  contracts: null,
  configurations: null,
  validators: null,
  inflationData: null,
  networkParameters: null,
  tvl: null,
  stats: null,
  setChains: data => set(state => ({ ...state, chains: data })),
  setAssets: data => set(state => ({ ...state, assets: data })),
  setITSAssets: data => set(state => ({ ...state, itsAssets: data })),
  setContracts: data => set(state => ({ ...state, contracts: data })),
  setConfigurations: data => set(state => ({ ...state, configurations: data })),
  setValidators: data => set(state => ({ ...state, validators: data })),
  setInflationData: data => set(state => ({ ...state, inflationData: data })),
  setNetworkParameters: data => set(state => ({ ...state, networkParameters: data })),
  setTVL: data => set(state => ({ ...state, tvl: data })),
  setStats: data => set(state => ({ ...state, stats: data })),
}))

export function Global() {
  const { setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setInflationData, setNetworkParameters, setTVL, setStats } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      await Promise.all(['chains', 'assets', 'itsAssets', 'contracts', 'configurations', 'validators', 'inflationData', 'networkParameters', 'tvl', 'stats'].map(k => new Promise(async resolve => {
        switch (k) {
          case 'chains':
            setChains(await getChains())
            break
          case 'assets':
            const assets = await getAssets()
            if (assets) {
              for (const [k, v] of Object.entries({ ...await getTokensPrice({ symbols: assets.map(d => d.id) }) })) {
                const i = assets.findIndex(d => d.id === k)
                if (i > -1) assets[i].price = assets[i].price || v.price
              }
            }
            setAssets(assets)
            break
          case 'itsAssets':
            setITSAssets(await getITSAssets())
            break
          case 'contracts':
            setContracts(await getContracts())
            break
          case 'configurations':
            setConfigurations(await getConfigurations())
            break
          case 'validators':
            setValidators((await getValidators())?.data)
            break
          case 'inflationData':
            setInflationData(await getInflation())
            break
          case 'networkParameters':
            setNetworkParameters(await getNetworkParameters())
            break
          case 'tvl':
            setTVL(await getTVL())
            break
          case 'stats':
            const metrics = ['GMPStats', 'GMPChart', 'GMPTotalVolume', 'GMPTotalFee', 'GMPTotalActiveUsers', 'GMPTopUsers', 'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTotalFee', 'transfersTotalActiveUsers', 'transfersTopUsers', 'transfersTopUsersByVolume']
            setStats(Object.fromEntries((await Promise.all(toArray(metrics.map(d => new Promise(async resolve => {
              switch (d) {
                case 'GMPStats':
                  resolve([d, await GMPStats()])
                  break
                case 'GMPChart':
                  resolve([d, await GMPChart({ granularity: 'month' })])
                  break
                case 'GMPTotalVolume':
                  resolve([d, await GMPTotalVolume()])
                  break
                case 'GMPTotalFee':
                  resolve([d, await GMPTotalFee()])
                  break
                case 'GMPTotalActiveUsers':
                  resolve([d, await GMPTotalActiveUsers()])
                  break
                case 'GMPTopUsers':
                  resolve([d, await GMPTopUsers({ size: 100 })])
                  break
                case 'transfersStats':
                  resolve([d, await transfersStats()])
                  break
                case 'transfersChart':
                  let value = await transfersChart({ granularity: 'month' })
                  const values = [[d, value]]

                  if (value?.data) {
                    const airdrops = [
                      { date: '08-01-2023', fromTime: undefined, toTime: undefined, chain: 'sei', environment: 'mainnet' },
                    ]

                    for (const airdrop of airdrops) {
                      const { date, chain, environment } = { ...airdrop }
                      let { fromTime, toTime } = { ...airdrop }
                      fromTime = fromTime || moment(date).startOf('month').unix()
                      toTime = toTime || moment(date).endOf('month').unix()

                      if (environment === ENVIRONMENT) {
                        const _value = await transfersChart({ chain, fromTime, toTime, granularity: 'month' })

                        if (toArray(_value?.data).length > 0) {
                          for (const v of _value.data) {
                            if (v.timestamp && v.volume > 0) {
                              const index = value.data.findIndex(_v => _v.timestamp === v.timestamp)
                              if (index > -1 && value.data[index].volume >= v.volume) {
                                value.data[index] = { ...value.data[index], volume: value.data[index].volume - v.volume }
                              }
                            }
                          }
                          values.push([d.replace('transfers', 'transfersAirdrop'), _value])
                        }
                      }
                    }
                  }

                  resolve(values)
                  break
                case 'transfersTotalVolume':
                  resolve([d, await transfersTotalVolume()])
                  break
                case 'transfersTotalFee':
                  resolve([d, await transfersTotalFee()])
                  break
                case 'transfersTotalActiveUsers':
                  resolve([d, await transfersTotalActiveUsers()])
                  break
                case 'transfersTopUsers':
                  resolve([d, await transfersTopUsers({ size: 100 })])
                  break
                case 'transfersTopUsersByVolume':
                  resolve([d, await transfersTopUsers({ orderBy: 'volume', size: 100 })])
                  break
                default:
                  resolve()
                  break
              }
            }))))).map(d => Array.isArray(_.head(d)) ? d : [d]).flatMap(d => d)))
          default:
            break
        }
        resolve()
      })))
    }

    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setInflationData, setNetworkParameters, setTVL, setStats])

  return null
}
