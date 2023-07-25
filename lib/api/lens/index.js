import _ from 'lodash'

import { toArray, equalsIgnoreCase } from '../../utils'

const request = async params => {
  const response = await fetch('https://api.lens.dev', { method: 'POST', body: JSON.stringify(params), headers: { 'Content-Type': 'application/json' } }).catch(error => { return null })
  return response && await response.json()
}

const domains = async params => {
  const limit = typeof params?.limit === 'number' ? params.limit : 50
  const { addresses } = { ...params }

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
    addresses = _.uniq(toArray(addresses, 'lower'))

    let domains_data
    const addresses_chunk = _.chunk(addresses, 50)
    for (const _addresses of addresses_chunk) {
      const response = await domains({ addresses: _addresses })
      const { data } = { ...response }
      domains_data = toArray(_.concat(domains_data, data))
    }

    if (domains_data?.length > 0) {
      for (const address of addresses) {
        const resolved_addresses = domains_data.filter(d => equalsIgnoreCase(d.ownedBy, address))
        if (resolved_addresses.length < 1) {
          domains_data.push({ ownedBy: address })
        }
      }
      return Object.fromEntries(domains_data.map(d => [d.ownedBy?.toLowerCase(), { ...d }]))
    }
  }
  return null
}