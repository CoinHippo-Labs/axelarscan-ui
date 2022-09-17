import { VALIDATORS_DATA } from './types'

export default (
  state = {
    [`${VALIDATORS_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case VALIDATORS_DATA:
      return {
        ...state,
        [`${VALIDATORS_DATA}`]: action.value,
      }
    default:
      return state
  }
}