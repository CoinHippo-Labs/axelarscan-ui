'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeProvider, useTheme } from 'next-themes'
import TagManager from 'react-gtm-module'
import { IntercomProvider } from 'react-use-intercom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAppKitTheme } from '@reown/appkit/react'
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { WalletProvider as XRPLWalletProvider } from '@xrpl-wallet-standard/react'
import { CrossmarkWallet } from '@xrpl-wallet-adapter/crossmark'
import { LedgerWallet } from '@xrpl-wallet-adapter/ledger'
import { WalletConnectWallet as XRPLWalletConnectWallet } from '@xrpl-wallet-adapter/walletconnect'

import { Global } from '@/components/Global'
import WagmiConfigProvider from '@/lib/provider/WagmiConfigProvider'
import { queryClient, xrplConfig } from '@/lib/provider/wagmi'
import * as ga from '@/lib/ga'
import { ENVIRONMENT } from '@/lib/config'

function ThemeWatcher() {
  const { resolvedTheme, setTheme } = useTheme()
  const { setThemeMode } = useAppKitTheme()

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
    return () => media.removeEventListener('change', onMediaChange)
  }, [resolvedTheme, setTheme, setThemeMode])

  return
}

export function Providers({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [rendered, setRendered] = useState(false)
  const [tagManagerInitiated, setTagManagerInitiated] = useState(false)
  const [xrplRegisterWallets, setXRPLlRegisterWallets] = useState(null)
  const [client] = useState(() => queryClient)

  useEffect(() => {
    setRendered(true)
  }, [])

  // google tag manager
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GTM_ID && rendered && !tagManagerInitiated) {
      TagManager.initialize({ gtmId: process.env.NEXT_PUBLIC_GTM_ID })
      setTagManagerInitiated(true)
    }
  }, [rendered, tagManagerInitiated, setTagManagerInitiated])

  // google analytics
  useEffect(() => {
    if (pathname && searchParams) {
      const qs = searchParams.toString()
      ga.pageview(`${pathname}${qs ? `?${qs}` : ''}`)
    }
  }, [pathname, searchParams])

  // sui
  const { networkConfig } = createNetworkConfig({
    testnet: { url: 'https://sui-testnet-rpc.publicnode.com' || getFullnodeUrl('testnet') },
    mainnet: { url: 'https://sui-rpc.publicnode.com' || getFullnodeUrl('mainnet') },
  })

  // xrpl
  useEffect(() => {
    if (rendered) {
      setXRPLlRegisterWallets([
        new CrossmarkWallet(),
        new LedgerWallet(),
        new XRPLWalletConnectWallet(xrplConfig),
      ])
    }
  }, [rendered, setXRPLlRegisterWallets])

  return (
    <ThemeProvider attribute="class" disableTransitionOnChange>
      <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID} autoBoot={true}>
        <ThemeWatcher />
        <Global />
        <QueryClientProvider client={client}>
          <WagmiConfigProvider>
            <XRPLWalletProvider registerWallets={xrplRegisterWallets}>
              <SuiClientProvider networks={networkConfig} defaultNetwork={ENVIRONMENT === 'mainnet' ? 'mainnet' : 'testnet'}>
                <SuiWalletProvider>
                  {children}
                </SuiWalletProvider>
              </SuiClientProvider>
            </XRPLWalletProvider>
          </WagmiConfigProvider>
        </QueryClientProvider>
      </IntercomProvider>
    </ThemeProvider>
  )
}
