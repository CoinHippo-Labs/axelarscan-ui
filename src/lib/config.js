import _ from 'lodash'

import { toCase, toArray } from '@/lib/parser'
import { equalsIgnoreCase, removeDoubleQuote } from '@/lib/string'

export const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

export const axelarContracts = ['axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5', 'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5s']

export const getChainKey = (chain, chainsData, exact = false) => {
  let key
  if (chain) {
    chain = toCase(removeDoubleQuote(chain), 'lower')
    key = _.head(toArray(chainsData).filter(d => {
      const { id, chain_id, chain_name, maintainer_id, name, prefix_address, prefix_chain_ids, chain_type } = { ...d }
      return (
        toArray([id, chain_type === 'cosmos' && chain_id, chain_name, maintainer_id, name, !exact && prefix_address]).findIndex(s => equalsIgnoreCase(s, chain) || (!exact && chain_type !== 'evm' && chain.startsWith(s))) > -1 ||
        (!exact && toArray(prefix_chain_ids).findIndex(p => chain.startsWith(p)) > -1)
      )
    }).map(d => d.id))
    key = key || chain
  }
  return key
}

export const getChainData = (chain, chainsData, exact = true) => chain && toArray(chainsData).find(d => d.id === getChainKey(chain, chainsData, exact))

export const getAssetData = (asset, assetsData) => asset && toArray(assetsData).find(d => equalsIgnoreCase(d.denom, asset) || toArray(d.denoms).findIndex(_d => equalsIgnoreCase(_d, asset)) > -1 || equalsIgnoreCase(d.symbol, asset) || toArray(Object.values({ ...d.addresses })).findIndex(a => ['symbol', 'address', 'ibc_denom'].findIndex(f => equalsIgnoreCase(a[f], asset)) > -1) > -1)

export const getITSAssetData = (asset, assetsData) => asset && toArray(assetsData).find(d => toArray(_.concat(d.id, d.symbol, d.addresses, d.address)).findIndex(_d => equalsIgnoreCase(_d, asset)) > -1)
