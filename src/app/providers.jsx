'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import TagManager from 'react-gtm-module'
import { QueryClientProvider } from '@tanstack/react-query'
import { useWeb3ModalTheme } from '@web3modal/wagmi/react'
import { create } from 'zustand'

import WagmiConfigProvider from '@/lib/provider/WagmiConfigProvider'
import { queryClient } from '@/lib/provider/wagmi'
import { getChains, getAssets, getTokensPrice, getTVL } from '@/lib/api/axelarscan'
import { getContracts, getConfigurations } from '@/lib/api/gmp'
import { getValidators } from '@/lib/api/validator'
import * as ga from '@/lib/ga'

function ThemeWatcher() {
  const { resolvedTheme, setTheme } = useTheme()
  const { setThemeMode } = useWeb3ModalTheme()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function onMediaChange() {
      const systemTheme = media.matches ? 'dark' : 'light'
      if (resolvedTheme === systemTheme) {
        setTheme('system')
      }
      setThemeMode(resolvedTheme)
    }

    onMediaChange()
    media.addEventListener('change', onMediaChange)

    return () => {
      media.removeEventListener('change', onMediaChange)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export const useGlobalStore = create()(set => ({
  chains: null,
  assets: null,
  contracts: null,
  configurations: null,
  validators: null,
  tvl: null,
  setChains: data => set(state => ({ ...state, chains: data })),
  setAssets: data => set(state => ({ ...state, assets: data })),
  setContracts: data => set(state => ({ ...state, contracts: data })),
  setConfigurations: data => set(state => ({ ...state, configurations: data })),
  setValidators: data => set(state => ({ ...state, validators: data })),
  setTVL: data => set(state => ({ ...state, tvl: data })),
}))

const GlobalLoader = () => {
  const { setChains, setAssets, setContracts, setConfigurations, setValidators, setTVL } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      await Promise.all(['chains', 'assets', 'contracts', 'configurations', 'validators', 'tvl'].map(k => new Promise(async resolve => {
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
          case 'contracts':
            setContracts(await getContracts())
            break
          case 'configurations':
            setConfigurations(await getConfigurations())
            break
          case 'validators':
            setValidators(await getValidators())
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
  }, [setChains, setAssets, setContracts, setConfigurations, setValidators, setTVL])

  return null
}

export function Providers({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [rendered, setRendered] = useState(false)
  const [tagManagerInitiated, setTagManagerInitiated] = useState(false)
  const [client] = useState(() => queryClient)

  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GTM_ID && rendered && !tagManagerInitiated) {
      TagManager.initialize({ gtmId: process.env.NEXT_PUBLIC_GTM_ID })
      setTagManagerInitiated(true)
    }
  }, [rendered, tagManagerInitiated, setTagManagerInitiated])

  useEffect(() => {
    if (pathname && searchParams) {
      const qs = searchParams.toString()
      ga.pageview(`${pathname}${qs ? `?${qs}` : ''}`)
    }
  }, [pathname, searchParams])

  return (
    <ThemeProvider attribute="class" disableTransitionOnChange>
      <ThemeWatcher />
      <GlobalLoader />
      <QueryClientProvider client={client}>
        <WagmiConfigProvider>
          {children}
        </WagmiConfigProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
