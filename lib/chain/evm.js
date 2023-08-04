import { providers } from 'ethers'
const { FallbackProvider, StaticJsonRpcProvider: JsonRpcProvider } = { ...providers }
import _ from 'lodash'

import { getChainData } from '../config'
import { toArray } from '../utils'

const createRpcProvider = (url, chain_id) => new JsonRpcProvider(url, chain_id ? Number(chain_id) : undefined)

export const getProvider = (chain, chains_data) => {
  const { chain_id, deprecated, endpoints } = { ...getChainData(chain, chains_data) }
  const { rpc } = { ...endpoints }
  const rpcs = toArray(rpc)
  if (rpcs.length > 0 && !deprecated) {
    try {
      return (
        rpcs.length > 1 ?
          new FallbackProvider(
            rpcs.map((url, i) => {
              return {
                priority: i + 1,
                provider: createRpcProvider(url, chain_id),
                stallTimeout: 1000,
                weight: 1,
              }
            }),
            rpcs.length / 3, // chain_id,
          ) :
          createRpcProvider(_.head(rpcs), chain_id)
      )
    } catch (error) {}
  }
  return null
}