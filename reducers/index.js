import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import cosmos_chains from './cosmos-chains'
import assets from './assets'
import denoms from './denoms'
import tvl from './tvl'
import status from './status'
import env from './env'
import validators from './validators'
import validators_chains from './validators-chains'
import jailed_sync from './jailed-sync'

export default combineReducers({
  preferences,
  chains,
  cosmos_chains,
  assets,
  denoms,
  tvl,
  status,
  env,
  validators,
  validators_chains,
  jailed_sync,
})