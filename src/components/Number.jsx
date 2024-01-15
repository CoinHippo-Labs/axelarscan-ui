import clsx from 'clsx'
import _ from 'lodash'

import { Tooltip } from '@/components/Tooltip'
import { split } from '@/lib/parser'
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
  tooltipContent = '',
  className,
}) {
  const valid = isNumber(value)

  let _value = valid ? value.toString() : undefined
  if (_value && _value.includes(delimiter) && !_value.endsWith(delimiter)) {
    const valueNumber = toNumber(split(_value).join(''))
    const decimals = _.last(split(_value, { delimiter }))
    maxDecimals = isNumber(maxDecimals) ? maxDecimals : valueNumber >= LARGE_NUMBER_THRESHOLD ? 0 : valueNumber >= 1 ? 2 : 6

    // handle exceed maxDecimals
    if (Math.abs(valueNumber) >= Math.pow(10, -maxDecimals)) _value = decimals.length > maxDecimals ? toFixed(valueNumber, maxDecimals) : undefined
    else _value = decimals.length > maxDecimals ? `<${maxDecimals > 0 ? `0${delimiter}${_.range(maxDecimals - 1).map(i => '0').join('')}` : ''}1` : undefined

    // remove .0
    if (_value) {
      while (_value.includes(delimiter) && _value.endsWith('0') && !_value.endsWith(`${delimiter}00`)) {
        _value = _value.substring(0, _value.length - 1)
      }
      if ([delimiter, `${delimiter}0`].findIndex(s => _value.endsWith(s)) > -1) _value = _.head(split(_value, { delimiter }))
    }
  }
  else _value = undefined

  // remove .0
  if (typeof value === 'string' && value.endsWith(`${delimiter}0`)) value = _.head(split(value, { delimiter }))

  if (toNumber(_value) >= LARGE_NUMBER_THRESHOLD) _value = numberFormat(_value, format, true)
  else if (toNumber(value) >= LARGE_NUMBER_THRESHOLD) value = numberFormat(value, format, true)

  className = clsx('text-sm whitespace-nowrap', className)
  const element = (
    <span className={className}>
      {typeof _value === 'string' ? `${prefix}${_value}${suffix}` : isNumber(value) ? `${prefix}${value}${suffix}` : '-'}
    </span>
  )
  return valid && (typeof _value === 'string' ?
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
  )
}
