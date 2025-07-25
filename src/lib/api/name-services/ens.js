import _ from 'lodash'

import { toCase, toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'
import { isNumber, toNumber } from '@/lib/number'

const request = async params => {
  const response = await fetch('https://gateway-arbitrum.network.thegraph.com/api/44733860e4dbf89d70eee7c63bc06bf8/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH', { method: 'POST', body: JSON.stringify(params) }).catch(error => null)
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
        labelName
        labelhash
        parent {
          id
          name
        }
        subdomains {
          id
          name
        }
        resolvedAddress {
          id
        }
        resolver {
          id
          address
          addr {
            id
          }
          texts
          coinTypes
        }
        ttl
        isMigrated
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

const getReverseRecord = async address => {
  const response = await fetch(`https://ens.fafrd.workers.dev/ens/${address}`).catch(error => null)
  return response && await response.json()
}

export const getENS = async addresses => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, { toCase: 'lower' }))

    let domainsData

    for (const chunk of _.chunk(addresses, 50)) {
      const { data } = { ...await getDomains({ where: `{ resolvedAddress_in: [${chunk.map(a => `"${a}"`).join(',')}] }` }) }
      domainsData = toArray(_.concat(domainsData, data))
    }

    if (domainsData?.length > 0) {
      const ensData = {}

      for (const address of addresses) {
        const resolvedAddresses = domainsData.filter(d => equalsIgnoreCase(d.resolvedAddress?.id, address))

        if (resolvedAddresses.length > 1) {
          ensData[address] = undefined // await getReverseRecord(address)
        }
        else if (resolvedAddresses.length === 0) {
          domainsData.push({ resolvedAddress: { id: address } })
        }
      }

      const getKeyFromDomain = d => toCase(d.resolvedAddress?.id, 'lower')

      return Object.fromEntries(
        domainsData.filter(d => {
          const { reverseRecord } = { ...ensData[getKeyFromDomain(d)] }
          return !reverseRecord || equalsIgnoreCase(d.name, reverseRecord)
        }).map(d => [getKeyFromDomain(d), d])
      )
    }
  }

  return
}

export const getDomainFromENS = async (ens, ensData) => {
  if (ens) {
    let domainData = toArray(Object.values({ ...ensData })).find(d => equalsIgnoreCase(d.name, ens))
    if (domainData) return domainData

    const { data } = { ...await getDomains({ where: `{ name_in: ["${toCase(ens, 'lower')}"] }` }) }

    return toArray(data).find(d => equalsIgnoreCase(d.name, ens))
  }

  return
}
