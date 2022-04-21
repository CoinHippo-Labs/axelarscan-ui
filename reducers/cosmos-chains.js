import { COSMOS_CHAINS_DATA } from './types'

export default function data(
  state = {
    [`${COSMOS_CHAINS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case COSMOS_CHAINS_DATA:
      return {
        ...state,
        [`${COSMOS_CHAINS_DATA}`]: action.value,
      }
    default:
      return state
  }
}