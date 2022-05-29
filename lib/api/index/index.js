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
      data: Object.fromEntries(response.aggs.heartbeats.buckets.map(r => [r.key, r.period_height?.buckets && record.period_height.buckets.length <= 100000 ? record.period_height.buckets.length : record.doc_count])),
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
  return response
}

export const evm_polls = async params => {
  const path = '/evm_polls/_search'
  params = {
    ...params,
    collection: 'evm_polls',
    method: 'search',
  }
  return await request(path, params)
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
  if (response?.aggs?.from_chains?.buckets) {
    response = {
      data: response.aggs.from_chains.buckets.flatMap(f => (
        f.to_chains?.buckets?.flatMap(t => (
          t.assets?.buckets?.map(a => {
            return {
              id: `${f.key}_${t.key}_${a.key}`,
              from_chain: f.key,
              to_chain: t.key,
              asset: a.key,
              tx: a.doc_count,
              amount: a.amounts?.value,
              avg_amount: a.avg_amounts?.value,
              max_amount: a.max_amounts?.value,
              since: a.since?.value,
              times: a.times?.buckets?.map(time => {
                return {
                  time: time.key,
                  tx: time.doc_count,
                  amount: time.amounts?.value,
                }
              }),
            }
          }) || []
        )) || []
      )) || [],
    }
    response.total = response.data?.length
  }
  else if (response?.aggs?.assets?.buckets) {
    response = {
      data: response.aggs.assets.buckets.flatMap(a => (
        a.to_chains?.buckets?.map(t => {
          return {
            id: `${a.key}_${t.key}`,
            asset: a.key,
            to_chain: t.key,
            tx: t.doc_count,
            amount: t.amounts?.value,
            avg_amount: t.avg_amounts?.value,
            max_amount: t.max_amounts?.value,
            since: t.since?.value,
            times: t.times?.buckets?.map(time => {
              return {
                time: time.key,
                tx: time.doc_count,
                amount: time.amounts?.value,
              }
            }),
          }
        }) || []
      )) || [],
    }
    response.total = response.data?.length
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
  return await request(path, params)
}