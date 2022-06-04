import _ from 'lodash'

import { tx_manager } from '../../object/tx'
import { base64ToHex, base64ToBech32 } from '../../object/key'

const _module = 'index'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const transactions = async (params, denoms) => {
  const path = '/txs/_search'
  params = {
    ...params,
    collection: 'txs',
    method: 'search',
  }
  const _response = await request(path, params)
  let response = _.cloneDeep(_response)
  if (response?.data) {
    response.data = response.data.map(d => {
      return {
        ...d,
        status: tx_manager.status(d),
        type: tx_manager.type(d),
        sender: tx_manager.sender(d),
        fee: tx_manager.fee(d, denoms),
        symbol: tx_manager.symbol(d, denoms),
        gas_used: tx_manager.gas_used(d),
        gas_limit: tx_manager.gas_limit(d),
        memo: tx_manager.memo(d),
        activities: tx_manager.activities(d, denoms),
      }
    })
  }
  if (_response?.aggs?.types?.buckets) {
    response = {
      data: _response.aggs.types.buckets.map(r => r?.key).filter(t => t),
    }
  }
  return response
}

export const blocks = async params => {
  const path = '/blocks/_search'
  params = {
    ...params,
    collection: 'blocks',
    method: 'search',
  }
  const response = await request(path, params)
  if (response?.data) {
    response.data = response.data.map(d => {
      return {
        ...d,
        hash: base64ToHex(d.hash),
        proposer_address: base64ToBech32(d.proposer_address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS),
        num_txs: typeof d.num_txs === 'number' ? d.num_txs : -1,
      }
    })
  }
  return response
}

export const uptimes = async params => {
  const path = '/uptimes/_search'
  params = {
    size: 0,
    ...params,
    collection: 'uptimes',
    method: 'search',
  }
  let response = await request(path, params)
  if (response?.aggs?.uptimes?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.uptimes.buckets.map(r => [base64ToBech32(r.key, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS), r.doc_count])),
      total: response.total,
    }
  }
  return response
}

export const heartbeats = async params => {
  const path = '/heartbeats/_search'
  params = {
    size: 0,
    ...params,
    collection: 'heartbeats',
    method: 'search',
  }
  let response = await request(path, params)
  if (response?.aggs?.heartbeats?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.heartbeats.buckets.map(r => [r.key, r.period_height?.buckets && r.period_height.buckets.length <= 100000 ? r.period_height.buckets.length : r.doc_count])),
      total: response.total,
    }
  }
  return response
}

export const evm_votes = async params => {
  const path = '/evm_votes/_search'
  params = {
    size: 0,
    ...params,
    collection: 'evm_votes',
    method: 'search',
  }
  const _response = await request(path, params)
  let response = _.cloneDeep(_response)
  if (response?.aggs?.voters?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.voters.buckets.map(v => [
        v.key,
        {
          chains: Object.fromEntries((v.chains?.buckets || []).map(c => [
            c.key,
            {
              votes: Object.fromEntries((c.votes?.buckets || []).map(_v => [_v.key_as_string, _v.doc_count])),
              total: c.doc_count,
            },
          ])),
          total: v.doc_count,
        },
      ])),
      total: response.total,
    }
  }
  else if (response?.aggs?.chains?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.chains.buckets.map(c => [
        c.key,
        {
          votes: Object.fromEntries((c.votes?.buckets || []).map(_v => [_v.key_as_string, _v.doc_count])),
          total: c.doc_count,
        },
      ])),
      total: response.total,
    }
  }
  return response
}

export const evm_polls = async params => {
  const path = '/evm_polls/_search'
  params = {
    size: 0,
    ...params,
    collection: 'evm_polls',
    method: 'search',
  }
  const _response = await request(path, params)
  let response = _.cloneDeep(_response)
  if (response?.aggs?.chains?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.chains.buckets.map(c => [
        c.key,
        c.doc_count,
      ])),
      total: response.total,
    }
  }
  return response
}

export const keygens = async (params, is_success = true) => {
  const path = '/keygens/_search'
  params = {
    ...params,
    collection: 'keygens',
    method: 'search',
    query: is_success ?
      {
        bool: {
          must_not: [
            { exists: { field: 'failed' } },
          ],
        },
      } :
      { match: { failed: true } },
  }
  return await request(path, params)
}

export const sign_attempts = async params => {
  const path = '/sign_attempts/_search'
  params = {
    ...params,
    collection: 'sign_attempts',
    method: 'search',
  }
  return await request(path, params)
}

export const axelard = async params => {
  const path = '/axelard/_search'
  params = {
    ...params,
    collection: 'axelard',
    method: 'search',
  }
  return await request(path, params)
}

export const deposit_addresses = async params => {
  const path = '/deposit_addresses/_search'
  params = {
    size: 0,
    ...params,
    collection: 'deposit_addresses',
    method: 'search',
  }
  return await request(path, params)
}

export const transfers = async params => {
  const path = '/transfers/_search'
  params = {
    size: 0,
    ...params,
    collection: 'transfers',
    method: 'search',
  }
  let response = await request(path, params)
  if (response?.aggs?.source_chains?.buckets) {
    response = {
      data: response.aggs.source_chains.buckets.flatMap(s => (
        s.destination_chains?.buckets?.flatMap(d => (
          d.assets?.buckets?.map(a => {
            return {
              id: `${s.key}_${d.key}_${a.key}`,
              source_chain: s.key,
              destination_chain: d.key,
              asset: a.key,
              num_txs: a.doc_count,
              volume: a.volume?.value,
            }
          }) || [{
            id: `${s.key}_${d.key}`,
            source_chain: s.key,
            destination_chain: d.key,
            num_txs: d.doc_count,
            volume: d.volume?.value,
          }],
        )) || [{
          id: `${s.key}`,
          source_chain: s.key,
          num_txs: s.doc_count,
          volume: s.volume?.value,
        }],
      )),
    }
    response.total = response.data?.length
  }
  else if (response?.aggs?.assets?.buckets) {
    response = {
      data: response.aggs.assets.buckets.flatMap(a => (
        a.destination_chains?.buckets?.map(d => {
          return {
            id: `${a.key}_${d.key}`,
            asset: a.key,
            destination_chain: d.key,
            num_txs: d.doc_count,
            volume: d.volume?.value,
          }
        }) || [{
          id: `${a.key}`,
          asset: a.key,
          num_txs: a.doc_count,
          volume: a.volume?.value,
        }],
      )),
    }
    response.total = response.data?.length
  }
  else if (response?.aggs?.cumulative_volume?.buckets) {
    response = {
      data: response.aggs.cumulative_volume.buckets.map(c => {
        return {
          timestamp: c.key,
          volume: c.volume?.value || 0,
          cumulative_volume: c.cumulative_volume?.value || 0,
          num_txs: c.doc_count,
        }
      }),
      total: response.total,
    }
  }
  return response
}

export const batches = async params => {
  const path = '/batches/_search'
  params = {
    ...params,
    collection: 'batches',
    method: 'search',
  }
  let response = await request(path, params)
  if (response?.aggs?.types?.buckets) {
    response = {
      data: response.aggs.types.buckets.map(r => r?.key).filter(t => t),
    }
  }
  return response
}

export const fieldsToObj = (fields_data, array_fields = []) => {
  const obj = {}
  const fields = Object.keys(fields_data).filter(field => field && !field.endsWith('.keyword'))
  
  fields.filter(field => !field.includes('.')).forEach(field => {
    const value = fields_data[field]
    obj[field] = array_fields.includes(field) ? value : _.head(value)
  })

  const nested_fields = fields.filter(field => field.includes('.'))
  const csv = [nested_fields.join(',')]

  for (let i = 0; i < fields_data[_.head(nested_fields)]?.length; i++) {
    const data = []
    nested_fields.forEach(field => {
      const value = fields_data[field][i]
      data.push(value)
    })
    csv.push(data.join(','))
  }

  const json = csvToJson(csv)
  const nested_obj_fields = Object.keys(_.head(json) || {})
  const _obj = Object.fromEntries(nested_obj_fields.map(field => [field, json.map(data => data[field])]))
  return mergeObj(obj, _obj)
}

const csvToJson = csv => {
  const construct = (key, parent, value) => {
    if (key?.split('.').length === 1) {
      parent[key] = value
      return parent
    }

    const _key = key.split('.')[0]
    if (!parent[_key]) {
      parent[_key] = {}
    }
    if (key.split('.').length > 0) {
      parent[_key] = construct(key.split('.').slice(1).join('.'), parent[_key], value)
    }
    return parent
  }

  const attrs = _.head(csv?.splice(0, 1) || [])?.split(',')
  const json = csv?.map(row => {
    var obj = {}
    var values = row.split(',')
    attrs?.forEach((value, i) => {
      obj = construct(value, obj, values[i])
    })
    return obj
  })
  return json
}

const mergeObj = (a, b) => {
  Object.entries(b || {}).forEach(([key, value]) => {
    a[key] = value
  })
  return a
}