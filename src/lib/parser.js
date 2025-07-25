import { utils } from 'ethers'
const { base64, getAddress, toUtf8String } = { ...utils }
const decodeBase64 = base64.decode
import _ from 'lodash'

export const objToQS = obj => {
  const qs = Object.entries({ ...obj }).filter(([k, v]) => ![undefined, null].includes(v)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  if (!qs) return ''
  return `?${qs}`
}

export const getIcapAddress = string => {
  try {
    return string?.startsWith('0x') ? getAddress(string) : string
  } catch (error) {
    return string
  }
}

export const base64ToString = string => {
  try {
    return toUtf8String(decodeBase64(string))
  } catch (error) {
    return string
  }
}

export const getIBCDenomBase64 = ibcDenom => {
  try {
    return Buffer.from(_.last(toArray(ibcDenom, { delimiter: '/' }))).toString('base64')
  } catch (error) {
    return ibcDenom
  }
}

export const getInputType = (string, chainsData) => {
  if (!string) return

  const regexMap = {
    txhash: new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm'),
    evmAddress: new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm'),
    domainName: new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm'),
    validator: new RegExp('axelarvaloper.*$', 'igm'),
    axelarAddress: new RegExp('axelar.*$', 'igm'),
    cosmosAddress: Object.fromEntries(toArray(chainsData).filter(d => d.prefix_address && d.prefix_address !== 'axelar').map(d => [d.id, new RegExp(`${d.prefix_address}.*$`, 'igm')])),
  }

  return _.head(
    Object.entries(regexMap).filter(([k, v]) => k === 'cosmosAddress' ?
      Object.entries(v).findIndex(([k, v]) => string.match(v) && string.startsWith(chainsData.find(d => d.id === k)?.prefix_address)) > -1 :
      string.match(v)
    ).map(([k, v]) => k)
  ) || (!isNaN(string) ? 'block' : 'tx')
}

export const toJson = string => {
  if (!string) return null
  if (typeof string === 'object') return string
  try {
    if (typeof string === 'string' && string.startsWith('{') && string.endsWith('}') && !string.includes('"')) {
      try {
        string = `{${split(string.substring(1, string.length - 1), { delimiter: ',' }).map(s => split(s, { delimiter: ':' }).map(s => typeof s === 'string' ? `"${s}"` : s).join(':')).join(',')}}`
      } catch (error) {}
    }

    return JSON.parse(string)
  } catch (error) {
    return null
  }
}

export const toHex = byteArray => {
  let string = '0x'
  if (typeof byteArray === 'string' && byteArray.startsWith('[') && byteArray.endsWith(']')) byteArray = toJson(byteArray)
  if (Array.isArray(byteArray)) byteArray.forEach(byte => string += ('0' + (byte & 0xFF).toString(16)).slice(-2))
  else string = byteArray
  return string
}

export const toCase = (string, _case = 'normal') => {
  if (typeof string !== 'string') return string
  string = string.trim()
  switch (_case) {
    case 'upper':
      string = string.toUpperCase()
      break
    case 'lower':
      string = string.toLowerCase()
      break
    default:
      break
  }
  return string
}

const getOptions = options => {
  let { delimiter, toCase: _toCase, filterBlank } = { ...options }
  delimiter = typeof delimiter === 'string' ? delimiter : ','
  _toCase = _toCase || 'normal'
  filterBlank = typeof filterBlank === 'boolean' ? filterBlank : true
  return { ...options, delimiter, toCase: _toCase, filterBlank }
}

export const split = (string, options) => {
  const { delimiter, toCase: _toCase, filterBlank } = { ...getOptions(options) }
  return (typeof string !== 'string' && ![undefined, null].includes(string) ? [string] : (typeof string === 'string' ? string : '').split(delimiter).map(s => toCase(s, _toCase))).filter(s => !filterBlank || s)
}

export const toArray = (x, options) => {
  options = getOptions(options)
  const { toCase: _toCase, filterBlank } = { ...options }
  if (Array.isArray(x)) return x.map(_x => toCase(_x, _toCase)).filter(_x => !filterBlank || _x)
  return split(x, options)
}

export const parseError = error => {
  let message = error?.reason || error?.data?.message || error?.data?.text || error?.message || (typeof error === 'string' ? error : undefined)
  const code = _.slice(split(message, { delimiter: ' ', toCase: 'lower' }), 0, 2).join('_')

  if (message?.includes('ACTION_REJECTED') || code === 'user_rejected') {
    message = 'User Rejected'
  }

  return { code, message }
}

export const getValuesOfAxelarAddressKey = data => Object.entries({ ...data }).filter(([k, v]) => k.startsWith('axelar') && v).map(([k, v]) => v)
