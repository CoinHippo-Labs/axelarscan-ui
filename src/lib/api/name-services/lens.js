import _ from 'lodash'

import { toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'
import { isNumber, toNumber } from '@/lib/number'

const request = async params => {
  const response = await fetch('https://api.lens.dev', { method: 'POST', body: JSON.stringify(params), headers: { 'Content-Type': 'application/json' } }).catch(error => { return null })
  return response && await response.json()
}

const getDomains = async params => {
  const { addresses } = { ...params }
  let { limit } = { ...params }
  limit = isNumber(limit) ? toNumber(limit) : 50

  const query = `query {
    profiles(request: { limit: ${limit}, ownedBy: [${toArray(addresses).map(a => `"${a}"`).join(',')}] }) {
      items {
        id
        name
        bio
        metadata
        handle
        picture {
          ... on MediaSet {
            original {
              url
              mimeType
            }
          }
        }
        ownedBy
      }
    }
  }`
  const response = await request({ query })
  const { items } = { ...response?.data?.profiles }

  return { data: _.uniqBy(toArray(items).filter(d => d.handle && d.ownedBy), 'ownedBy') }
}

export const getLENS = async addresses => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, { toCase: 'lower' }))

    let domainsData
    for (const chunk of _.chunk(addresses, 50)) {
      const { data } = { ...await getDomains({ addresses: chunk }) }
      domainsData = toArray(_.concat(domainsData, data))
    }

    if (domainsData?.length > 0) {
      for (const address of addresses) {
        const resolvedAddresses = domainsData.filter(d => equalsIgnoreCase(d.ownedBy, address))
        if (resolvedAddresses.length === 0) domainsData.push({ ownedBy: address })
      }
      return Object.fromEntries(domainsData.map(d => [d.ownedBy?.toLowerCase(), { ...d }]))
    }
  }
  return null
}
