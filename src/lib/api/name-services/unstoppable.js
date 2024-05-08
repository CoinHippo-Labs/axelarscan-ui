import _ from 'lodash'

import { toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'
import { isNumber, toNumber } from '@/lib/number'

const request = async params => {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/unstoppable-domains-integrations/dot-crypto-registry', { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

const getDomains = async params => {
  const { where } = { ...params }
  let { size } = { ...params }
  size = isNumber(size) ? toNumber(size) : 1000

  if (params) {
    delete params.where
    delete params.size
  }

  let data
  let hasMore = true
  let skip = 0
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
    if (hasMore) skip += size
  }

  return { data }
}

export const getUnstoppable = async addresses => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, { toCase: 'lower' }))

    let domainsData
    for (const chunk of _.chunk(addresses, 50)) {
      const { data } = { ...await getDomains({ where: `{ owner_in: [${chunk.map(a => `"${a}"`).join(',')}] }` }) }
      domainsData = toArray(_.concat(domainsData, data))
    }

    if (domainsData?.length > 0) {
      for (const address of addresses) {
        const resolvedAddresses = domainsData.filter(d => equalsIgnoreCase(d.owner?.id, address))
        if (resolvedAddresses.length === 0) domainsData.push({ owner: { id: address } })
      }
      return Object.fromEntries(domainsData.map(d => [d.owner?.id?.toLowerCase(), { ...d }]))
    }
  }
  return null
}
