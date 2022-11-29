import _ from 'lodash'

import { ACCOUNTS_DATA } from './types'

export default (
  state = {
    [`${ACCOUNTS_DATA}`]: null,
  },
  action,
) => {
  switch (action.type) {
    case ACCOUNTS_DATA:
      return {
        ...state,
        [`${ACCOUNTS_DATA}`]:
          _.uniqBy(
            _.concat(
              state[`${ACCOUNTS_DATA}`],
              action.value,
            )
            .filter(a => a),
            'address',
          ),
      }
    default:
      return state
  }
}