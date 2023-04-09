import _ from 'lodash'
import moment from 'moment'

import { uptimes, axelard as axelard_cache } from '../index'
import { chain_maintainers } from '../chain-maintainers'
import { heartbeats as getHeartbeats } from '../heartbeat'
import { base64ToHex, base64ToBech32, delegatorAddress, pubKeyToBech32 } from '../../object/key'
import { chainManager } from '../../object/chain'
import { assetManager } from '../../object/asset'
import { transactionManager } from '../../object/transaction'
import { equalsIgnoreCase, to_json, sleep } from '../../utils'

const _module = 'lcd'

const request = async (
  path,
  params,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const getBlock = async (
  height,
  params,
) => {
  const response =
    await request(
      `/cosmos/base/tendermint/v1beta1/blocks/${height}`,
      params,
    )

  const {
    block,
    block_id,
  } = { ...response }
  const {
    header,
    data,
  } = { ...block }
  const {
    txs,
  } = { ...data }
  let {
    hash,
    proposer_address,
    num_txs,
  } = { ...header }

  if (header) {
    hash = base64ToHex(block_id?.hash)

    proposer_address =
      base64ToBech32(
        proposer_address,
        process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
      )

    num_txs =
      typeof txs?.length === 'number' ?
        txs.length :
        -1
  }

  return (
    response &&
    {
      ...response,
      block: {
        ...block,
        header: {
          ...header,
          hash,
          proposer_address,
          num_txs,
        },
      },
    }
  )
}

export const validator_profile = async params => {
  const qs = new URLSearchParams()

  Object.entries(
    {
      ...params,
      fields: 'pictures',
    }
  )
  .forEach(([k, v]) =>
    qs.append(k, v)
  )

  await sleep(
    _.random(
      0,
      3,
      true,
    ) *
    1000
  )

  const response =
    await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?${qs.toString()}`,
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const staking_params = async params =>
  await request(
    '/cosmos/staking/v1beta1/params',
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const bank_supply = async (
  denom,
  params,
) =>
  await request(
    `/cosmos/bank/v1beta1/supply${denom ? `/${denom}` : ''}`,
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const staking_pool = async params =>
  await request(
    '/cosmos/staking/v1beta1/pool',
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const slashing_params = async params =>
  await request(
    '/cosmos/slashing/v1beta1/params',
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const distribution_params = async params =>
  await request(
    '/cosmos/distribution/v1beta1/params',
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const mint_inflation = async params =>
  await request(
    '/cosmos/mint/v1beta1/inflation',
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const _validators = async (
  params,
  validators_data,
  addresses,
) => {
  let response =
    await request(
      '/cosmos/staking/v1beta1/validators',
      params,
    )

  const {
    validators,
    pagination,
  } = { ...response }

  if (validators) {
    for (let i = 0; i < validators.length; i++) {
      let validator = validators[i]

      if (validator) {
        const {
          consensus_pubkey,
          operator_address,
          self_delegation,
          tokens,
          delegator_shares,
        } = { ...validator }
        let {
          consensus_address,
          delegator_address,
        } = { ...validator }
        const {
          key,
        } = { ...consensus_pubkey }

        if (key) {
          consensus_address =
            pubKeyToBech32(
              key,
              process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
            )
        }

        delegator_address = delegatorAddress(operator_address)

        validator = {
          ...validator,
          consensus_address,
          delegator_address,
        }

        if (
          delegator_address &&
          typeof self_delegation !== 'number' &&
          addresses?.includes(operator_address)
        ) {
          validator =
            await validator_self_delegation(
              validator,
              validators_data,
              true,
            )
        }

        validator = {
          ...validator,
          tokens: Number(tokens),
          delegator_shares: Number(delegator_shares),
        }

        validators[i] = validator
      }
    }

    response = {
      data: validators,
      pagination,
    }
  }

  return response
}

export const all_validators = async (
  params,
  validators_data,
  status,
  addresses,
  latest_block_height,
  assets_data,
) => {
  addresses =
    (
      Array.isArray(addresses) ?
        addresses :
        [addresses]
    )
    .filter(a => a)

  let data = [],
    pageKey = true
    
  while (pageKey) {
    const response =
      await _validators(
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
        validators_data,
        addresses,
      )

    const {
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.orderBy(
        _.uniqBy(
          _.concat(
            data,
            response?.data ||
            [],
          ),
          'operator_address',
        ),
        ['description.moniker'],
        ['asc'],
      )

    pageKey = next_key
  }

  if (
    latest_block_height &&
    (
      [
        'active',
        'inactive',
      ].includes(status) ||
      addresses.length > 0
    )
  ) {
    const num_uptime_blocks =
      Number(
        process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS
      )

    const response =
      await uptimes(
        {
          query: {
            range: {
              height: {
                gt: latest_block_height - 1 - num_uptime_blocks,
              },
            },
          },
          aggs: {
            uptimes: {
              terms: { field: 'validators.keyword', size: data.length },
            },
          },
        },
      )

    const {
      total,
    } = { ...response }

    if (response?.data) {
      data =
        data
          .map(v => {
            const {
              consensus_address,
            } = { ...v }

            return {
              ...v,
              uptime:
                (
                  response.data[consensus_address] ||
                  0
                ) *
                100 /
                (
                  total ||
                  num_uptime_blocks
                ),
            }
          })
          .map(v => {
            const {
              uptime,
            } = { ...v }

            return {
              ...v,
              uptime:
                typeof uptime === 'number' ?
                  uptime > 100 ?
                    100 :
                    uptime < 0 ?
                      0 :
                      uptime :
                  undefined,
            }
          })
    }
  }

  if (
    status ||
    addresses.length > 0 ||
    params
  ) {
    pageKey = true

    while (pageKey) {
      const response =
        await slash_signing_infos(
          {
            'pagination.key':
              pageKey &&
              typeof pageKey === 'string' ?
                pageKey :
                undefined,
          },
        )

      const {
        info,
        pagination,
      } = { ...response }

      data =
        data
          .map(v => {
            const {
              consensus_address,
            } = { ...v }

            const i = (info || [])
              .find(i =>
                equalsIgnoreCase(
                  i?.address,
                  consensus_address,
                )
              )

            if (i) {
              const {
                jailed_until,
                tombstoned,
              } = { ...i }
              let {
                start_height,
                start_proxy_height,
                missed_blocks_counter,
              } = { ...i }

              start_height = Number(start_height)
              start_proxy_height =
                start_proxy_height ||
                start_height
              missed_blocks_counter = Number(missed_blocks_counter)

              return {
                ...v,
                start_height,
                start_proxy_height,
                jailed_until:
                  jailed_until &&
                  moment(jailed_until)
                    .valueOf(),
                tombstoned:
                  typeof tombstoned === 'boolean' ?
                    tombstoned :
                    undefined,
                missed_blocks_counter,
              }
            }

            return v
          })

      pageKey = pagination?.next_key
    }
  }

  return data
}

export const all_validators_broadcaster = async (
  validators_data,
  addresses,
  assets_data,
) => {
  addresses = (
    Array.isArray(addresses) ?
      addresses :
      [addresses]
  )
  .filter(a => a)

  let data =
    validators_data ||
    [],
    response =
      await transactions_by_events(
        `message.action='RegisterProxy'`,
        null,
        true,
        assets_data,
      )

  const transactions_data = response?.data

  if (transactions_data) {
    data =
      data
        .map(v => {
          const {
            operator_address,
          } = { ...v }
          let {
            start_proxy_height,
          } = { ...v }

          const transaction_data = transactions_data
            .find(t =>
              !t?.code &&
              (t?.tx?.body?.messages || [])
                .findIndex(m =>
                  m?.['@type']?.includes('RegisterProxy') &&
                  equalsIgnoreCase(
                    m.sender,
                    operator_address,
                  )
                ) > -1
            )

          const {
            height,
            tx,
          } = { ...transaction_data }
          const {
            messages,
          } = { ...tx?.body }

          start_proxy_height =
            Number(height) ||
            start_proxy_height

          return {
            ...v,
            start_proxy_height,
            broadcaster_address:
              (messages || [])
                .find(m =>
                  m?.['@type']?.includes('RegisterProxy') &&
                  equalsIgnoreCase(
                    m.sender,
                    operator_address,
                  )
                )?.proxy_addr,
            broadcaster_loaded: true,
          }
        })
  }

  const no_broadcaster_data =
    data
      .filter(v =>
        !v.broadcaster_address &&
        (
          addresses.length < 1 ||
          addresses.includes(v.operator_address)
        )
      )

  let broadcasters_data

  if (no_broadcaster_data.length > 1) {
    response =
      await axelard_cache(
        {
          query: {
            bool: {
              must: [
                { match: { type: 'proxy' } },
                {
                  range: {
                    updated_at: {
                      gte:
                        moment()
                          .subtract(
                            1,
                            'days',
                          )
                          .valueOf() /
                          1000,
                    },
                  },
                },
              ],
            },
          },
          size: 1000,
        },
      )

    broadcasters_data =
      (response?.data || [])
        .map(d => {
          const {
            id,
            stdout,
          } = { ...d }

          return {
            operator_address:
              _.last(
                (id || '')
                  .split(' ')
              ),
            broadcaster_address: to_json(stdout)?.address,
            broadcaster_loaded: true,
          }
        })
  }

  for (const d of no_broadcaster_data) {
    const {
      operator_address,
    } = { ...d }
    let {
      broadcaster_address,
      broadcaster_loaded,
    } = { ...d }

    const index = data
      .findIndex(v =>
        equalsIgnoreCase(
          v?.operator_address,
          operator_address,
        )
      )

    if (
      index > -1 &&
      !broadcaster_address
    ) {
      broadcaster_address = broadcasters_data
        .find(_d =>
          equalsIgnoreCase(
            _d?.operator_address,
            operator_address,
          )
        )?.broadcaster_address

      broadcaster_loaded = true

      data[index] = {
        ...data[index],
        broadcaster_address,
        broadcaster_loaded,
      }
    }
  }

  return data
}

export const all_validators_status = async (
  validators_data,
) => {
  let data =
    validators_data ||
    []

  let response =
    await getHeartbeats(
      {
        size: 500,
      },
    )

  data = data
    .map(v => {
      const {
        broadcaster_address,
      } = { ...v }

      return {
        ...v,
        stale_heartbeats:
          (response?.data || [])
            .findIndex(d =>
              equalsIgnoreCase(
                d?.sender,
                broadcaster_address,
              )
            ) < 0,
      }
    })

  return data
}

export const chain_maintainer = async (
  id,
  chains_data,
) => {
  const data = {},
    chains =
      (chains_data || [])
        .filter(c => c?.id === id)
        .map(c => c?.id)

  for (const chain of chains) {
    const response =
      await chain_maintainers(
        {
          chain:
            chainManager
              .maintainer_id(
                chain,
                chains_data,
              ),
        },
      )

    const {
      maintainers,
    } = { ...response }

    data[chain] =
      Array.isArray(maintainers) ?
        maintainers :
        []
  }

  return data
}

export const staking_delegations_address = async (
  operator_address,
  delegator_address,
  params,
) =>
  await request(
    `/cosmos/staking/v1beta1/validators/${operator_address}/delegations/${delegator_address}`,
    params,
  )

export const validator_self_delegation = async (
  validator_data,
  validators_data,
  status,
) => {
  const {
    delegator_address,
    operator_address,
  } = { ...validator_data }
  let {
    self_delegation,
  } = { ...validator_data }

  if (
    delegator_address &&
    typeof self_delegation !== 'number'
  ) {
    self_delegation = (validators_data || [])
      .find(v =>
        typeof v.self_delegation === 'number' &&
        equalsIgnoreCase(
          v.operator_address,
          operator_address,
        )
      )?.self_delegation

    if (!self_delegation &&
      status &&
      (
        typeof status === 'boolean' ||
        (
          ['active'].includes(status) ?
            ['BOND_STATUS_BONDED'].includes(validator_data.status) :
            !['BOND_STATUS_BONDED'].includes(validator_data.status)
        )
      )
    ) {
      const response =
        await staking_delegations_address(
          operator_address,
          delegator_address,
        )

      const {
        shares,
      } = { ...response?.delegation_response?.delegation }

      self_delegation =
        Number(
          shares ||
          '0'
        )
    }

    validator_data = {
      ...validator_data,
      self_delegation,
    }
  }

  return validator_data
}

export const slash_signing_infos = async params =>
  await request(
    '/cosmos/slashing/v1beta1/signing_infos',
    params,
  )

export const _proposals = async params =>
  await request(
    '/cosmos/gov/v1beta1/proposals',
    params,
  )

export const all_proposals = async (
  params,
  denoms,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _proposals(
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      proposals,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.orderBy(
        _.uniqBy(
          _.concat(
            data,
            (proposals || [])
              .map(p => {
                const {
                  proposal_id,
                  content,
                  status,
                  submit_time,
                  deposit_end_time,
                  voting_start_time,
                  voting_end_time,
                  total_deposit,
                  final_tally_result,
                } = { ...p }
                const {
                  plan,
                } = { ...content }
                const {
                  height,
                } = { ...plan }

                return {
                  ...p,
                  proposal_id: Number(proposal_id),
                  type:
                    (
                      _.last(
                        (content?.['@type'] || '')
                          .split('.') ||
                        []
                      ) ||
                      ''
                    )
                    .replace(
                      'Proposal',
                      '',
                    ),
                  status:
                    (status || [])
                      .replace(
                        'PROPOSAL_STATUS_',
                        '',
                      ),
                  content: {
                    ...content,
                    plan:
                      plan &&
                      {
                        ...plan,
                        height: Number(height),
                      },
                  },
                  submit_time:
                    moment(submit_time)
                      .valueOf(),
                  deposit_end_time:
                    moment(deposit_end_time)
                      .valueOf(),
                  voting_start_time:
                    moment(voting_start_time)
                      .valueOf(),
                  voting_end_time:
                    moment(voting_end_time)
                      .valueOf(),
                  total_deposit:
                    (total_deposit || [])
                      .map(d => {
                        const {
                          amount,
                          denom,
                        } = { ...d }

                        return {
                          ...d,
                          amount:
                            assetManager
                              .amount(
                                amount,
                                denom,
                                denoms,
                              ),
                          symbol:
                            assetManager
                              .symbol(
                                denom,
                                denoms,
                              ),
                        }
                      }),
                  final_tally_result:
                    Object.fromEntries(
                      Object.entries({ ...final_tally_result })
                        .map(([k, v]) =>
                          [
                            k,
                            assetManager
                              .amount(
                                Number(v),
                                _.head(denoms)?.denom,
                                denoms,
                              ),
                          ]
                        )
                    ),
                }
              }),
          ),
          'proposal_id',
        ),
        ['proposal_id'],
        ['desc'],
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const proposal = async (
  id,
  params,
  denoms,
) => {
  let response =
    await request(
      `/cosmos/gov/v1beta1/proposals/${id}`,
      params,
    )

  const {
    proposal,
  } = { ...response }

  if (proposal) {
    const {
      proposal_id,
      content,
      status,
      submit_time,
      deposit_end_time,
      voting_start_time,
      voting_end_time,
      total_deposit,
      final_tally_result,
    } = { ...proposal }
    const {
      plan,
    } = { ...content }
    const {
      height,
    } = { ...plan }

    response = {
      ...proposal,
      proposal_id: Number(proposal_id),
      type:
        (
          _.last(
            (content?.['@type'] || '')
              .split('.') ||
            []
          ) ||
          ''
        )
        .replace(
          'Proposal',
          '',
        ),
      status:
        (status || [])
          .replace(
            'PROPOSAL_STATUS_',
            '',
          ),
      content: {
        ...content,
        plan:
          plan &&
          {
            ...plan,
            height: Number(height),
          },
      },
      submit_time:
        moment(submit_time)
          .valueOf(),
      deposit_end_time:
        moment(deposit_end_time)
          .valueOf(),
      voting_start_time:
        moment(voting_start_time)
          .valueOf(),
      voting_end_time:
        moment(voting_end_time)
          .valueOf(),
      total_deposit:
        (total_deposit || [])
          .map(d => {
            const {
              amount,
              denom,
            } = { ...d }

            return {
              ...d,
              amount:
                assetManager
                  .amount(
                    amount,
                    denom,
                    denoms,
                  ),
              symbol:
                assetManager
                  .symbol(
                    denom,
                    denoms,
                  ),
            }
          }),
      final_tally_result:
        Object.fromEntries(
          Object.entries({ ...final_tally_result })
            .map(([k, v]) =>
              [
                k,
                assetManager
                  .amount(
                    Number(v),
                    _.head(denoms)?.denom,
                    denoms,
                  ),
              ]
            )
        ),
    }
  }

  return response
}

export const _proposal_votes = async (
  id,
  params,
) =>
  await request(
    `/cosmos/gov/v1beta1/proposals/${id}/votes`,
    params,
  )

export const all_proposal_votes = async (
  id,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _proposal_votes(
        id,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      votes,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.uniqBy(
        _.concat(
          data,
          (votes || [])
            .map(v => {
              const {
                proposal_id,
                option,
                options,
              } = { ...v }

              return {
                ...v,
                proposal_id: Number(proposal_id),
                option:
                  (option || '')
                    .replace(
                      'VOTE_OPTION_',
                      '',
                    ),
                options:
                  (options || [])
                    .map(o => {
                      const {
                        option,
                        weight,
                      } = { ...o }

                      return {
                        ...o,
                        option:
                          (option || '')
                            .replace(
                              'VOTE_OPTION_',
                              '',
                            ),
                        weight: Number(weight),
                      }
                    }),
              }
            })
        ),
        'voter',
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const transactions = async (
  params,
  assets_data,
) => {
  const path = '/cosmos/tx/v1beta1/txs'

  let response =
    await request(
      path,
      params,
    )

  const {
    pagination,
    url,
  } = { ...response }
  let {
    tx_responses,
  } = { ...response }
  const {
    total,
  } = { ...pagination }

  if (tx_responses) {
    if (
      tx_responses.length < 1 &&
      url
    ) {
      let _response =
        await fetch(
          url,
        )
        .catch(error => {
          return null
        })

      _response =
        _response &&
        await _response.json()

      const {
        txs,
      } = { ..._.head(_response) }

      if (txs) {
        tx_responses =
          txs
            .map(d => {
              const {
                data,
              } = { ...d }

              return {
                ...data,
              }
            })
      }
    }

    tx_responses =
      tx_responses
        .map(d => {
          let {
            height,
          } = {  ...d }

          height = Number(height)

          return {
            ...d,
            height,
            status: transactionManager.status(d),
            type: transactionManager.type(d),
            sender: transactionManager.sender(d),
            recipient: transactionManager.recipient(d),
            fee:
              transactionManager
                .fee(
                  d,
                  assets_data,
                ),
            symbol:
              transactionManager
                .symbol(
                  d,
                  assets_data,
                ),
            gas_used: transactionManager.gas_used(d),
            gas_limit: transactionManager.gas_limit(d),
            memo: transactionManager.memo(d),
            activities:
              transactionManager
                .activities(
                  d,
                  assets_data,
                ),
          }
        })

    response = {
      data: tx_responses,
      pagination,
      total:
        pagination &&
        Number(total),
    }
  }

  return response
}

export const transactions_by_events = async (
  events,
  data,
  is_unlimit,
  denoms,
  max_size = 500,
) => {
  const page_size = 50
  let pageKey = true,
    total = 500,
    loop_count = 0,
    txs = [],
    first_load_txs

  while (
    (pageKey || total) &&
    txs.length < total &&
    (is_unlimit || txs.length < max_size) &&
    (loop_count < Math.ceil((is_unlimit ? total : max_size) / page_size))
  ) {
    const _pageKey =
      (
        is_unlimit ||
        total <= max_size
      ) &&
      pageKey &&
      typeof pageKey === 'string' ?
        pageKey :
        undefined

    const _offset = total +
      (total % page_size === 0 ?
        0 :
        page_size - (total % page_size)
      ) -
      txs.length

    const response =
      await transactions(
        {
          events,
          'pagination.key': _pageKey,
          'pagination.limit': page_size,
          'pagination.offset':
            _pageKey ?
              undefined :
              txs.length > 0 &&
              _offset >= page_size ?
                _offset > total ?
                  total :
                  _offset :
                txs.length,
        },
        denoms,
      )

    const {
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    txs =
      _.uniqBy(
        _.concat(
          txs,
          response?.data ||
          [],
        ),
        'txhash',
      )

    first_load_txs =
      !first_load_txs ?
        txs :
        first_load_txs

    total =
      Number(
        pagination?.total ||
        0
      )

    loop_count++

    pageKey = next_key
  }

  if (
    total > max_size &&
    is_unlimit
  ) {
    txs = txs
      .filter(tx =>
        !first_load_txs ||
        first_load_txs
          .findIndex(_tx =>
            equalsIgnoreCase(
              _tx?.txhash,
              tx?.txhash,
            )
          ) < 0
      )
  }

  return {
    data:
      _.orderBy(
        _.uniqBy(
          _.concat(
            data ||
            [],
            txs,
          ),
          'txhash',
        ),
        [
          'timestamp',
          'height',
        ],
        [
          'desc',
          'desc',
        ],
      ),
    total,
  }
}

export const transactions_by_events_paging = async (
  events,
  data,
  offset,
  denoms,
) => {
  const page_size = 50,
    max_size = 50
  let txs = []

  while (
    offset > 0 &&
    txs.length < max_size
  ) {
    offset -= page_size

    const response =
      await transactions(
        {
          events,
          'pagination.limit': page_size,
          'pagination.offset': offset,
        },
        denoms,
      )

    txs =
      _.uniqBy(
        _.concat(
          txs,
          response?.data ||
          [],
        ),
        'txhash',
      )

    if (txs?.length < page_size) {
      break
    }
  }

  return {
    data:
      _.orderBy(
        _.uniqBy(
          _.concat(
            data ||
            [],
            txs,
          ),
          'txhash',
        ),
        [
          'timestamp',
          'height',
        ],
        [
          'desc',
          'desc',
        ],
      ),
    offset,
  }
}

export const getTransaction = async (
  tx,
  params,
  denoms,
) => {
  const path = `/cosmos/tx/v1beta1/txs/${tx}`

  const response =
    await request(
      path,
      params,
    )

  const {
    tx_response,
  } = { ...response }

  return (
    tx_response &&
    {
      ...tx_response,
      status: transactionManager.status(tx_response),
      type: transactionManager.type(tx_response),
      sender: transactionManager.sender(tx_response),
      recipient: transactionManager.recipient(tx_response),
      fee:
        transactionManager
          .fee(
            tx_response,
            denoms,
          ),
      symbol:
        transactionManager
          .symbol(
            tx_response,
            denoms,
          ),
      gas_used: transactionManager.gas_used(tx_response),
      gas_limit: transactionManager.gas_limit(tx_response),
      memo: transactionManager.memo(tx_response),
      activities:
        transactionManager
          .activities(
            tx_response,
            denoms,
          ),
    }
  )
}

export const _bank_balances = async (
  address,
  params,
) =>
  await request(
    `/cosmos/bank/v1beta1/balances/${address}`,
    params,
  )

export const all_bank_balances = async (
  address,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _bank_balances(
        address,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      balances,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.uniqBy(
        _.concat(
          data,
          balances ||
          [],
        ),
        'denom',
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const _staking_delegations = async (
  address,
  params,
) =>
  await request(
    `/cosmos/staking/v1beta1/delegations/${address}`,
    params,
  )

export const all_staking_delegations = async (
  address,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _staking_delegations(
        address,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      delegation_responses,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.concat(
        data,
        delegation_responses ||
        [],
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const _staking_redelegations = async (
  address,
  params,
) =>
  await request(
    `/cosmos/staking/v1beta1/delegators/${address}/redelegations`,
    params,
  )

export const all_staking_redelegations = async (
  address,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _staking_redelegations(
        address,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      redelegation_responses,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.concat(
        data,
        redelegation_responses ||
        [],
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const _staking_unbonding = async (
  address,
  params,
) =>
  await request(
    `/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`,
    params,
  )

export const all_staking_unbonding = async (
  address,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _staking_unbonding(
        address,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      unbonding_responses,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.concat(
        data,
        unbonding_responses ||
        [],
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const distribution_rewards = async (
  address,
  params,
) =>
  await request(
    `/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const distribution_commissions = async (
  address,
  params,
) =>
  await request(
    `/cosmos/distribution/v1beta1/validators/${address}/commission`,
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const validator_sets = async (
  height,
  params,
) =>
  await request(
    `/validatorsets/${height || 'latest'}`,
    {
      ...params,
      cache_timeout: 30,
    },
  )

export const _delegations = async (
  address,
  params,
) =>
  await request(
    `/cosmos/staking/v1beta1/validators/${address}/delegations`,
    params,
  )

export const all_delegations = async (
  address,
  params,
) => {
  let pageKey = true,
    data = []

  while (pageKey) {
    const response =
      await _delegations(
        address,
        {
          ...params,
          'pagination.key':
            pageKey &&
            typeof pageKey === 'string' ?
              pageKey :
              undefined,
        },
      )

    const {
      delegation_responses,
      pagination,
    } = { ...response }
    const {
      next_key,
    } = { ...pagination }

    data =
      _.uniqBy(
        _.concat(
          data,
          delegation_responses ||
          [],
        ),
        'delegation.delegator_address',
      )

    pageKey = next_key
  }

  return {
    data,
  }
}

export const batched_commands = async (
  chain,
  id,
  params,
) =>
  await request(
    `/axelar/evm/v1beta1/batched_commands/${chain}/${id}`,
    params,
  )

export const pending_commands = async (
  chain,
  params,
) =>
  await request(
    `/axelar/evm/v1beta1/pending_commands/${chain}`,
    params,
  )