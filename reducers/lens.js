import { LENS_DATA } from './types'

export default (
  state = {
    [LENS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case LENS_DATA:
      return {
        ...state,
        [LENS_DATA]: {
          ...state[LENS_DATA],
          ...action.value,
        },
      }
    default:
      return state
  }
}