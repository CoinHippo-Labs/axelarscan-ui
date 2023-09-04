import { QueryClient } from '@tanstack/react-query'
import { configureChains, createClient } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { EthereumClient, w3mConnectors } from '@web3modal/ethereum'
import { mainnet, goerli, bsc, bscTestnet, polygon, polygonMumbai, polygonZkEvm, polygonZkEvmTestnet, avalanche, avalancheFuji, fantom, fantomTestnet, moonbeam, moonbaseAlpha, aurora, auroraTestnet, arbitrum, arbitrumGoerli, optimism, optimismGoerli, base, baseGoerli, mantle, mantleTestnet, celo, celoAlfajores, filecoin, filecoinHyperspace, filecoinCalibration, linea, lineaTestnet } from '@wagmi/chains'

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
export const EVM_CHAIN_CONFIGS =
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' ?
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
      { _id: 'kava', id: 2222, network: 'kava', name: 'Kava', nativeCurrency: { name: 'Kava', symbol: 'KAVA', decimals: 18 }, rpcUrls: { default: { http: ['https://evm.data.axelar.kava.io', 'https://evm.kava.io', 'https://evm2.kava.io'] } }, blockExplorers: { default: { name: 'Kava', url: 'https://explorer.kava.io' } } },
      { _id: 'filecoin', ...filecoin },
      // { _id: 'linea', ...linea },
      { _id: 'linea', id: 59144, network: 'linea', name: 'Linea', nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://linea-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'] } }, blockExplorers: { default: { name: 'Linea', url: 'https://lineascan.build' } } },
      // { _id: 'centrifuge', id: 2031, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Algol', symbol: 'ALGL', decimals: 18 }, rpcUrls: { default: { http: [] } }, blockExplorers: { default: { name: 'Centrifuge', url: '' } } },
    ] :
    [
      { _id: 'goerli', ...goerli },
      { _id: 'binance', ...bscTestnet },
      { _id: 'polygon', ...polygonMumbai },
      { _id: 'polygon-zkevm', ...polygonZkEvmTestnet },
      { _id: 'avalanche', ...avalancheFuji },
      { _id: 'fantom', ...fantomTestnet },
      { _id: 'moonbeam', ...moonbaseAlpha },
      { _id: 'aurora', ...auroraTestnet },
      { _id: 'arbitrum', ...arbitrumGoerli },
      { _id: 'optimism', ...optimismGoerli },
      { _id: 'base', ...baseGoerli },
      { _id: 'mantle', ...mantleTestnet },
      { _id: 'celo', ...celoAlfajores },
      { _id: 'kava', id: 2221, network: 'kava', name: 'Kava', nativeCurrency: { name: 'Kava', symbol: 'KAVA', decimals: 18 }, rpcUrls: { default: { http: ['https://evm.testnet.kava.io'] } }, blockExplorers: { default: { name: 'Kava', url: 'https://explorer.testnet.kava.io' } } },
      { _id: 'filecoin', ...filecoinHyperspace },
      { _id: 'filecoin-2', ...filecoinCalibration },
      { _id: 'linea', ...lineaTestnet },
      { _id: 'centrifuge', id: 2089, network: 'centrifuge', name: 'Centrifuge', nativeCurrency: { name: 'Algol', symbol: 'ALGL', decimals: 18 }, rpcUrls: { default: { http: ['https://fullnode.algol.cntrfg.com/rpc'] } }, blockExplorers: { default: { name: 'Centrifuge', url: 'https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Ffullnode.algol.cntrfg.com%2Fpublic-ws#/explorer' } } },
    ]

const { webSocketProvider, provider } = configureChains(EVM_CHAIN_CONFIGS, [publicProvider()])
export const queryClient = new QueryClient()
export const wagmiClient = createClient(
  {
    autoConnect: true,
    provider,
    webSocketProvider,
    connectors: w3mConnectors({ chains: EVM_CHAIN_CONFIGS, projectId: WALLETCONNECT_PROJECT_ID, version: 2 }),
    queryClient,
  }
)
export const ethereumClient = new EthereumClient(wagmiClient, EVM_CHAIN_CONFIGS)