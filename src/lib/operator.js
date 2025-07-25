import { find } from '@/lib/string'
import { toNumber } from '@/lib/number'

export const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

export const getParams = (searchParams, size = 25) => {
  const params = {}

  for (const [k, v] of searchParams.entries()) {
    switch (k) {
      case 'page':
        params.from = (toNumber(v) - 1) * size
        break
      default:
        params[k] = v
        break
    }
  }

  return params
}

export const getQueryString = params => {
  if (!(Object.keys({ ...params }).length > 0)) {
    return ''
  }

  const qs = new URLSearchParams()

  Object.entries(params).filter(([k, v]) => v && !find(k, ['from'])).forEach(([k, v]) => {
    qs.append(k, v)
  })

  return `?${qs.toString()}`
}

export const generateKeyByParams = params => JSON.stringify(params)

export const isFiltered = params => Object.keys({ ...params }).filter(k => !find(k, ['from'])).length > 0
