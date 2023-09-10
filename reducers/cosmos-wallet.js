import { COSMOS_WALLET_DATA, COSMOS_WALLET_RESET } from './types'

const INITIAL_WALLET_DATA = {
  chain_id: null,
  provider: null,
  signer: null,
  address: null,
}

export default (
  state = {
    [COSMOS_WALLET_DATA]: INITIAL_WALLET_DATA,
  },
  action,
) => {
  switch (action.type) {
    case COSMOS_WALLET_DATA:
      return {
        ...state,
        [COSMOS_WALLET_DATA]: {
          ...state[COSMOS_WALLET_DATA],
          ...action.value,
        },
      }
    case COSMOS_WALLET_RESET:
      return {
        ...state,
        [COSMOS_WALLET_DATA]: INITIAL_WALLET_DATA,
      }
    default:
      return state
  }
}