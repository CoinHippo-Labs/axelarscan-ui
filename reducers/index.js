import { combineReducers } from 'redux'

import preferences from './preferences'
import evm_chains from './evm-chains'
import cosmos_chains from './cosmos-chains'
import assets from './assets'
import ens from './ens'
import chain from './chain'
import status from './status'
import tvl from './tvl'
import validators from './validators'
import validators_chains from './validators-chains'
import rpc_providers from './rpc-providers'
import wallet from './wallet'
import chain_id from './chain-id'

export default combineReducers({
  preferences,
  evm_chains,
  cosmos_chains,
  assets,
  ens,
  chain,
  status,
  tvl,
  validators,
  validators_chains,
  rpc_providers,
  wallet,
  chain_id,
})