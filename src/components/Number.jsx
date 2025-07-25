'use client'

import clsx from 'clsx'
import _ from 'lodash'

import { Tooltip } from '@/components/Tooltip'
import { split } from '@/lib/parser'
import { isString, headString, lastString } from '@/lib/string'
import { isNumber, toNumber, toFixed, numberFormat } from '@/lib/number'

const LARGE_NUMBER_THRESHOLD = 1000

export function Number({
  value,
  format = '0,0.00',
  delimiter = '.',
  maxDecimals,
  prefix = '',
  suffix = '',
  noTooltip = false,
  tooltipContent,
  className,
}) {
  if (!isNumber(value)) return

  // init value string
  let _value = value.toString()

  if (_value && _value.includes(delimiter) && !_value.endsWith(delimiter)) {
    // remove ','
    const valueNumber = toNumber(split(_value).join(''))
    const decimals = lastString(_value, delimiter)

    // auto set max decimals
    if (!isNumber(maxDecimals)) {
      maxDecimals = valueNumber >= LARGE_NUMBER_THRESHOLD ? 0 : valueNumber >= 1.01 ? 2 : 6
    } 

    // handle exceed max decimals
    if (Math.abs(valueNumber) >= Math.pow(10, -maxDecimals)) {
      _value = decimals.length > maxDecimals ? toFixed(valueNumber, maxDecimals) : undefined
    }
    else {
      _value = decimals.length > maxDecimals ? `<${maxDecimals > 0 ? `0${delimiter}${_.range(maxDecimals - 1).map(i => '0').join('')}` : ''}1` : undefined
    }

    // remove .0
    if (_value) {
      while (_value.includes(delimiter) && _value.endsWith('0') && !_value.endsWith(`${delimiter}00`)) {
        _value = _value.substring(0, _value.length - 1)
      }

      if ([delimiter, `${delimiter}0`].findIndex(s => _value.endsWith(s)) > -1) {
        _value = headString(_value, delimiter)
      }
    }
  }
  else {
    _value = undefined
  }

  // remove .0
  if (isString(value) && value.endsWith(`${delimiter}0`)) {
    value = headString(value, delimiter)
  }

  if (toNumber(_value) >= LARGE_NUMBER_THRESHOLD) {
    _value = numberFormat(_value, format, true)
  }
  else if (toNumber(value) >= LARGE_NUMBER_THRESHOLD) {
    value = numberFormat(value, format, true)
  }

  className = clsx('text-sm whitespace-nowrap', className)

  const element = (
    <span className={className}>
      {isString(_value) ? `${prefix}${_value}${suffix}` : isNumber(value) || isString(value) ? `${prefix}${value}${suffix}` : '-'}
    </span>
  )

  return isString(_value) ?
    !noTooltip || tooltipContent ?
      <Tooltip content={tooltipContent || `${prefix}${value}${suffix}`} className="whitespace-nowrap">
        {element}
      </Tooltip> :
      element :
    tooltipContent ?
      <Tooltip content={tooltipContent} className="whitespace-nowrap">
        {element}
      </Tooltip> :
      element
}
