import _ from 'lodash'

import { tx_manager } from '../../object/tx'
import { base64ToHex, base64ToBech32 } from '../../object/key'
// import { getRequestUrl } from '../../utils'

const _module = 'index'

const request = async (path, params) => {
  // const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
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
    index: 'txs',
    method: 'search',
  }

  const _response = await request(path, params)
  let response = _response
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
    response = { data: _response.aggs.types.buckets.map(record => record?.key).filter(t => t) }
  }
  return response
}

export const blocks = async params => {
  const path = '/blocks/_search'
  params = {
    ...params,
    index: 'blocks',
    method: 'search',
  }

  let response = await request(path, params)
  if (response?.data) {
    response.data = response.data.map(d => {
      return {
        ...d,
        hash: base64ToHex(d.hash),
        proposer_address: base64ToBech32(d.proposer_address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS),
        txs: typeof d.txs === 'number' ? d.txs : -1,
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
    index: 'uptimes',
    method: 'search',
  }

  let response = await request(path, params)
  if (response?.aggs?.uptimes?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.uptimes.buckets.map(record => [base64ToBech32(record.key, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS), record.doc_count])),
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
    index: 'heartbeats',
    method: 'search',
  }

  let response = await request(path, params)
  if (response?.aggs?.heartbeats?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.heartbeats.buckets.map(record => [record.key, record.heightgroup?.buckets && record.heightgroup?.buckets.length <= 100000 ? record.heightgroup.buckets.length : record.doc_count])),
      total: response.total,
    }
  }
  return response
}

export const searchAxelard = async params => {
  const path = '/axelard/_search'
  params = {
    ...params,
    index: 'axelard',
    method: 'search',
  }

  const response = await request(path, params)
  return response
}

export const successKeygens = async params => {
  const path = '/keygens/_search'
  params.query = { bool: { must_not: [{ exists: { field: 'failed' } }] } }
  params = {
    ...params,
    index: 'keygens',
    method: 'search',
  }

  const response = await request(path, params)
  return response
}

export const failedKeygens = async params => {
  const path = '/keygens/_search'
  params.query = { match: { failed: true } }
  params = {
    ...params,
    index: 'keygens',
    method: 'search',
  }

  const response = await request(path, params)
  return response
}

export const signAttempts = async params => {
  const path = '/sign_attempts/_search'
  params = {
    ...params,
    index: 'sign_attempts',
    method: 'search',
  }

  let response = await request(path, params)
  if (response?.data) {
    response = {
      ...response,
      total: response.aggs?.total?.buckets?.find(d => d?.key_as_string === 'true')?.doc_count || response.total,
    }
  }
  return response
}

export const historical = async params => {
  const path = '/historical/_search'
  params = {
    size: 0,
    ...params,
    index: 'historical',
    method: 'search',
  }

  let response = await request(path, params)
  if (response?.data) {
    response = {
      ...response,
      data: _.orderBy(response.data, ['description.moniker'], ['asc']),
    }
  }
  if (response?.aggs?.historical?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.historical.buckets.map(record => [record.key, record.doc_count])),
      total: response.total,
    }
  }
  if (response?.aggs?.validators?.buckets) {
    response = {
      data: response.aggs.validators.buckets.map(record => {
        return {
          operator_address: record.key,
          description: {
            moniker: _.head(record.moniker?.buckets?.map(obj => obj?.key).filter(v => v)),
            identity: _.head(record.identity?.buckets?.map(obj => obj?.key).filter(v => v)),
          },
          supported_chains: record.supported_chains?.buckets?.filter(obj => obj?.key && obj?.doc_count).map(obj => { return { chain: obj.key, count: obj.doc_count } }) || [],
          vote_participated: record.vote_participated?.value,
          vote_not_participated: record.vote_not_participated?.value,
          keygen_participated: record.keygen_participated?.value,
          keygen_not_participated: record.keygen_not_participated?.value,
          sign_participated: record.sign_participated?.value,
          sign_not_participated: record.sign_not_participated?.value,
          up_heartbeats: record.up_heartbeats?.value,
          missed_heartbeats: record.missed_heartbeats?.value,
          ineligibilities_jailed: record.ineligibilities_jailed?.value,
          ineligibilities_tombstoned: record.ineligibilities_tombstoned?.value,
          ineligibilities_missed_too_many_blocks: record.ineligibilities_missed_too_many_blocks?.value,
          ineligibilities_no_proxy_registered: record.ineligibilities_no_proxy_registered?.value,
          ineligibilities_proxy_insuficient_funds: record.ineligibilities_proxy_insuficient_funds?.value,
          ineligibilities_tss_suspended: record.ineligibilities_tss_suspended?.value,
          up_blocks: record.up_blocks?.value,
          missed_blocks: record.missed_blocks?.value,
          num_blocks_jailed: record.num_blocks_jailed?.value,
        }
      }),
      total: response.aggs.validators.buckets.length,
    }
  }
  return response
}

export const linkedAddresses = async params => {
  const path = '/linked_addresses/_search'
  params = {
    size: 0,
    ...params,
    index: 'linked_addresses',
    method: 'search',
  }

  const response = await request(path, params)
  return response
}

export const crosschainTxs = async params => {
  const path = '/crosschain_txs/_search'
  params = {
    size: 0,
    ...params,
    index: 'crosschain_txs',
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

export const evmVotes = async params => {
  const path = '/evm_votes/_search'
  params = {
    size: 0,
    ...params,
    index: 'evm_votes',
    method: 'search',
  }

  let response = await request(path, params)
  const _response = _.cloneDeep(response)
  if (response?.aggs?.votes?.buckets) {
    response = {
      data: Object.fromEntries(response.aggs.votes.buckets.map(record => [
        record.key,
        {
          chains: Object.fromEntries((record.chains?.buckets || []).map(c => [
            c.key,
            {
              confirms: Object.fromEntries((c.confirms?.buckets || []).map(cf => [cf.key_as_string, cf.doc_count])),
              total: c.doc_count,
            },
          ])),
          total: record.doc_count,
        },
      ])),
      total: response.total,
    }
  }
  if (_response?.aggs?.all_votes?.buckets) {
    response = {
      ...response,
      all_data: Object.fromEntries(_response.aggs.all_votes.buckets.map(record => [
        record.key,
        record.polls?.value,
      ])),
    }
  }
  if (_response?.aggs?.all_polls?.buckets) {
    response = {
      ...response,
      all_polls: _.slice(_.orderBy(_response.aggs.all_polls.buckets.map(record => {
        return {
          poll_id: record.key,
          sender_chain: _.head((record.sender_chain?.buckets || []).map(c => c.key)),
          height: record.height?.value,
          created_at: record.created_at?.value,
        }
      }), ['created_at'], ['desc']), 0, Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS)),
    }
  }
  return response
}