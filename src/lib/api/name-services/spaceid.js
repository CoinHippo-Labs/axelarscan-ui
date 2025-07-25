import SID, { getSidAddress } from '@siddomains/sidjs'
import _ from 'lodash'

import { getProvider } from '@/lib/chain/evm'
import { getChainData } from '@/lib/config'
import { toCase, toArray } from '@/lib/parser'
import { equalsIgnoreCase } from '@/lib/string'

const TLDS = {
  binance: 'bnb',
  arbitrum: 'arb1',
}

const request = async (params, chainsData) => {
  const { tld, address } = { ...params }

  try {
    const chain = _.head(Object.entries(TLDS).find(([k, v]) => tld === v))
    const { chain_id } = { ...getChainData(chain, chainsData) }

    const sid = new SID({
      provider: getProvider(chain, chainsData),
      sidAddress: getSidAddress(chain_id),
    })

    return await sid.getName(address)
  } catch (error) {
    return
  }
}

const getDomains = async (params, chain, chainsData) => {
  const { address } = { ...params }
  let { tld } = { ...params }

  if (!tld) {
    tld = TLDS[toCase(chain, 'lower')]
  }

  const tlds = _.uniq(toArray(_.concat(tld, Object.values(TLDS))))
  let data

  for (const tld of tlds) {
    const response = await request({ tld, address }, chainsData)

    if (response?.name) {
      data = _.uniqBy(toArray(_.concat(data, { ...response, address })), 'address')
      break
    }
  }

  return { data }
}

export const getSpaceID = async (addresses, chain, chainsData) => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, { toCase: 'lower' }))

    let domainsData

    for (const chunk of _.chunk(addresses, 50)) {
      for (const address of chunk) {
        const { data } = { ...await getDomains({ address }, chain, chainsData) }
        domainsData = toArray(_.concat(domainsData, data))
      }
    }

    if (domainsData?.length > 0) {
      for (const address of addresses) {
        const resolvedAddresses = domainsData.filter(d => equalsIgnoreCase(d.address, address))

        if (resolvedAddresses.length === 0) {
          domainsData.push({ address })
        }
      }

      return Object.fromEntries(domainsData.map(d => [toCase(d.address, 'lower'), d]))
    }
  }

  return
}
