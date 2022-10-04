import numeral from 'numeral'
import _ from 'lodash'
import moment from 'moment'

const remove_decimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }

  if (number.includes('NaN')) {
    return number.replace(
      'NaN',
      '< 0.00000001',
    )
  }

  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(
        number.indexOf('.') + 1,
      )

      while (decimal.endsWith('0')) {
        decimal = decimal.substring(
          0,
          decimal.length - 1,
        )
      }

      if (
        number.substring(
          0,
          number.indexOf('.'),
        ).length >= 7 &&
        decimal.length > 2 &&
        !isNaN(`0.${decimal}`)
      ) {
        decimal = Number(`0.${decimal}`)
          .toFixed(2)
          .toString()

        if (decimal.indexOf('.') > -1) {
          decimal = decimal.substring(
            decimal.indexOf('.') + 1,
          )

          while (decimal.endsWith('0')) {
            decimal = decimal.substring(
              0,
              decimal.length - 1,
            )
          }
        }
      }

      return `${number.substring(
        0,
        number.indexOf('.'),
      )}${decimal ?
        '.' :
        ''
      }${decimal}`
    }

    return number
  }

  return ''
}

export const number_format = (
  number,
  format,
  is_exact,
) => {
  let formatted_number = numeral(number)
    .format(
      format.includes('.000') &&
      Math.abs(Number(number)) >= 1.01 ?
        format.substring(
          0,
          format.indexOf('.') +
          (is_exact ?
            7 :
            3
          )
        ) :
        format === '0,0' &&
        Number(number) < 1 ?
          '0,0.00' :
          format
    )

  if (formatted_number.includes('NaN')) {
    formatted_number = number.toString()
  }

  let string = remove_decimal(formatted_number)

  if (
    string?.toLowerCase().endsWith('t') &&
    string.split(',').length > 0
  ) {
    string = numeral(number)
      .format('0,0e+0')
  }

  return string
}

const names = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
  'evm_transfer': 'EVM Transfer',
  'ibc_transfer': 'IBC Transfer',
}

export const capitalize = s =>
  typeof s !== 'string' ?
    '' :
    s.trim()
      .split(' ')
      .join('_')
      .split('-')
      .join('_')
      .split('_')
      .map(x => x.trim())
      .filter(x => x)
      .map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`)
      .join(' ')

export const name = (
  s,
  data,
) => names[s] ?
  names[s] :
  data?.name && data.id === s ?
    data.name :
    s && s.length <= 3 ?
      s.toUpperCase() :
      capitalize(s)

export const remove_chars = (
  string = '',
  chars = [
    '"',
    `'`,
  ],
) => {
  if (_.head(chars)) {
    return remove_chars(
      (string || '')
        .split(_.head(chars))
        .join(''),
      _.slice(
        chars,
        1,
      ),
    )
  }

  return string
}

export const ellipse = (
  string,
  length = 10,
  prefix = '',
) => !string ?
  '' :
  string.length < (length * 2) + 3 ?
    string :
    `${string.startsWith(prefix) ?
      prefix :
      ''
    }${string
      .replace(
        prefix,
        '',
      )
      .slice(
        0,
        length,
      )
    }...${string
      .replace(
        prefix,
        '',
      )
      .slice(-length)
    }`

export const equals_ignore_case = (
  a,
  b,
) => (!a && !b) ||
  a?.toLowerCase() === b?.toLowerCase()

export const _total_time_string = (
  total_time,
  a,
  b,
) => {
  if (typeof total_time === 'number') {
    total_time = parseInt(total_time)
  }

  return total_time < 60 ?
    `${total_time || 0}s` :
    total_time < 60 * 60 ?
      `${Math.floor(total_time / 60)} min${total_time % 60 > 0 ? ` ${total_time % 60}s` : ''}` :
        total_time < 24 * 60 * 60 ?
          moment .utc(total_time * 1000).format('HH:mm:ss') :
          a & b ?
            `${moment(b).diff(moment(a), 'days')} day` :
            `${moment().diff(moment().subtract(total_time, 'seconds'), 'days')} day`
}

export const total_time_string = (
  a,
  b,
) => {
  if (!(a && b))
    return null

  a = a * 1000
  b = b * 1000

  return _total_time_string(
    moment(b).diff(moment(a), 'seconds'),
    a,
    b,
  )
}

export const params_to_obj = s => s &&
  JSON.parse(
    `{"${
      s.replace(
        /&/g,
        '","',
      ).replace(
        /=/g,
        '":"',
      )
    }"}`,
    (k, v) => k === '' ?
      v :
      decodeURIComponent(v),
  )

export const to_json = s => {
  if (s) {
    if (typeof s === 'object')
      return s

    try {
      return JSON.parse(s)
    } catch (error) {}
  }

  return null
}

export const to_hex = byte_array => {
  let string = '0x'

  byte_array.forEach(byte =>
    string += (
      '0' +
      (byte & 0xFF)
        .toString(16)
    )
    .slice(-2)
  )

  return string
}

export const decode_base64 = s => {
  if (!s)
    return ''

  const buffer = new Buffer(
    s,
    'base64',
  )

  return buffer.toString()
}

export const rand = (
  initial = 0,
  variation = 100,
) => initial + Math.ceil(
  Math.random(0, 1) * variation
)

export const rand_image = i =>
  `/logos/addresses/${((i || rand()) % 8) + 1}.png`

export const loader_color = theme =>
  theme === 'dark' ?
    'white' :
    '#3b82f6'

export const chart_color = (
  theme,
  type,
) => {
  return ['day'].includes(type) ?
    theme === 'dark' ?
      '#fc9b67' :
      '#ff7d20' :
    theme === 'dark' ?
      '#91ccf6' :
      '#009ef7'
}

export const json_theme = theme =>
  theme === 'dark' ?
    'brewer' :
    'bright:inverted'

export const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))