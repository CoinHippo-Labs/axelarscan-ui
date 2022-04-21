import { DENOMS_DATA } from './types'

export default function data(
  state = {
    [`${DENOMS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case DENOMS_DATA:
      return {
        ...state,
        [`${DENOMS_DATA}`]: action.value,
      }
    default:
      return state
  }
}