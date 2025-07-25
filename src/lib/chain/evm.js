import { providers } from 'ethers'
const { FallbackProvider, StaticJsonRpcProvider: JsonRpcProvider } = { ...providers }

import { getChainData } from '@/lib/config'
import { toArray } from '@/lib/parser'
import { toNumber } from '@/lib/number'

const createRPCProvider = (url, chainId) => new JsonRpcProvider(url, chainId ? toNumber(chainId) : undefined)
export const getProvider = (chain, chainsData) => {
  const { chain_id, deprecated, endpoints } = { ...getChainData(chain, chainsData) }
  const rpcs = toArray(endpoints?.rpc)

  if (rpcs.length > 0 && !deprecated) {
    try {
      if (rpcs.length === 1) return createRPCProvider(rpcs[0], chain_id)
      return new FallbackProvider(
        rpcs.map((url, i) => ({
          provider: createRPCProvider(url, chain_id),
          priority: i + 1,
          weight: 1,
          stallTimeout: 1000,
        })),
        rpcs.length / 3,
      )
    } catch (error) {}
  }

  return
}
