'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'

import { getChains, getAssets, getITSAssets, getTokensPrice, getInflation, getNetworkParameters, getTVL } from '@/lib/api/axelarscan'
import { getContracts, getConfigurations } from '@/lib/api/gmp'
import { getValidators } from '@/lib/api/validator'

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
  setChains: data => set(state => ({ ...state, chains: data })),
  setAssets: data => set(state => ({ ...state, assets: data })),
  setITSAssets: data => set(state => ({ ...state, itsAssets: data })),
  setContracts: data => set(state => ({ ...state, contracts: data })),
  setConfigurations: data => set(state => ({ ...state, configurations: data })),
  setValidators: data => set(state => ({ ...state, validators: data })),
  setInflationData: data => set(state => ({ ...state, inflationData: data })),
  setNetworkParameters: data => set(state => ({ ...state, networkParameters: data })),
  setTVL: data => set(state => ({ ...state, tvl: data })),
}))

export function Global() {
  const { setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setInflationData, setNetworkParameters, setTVL } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      await Promise.all(['chains', 'assets', 'itsAssets', 'contracts', 'configurations', 'validators', 'inflationData', 'networkParameters', 'tvl'].map(k => new Promise(async resolve => {
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
          default:
            break
        }
        resolve()
      })))
    }
    getData()
  }, [setChains, setAssets, setITSAssets, setContracts, setConfigurations, setValidators, setInflationData, setNetworkParameters, setTVL])

  return null
}
