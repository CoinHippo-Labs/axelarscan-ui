// import { FixedNumber, formatUnits as _formatUnits, isHexString } from 'ethers'
import { BigNumber, FixedNumber, utils } from 'ethers'
const { formatUnits: _formatUnits } = { ...utils }

import { split } from './utils'

// export const toBigNumber = number => {
//   try {
//     return number.round(0).toString().replace('.0', '')
//   } catch (error) {
//     return (isHexString(number?.hex) ? BigInt(number.hex) : isHexString(number) ? BigInt(number) : number)?.toString() || '0'
//   }
// }

export const toBigNumber = number => {
  try {
    if (FixedNumber.isFixedNumber(number)) {
      return number.round(0).toString().replace('.0', '')
    }
    else {
      return BigNumber.from(number).toString()
    }
  } catch (error) {}
  return number?.toString()
}

export const toFixedNumber = number => FixedNumber.fromString(number?.toString().includes('.') ? number.toString() : toBigNumber(number))

export const formatUnits = (number, decimals = 6) => {
  if (typeof number === 'string') {
    const start_denom_index = split(number, 'normal', '').findIndex(c => isNaN(c)) || -1
    if (start_denom_index > -1) {
      number = number.substring(0, start_denom_index)
    }
  }
  else if (typeof number === 'number' && number.toString().includes('e+')) {
    try {
      number = BigInt(number)
    } catch (error) {}
  }
  return number && Number(_formatUnits(toBigNumber(number), decimals))
}