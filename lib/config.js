import _ from 'lodash'

import { toArray, equalsIgnoreCase, normalizeQuote } from './utils'

export const PROJECT_ASSET = 'uaxl'

export const getChainKey = (chain, chains_data, exact = false) => {
  let key
  if (chain) {
    chain = normalizeQuote(chain, 'lower')
    key = _.head(
      toArray(chains_data)
        .filter(c => {
          const { id, chain_id, chain_name, maintainer_id, prefix_address, prefix_chain_ids, chain_type } = { ...c }
          return (
            toArray(toArray([id, chain_type === 'cosmos' && chain_id, chain_name, maintainer_id, !exact && prefix_address])).findIndex(s => equalsIgnoreCase(chain, s) || (!exact && chain_type !== 'evm' && chain.startsWith(s))) > -1 ||
            (!exact && toArray(prefix_chain_ids).findIndex(p => chain.startsWith(p)) > -1)
          )
        })
        .map(c => c.id)
    )
    key = key || chain
  }
  return key
}

export const getChainData = (chain, chains_data, exact = true) => chain && toArray(chains_data).find(c => c.id === getChainKey(chain, chains_data, exact))

export const getAssetData = (asset, assets_data) => asset && toArray(assets_data).find(a => equalsIgnoreCase(a.denom, asset) || toArray(a.denoms).findIndex(d => equalsIgnoreCase(d, asset)) > -1 || equalsIgnoreCase(a.symbol, asset) || toArray(Object.values({ ...a.addresses })).findIndex(_a => ['symbol', 'address', 'ibc_denom'].findIndex(f => equalsIgnoreCase(_a[f], asset)) > -1) > -1)