import { MAINTAINERS_DATA } from './types'

export default (
  state = {
    [MAINTAINERS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case MAINTAINERS_DATA:
      return {
        ...state,
        [MAINTAINERS_DATA]: action.value ? { ...state[MAINTAINERS_DATA], ...action.value } : {},
      }
    default:
      return state
  }
}