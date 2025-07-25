'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import moment from 'moment'

import { getChains, getAssets, getITSAssets, getTokensPrice, getInflation, getNetworkParameters, getTVL } from '@/lib/api/axelarscan'
import { getValidators, getVerifiers } from '@/lib/api/validator'
import { transfersStats, transfersChart, transfersTotalVolume, transfersTopUsers } from '@/lib/api/token-transfer'
import { getContracts, getConfigurations, GMPStatsByChains, GMPStatsByContracts, GMPChart, GMPTotalVolume, GMPTopUsers, GMPTopITSAssets } from '@/lib/api/gmp'
import { ENVIRONMENT } from '@/lib/config'
import { toArray } from '@/lib/parser'

export const useGlobalStore = create()(set => ({
  chains: null,
  assets: null,
  itsAssets: null,
  contracts: null,
  configurations: null,
  validators: null,
  verifiers: null,
  verifiersByChain: null,
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
  setVerifiers: data => set(state => ({ ...state, verifiers: data })),
  setVerifiersByChain: data => set(state => ({ ...state, verifiersByChain: data })),
  setInflationData: data => set(state => ({ ...state, inflationData: data })),
  setNetworkParameters: data => set(state => ({ ...state, networkParameters: data })),
  setTVL: data => set(state => ({ ...state, tvl: data })),
  setStats: data => set(state => ({ ...state, stats: data })),
}))

export function Global() {
  const { setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setVerifiers, setVerifiersByChain, setInflationData, setNetworkParameters, setTVL, setStats } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      await Promise.all(['chains', 'assets', 'itsAssets', 'contracts', 'configurations', 'validators', 'verifiers', 'inflationData', 'networkParameters', 'tvl', 'stats'].map(k => new Promise(async resolve => {
        switch (k) {
          case 'chains':
            let chains = await getChains()

            if (chains) {
              // filter amplifier chains
              chains = chains.filter(d => d.chain_type !== 'vm' || d.voting_verifier?.address || ['devnet-amplifier'].includes(ENVIRONMENT))
            }

            setChains(chains)
            break
          case 'assets':
            const assets = await getAssets()

            if (assets) {
              // get tokens price
              for (const [k, v] of Object.entries({ ...await getTokensPrice({ symbols: assets.map(d => d.id) }) })) {
                const i = assets.findIndex(d => d.id === k)

                if (i > -1 && !assets[i].price) {
                  assets[i].price = v.price
                }
              }
            }

            setAssets(assets)
            break
          case 'itsAssets':
            const itsAssets = await getITSAssets()

            if (itsAssets) {
              // get tokens price
              for (const [k, v] of Object.entries({ ...await getTokensPrice({ symbols: itsAssets.map(d => d.symbol) }) })) {
                const i = itsAssets.findIndex(d => d.symbol === k)

                if (i > -1 && !itsAssets[i].price) {
                  itsAssets[i].price = v.price
                }
              }
            }

            setITSAssets(itsAssets)
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
          case 'verifiers':
            const { data, verifiersByChain } = { ...await getVerifiers() }

            setVerifiers(data)
            setVerifiersByChain(verifiersByChain)
            break
          case 'inflationData':
            setInflationData(await getInflation())
            break
          case 'networkParameters':
            setNetworkParameters(await getNetworkParameters())
            break
          case 'tvl':
            setTVL(ENVIRONMENT === 'mainnet' ? await getTVL() : {})
            break
          case 'stats':
            const metrics = [
              'GMPStatsByChains', 'GMPStatsByContracts', 'GMPChart', 'GMPTotalVolume', 'GMPTopUsers', 'GMPTopITSUsers', 'GMPTopITSUsersByVolume', 'GMPTopITSAssets', 'GMPTopITSAssetsByVolume',
              'transfersStats', 'transfersChart', 'transfersTotalVolume', 'transfersTopUsers', 'transfersTopUsersByVolume',
            ]

            setStats(Object.fromEntries(
              (await Promise.all(toArray(metrics.map(d => new Promise(async resolve => {
                switch (d) {
                  case 'GMPStatsByChains':
                    resolve([d, await GMPStatsByChains()])
                    break
                  case 'GMPStatsByContracts':
                    resolve([d, await GMPStatsByContracts()])
                    break
                  case 'GMPChart':
                    resolve([d, await GMPChart({ granularity: 'month' })])
                    break
                  case 'GMPTotalVolume':
                    resolve([d, await GMPTotalVolume()])
                    break
                  case 'GMPTopUsers':
                    resolve([d, await GMPTopUsers({ size: 100 })])
                    break
                  case 'GMPTopITSUsers':
                    resolve([d, await GMPTopUsers({ assetType: 'its', size: 100 })])
                    break
                  case 'GMPTopITSUsersByVolume':
                    resolve([d, await GMPTopUsers({ assetType: 'its', orderBy: 'volume', size: 100 })])
                    break
                  case 'GMPTopITSAssets':
                    resolve([d, await GMPTopITSAssets({ size: 100 })])
                    break
                  case 'GMPTopITSAssetsByVolume':
                    resolve([d, await GMPTopITSAssets({ orderBy: 'volume', size: 100 })])
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

                      // custom transfers chart by adding airdrops data
                      for (const airdrop of airdrops) {
                        const { date, chain, environment } = { ...airdrop }
                        let { fromTime, toTime } = { ...airdrop }

                        if (!fromTime) {
                          fromTime = moment(date, 'MM-DD-YYYY').startOf('month').unix()
                        }

                        if (!toTime) {
                          toTime = moment(date, 'MM-DD-YYYY').endOf('month').unix()
                        }

                        if (environment === ENVIRONMENT) {
                          const response = await transfersChart({ chain, fromTime, toTime, granularity: 'month' })

                          if (toArray(response?.data).length > 0) {
                            for (const v of response.data) {
                              if (v.timestamp && v.volume > 0) {
                                const i = value.data.findIndex(d => d.timestamp === v.timestamp)

                                if (i > -1 && value.data[i].volume >= v.volume) {
                                  value.data[i] = { ...value.data[i], volume: value.data[i].volume - v.volume }
                                }
                              }
                            }

                            values.push([d.replace('transfers', 'transfersAirdrop'), response])
                          }
                        }
                      }
                    }

                    resolve(values)
                    break
                  case 'transfersTotalVolume':
                    resolve([d, await transfersTotalVolume()])
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
              })))))
              .map(d => Array.isArray(d[0]) ? d : [d])
              .flatMap(d => d)
            ))
          default:
            break
        }
        resolve()
      })))
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setVerifiers, setVerifiersByChain, setInflationData, setNetworkParameters, setTVL, setStats])

  return
}
