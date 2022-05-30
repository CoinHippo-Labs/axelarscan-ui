import _ from 'lodash'
import moment from 'moment'

import { uptimes, axelard_cache } from '../index'
import { axelard } from '../executor'
import { base64ToHex, base64ToBech32, delegatorAddress, pubKeyToBech32 } from '../../object/key'
import { chain_manager } from '../../object/chain'
import { denom_manager } from '../../object/denom'
import { tx_manager } from '../../object/tx'
import { equals_ignore_case, to_json } from '../../utils'

const _module = 'lcd'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const block = async (height, params) => {
  const path = `/cosmos/base/tendermint/v1beta1/blocks/${height}`
  let response = await request(path, params)
  if (response?.block?.header) {
    response.block.header.hash = base64ToHex(response.block_id?.hash)
    response.block.header.proposer_address = base64ToBech32(response.block.header.proposer_address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)
    response.block.header.num_txs = typeof response.block.data.txs?.length === 'number' ? response.block.data.txs.length : -1
    response = { data: response.block.header }
  }
  return response
}

export const validator_profile = async params => {
  const qs = new URLSearchParams()
  Object.entries({ ...params, fields: 'pictures' }).forEach(([k, v]) => qs.append(k, v))
  const path = `https://keybase.io/_/api/1.0/user/lookup.json?${qs.toString()}`
  const res = await fetch(path)
    .catch(error => { return null })
  return res && await res.json()
}

export const staking_params = async params => {
  const path = '/cosmos/staking/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const bank_supply = async (denom, params) => {
  const path = `/cosmos/bank/v1beta1/supply${denom ? `/${denom}` : ''}`
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const staking_pool = async params => {
  const path = '/cosmos/staking/v1beta1/pool'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const slashing_params = async params => {
  const path = '/cosmos/slashing/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const distribution_params = async params => {
  const path = '/cosmos/distribution/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const _validators = async (params, validators_data, addresses) => {
  const path = '/cosmos/staking/v1beta1/validators'
  let response = await request(path, params)
  const { validators } = { ...response }
  if (validators) {
    for (let i = 0; i < validators.length; i++) {
      let validator = validators[i]
      if (validator) {
        if (validator.consensus_pubkey?.key) {
          validator.consensus_address = pubKeyToBech32(validator.consensus_pubkey.key, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)
        }
        validator.delegator_address = delegatorAddress(validator.operator_address)
        if (validator.delegator_address && typeof validator.self_delegation !== 'number' && addresses?.includes(validator.operator_address)) {
          validator = await validator_self_delegation(validator, validators_data, true)
        }
        validator.tokens = Number(validator.tokens)
        validator.delegator_shares = Number(validator.delegator_shares)
      }
      validators[i] = validator
    }
    response = {
      data: validators,
      pagination: response.pagination,
    }
  }
  return response
}

export const all_validators = async (params, validators_data, status, addresses, latest_block, denoms) => {
  addresses = (Array.isArray(addresses) ? addresses : [addresses]).filter(a => a)
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _validators({
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    }, validators_data, addresses)
    data = _.orderBy(_.uniqBy(_.concat(data, response?.data || []), 'operator_address'), ['description.moniker'], ['asc'])
    pageKey = response?.pagination?.next_key
  }
  if (latest_block && (['active', 'inactive', 'deregistering'].includes(status) || addresses?.length > 0)) {
    const num_uptime_blocks = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)
    const response = await uptimes({
      query: {
        range: { height: { gt: latest_block - num_uptime_blocks } }
      },
      aggs: {
        uptimes: {
          terms: { field: 'validators.keyword', size: data.length },
        },
      },
    })
    if (response?.data) {
      data = data.map(v => {
        return {
          ...v,
          uptime: (response.data[v?.consensus_address] || 0) * 100 / (response.total || num_uptime_blocks),
        }
      }).map(v => {
        return {
          ...v,
          uptime: typeof v.uptime === 'number' ?
            v.uptime > 100 ? 100 :
            v.uptime < 0 ? 0 :
            v.uptime : undefined,
        }
      })
    }
  }
  if (status || addresses?.length > 0) {
    pageKey = true
    while (pageKey) {
      const response = await slash_signing_infos({
        'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
      })
      const { info } = { ...response }
      data = data.map(v => {
        const i = info?.find(i => equals_ignore_case(i?.address, v?.consensus_address))
        if (i) {
          const { start_height, start_proxy_height, jailed_until, tombstoned, missed_blocks_counter } = { ...i }
          return {
            ...v,
            start_height: Number(start_height),
            start_proxy_height: start_proxy_height || Number(start_height),
            jailed_until: jailed_until && moment(jailed_until).valueOf(),
            tombstoned: typeof tombstoned === 'boolean' ? tombstoned : undefined,
            missed_blocks_counter: Number(missed_blocks_counter),
          }
        }
        return v
      })
      pageKey = response?.pagination?.next_key
    }
  }
  return { data }
}

export const all_validators_broadcaster = async (validators_data, addresses, denoms) => {
  addresses = (Array.isArray(addresses) ? addresses : [addresses]).filter(a => a)
  let data = validators_data || [],
    response = await transactions_by_events(`message.action='RegisterProxy'`, null, true, denoms)
  if (response?.data) {
    data = data.map(v => {
      const tx = response.data.find(tx => !tx?.code && tx?.activities?.findIndex(a => equals_ignore_case(a?.sender, v?.operator_address)) > -1)
      return {
        ...v,
        start_proxy_height: Number(tx?.height) || v?.start_proxy_height,
        broadcaster_address: tx?.activities?.find(a => equals_ignore_case(a?.sender, v?.operator_address))?.address,
        broadcaster_loaded: true,
      }
    })
  }
  const no_bc_data = data.filter(v => !v.broadcaster_address && (addresses.length < 1 || addresses.includes(v.operator_address)))
  let broadcasters_data
  if (no_bc_data.length > 1) {
    response = await axelard_cache({
      query: {
        bool: {
          must: [
            { match: { type: 'proxy' } },
            { range: { updated_at: { gte: moment().subtract(1, 'days').valueOf() / 1000 } } }
          ],
        },
      },
      size: 1000,
    })
    broadcasters_data = response?.data?.map(b => {
      const broadcaster_address = to_json(b?.data?.stdout || b.stdout)?.address
      return {
        operator_address: _.last(b?.id?.split(' ')),
        broadcaster_address,
        broadcaster_loaded: true,
      }
    })
  }
  for (let i = 0; i < no_bc_data.length; i++) {
    const v = no_bc_data[i]
    if (!v.broadcaster_address) {
      v.broadcaster_address = broadcasters_data?.find(b => equals_ignore_case(b?.operator_address, v.operator_address))?.broadcaster_address
      if (!v.broadcaster_address) {
        response = await axelard({
          cmd: `axelard q snapshot proxy ${v.operator_address}`,
          cache: true,
          cache_timeout: 5,
        })
        v.broadcaster_address = to_json(response?.stdout)?.address
      }
      v.broadcaster_loaded = true
    }
  }
  return { data }
}

export const all_validators_status = async validators_data => {
  let data = validators_data || [],
    response = await axelard({
      cmd: 'axelard q tss deactivated-operators -oj',
      cache: true,
      cache_timeout: 15,
    })
  if (to_json(response?.stdout)) {
    const deregistering_addresses = to_json(response.stdout)?.operator_addresses || []
    data = _.orderBy(data.map(v => {
      return {
        ...v,
        deregistering: deregistering_addresses.includes(v.operator_address),
      }
    }), ['deregistering', 'description.moniker'], ['asc', 'asc'])
  }
  response = await axelard({
    cmd: 'axelard q snapshot validators -oj',
    cache: true,
    cache_timeout: 5,
  })
  if (to_json(response?.stdout)) {
    const illegible_addresses = to_json(response.stdout)?.validators?.filter(v => Object.values({ ...v?.tss_illegibility_info }).findIndex(_v => _v) > -1)
    data = _.orderBy(data.map(v => {
      const illegible_validator = illegible_addresses?.find(_v => equals_ignore_case(_v.operator_address, v.operator_address))
      return {
        ...v,
        illegible: !!illegible_validator,
        tss_illegibility_info: illegible_validator?.tss_illegibility_info,
      }
    }), ['illegible', 'deregistering', 'description.moniker'], ['desc', 'asc', 'asc'])
  }
  return { data }
}

export const chain_maintainer = async (id, chains_data) => {
  const data = {}, chains = chains_data?.filter(c => c?.id === id).map(c => c?.id) || []
  for (let i = 0; i < chains.length; i++) {
    const id = chains[i]
    const response = await axelard({
      cmd: `axelard q nexus chain-maintainers ${chain_manager.maintainer_id(id, chains_data)} -oj`,
      cache: true,
      cache_timeout: 5,
    })
    if (to_json(response?.stdout)?.maintainers) {
      data[id] = Object.values(to_json(response.stdout).maintainers)
    }
  }
  return data
}

export const staking_delegations_address = async (operator_address, delegator_address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${operator_address}/delegations/${delegator_address}`
  return await request(path, params)
}

export const validator_self_delegation = async (validator_data, validators_data, status) => {
  if (validator_data?.delegator_address && typeof validator_data.self_delegation !== 'number') {
    validator_data.self_delegation = validators_data?.find(v => typeof v.self_delegation === 'number' && equals_ignore_case(v.operator_address, validator_data.operator_address))?.self_delegation
    if (!validator_data.self_delegation &&
      status && (typeof status === 'boolean' ||
      (['active'].includes(status) ?
        ['BOND_STATUS_BONDED'].includes(validator_data.status) :
        ['deregistering'].includes(status) ?
          validator_data.deregistering :
          !(['BOND_STATUS_BONDED'].includes(validator_data.status))
      ))
    ) {
      const response = await staking_delegations_address(validator_data.operator_address, validator_data.delegator_address)
      validator_data.self_delegation = Number(response?.delegation_response?.delegation?.shares || '0')
    }
  }
  return validator_data
}

export const slash_signing_infos = async params => {
  const path = '/cosmos/slashing/v1beta1/signing_infos'
  return await request(path, params)
}

export const _proposals = async params => {
  const path = '/cosmos/gov/v1beta1/proposals'
  return await request(path, params)
}

export const all_proposals = async (params, denoms) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _proposals({
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.orderBy(_.uniqBy(_.concat(data, response?.proposals?.map(p => {
      const { proposal_id, content, status, submit_time, deposit_end_time, voting_start_time, voting_end_time, total_deposit, final_tally_result } = { ...p }
      return {
        ...p,
        proposal_id: Number(proposal_id),
        type: _.last(content?.['@type']?.split('.') || [])?.replace('Proposal', ''),
        status: status?.replace('PROPOSAL_STATUS_', ''),
        content: {
          ...content,
          plan: content?.plan && {
            ...content.plan,
            height: Number(content.plan.height),
          },
        },
        submit_time: moment(submit_time).valueOf(),
        deposit_end_time: moment(deposit_end_time).valueOf(),
        voting_start_time: moment(voting_start_time).valueOf(),
        voting_end_time: moment(voting_end_time).valueOf(),
        total_deposit: total_deposit?.map(d => {
          return {
            ...d,
            amount: denom_manager.amount(d?.amount, d?.denom, denoms),
            symbol: denom_manager.symbol(d?.denom, denoms),
          }
        }),
        final_tally_result: Object.fromEntries(
          Object.entries({ ...final_tally_result }).map(([k, v]) =>
            [k, denom_manager.amount(Number(v), denoms?.[0]?.denom, denoms)]
          )
        ),
      }
    }) || []), 'proposal_id'), ['proposal_id'], ['desc'])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const proposal = async (id, params, denoms) => {
  const path = `/cosmos/gov/v1beta1/proposals/${id}`
  let response = await request(path, params)
  const { proposal } = { ...response }
  if (proposal) {
    const { proposal_id, content, status, submit_time, deposit_end_time, voting_start_time, voting_end_time, total_deposit, final_tally_result } = { ...proposal }
    response = {
      ...proposal,
      proposal_id: Number(proposal_id),
      type: _.last(content?.['@type']?.split('.') || [])?.replace('Proposal', ''),
      status: status?.replace('PROPOSAL_STATUS_', ''),
      content: {
        ...content,
        plan: content?.plan && {
          ...content.plan,
          height: Number(content.plan.height),
        },
      },
      submit_time: moment(submit_time).valueOf(),
      deposit_end_time: moment(deposit_end_time).valueOf(),
      voting_start_time: moment(voting_start_time).valueOf(),
      voting_end_time: moment(voting_end_time).valueOf(),
      total_deposit: total_deposit?.map(d => {
        return {
          ...d,
          amount: denom_manager.amount(d?.amount, d?.denom, denoms),
          symbol: denom_manager.symbol(d?.denom, denoms),
        }
      }),
      final_tally_result: Object.fromEntries(
        Object.entries({ ...final_tally_result }).map(([k, v]) =>
          [k, denom_manager.amount(Number(v), denoms?.[0]?.denom, denoms)]
        )
      ),
    }
  }
  return response
}

export const _proposal_votes = async (id, params) => {
  const path = `/cosmos/gov/v1beta1/proposals/${id}/votes`
  return await request(path, params)
}

export const all_proposal_votes = async (id, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _proposal_votes(id, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.uniqBy(_.concat(data, response?.votes?.map(v => {
      const { proposal_id, option, options } = { ...v }
      return {
        ...v,
        proposal_id: Number(proposal_id),
        option: option?.replace('VOTE_OPTION_', ''),
        options: options?.map(o => {
          return {
            ...o,
            option: o?.option?.replace('VOTE_OPTION_', ''),
            weight: Number(o?.weight),
          }
        }),
      }
    }) || []), 'voter')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const transactions = async (params, denoms) => {
  const path = '/cosmos/tx/v1beta1/txs'
  let response = await request(path, params)
  if (response?.tx_responses) {
    response.tx_responses = response.tx_responses.map(r => {
      const activities = tx_manager.activities(r, denoms)
      return {
        ...r,
        height: Number(r.height),
        status: tx_manager.status(r),
        type: tx_manager.type(r),
        sender: tx_manager.sender(r),
        fee: tx_manager.fee(r, denoms),
        symbol: tx_manager.symbol(r, denoms),
        gas_used: tx_manager.gas_used(r),
        gas_limit: tx_manager.gas_limit(r),
        memo: tx_manager.memo(r),
        activities,
      }
    })
    response = {
      data: response.tx_responses,
      pagination: response.pagination,
      total: response.pagination && Number(response.pagination.total),
    }
  }
  return response
}

export const transactions_by_events = async (events, data, is_unlimit, denoms) => {
  const page_size = 50, max_size = 500
  let pageKey = true, total = 500, loop_count = 0, txs = [], first_load_txs
  while ((pageKey || total) &&
    txs.length < total &&
    (is_unlimit || txs.length < max_size) &&
    (loop_count < Math.ceil((is_unlimit ? total : max_size) / page_size))
  ) {
    const _pageKey = (is_unlimit || total <= max_size) && pageKey && typeof pageKey === 'string' ? pageKey : undefined
    const _offset = total + (total % page_size === 0 ? 0 : page_size - (total % page_size)) - txs.length
    const response = await transactions({
      events,
      'pagination.key': _pageKey,
      'pagination.limit': page_size,
      'pagination.offset': _pageKey ?
        undefined :
        txs.length > 0 && _offset >= page_size ?
          _offset > total ? total : _offset : txs.length,
    }, denoms)
    txs = _.uniqBy(_.concat(txs, response?.data || []), 'txhash')
    first_load_txs = !first_load_txs ? txs : first_load_txs
    pageKey = response?.pagination?.next_key
    total = response?.pagination && Number(response.pagination.total)
    loop_count++
  }
  if (total > max_size) {
    txs = txs.filter(tx => !first_load_txs || first_load_txs.findIndex(_tx => equals_ignore_case(_tx?.txhash, tx?.txhash)) < 0)
  }
  return {
    data: _.orderBy(_.uniqBy(_.concat(data || [], txs), 'txhash'), ['timestamp', 'height'], ['desc', 'desc']),
    total,
  }
}

export const transactions_by_events_paging = async (events, data, offset, denoms) => {
  const page_size = 50, max_size = 50
  let txs = []
  while (offset > 0 && txs.length < max_size) {
    offset -= page_size
    const response = await transactions({
      events,
      'pagination.limit': page_size,
      'pagination.offset': offset,
    }, denoms)
    txs = _.uniqBy(_.concat(txs, response?.data || []), 'txhash')
    if (txs?.length < page_size) {
      break
    }
  }
  return {
    data:_.orderBy(_.uniqBy(_.concat(data || [], txs), 'txhash'), ['timestamp', 'height'], ['desc', 'desc']),
    offset,
  }
}

export const transaction = async (tx, params, denoms) => {
  const path = `/cosmos/tx/v1beta1/txs/${tx}`
  const response = await request(path, params)
  let data
  if (response?.tx_response) {
    data = { ...response.tx_response }
    data = {
      ...data,
      status: tx_manager.status(data),
      type: tx_manager.type(data),
      sender: tx_manager.sender(data),
      fee: tx_manager.fee(data, denoms),
      symbol: tx_manager.symbol(data, denoms),
      gas_used: tx_manager.gas_used(data),
      gas_limit: tx_manager.gas_limit(data),
      memo: tx_manager.memo(data),
      activities: tx_manager.activities(data, denoms),
    }
  }
  return { data }
}

export const _bank_balances = async (address, params) => {
  const path = `/cosmos/bank/v1beta1/balances/${address}`
  return await request(path, params)
}

export const all_bank_balances = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _bank_balances(address, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.uniqBy(_.concat(data, response?.balances || []), 'denom')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const _staking_delegations = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/delegations/${address}`
  return await request(path, params)
}

export const all_staking_delegations = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _staking_delegations(address, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.concat(data, response?.delegation_responses || [])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const _staking_redelegations = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/delegators/${address}/redelegations`
  return await request(path, params)
}

export const all_staking_redelegations = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _staking_redelegations(address, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.concat(data, response?.redelegation_responses || [])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const _staking_unbonding = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
  return await request(path, params)
}

export const all_staking_unbonding = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _staking_unbonding(address, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.concat(data, response?.unbonding_responses || [])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const distribution_rewards = async (address, params) => {
  const path = `/cosmos/distribution/v1beta1/delegators/${address}/rewards`
  params = {
    ...params,
    cache_timeout: 5,
  }
  return await request(path, params)
}

export const distribution_commissions = async (address, params) => {
  const path = `/cosmos/distribution/v1beta1/validators/${address}/commission`
  params = {
    ...params,
    cache_timeout: 5,
  }
  return await request(path, params)
}

export const validator_sets = async params => {
  const path = '/validatorsets/latest'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const _delegations = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${address}/delegations`
  return await request(path, params)
}

export const all_delegations = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await _delegations(address, {
      ...params,
      'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined,
    })
    data = _.uniqBy(_.concat(data, response?.delegation_responses || []), 'delegation.delegator_address')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}



export const allValidatorsSelfDelegation = async (validators_data, status) => {
  for (let i = 0; i < validators_data.length; i++) {
    let validator_data = validators_data[i]
    validator_data = await validator_self_delegation(validator_data, validators_data, status)
    validators_data[i] = validator_data
  }
  return validators_data
}

export const stakingDelegationsAddressUnbonding = async (operator_address, delegator_address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${operator_address}/delegations/${delegator_address}/unbonding_delegation`
  return await request(path, params)
}