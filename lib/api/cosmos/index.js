import _ from 'lodash'
import moment from 'moment'

import { uptimes, searchAxelard } from '../opensearch'
import { axelard } from '../executor'
import { tx_manager } from '../../object/tx'
import { base64ToHex, base64ToBech32, delegatorAddress, pubKeyToBech32 } from '../../object/key'
import { chain_manager } from '../../object/chain'
import { denomer } from '../../object/denom'
import { getRequestUrl, randImage, convertToJson } from '../../utils'

const _module = 'lcd'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const block = async (height, params) => {
  const path = `/cosmos/base/tendermint/v1beta1/blocks/${height}`
  let response = await request(path, params)
  if (response?.block?.header) {
    response.block.header.hash = base64ToHex(response.block_id?.hash)
    response.block.header.proposer_address = base64ToBech32(response.block.header.proposer_address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)
    response.block.header.txs = typeof response.block.data.txs?.length === 'number' ? response.block.data.txs.length : -1
    response = { data: response.block.header }
  }
  return response
}

export const stakingParams = async params => {
  const path = '/cosmos/staking/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const stakingPool = async params => {
  const path = '/cosmos/staking/v1beta1/pool'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const bankSupply = async (denom, params) => {
  const path = `/cosmos/bank/v1beta1/supply${denom ? `/${denom}` : ''}`
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const slashingParams = async params => {
  const path = '/cosmos/slashing/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const distributionParams = async params => {
  const path = '/cosmos/distribution/v1beta1/params'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const mintInflation = async params => {
  const path = '/cosmos/mint/v1beta1/inflation'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const communityPool = async params => {
  const path = '/cosmos/distribution/v1beta1/community_pool'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const validatorProfile = async params => {
  const path = 'https://keybase.io/_/api/1.0/user/lookup.json'
  const res = await fetch(getRequestUrl(path, null, { ...params, fields: 'pictures' }))
  return await res.json()
}

export const stakingDelegationsAddress = async (operator_address, delegator_address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${operator_address}/delegations/${delegator_address}`
  return await request(path, params)
}

export const validatorSelfDelegation = async (validator_data, validators_data, status) => {
  if (validator_data) {
    if (validator_data.delegator_address && typeof validator_data.self_delegation !== 'number') {
      if (validators_data?.findIndex(v => typeof v.self_delegation === 'number' && v.operator_address === validator_data.operator_address) > -1) {
        validator_data.self_delegation = validators_data.find(v => typeof v.self_delegation === 'number' && v.operator_address === validator_data.operator_address).self_delegation
      }
      else if (status && (typeof status === 'boolean' || (['active'].includes(status) ? ['BOND_STATUS_BONDED'].includes(validator_data.status) : ['illegible'].includes(status) ? validator_data.illegible : ['deregistering'].includes(status) ? validator_data.deregistering : !(['BOND_STATUS_BONDED'].includes(validator_data.status))))) {
        const response = await stakingDelegationsAddress(validator_data.operator_address, validator_data.delegator_address)
        validator_data.self_delegation = Number(response?.delegation_response?.delegation?.shares || 0)
      }
    }
  }
  return validator_data
}

export const slashSigningInfos = async params => {
  const path = '/cosmos/slashing/v1beta1/signing_infos'
  return await request(path, params)
}

export const validators = async (params, validators_data, addresses) => {
  const path = '/cosmos/staking/v1beta1/validators'
  let response = await request(path, params)
  if (response?.validators) {
    const _validators = response.validators
    for (let i = 0; i < _validators.length; i++) {
      let _validator = _validators[i]
      if (_validator) {
        if (_validator.description) {
          if (_validator.description.identity) {
            if (validators_data?.findIndex(v => v?.description?.image && v.operator_address === _validator.operator_address) > -1) {
              _validator.description.image = validators_data.find(v => v?.description?.image && v.operator_address === _validator.operator_address)?.description.image
            }
            else if (addresses?.includes(_validator.operator_address)) {
              const responseProfile = await validatorProfile({ key_suffix: _validator.description.identity })
              if (responseProfile?.them?.[0]?.pictures?.primary?.url) {
                _validator.description.image = responseProfile.them[0].pictures.primary.url
              }
              _validator.description.image = _validator.description.image || (_validator.description.moniker?.toLowerCase().startsWith('axelar-core-') ? '/logos/chains/axelar.png' : randImage(i))
            }
          }
          else {
            _validator.description.image = _validator.description.image || (_validator.description.moniker?.toLowerCase().startsWith('axelar-core-') ? '/logos/chains/axelar.png' : randImage(i))
          }
        }

        _validator.delegator_address = delegatorAddress(_validator.operator_address)
        if (_validator.consensus_pubkey?.key) {
          _validator.consensus_address = pubKeyToBech32(_validator.consensus_pubkey.key, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)
        }
        if (_validator.delegator_address && typeof _validator.self_delegation !== 'number' && addresses?.includes(_validator.operator_address)) {
          _validator = await validatorSelfDelegation(_validator, validators_data, true)
        }
        _validator.tokens = Number(_validator.tokens)
        _validator.delegator_shares = Number(_validator.delegator_shares)
      }
      _validators[i] = _validator
    }
    response = { data: _validators, pagination: response.pagination }
  }
  return response
}

export const allValidators = async (params, validators_data, status, addresses, latest_block, denoms) => {
  addresses = addresses && !Array.isArray(addresses) ? [addresses] : addresses
  let pageKey = true, data = []
  while (pageKey) {
    const response = await validators({ ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined }, validators_data, addresses)
    data = _.orderBy(_.uniqBy(_.concat(data, response?.data || []), 'operator_address'), ['description.moniker'], ['asc'])
    pageKey = response?.pagination?.next_key
  }

  data = data.filter(v => !['genesis'].includes(v?.description?.moniker))
  if (latest_block && (['active', 'inactive', 'deregistering'].includes(status) || addresses)) {
    const response = await uptimes({
      aggs: { uptimes: { terms: { field: 'validators.keyword', size: data.length } } },
      query: { range: { height: { gt: latest_block - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) } } },
    })
    if (response?.data) {
      data = data.map(v => {
        return {
          ...v,
          uptime: typeof response.data[v?.consensus_address] === 'number' ? response.data[v.consensus_address] * 100 / (response.total || Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)) : 0,
        }
      }).map(v => {
        return {
          ...v,
          uptime: typeof v.uptime === 'number' ? v.uptime > 100 ? 100 : v.uptime < 0 ? 0 : v.uptime : undefined,
        }
      })
    }
  }

  if (status || addresses) {
    pageKey = true
    while (pageKey) {
      const response = await slashSigningInfos({ 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
      const infos = response?.info
      data = data.map(v => {
        if (infos?.findIndex(info => info?.address === v?.consensus_address) > -1) {
          const info = infos.find(info => info?.address === v?.consensus_address)
          return {
            ...v,
            start_height: Number(info.start_height),
            start_proxy_height: info.start_proxy_height || Number(info.start_height),
            jailed_until: info.jailed_until && moment(info.jailed_until).valueOf(),
            tombstoned: typeof info.tombstoned === 'boolean' ? info.tombstoned : undefined,
            missed_blocks_counter: Number(info.missed_blocks_counter),
          }
        }
        return v
      })
      pageKey = response?.pagination?.next_key
    }
  }
  return { data }
}

export const allValidatorsStatus = async validators_data => {
  let response = await axelard({ cmd: 'axelard q tss deactivated-operators -oj', cache: true, cache_timeout: 15 })
  let data = validators_data || []

  if (convertToJson(response?.stdout)) {
    const deregistering_addresses = convertToJson(response.stdout)?.operator_addresses || []
    data = _.orderBy(data.map(v => {
      return {
        ...v,
        deregistering: deregistering_addresses.includes(v.operator_address) || (['genesis'].includes(v.description.moniker) && !['BOND_STATUS_BONDED'].includes(v.status)),
      }
    }), ['deregistering', 'description.moniker'], ['asc', 'asc'])
  }

  response = await axelard({ cmd: 'axelard q snapshot validators -oj', cache: true, cache_timeout: 5 })
  if (convertToJson(response?.stdout)) {
    const illegible_addresses = convertToJson(response.stdout)?.validators?.filter(v => Object.values(v?.tss_illegibility_info || {}).findIndex(value => value) > -1)
    data = _.orderBy(data.map(v => {
      return {
        ...v,
        illegible: illegible_addresses.findIndex(_v => _v.operator_address === v.operator_address) > -1,
        tss_illegibility_info: illegible_addresses?.find(_v => _v.operator_address === v.operator_address)?.tss_illegibility_info,
      }
    }), ['deregistering', 'description.moniker'], ['asc', 'asc'])
  }
  return { data }
}

export const allValidatorsBroadcaster = async (validators_data, addresses, denoms) => {
  addresses = addresses && !Array.isArray(addresses) ? [addresses] : addresses
  let response = await transactionsByEvents(`message.action='RegisterProxy'`, null, null, true, denoms), data = validators_data || []
  if (response?.data) {
    data = data.map(v => {
      const tx = response.data.find(_tx => _tx && !_tx.code && _tx.activities?.findIndex(a => a?.sender === v?.operator_address) > -1)
      return {
        ...v,
        start_proxy_height: (tx?.height && Number(tx.height)) || v?.start_proxy_height,
        broadcaster_address: tx?.activities?.find(a => a?.sender === v?.operator_address)?.address,
        broadcaster_loaded: true,
      }
    })
  }

  if (data) {
    const should_have_broadcaster_data = data.filter(v => !v.broadcaster_address && (!addresses || addresses.includes(v.operator_address)))
    let broadcasters_data
    if (should_have_broadcaster_data.length > 1) {
      response = await searchAxelard({
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
        const broadcaster_address = convertToJson(b?.data?.stdout || b.stdout)?.address
        return {
          operator_address: _.last(b?.id?.split(' ')),
          broadcaster_address,
          broadcaster_loaded: true,
        }
      })
    }

    for (let i = 0; i < should_have_broadcaster_data.length; i++) {
      const v = should_have_broadcaster_data[i]
      if (!v.broadcaster_address) {
        v.broadcaster_address = broadcasters_data?.find(b => b?.operator_address === v.operator_address)?.broadcaster_address
        if (!v.broadcaster_address) {
          response = await axelard({ cmd: `axelard q snapshot proxy ${v.operator_address}`, cache: true, cache_timeout: 5 })
          if (convertToJson(response?.stdout)) {
            v.broadcaster_address = convertToJson(response.stdout).address
          }
        }
        v.broadcaster_loaded = true
      }
    }
  }
  return { data }
}

export const chainMaintainer = async (id, chains) => {
  const data = {}, _chains = chains?.filter(c => c?.id === id).map(c => c?.id) || []
  for (let i = 0; i < _chains.length; i++) {
    const id = _chains[i]
    const response = await axelard({ cmd: `axelard q nexus chain-maintainers ${chain_manager.maintainer_id(id, chains)} -oj`, cache: true, cache_timeout: 5 })
    if (convertToJson(response?.stdout)?.maintainers) {
      data[id] = Object.values(convertToJson(response.stdout).maintainers)
    }
  }
  return data
}

export const proposals = async params => {
  const path = '/cosmos/gov/v1beta1/proposals'
  return await request(path, params)
}

export const allProposals = async (params, denoms) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await proposals({ ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.orderBy(_.uniqBy(_.concat(data, response.proposals?.map(_proposal => {
      return {
        ..._proposal,
        proposal_id: Number(_proposal?.proposal_id),
        type: _.last(_proposal?.content?.['@type']?.split('.') || [])?.replace('Proposal', ''),
        status: _proposal?.status?.replace('PROPOSAL_STATUS_', ''),
        content: {
          ..._proposal?.content,
          plan: _proposal?.content?.plan && {
            ..._proposal.content.plan,
            height: Number(_proposal.content.plan.height),
          },
        },
        submit_time: moment(_proposal?.submit_time).valueOf(),
        deposit_end_time: moment(_proposal?.deposit_end_time).valueOf(),
        voting_start_time: moment(_proposal?.voting_start_time).valueOf(),
        voting_end_time: moment(_proposal?.voting_end_time).valueOf(),
        total_deposit: _proposal?.total_deposit?.map(deposit => {
          return {
            ...deposit,
            amount: denomer.amount(deposit?.amount, deposit?.denom, denoms),
            symbol: denomer.symbol(deposit?.denom, denoms),
          }
        }),
        final_tally_result: Object.fromEntries(Object.entries(_proposal?.final_tally_result || {}).map(([key, value]) => [key, denomer.amount(Number(value), denoms?.[0]?.denom, denoms)]))
      }
    }) || []), 'proposal_id'), ['proposal_id'], ['desc'])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const proposal = async (id, params, denoms) => {
  const path = `/cosmos/gov/v1beta1/proposals/${id}`
  let response = await request(path, params)
  if (response?.proposal) {
    const _proposal = response?.proposal
    response = {
      ..._proposal,
      proposal_id: Number(_proposal?.proposal_id),
      type: _.last(_proposal?.content?.['@type']?.split('.') || [])?.replace('Proposal', ''),
      status: _proposal?.status?.replace('PROPOSAL_STATUS_', ''),
      content: {
        ..._proposal?.content,
        plan: _proposal?.content?.plan && {
          ..._proposal.content.plan,
          height: Number(_proposal.content.plan.height),
        },
      },
      submit_time: moment(_proposal?.submit_time).valueOf(),
      deposit_end_time: moment(_proposal?.deposit_end_time).valueOf(),
      voting_start_time: moment(_proposal?.voting_start_time).valueOf(),
      voting_end_time: moment(_proposal?.voting_end_time).valueOf(),
      total_deposit: _proposal?.total_deposit?.map(deposit => {
        return {
          ...deposit,
          amount: denomer.amount(deposit?.amount, deposit?.denom, denoms),
          symbol: denomer.symbol(deposit?.denom, denoms),
        }
      }),
      final_tally_result: Object.fromEntries(Object.entries(_proposal?.final_tally_result || {}).map(([key, value]) => [key, denomer.amount(Number(value), denoms?.[0]?.denom, denoms)]))
    }
  }
  return response
}

export const proposalVotes = async (id, params) => {
  const path = `/cosmos/gov/v1beta1/proposals/${id}/votes`
  return await request(path, params)
}

export const allProposalVotes = async (id, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await proposalVotes(id, { ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.uniqBy(_.concat(data, response.votes?.map(_vote => {
      return {
        ..._vote,
        proposal_id: Number(_vote?.proposal_id),
        option: _vote?.option?.replace('VOTE_OPTION_', ''),
        options: _vote?.options?.map(option => {
          return {
            ...option,
            option: option?.option?.replace('VOTE_OPTION_', ''),
            weight: Number(option?.weight),
          }
        }),
      }
    }) || []), 'voter')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const transactions = async (params, validator_address, denoms) => {
  const path = '/cosmos/tx/v1beta1/txs'
  let response = await request(path, params)
  if (response?.tx_responses) {
    response.tx_responses = response.tx_responses.map(record => {
      const activities = tx_manager.activities(record, denoms)
      return {
        ...record,
        height: Number(record.height),
        status: tx_manager.status(record),
        type: tx_manager.type(record),
        sender: tx_manager.sender(record),
        fee: tx_manager.fee(record, denoms),
        symbol: tx_manager.symbol(record, denoms),
        gas_used: tx_manager.gas_used(record),
        gas_limit: tx_manager.gas_limit(record),
        memo: tx_manager.memo(record),
        activities,
        participated: validator_address && activities?.findIndex(a => a?.participants && JSON.parse(a.participants).includes(validator_address)) > -1,
      }
    })
    response = { data: response.tx_responses, pagination: response.pagination, total: response.pagination && Number(response.pagination.total) }
  }
  return response
}

export const bankBalances = async (address, params) => {
  const path = `/cosmos/bank/v1beta1/balances/${address}`
  return await request(path, params)
}

export const allBankBalances = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await bankBalances(address, { ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.uniqBy(_.concat(data, response.balances || []), 'denom')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const stakingDelegations = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/delegations/${address}`
  return await request(path, params)
}

export const allStakingDelegations = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await stakingDelegations(address, { ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.concat(data, response.delegation_responses || [])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const stakingUnbonding = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
  return await request(path, params)
}

export const allStakingUnbonding = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await stakingUnbonding(address, { ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.concat(data, response.unbonding_responses || [])
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const distributionRewards = async (address, params) => {
  const path = `/cosmos/distribution/v1beta1/delegators/${address}/rewards`
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const distributionCommissions = async (address, params) => {
  const path = `/cosmos/distribution/v1beta1/validators/${address}/commission`
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const transactionsByEvents = async (events, data, validator_address, isUnlimit, denoms) => {
  const page_size = 50, max_size = 500
  let pageKey = true, total = 500, loop_count = 0, txs = [], first_load_txs
  while ((pageKey || total) && txs.length < total && (isUnlimit || txs.length < max_size) && (loop_count < Math.ceil((isUnlimit ? total : max_size) / page_size))) {
    const _pageKey = (isUnlimit || total <= max_size) && pageKey && typeof pageKey === 'string' ? pageKey : undefined
    const _offset = total + (total % page_size === 0 ? 0 : page_size - (total % page_size)) - txs.length
    const response = await transactions({
      events,
      'pagination.key': _pageKey,
      'pagination.limit': page_size,
      'pagination.offset': _pageKey ?
        undefined
        :
        txs.length > 0 && _offset >= page_size ?
          _offset > total ? total : _offset
          :
          txs.length,
    }, validator_address, denoms)
    txs = _.uniqBy(_.concat(txs, response?.data || []), 'txhash')
    if (!first_load_txs) {
      first_load_txs = txs
    }
    pageKey = response?.pagination?.next_key
    total = response?.pagination && Number(response.pagination.total)
    loop_count++
  }

  if (total > max_size) {
    txs = txs.filter(tx => !first_load_txs || first_load_txs.findIndex(_tx => _tx?.txhash === tx?.txhash) < 0)
  }
  return { data: _.orderBy(_.uniqBy(_.concat(data || [], txs), 'txhash'), ['timestamp', 'height'], ['desc', 'desc']), total }
}

export const transactionsByEventsPaging = async (events, data, offset, denoms) => {
  const page_size = 50, max_size = 50
  while (offset > 0 && txs.length < max_size) {
    offset -= page_size
    const response = await transactions({
      events,
      'pagination.limit': page_size,
      'pagination.offset': offset,
    }, null, denoms)
    txs = _.uniqBy(_.concat(txs, response?.data || []), 'txhash')
    if (txs?.length < page_size) {
      break
    }
  }
  return { data:_.orderBy(_.uniqBy(_.concat(data || [], txs), 'txhash'), ['timestamp', 'height'], ['desc', 'desc']), offset }
}

export const transaction = async (tx, params, denoms) => {
  const path = `/cosmos/tx/v1beta1/txs/${tx}`
  let response = await request(path, params)
  if (response?.tx_response) {
    response.tx_response.status = tx_manager.status(response.tx_response)
    response.tx_response.type = tx_manager.type(response.tx_response)
    response.tx_response.sender = tx_manager.sender(response.tx_response)
    response.tx_response.fee = tx_manager.fee(response.tx_response, denoms)
    response.tx_response.symbol = tx_manager.symbol(response.tx_response, denoms)
    response.tx_response.gas_used = tx_manager.gas_used(response.tx_response)
    response.tx_response.gas_limit = tx_manager.gas_limit(response.tx_response)
    response.tx_response.memo = tx_manager.memo(response.tx_response)
    response.tx_response.activities = tx_manager.activities(response.tx_response, denoms)
    response = { data: response.tx_response }
  }
  return response
}

export const validatorSets = async params => {
  const path = '/validatorsets/latest'
  params = { ...params, cache_timeout: 5 }
  return await request(path, params)
}

export const delegations = async (address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${address}/delegations`
  return await request(path, params)
}

export const allDelegations = async (address, params) => {
  let pageKey = true, data = []
  while (pageKey) {
    const response = await delegations(address, { ...params, 'pagination.key': pageKey && typeof pageKey === 'string' ? pageKey : undefined })
    data = _.uniqBy(_.concat(data, response.delegation_responses || []), 'delegation.delegator_address')
    pageKey = response?.pagination?.next_key
  }
  return { data }
}

export const allValidatorsSelfDelegation = async (validators_data, status) => {
  for (let i = 0; i < validators_data.length; i++) {
    let validator_data = validators_data[i]
    validator_data = await validatorSelfDelegation(validator_data, validators_data, status)
    validators_data[i] = validator_data
  }
  return validators_data
}

export const stakingDelegationsAddressUnbonding = async (operator_address, delegator_address, params) => {
  const path = `/cosmos/staking/v1beta1/validators/${operator_address}/delegations/${delegator_address}/unbonding_delegation`
  return await request(path, params)
}