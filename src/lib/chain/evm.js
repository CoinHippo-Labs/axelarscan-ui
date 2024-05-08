import { providers } from 'ethers'
const { FallbackProvider, StaticJsonRpcProvider: JsonRpcProvider } = { ...providers }

import { getChainData } from '@/lib/config'
import { toArray } from '@/lib/parser'
import { toNumber } from '@/lib/number'

const createRPCProvider = (url, chain_id) => new JsonRpcProvider(url, chain_id ? toNumber(chain_id) : undefined)

export const getProvider = (chain, chainsData) => {
  const { chain_id, deprecated, endpoints } = { ...getChainData(chain, chainsData) }
  const rpcs = toArray(endpoints?.rpc)
  if (rpcs.length > 0 && !deprecated) {
    try {
      return rpcs.length > 1 ?
        new FallbackProvider(
          rpcs.map((url, i) => {
            return {
              priority: i + 1,
              provider: createRPCProvider(url, chain_id),
              stallTimeout: 1000,
              weight: 1,
            }
          }),
          rpcs.length / 3, // chain_id,
        ) :
        createRPCProvider(rpcs[0], chain_id)
    } catch (error) {}
  }
  return null
}
