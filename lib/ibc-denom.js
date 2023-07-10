import _ from 'lodash'

import { toArray } from './utils'

export const getIBCDenomBase64 = ibc_denom => {
  try {
    return Buffer.from(_.last(toArray(ibc_denom, 'normal', '/'))).toString('base64')
  } catch (error) {}
  return ibc_denom
}