import { BigNumber, FixedNumber, utils } from 'ethers'
const { formatUnits: _formatUnits, parseUnits: _parseUnits } = { ...utils }

import { split } from '@/src/lib/parser'
import { isString, headString } from '@/src/lib/string'

export const isNumber = number => typeof number === 'number' || (isString(number) && number && !isNaN(number))

export const toNumber = number => isNumber(number) ? Number(number) : 0

export const toBigNumber = number => {
  try {
    if (FixedNumber.isFixedNumber(number)) return number.round(0).toString().replace('.0', '')
    return BigNumber.from(number).toString()
  } catch (error) {
    return headString(number?.toString(), '.') || '0'
  }
}

export const toFixedNumber = number => FixedNumber.fromString(number?.toString().includes('.') ? number.toString() : toBigNumber(number))

export const formatUnits = (number = '0', decimals = 18, parseNumber = true) => {
  const formattedNumber = _formatUnits(toBigNumber(number), decimals)
  return parseNumber ? toNumber(formattedNumber) : formattedNumber
}

export const parseUnits = (number = 0, decimals = 18) => {
  try {
    number = number.toString()
    if (number.includes('.')) {
      const [_number, _decimals] = split(number, { delimiter: '.' })
      if (isString(_decimals) && _decimals.length > decimals) {
        let output = `${_number}${_decimals.substring(0, decimals)}`
        while (output.length > 1 && output.startsWith('0')) {
          output = output.substring(1)
        }
        return output
      }
    }
    return toBigNumber(_parseUnits(number, decimals))
  } catch (error) {
    return '0'
  }
}

export const toFixed = (number = 0, decimals = 18) => toNumber(number).toFixed(decimals)
