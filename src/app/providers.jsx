'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import TagManager from 'react-gtm-module'
import { QueryClientProvider } from '@tanstack/react-query'
import { create } from 'zustand'

import WagmiConfigProvider from '@/lib/provider/WagmiConfigProvider'
import { queryClient } from '@/lib/provider/wagmi'
import { getChains, getAssets, getContracts } from '@/lib/api/axelarscan'
import * as ga from '@/lib/ga'

function ThemeWatcher() {
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function onMediaChange() {
      const systemTheme = media.matches ? 'dark' : 'light'
      if (resolvedTheme === systemTheme) {
        setTheme('system')
      }
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
  setChains: data => set(state => ({ ...state, chains: data })),
  setAssets: data => set(state => ({ ...state, assets: data })),
  setContracts: data => set(state => ({ ...state, contracts: data })),
}))

export const useNameServicesStore = create()(set => ({
  ens: null,
  lens: null,
  spaceID: null,
  unstoppable: null,
  setENS: data => set(state => ({ ...state, ens: { ...state.ens, ...data } })),
  setLENS: data => set(state => ({ ...state, lens: { ...state.lens, ...data } })),
  setSpaceID: data => set(state => ({ ...state, spaceID: { ...state.spaceID, ...data } })),
  setUnstoppable: data => set(state => ({ ...state, unstoppable: { ...state.unstoppable, ...data } })),
}))

const GlobalLoader = () => {
  const { setChains, setAssets, setContracts } = useGlobalStore()

  useEffect(() => {
    const getData = async () => {
      await Promise.all(['chains', 'assets', 'contracts'].map(k => new Promise(async resolve => {
        switch (k) {
          case 'chains':
            setChains(await getChains())
            break
          case 'assets':
            setAssets(await getAssets())
            break
          case 'contracts':
            setContracts(await getContracts())
            break
          default:
            break
        }
        resolve()
      })))
    }
    getData()
  }, [setChains, setAssets, setContracts])

  return null
}

export function Providers({ children }) {
  const router = useRouter()
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
  }, [rendered, tagManagerInitiated])

  useEffect(() => {
    const handleRouteChange = url => ga.pageview(url)
    if (router.events) {
      router.events.on('routeChangeComplete', handleRouteChange)
      return () => router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

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
