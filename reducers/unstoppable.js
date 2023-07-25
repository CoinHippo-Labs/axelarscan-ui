import { UNSTOPPABLE_DATA } from './types'

export default (
  state = {
    [UNSTOPPABLE_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case UNSTOPPABLE_DATA:
      return {
        ...state,
        [UNSTOPPABLE_DATA]: {
          ...state[UNSTOPPABLE_DATA],
          ...action.value,
        },
      }
    default:
      return state
  }
}