import { STATUS_DATA } from './types'

export default (
  state = {
    [STATUS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case STATUS_DATA:
      return {
        ...state,
        [STATUS_DATA]: action.value,
      }
    default:
      return state
  }
}