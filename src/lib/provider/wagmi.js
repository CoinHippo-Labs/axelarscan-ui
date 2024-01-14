import { QueryClient } from '@tanstack/react-query'
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { mainnet, goerli, sepolia, bsc, bscTestnet, polygon, polygonMumbai, polygonZkEvm, polygonZkEvmTestnet, avalanche, avalancheFuji, fantom, fantomTestnet, moonbeam, moonbaseAlpha, aurora, auroraTestnet, arbitrum, arbitrumGoerli, arbitrumSepolia, optimism, optimismGoerli, base, baseGoerli, mantle, mantleTestnet, celo, celoAlfajores, kava, kavaTestnet, filecoin, filecoinHyperspace, filecoinCalibration, linea, lineaTestnet, scroll, scrollSepolia } from 'wagmi/chains'

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

export const CHAINS = process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' ?
  [
    { _id: 'ethereum', ...mainnet },
    { _id: 'binance', ...bsc },
    { _id: 'polygon', ...polygon },
    { _id: 'polygon-zkevm', ...polygonZkEvm },
    { _id: 'avalanche', ...avalanche },
    { _id: 'fantom', ...fantom },
    { _id: 'moonbeam', ...moonbeam },
    { _id: 'aurora', ...aurora },
    { _id: 'arbitrum', ...arbitrum },
    { _id: 'optimism', ...optimism },
    { _id: 'base', ...base },
    { _id: 'mantle', ...mantle },
    { _id: 'celo', ...celo },
    { _id: 'kava', ...kava },
    { _id: 'filecoin', ...filecoin },
    { _id: 'linea', ...linea },
    { _id: 'centrifuge', id: 2031, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Centrifuge', symbol: 'CFG', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.parachain.centrifuge.io'] } }, blockExplorers: { default: { name: 'Centrifuge', url: 'https://centrifuge.subscan.io' } } },
    { _id: 'immutable', id: 13371, network: 'immutable', name: 'Immutable', nativeCurrency: { name: 'ImmutableX', symbol: 'IMX', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.immutable.com'] } }, blockExplorers: { default: { name: 'Immutable', url: 'https://explorer.immutable.com' } } },
    { _id: 'scroll', scroll },
  ] :
  [
    { _id: 'ethereum-2', ...goerli },
    { _id: 'ethereum-sepolia', ...sepolia },
    { _id: 'binance', ...bscTestnet },
    { _id: 'polygon', ...polygonMumbai },
    { _id: 'polygon-zkevm', ...polygonZkEvmTestnet },
    { _id: 'avalanche', ...avalancheFuji },
    { _id: 'fantom', ...fantomTestnet },
    { _id: 'moonbeam', ...moonbaseAlpha },
    { _id: 'aurora', ...auroraTestnet },
    { _id: 'arbitrum', ...arbitrumGoerli },
    { _id: 'arbitrum-sepolia', ...arbitrumSepolia },
    { _id: 'optimism', ...optimismGoerli },
    { _id: 'base', ...baseGoerli },
    { _id: 'mantle', ...mantleTestnet },
    { _id: 'celo', ...celoAlfajores },
    { _id: 'kava', ...kavaTestnet },
    { _id: 'filecoin', ...filecoinHyperspace },
    { _id: 'filecoin-2', ...filecoinCalibration },
    { _id: 'linea', ...lineaTestnet },
    { _id: 'centrifuge', id: 2089, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Algol', symbol: 'ALGL', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.algol.cntrfg.com/rpc'] } }, blockExplorers: { default: { name: 'Centrifuge', url: '' } } },
    { _id: 'centrifuge-2', id: 2090, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Algol', symbol: 'ALGL', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.demo.k-f.dev'] } }, blockExplorers: { default: { name: 'Centrifuge', url: '' } } },
    { _id: 'immutable', id: 13473, network: 'immutable', name: 'Immutable', nativeCurrency: { name: 'ImmutableX', symbol: 'tIMX', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.testnet.immutable.com'] } }, blockExplorers: { default: { name: 'Immutable', url: 'https://explorer.testnet.immutable.com' } } },
    { _id: 'immutable-devnet', id: 15003, network: 'immutable', name: 'Immutable', nativeCurrency: { name: 'ImmutableX', symbol: 'tIMX', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.dev.immutable.com'] } }, blockExplorers: { default: { name: 'Immutable', url: 'https://explorer.testnet.immutable.com' } } },
    { _id: 'scroll', ...scrollSepolia },
  ]

export const queryClient = new QueryClient()

export const wagmiConfig = defaultWagmiConfig({
  chains: CHAINS,
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata: {
    name: 'Axelarscan',
    description: process.env.NEXT_PUBLIC_DEFAULT_TITLE,
    icons: ['/icons/favicon-32x32.png'],
  },
})

export const WEB3MODAL = createWeb3Modal({
  wagmiConfig,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: CHAINS,
  themeVariables: {
    '--w3m-background-color': '#18181b',
    '--w3m-logo-image-url': `${process.env.NEXT_PUBLIC_APP_URL}/logos/logo_white.png`,
  },
  excludeWalletIds: ['19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927'],
})
