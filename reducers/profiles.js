import { PROFILES_DATA } from './types'

export default (
  state = {
    [PROFILES_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case PROFILES_DATA:
      return {
        ...state,
        [PROFILES_DATA]: action.value ? { ...state[PROFILES_DATA], ...action.value } : {},
      }
    default:
      return state
  }
}