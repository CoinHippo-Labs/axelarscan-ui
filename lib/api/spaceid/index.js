import SID, { getSidAddress } from '@siddomains/sidjs'
import _ from 'lodash'

import { getProvider } from '../../chain/evm'
import { getChainData } from '../../config'
import { toArray, equalsIgnoreCase } from '../../utils'

const TLDS = {
  binance: 'bnb',
  arbitrum: 'arb1',
}

const request = async (params, chains_data) => {
  // const qs = new URLSearchParams()
  // Object.entries({ ...params }).forEach(([k, v]) => qs.append(k, v))
  // const qs_string = qs.toString()
  // const response = await fetch(`https://api.prd.space.id/v1/getName${qs_string ? `?${qs_string}` : ''}`).catch(error => { return null })
  // return response && await response.json()
  let output
  const { tld, address } = { ...params }
  try {
    const chain = _.head(Object.entries(TLDS).find(([k, v]) => tld === v))
    const { chain_id } = { ...getChainData(chain, chains_data) }
    const sid = new SID({ provider: getProvider(chain, chains_data), sidAddress: getSidAddress(chain_id) })
    output = await sid.getName(address)
  } catch (error) {}
  return output
}

const domains = async (params, chain, chains_data) => {
  const { address } = { ...params }
  let { tld } = { ...params }
  tld = tld || TLDS[chain?.toLowerCase()]

  const tlds = _.uniq(toArray(_.concat(tld, Object.values(TLDS))))
  let data
  for (const tld of tlds) {
    const response = await request({ tld, address }, chains_data)
    const { name } = { ...response }
    if (name) {
      data = _.uniqBy(toArray(_.concat(data, { ...response, address })), 'address')
      break
    }
  }

  return { data }
}

export const getSPACEID = async (addresses, chain, chains_data) => {
  if (addresses) {
    addresses = _.uniq(toArray(addresses, 'lower'))

    let domains_data
    const addresses_chunk = _.chunk(addresses, 50)
    for (const _addresses of addresses_chunk) {
      for (const address of _addresses) {
        const response = await domains({ address }, chain, chains_data)
        const { data } = { ...response }
        domains_data = toArray(_.concat(domains_data, data))
      }
    }

    if (domains_data?.length > 0) {
      for (const address of addresses) {
        const resolved_addresses = domains_data.filter(d => equalsIgnoreCase(d.address, address))
        if (resolved_addresses.length < 1) {
          domains_data.push({ address })
        }
      }
      return Object.fromEntries(domains_data.map(d => [d.address?.toLowerCase(), { ...d }]))
    }
  }
  return null
}