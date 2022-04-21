import { VALIDATORS_CHAINS_DATA } from './types'

export default function data(
  state = {
    [`${VALIDATORS_CHAINS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case VALIDATORS_CHAINS_DATA:
      return {
        ...state,
        [`${VALIDATORS_CHAINS_DATA}`]: action.value ? { ...state[`${VALIDATORS_CHAINS_DATA}`], ...action.value }  : {},
      }
    default:
      return state
  }
}