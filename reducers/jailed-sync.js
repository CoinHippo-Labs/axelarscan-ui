import { JAILED_SYNC_DATA } from './types'

export default function data(
  state = {
    [`${JAILED_SYNC_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case JAILED_SYNC_DATA:
      return {
        ...state,
        [`${JAILED_SYNC_DATA}`]: action.value ? { ...state[`${JAILED_SYNC_DATA}`], [`${action.i}`]: action.value } : {},
      }
    default:
      return state
  }
}