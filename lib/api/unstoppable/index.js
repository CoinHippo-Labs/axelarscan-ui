import _ from 'lodash'

import { toArray, equalsIgnoreCase } from '../../utils'

const request = async params => {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/unstoppable-domains-integrations/dot-crypto-registry', { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

const domains = async params => {
  const size = typeof params?.size === 'number' ? params.size : 1000
  if (typeof params?.size !== 'undefined') {
    delete params.size
  }

  const where = params?.where
  if (typeof params?.where !== 'undefined') {
    delete params.where
  }

  let data
  let skip = 0
  let hasMore = true

  while (hasMore) {
    const query = `{
      domains(skip: ${skip}, first: ${size}${where ? `, where: ${where}` : ''}) {
        id
        name
        owner {
          id
        }
        resolver {
          id
        }
      }
    }`

    const response = await request({ query })
    const { domains } = { ...response?.data }
    data = _.uniqBy(toArray(_.concat(data, domains)), 'id')
    hasMore = where && domains?.length === size

    if (hasMore) {
      skip += size
    }
  }

  return { data }
}

export const getUNSTOPPABLE = async addresses => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, 'lower'))

    let domains_data
    const addresses_chunk = _.chunk(addresses, 50)
    for (const _addresses of addresses_chunk) {
      const response = await domains({ where: `{ owner_in: [${_addresses.map(a => `"${a}"`).join(',')}] }` })
      const { data } = { ...response }
      domains_data = toArray(_.concat(domains_data, data))
    }

    if (domains_data?.length > 0) {
      for (const address of addresses) {
        const resolved_addresses = domains_data.filter(d => equalsIgnoreCase(d.owner?.id, address))
        if (resolved_addresses.length < 1) {
          domains_data.push({ owner: { id: address } })
        }
      }
      return Object.fromEntries(domains_data.map(d => [d.owner?.id?.toLowerCase(), { ...d }]))
    }
  }
  return null
}