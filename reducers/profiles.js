import { PROFILES_DATA } from './types'

export default (
  state = {
    [PROFILES_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case PROFILES_DATA:
      const value = action.value ? { ...state[PROFILES_DATA], ...action.value } : {}
      localStorage.setItem(PROFILES_DATA, JSON.stringify(value))
      return {
        ...state,
        [PROFILES_DATA]: value,
      }
    default:
      return state
  }
}