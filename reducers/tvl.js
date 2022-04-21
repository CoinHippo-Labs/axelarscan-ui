import { TVL_DATA } from './types'

export default function data(
  state = {
    [`${TVL_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case TVL_DATA:
      return {
        ...state,
        [`${TVL_DATA}`]: action.value ? { ...state[`${TVL_DATA}`], ...action.value }  : {},
      }
    default:
      return state
  }
}