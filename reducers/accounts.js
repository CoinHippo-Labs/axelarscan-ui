import _ from 'lodash'

import { toArray } from '../lib/utils'
import { ACCOUNTS_DATA } from './types'

export default (
  state = {
    [ACCOUNTS_DATA]: null,
  },
  action,
) => {
  switch (action.type) {
    case ACCOUNTS_DATA:
      return {
        ...state,
        [ACCOUNTS_DATA]: _.uniqBy(toArray(_.concat(state[ACCOUNTS_DATA], action.value)), 'address'),
      }
    default:
      return state
  }
}