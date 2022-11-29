import { VALIDATORS_PROFILE_DATA } from './types'

export default (
  state = {
    [`${VALIDATORS_PROFILE_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case VALIDATORS_PROFILE_DATA:
      return {
        ...state,
        [`${VALIDATORS_PROFILE_DATA}`]:
          action.value ?
            {
              ...state[`${VALIDATORS_PROFILE_DATA}`],
              ...action.value,
            } :
            {},
      }
    default:
      return state
  }
}