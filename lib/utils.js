import numeral from 'numeral'

const url = (url, params) => {
  if (url) {
    url = new URL(url)

    if (params) {
      const urlSearchParams = new URLSearchParams(url.search)
      Object.keys(params).filter(key => typeof params[key] !== 'undefined').forEach(key => urlSearchParams.append(key, params[key]))
      url.search = urlSearchParams
    }
  }

  return url
}

export const getRequestUrl = (base_url, path, params) => {
  params = { ...params, path }

  if (typeof path !== 'string') {
    delete params.path
  }

  return url(base_url, params)
}

export const paramsToObject = string => string && JSON.parse(`{"${string.replace(/&/g, '","').replace(/=/g, '":"')}"}`, (key, value) => key === '' ? value : decodeURIComponent(value))

const numberOptimizeDecimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }

  if (number.includes('NaN')) {
    return number.replace('NaN', '<0.00000001')
  }

  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(number.indexOf('.') + 1)

      while (decimal.endsWith('0')) {
        decimal = decimal.substring(0, decimal.length - 1)
      }

      if (number.substring(0, number.indexOf('.')).length >= 7 && decimal.length > 2 && !isNaN(`0.${decimal}`)) {
        decimal = Number(`0.${decimal}`).toFixed(2).toString()
        if (decimal.indexOf('.') > -1) {
          decimal = decimal.substring(decimal.indexOf('.') + 1)
          while (decimal.endsWith('0')) {
            decimal = decimal.substring(0, decimal.length - 1)
          }
        }
      }

      return `${number.substring(0, number.indexOf('.'))}${decimal ? '.' : ''}${decimal}`
    }

    return number
  }

  return ''
}

export const numberFormat = (number, format, is_exact) => {
  let _number = numberOptimizeDecimal(numeral(number).format(format.includes('.000') && Math.abs(Number(number)) >= 1.01 ? `${format.substring(0, format.indexOf('.') + (is_exact ? 7 : 3))}` : format === '0,0' && Number(number) < 1 ? '0,0.00' : format))

  if (_number?.toLowerCase().endsWith('t') && (_number.split(',').length > 1 || _number.startsWith('<'))) {
    _number = numeral(number).format('0,0e+0')
  }

  return _number
}

const capitalize = s => typeof s !== 'string' ? '' : s.trim().split(' ').join('_').split('-').join('_').split('_').map(x => x.trim()).filter(x => x).map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`).join(' ')

const names = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
  axelarnet: 'Axelar Network',
  ibc_transfer: 'IBC Transfer',
}

export const getName = (s, data) => names[s] ? names[s] : data?.name && data.id === s ? data.name : s?.length <= 3 ? s.toUpperCase() : capitalize(s)

export const ellipseAddress = (address, width = 10) => !address ? '' : address.length < width * 2 ? address : `${address.slice(0, width)}...${address.slice(-width)}`

export const rand = (initial = 0, variation = 100) => initial + Math.ceil(Math.random(0, 1) * variation)

export const randImage = i => `/logos/addresses/${((i || rand()) % 8) + 1}.png`

export const convertToJson = s => {
  let json

  if (s) {
    if (typeof s === 'object') {
      json = s
    }
    else {
      try {
        json = JSON.parse(s)
      } catch (err) {}
    }
  }

  return json
}

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))