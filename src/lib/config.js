import _ from 'lodash'

import { toCase, toArray } from '@/lib/parser'
import { isString, removeDoubleQuote, find } from '@/lib/string'

export const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

export const axelarContracts = [
  'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5s',
  'axelar1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqecnww6',
]

export const axelarContractFields = ['router', 'service_registry', 'rewards', 'multisig', 'gateway', 'multisig_prover', 'voting_verifier', 'interchain_token_service_hub']

export const getAxelarContractAddresses = chainsData => {
  if (!chainsData) return []

  const addresses = []

  for (const chainData of chainsData) {
    for (const f of axelarContractFields) {
      if (chainData[f]?.address) {
        addresses.push(chainData[f].address)
      }
    }
  }

  return addresses
}

export const getChainKey = (chain, chainsData, exact = false) => {
  if (!chain) return
  chain = removeDoubleQuote(chain)

  return toArray(chainsData).find(d => {
    const keys = _.concat(d.id, d.chain_id, d.chain_name, d.maintainer_id, d.name, d.aliases)

    return (
      find(chain, keys) || // check equals
      (!exact && _.concat(keys, d.prefix_address, d.prefix_chain_ids).filter(p => isString(p)).findIndex(p => chain.startsWith(p)) > -1) // check prefix
    )
  })?.id || toCase(chain, 'lower')
}

export const getChainData = (chain, chainsData, exact = true) => {
  const id = getChainKey(chain, chainsData, exact)
  if (!id) return

  return toArray(chainsData).find(d => d.id === id)
}

export const getAssetData = (asset, assetsData) => {
  if (!asset) return

  return toArray(assetsData).find(d =>
    find(asset, _.concat(d.denom, d.denoms, d.symbol)) || // check equals
    toArray(Object.values({ ...d.addresses })).findIndex(a => find(asset, [a.address, a.ibc_denom, a.symbol])) > -1 // check equals to address, denom or symbol of each chain
  )
}

export const getITSAssetData = (asset, assetsData) => {
  if (!asset) return

  // check equals
  return toArray(assetsData).find(d => find(asset, _.concat(d.id, d.symbol, d.addresses, d.address)))
}
