import { ENV_DATA } from './types'

export default function data(
  state = {
    [`${ENV_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case ENV_DATA:
      return {
        ...state,
        [`${ENV_DATA}`]: action.value ? { ...state[`${ENV_DATA}`], ...action.value }  : {},
      }
    default:
      return state
  }
}