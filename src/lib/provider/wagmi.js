import { QueryClient } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia, bsc, bscTestnet, polygon, polygonAmoy, avalanche, avalancheFuji, fantom, fantomTestnet, moonbeam, moonbaseAlpha, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia, mantle, mantleSepoliaTestnet, celo, celoAlfajores, kava, kavaTestnet, filecoin, filecoinCalibration, linea, lineaSepolia, scroll, scrollSepolia, immutableZkEvm, immutableZkEvmTestnet, fraxtal, fraxtalTestnet, blast, blastSepolia, flowMainnet, flowTestnet, hedera, hederaTestnet } from 'wagmi/chains'

import { ENVIRONMENT } from '@/lib/config'
import { toArray } from '@/lib/parser'

export const CHAINS = toArray(ENVIRONMENT === 'mainnet' ?
  [
    { _id: 'ethereum', ...mainnet },
    { _id: 'binance', ...bsc },
    { _id: 'polygon', ...polygon },
    { _id: 'avalanche', ...avalanche },
    { _id: 'fantom', ...fantom, rpcUrls: { default: { http: ['https://rpc.fantom.network'] } } },
    { _id: 'moonbeam', ...moonbeam },
    { _id: 'arbitrum', ...arbitrum },
    { _id: 'optimism', ...optimism },
    { _id: 'base', ...base },
    { _id: 'mantle', ...mantle },
    { _id: 'celo', ...celo },
    { _id: 'kava', ...kava },
    { _id: 'filecoin', ...filecoin },
    { _id: 'linea', ...linea },
    { _id: 'centrifuge', id: 2031, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Centrifuge', symbol: 'CFG', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.parachain.centrifuge.io'] } }, blockExplorers: { default: { name: 'Centrifuge', url: 'https://centrifuge.subscan.io' } } },
    { _id: 'scroll', ...scroll },
    { _id: 'immutable', ...immutableZkEvm },
    { _id: 'fraxtal', ...fraxtal },
    { _id: 'blast', ...blast },
    { _id: 'flow', ...flowMainnet },
    { _id: 'hedera', ...hedera },
    { _id: 'xrpl-evm', id: 1440000, network: 'xrpl-evm', name: 'XRP Ledger EVM', nativeCurrency: { name: 'Ripple', symbol: 'XRP', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.xrplevm.org'] } }, blockExplorers: { default: { name: 'XRP Ledger EVM', url: 'https://explorer-mainnet.aws.peersyst.tech' } } },
    { _id: 'plume', id: 98866, network: 'plume', name: 'Plume', nativeCurrency: { name: 'Plume', symbol: 'PLUME', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.plume.org'] } }, blockExplorers: { default: { name: 'Plume', url: 'https://explorer.plume.org' } } },
    { _id: 'hyperliquid', id: 999, network: 'hyperliquid', name: 'Hyperliquid', nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } }, blockExplorers: { default: { name: 'Hyperliquid', url: 'https://app.hyperliquid.xyz/explorer' } } },
    { _id: 'berachain', id: 80094, network: 'berachain', name: 'Berachain', nativeCurrency: { name: 'Berachain', symbol: 'BERA', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.berachain.com'] } }, blockExplorers: { default: { name: 'Berascan', url: 'https://berascan.com' } } },
  ] :
  [
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'ethereum-sepolia', ...sepolia },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'test-sepolia', ...sepolia, name: `${sepolia.name} (Amplifier)` },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'core-ethereum', ...sepolia },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'eth-sepolia', ...sepolia, name: `${sepolia.name} (Amplifier)` },
    { _id: 'binance', ...bscTestnet },
    { _id: 'polygon-sepolia', ...polygonAmoy },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'avalanche', ...avalancheFuji },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'test-avalanche', ...avalancheFuji, name: `${avalancheFuji.name} (Amplifier)` },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'core-avalanche', ...avalancheFuji },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'avalanche-fuji', ...avalancheFuji, name: `${avalancheFuji.name} (Amplifier)` },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'avalanche-test', ...avalancheFuji, name: `${avalancheFuji.name} (Amplifier)` },
    { _id: 'fantom', ...fantomTestnet },
    { _id: 'moonbeam', ...moonbaseAlpha },
    { _id: 'arbitrum-sepolia', ...arbitrumSepolia },
    { _id: 'optimism-sepolia', ...optimismSepolia },
    { _id: 'base-sepolia', ...baseSepolia },
    { _id: 'mantle-sepolia', ...mantleSepoliaTestnet },
    { _id: 'celo', ...celoAlfajores },
    { _id: 'kava', ...kavaTestnet },
    { _id: 'filecoin-2', ...filecoinCalibration },
    { _id: 'linea-sepolia', ...lineaSepolia },
    { _id: 'centrifuge-2', id: 2090, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Algol', symbol: 'ALGL', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.demo.k-f.dev'] } }, blockExplorers: { default: { name: 'Centrifuge', url: '' } }, testnet: true },
    { _id: 'scroll', ...scrollSepolia },
    { _id: 'immutable', ...immutableZkEvmTestnet },
    { _id: 'fraxtal', ...fraxtalTestnet },
    { _id: 'blast-sepolia', ...blastSepolia },
    { _id: 'flow', ...flowTestnet },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'hedera', ...hederaTestnet },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'hedera-testnet', ...hederaTestnet },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'xrpl-evm', id: 1449000, network: 'xrpl-evm', name: 'XRP Ledger EVM', nativeCurrency: { name: 'Ripple', symbol: 'XRP', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.testnet.xrplevm.org'] } }, blockExplorers: { default: { name: 'XRP Ledger EVM', url: 'https://explorer.testnet.xrplevm.org' } }, testnet: true },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'xrpl-evm-2', id: 1440002, network: 'xrpl-evm-2', name: 'XRP Ledger EVM 2', nativeCurrency: { name: 'Ripple', symbol: 'XRP', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.devnet.xrplevm.org'] } }, blockExplorers: { default: { name: 'XRP Ledger EVM', url: 'https://explorer.devnet.xrplevm.org' } }, testnet: true },
    ['testnet', 'stagenet'].includes(ENVIRONMENT) && { _id: 'plume', id: 98867, network: 'plume', name: 'Plume', nativeCurrency: { name: 'Plume', symbol: 'PLUME', decimals: 18 }, rpcUrls: { default: { http: ['https://testnet-rpc.plume.org'] } }, blockExplorers: { default: { name: 'Plume', url: 'https://testnet-explorer.plume.org' } }, testnet: true },
    ['devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'plume-2', id: 98867, network: 'plume-2', name: 'Plume', nativeCurrency: { name: 'Plume', symbol: 'PLUME', decimals: 18 }, rpcUrls: { default: { http: ['https://testnet-rpc.plume.org'] } }, blockExplorers: { default: { name: 'Plume', url: 'https://testnet-explorer.plume.org' } }, testnet: true },
    ['testnet', 'stagenet', 'devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'hyperliquid', id: 998, network: 'hyperliquid', name: 'Hyperliquid', nativeCurrency: { name: 'Hyperliquid', symbol: 'HYPE', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] } }, blockExplorers: { default: { name: 'Hyperliquid', url: 'https://app.hyperliquid-testnet.xyz/explorer' } }, testnet: true },
    { _id: 'berachain', id: 80069, network: 'berachain', name: 'Berachain', nativeCurrency: { name: 'Berachain', symbol: 'BERA', decimals: 18 }, rpcUrls: { default: { http: ['https://bepolia.rpc.berachain.com'] } }, blockExplorers: { default: { name: 'Berascan', url: 'https://testnet.berascan.com' } }, testnet: true },
    ['testnet', 'stagenet', 'devnet-amplifier'].includes(ENVIRONMENT) && { _id: 'monad', id: 10143, network: 'monad', name: 'Monad', nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } }, blockExplorers: { default: { name: 'Monad', url: 'https://testnet.monadexplorer.com' } }, testnet: true },
  ]
)

export const queryClient = new QueryClient()

const wagmiAdapter = new WagmiAdapter({
  networks: CHAINS,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: CHAINS,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  metadata: {
    name: 'Axelarscan',
    description: process.env.NEXT_PUBLIC_DEFAULT_TITLE,
    url: process.env.NEXT_PUBLIC_APP_URL,
    icons: ['/icons/favicon-32x32.png'],
  },
  allWallets: 'SHOW',
  features: {
    email: false,
    socials: [],
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export const xrplConfig = {
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  metadata: {
    name: 'Axelarscan',
    description: process.env.NEXT_PUBLIC_DEFAULT_TITLE,
    icons: ['/icons/favicon-32x32.png'],
  },
  networks: [`xrpl:${ENVIRONMENT === 'mainnet' ? 'mainnet' : ENVIRONMENT === 'devnet-amplifier' ? 'devnet' : 'testnet'}`],
}
