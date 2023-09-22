import { GMP_CONFIGURATIONS_DATA } from './types'

export default (
  state = {
    [GMP_CONFIGURATIONS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case GMP_CONFIGURATIONS_DATA:
      return {
        ...state,
        [GMP_CONFIGURATIONS_DATA]: action.value,
      }
    default:
      return state
  }
}