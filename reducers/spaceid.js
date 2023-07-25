import { SPACEID_DATA } from './types'

export default (
  state = {
    [SPACEID_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case SPACEID_DATA:
      return {
        ...state,
        [SPACEID_DATA]: {
          ...state[SPACEID_DATA],
          ...action.value,
        },
      }
    default:
      return state
  }
}