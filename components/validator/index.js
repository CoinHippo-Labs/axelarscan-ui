import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import moment from 'moment'
import toRegexRange from 'to-regex-range'

import Information from './information'
import CosmosGeneric from './cosmos-generic'
import HealthCheck from './health-check'
import AxelarSpecific from './axelar-specific'
import EVMSupport from './evm-support'
import VotingPower from './voting-power'
import Uptime from './uptime'
import Heartbeat from './heartbeat'
import Polls from './polls'
import KeysTable from '../participations/keys-table'
import TransactionsTable from '../transactions/transactions-table'
import DelegationsTable from './delegations-table'
import Widget from '../widget'

import { getUptime, uptimeForJailedInfoSync, jailedInfo, getHeartbeat } from '../../lib/api/query'
import { validatorSets, allBankBalances, allDelegations, distributionRewards, distributionCommissions } from '../../lib/api/cosmos'
import { getKeygensByValidator } from '../../lib/api/executor'
import { heartbeats as getHeartbeats, evmVotes as getEvmVotes, successKeygens as getSuccessKeygens, failedKeygens as getFailedKeygens, signAttempts as getSignAttempts } from '../../lib/api/opensearch'
import { chain_manager } from '../../lib/object/chain'
import { denomer } from '../../lib/object/denom'
import { blocksPerHeartbeat, blockFraction, lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { getName } from '../../lib/utils'

import { JAILED_SYNC_DATA } from '../../reducers/types'

export default function Validator({ address }) {
  const dispatch = useDispatch()
  const { chains, denoms, status, env, validators, validators_chains, jailed_sync } = useSelector(state => ({ chains: state.chains, denoms: state.denoms, status: state.status, env: state.env, validators: state.validators, validators_chains: state.validators_chains, jailed_sync: state.jailed_sync }), shallowEqual)
  const { chains_data } = { ...chains }
  const { denoms_data } = { ...denoms }
  const { status_data } = { ...status }
  const { env_data } = { ...env }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }
  const { jailed_sync_data } = { ...jailed_sync }

  const [validator, setValidator] = useState(null)
  const [votingPower, setVotingPower] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [uptime, setUptime] = useState(null)
  const [maxMissed, setMaxMissed] = useState(Number(process.env.NEXT_PUBLIC_DEFAULT_MAX_MISSED))
  const [jailed, setJailed] = useState(null)
  const [heartbeat, setHeartbeat] = useState(null)
  const [health, setHealth] = useState(null)
  const [evmVotes, setEvmVotes] = useState(null)
  const [evmVotePolls, setEvmVotePolls] = useState(null)

  const [tab, setTab] = useState('key_share')
  const [keyShares, setKeyShares] = useState(null)
  const [keygens, setKeygens] = useState(null)
  const [signs, setSigns] = useState(null)
  const [supportedChains, setSupportedChains] = useState(null)
  const [rewards, setRewards] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && denoms_data && status_data && validators_data) {
        let response, data
        const validator_data = validators_data?.find(v => v.operator_address === address)
        if (validator_data?.start_proxy_height || validator_data?.start_height || validator_data?.deregistering) {
          data = { ...data, ...validator_data }
          setValidator({ data, address, broadcaster_loaded: data.broadcaster_loaded })

          if (data.broadcaster_loaded && 'tss_illegibility_info' in data) {
            const _health = {
              broadcaster_registration: !data.tss_illegibility_info?.no_proxy_registered && data.broadcaster_address ? true : false,
            }
            _health.num_block_before_registered = _health ? _health.broadcaster_registration ? typeof data?.start_proxy_height === 'number' && typeof data?.start_height === 'number' ? data.start_proxy_height >= data.start_height ? data.start_proxy_height - data.start_height : 0 : '-' : 'No Proxy' : null

            if (data.broadcaster_address) {
              response = await allBankBalances(data.broadcaster_address)
              if (response?.data) {
                _health.broadcaster_funded = _.head(response.data.filter(b => b?.denom === 'uaxl').map(b => { return { amount: denomer.amount(b.amount, b.denom, denoms_data), denom: denomer.symbol(b.denom, denoms_data) } }))
              }
            }
            else {
              _health.broadcaster_funded = 'No Proxy'
            }

            response = await getHeartbeats({
              _source: false,
              aggs: {
                heartbeats: {
                  terms: { field: 'sender.keyword' },
                  aggs: {
                    heightgroup: {
                      terms: { field: 'height_group', size: 100000 },
                    },
                  },
                },
              },
              query: {
                bool: {
                  must: [
                    { match: { sender: data.broadcaster_address } },
                    { range: { height: { gt: firstHeartbeatBlock(Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)), lte: Number(status_data.latest_block_height) } } },
                  ],
                },
              },
            })

            const _last = lastHeartbeatBlock(Number(status_data.latest_block_height))
            const _first = firstHeartbeatBlock(Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)) + 1

            const totalHeartbeats = Math.floor((_last - _first) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)) + 1
            _health.total_heartbeats = totalHeartbeats
            _health.up_heartbeats = response?.data?.[data?.broadcaster_address] || 0

            _health.missed_heartbeats = _health.total_heartbeats - _health.up_heartbeats
            _health.missed_heartbeats = _health.missed_heartbeats < 0 ? 0 : _health.missed_heartbeats

            _health.heartbeats_uptime = _health.total_heartbeats > 0 ? _health.up_heartbeats * 100 / _health.total_heartbeats : 0
            _health.heartbeats_uptime = _health.heartbeats_uptime > 100 ? 100 : _health.heartbeats_uptime
            setHealth({ data: _health, address })
          }
        }
        else {
          setValidator({ data, address, broadcaster_loaded: true })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validators_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && (!votingPower || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          let response, data = { ...validator.data }

          if (!controller.signal.aborted) {
            response = await validatorSets()
            if (response?.result?.validators?.findIndex(v => v.address === data.consensus_address) > -1) {
              const v = response.result.validators?.find(v => v.address === data.consensus_address)
              data = {
                ...data,
                proposer_priority: v?.proposer_priority,
                voting_power: Number(v?.voting_power),
              }
            }
            setVotingPower({ data, address })
          }
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && (!delegations || !validator.broadcaster_loaded) && denoms_data) {
        if (!controller.signal.aborted) {
          let response, _delegations
          if (!controller.signal.aborted) {
            response = await allDelegations(address)
            _delegations = _.orderBy(response.data?.map(d => {
              return {
                ...d.delegation,
                self: d.delegation.delegator_address === validator.data?.delegator_address,
                shares: d.delegation && denomer.amount(d.delegation.shares, d.balance?.denom, denoms_data),
                ...d.balance,
                denom: denomer.symbol(d.balance?.denom, denoms_data),
                amount: d.balance && denomer.amount(d.balance.amount, d.balance.denom, denoms_data),
              }
            }) || [], ['self', 'shares'], ['desc', 'desc'])
            setDelegations({ data: _delegations, address })
          }

          /*if (!controller.signal.aborted) {
            let _rewards = []
            response = await distributionRewards(validator.data?.delegator_address)
            if (response && !response.error) {
              _rewards.push({
                ...response,
                name: 'Distribution Rewards',
                rewards: response.rewards && Object.entries(_.groupBy(response.rewards.flatMap(r => r.reward).map(r => { return { ...r, denom: denomer.symbol(r.denom, denoms_data), amount: r.amount && (isNaN(r.amount) ? -1 : denomer.amount(r.amount, r.denom, denoms_data)) } }), 'denom')).map(([key, value]) => { return { denom: key, amount: _.sumBy(value, 'amount') } }),
                total: response.total && Object.entries(_.groupBy(response.total.map(t => { return { ...t, denom: denomer.symbol(t.denom, denoms_data), amount: t.amount && denomer.amount(t.amount, t.denom, denoms_data) } }), 'denom')).map(([key, value]) => { return { denom: key, amount: _.sumBy(value, 'amount') } }),
              })
            }

            response = await distributionCommissions(validator.data?.operator_address)
            if (response && !response.error) {
              _rewards.push({
                ...response,
                name: 'Distribution Commissions',
                total: response?.commission?.commission?.map(c => {
                  return {
                    ...c,
                    denom: denomer.symbol(c.denom, denoms_data),
                    amount: c.amount && (isNaN(c.amount) ? -1 : denomer.amount(c.amount, c.denom, denoms_data)),
                  }
                }),
              })
            }

            _rewards = _rewards.map(r => {
              return {
                ...r,
                rewards_per_stake: r.total?.map(_denom => {
                  const stake = _.sumBy(_delegations?.filter(d => d.denom === _denom.denom) || [], 'amount')
                  return {
                    ..._denom,
                    stake,
                    amount_per_stake: _denom.amount / (stake > 0 ? stake : 1),
                  }
                }),
              }
            })

            setRewards({ data: _rewards, address })
          }*/
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator, denoms_data])

  useEffect(() => {
    const controller = new AbortController()

    const getDataSync = async (beginBlock, address, from, i) => {
      const data = await uptimeForJailedInfoSync(beginBlock, address, from)
      dispatch({
        type: JAILED_SYNC_DATA,
        value: data,
        i,
      })
    }

    const getData = async () => {
      if (address && validator?.address === address && (!jailed || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const validator_data = validator?.data
          let response, jailed_data
          if (validator_data?.jailed_until > 0) {
            const _maxMissed = env_data?.slashing_params ? Number(env_data.slashing_params.signed_blocks_window) - (Number(env_data.slashing_params.min_signed_per_window) * Number(env_data.slashing_params.signed_blocks_window)) : Number(process.env.NEXT_PUBLIC_DEFAULT_MAX_MISSED)
            setMaxMissed(_maxMissed)

            const beginBlock = Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) > validator_data.start_height ? Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) : validator_data.start_height
            const numBlock = Number(status_data.latest_block_height) - beginBlock
            if (!validator_data.uptime) {
              jailed_data = {
                times_jailed: -1,
                avg_jail_response_time: -1,
              }
            }
            else if (numBlock * (1 - (validator_data?.uptime / 100)) > _maxMissed) {
              const chunkSize = _.head([...Array(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)).keys()].map(i => i + 1).filter(i => Math.ceil(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS) / i) <= Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS_CHUNK))) || Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)
              _.chunk([...Array(Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)).keys()], chunkSize).forEach((chunk, i) => getDataSync(beginBlock, validator_data.consensus_address, i * chunkSize, i))
            }
            else {
              jailed_data = {
                times_jailed: 0,
                avg_jail_response_time: 0,
              }
            }
          }
          else {
            jailed_data = {
              times_jailed: 0,
              avg_jail_response_time: 0,
            }
          }

          if (jailed_data) {
            setJailed({ data: jailed_data, address })
          }
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
      dispatch({
        type: JAILED_SYNC_DATA,
        value: null,
      })
    }
  }, [address, validator])

  useEffect(() => {
    if (Object.keys(jailed_sync_data || {}).length >= Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS_CHUNK)) {
      const uptime_data = jailedInfo(Object.values(jailed_sync_data).flatMap(u => u), status_data && (moment(status_data.latest_block_time).diff(moment(status_data.earliest_block_time), 'milliseconds') / Number(status_data.latest_block_height)))?.data
      let jailed_data

      if (uptime_data) {
        const _jailed_data = []
        let numMissed = 0, _jailed = false

        for (let i = 0; i < uptime_data.length; i++) {
          const block = uptime_data[i]
          if (block?.up) {
            if (_jailed) {
              if (_jailed_data.length - 1 >= 0) {
                _jailed_data[_jailed_data.length - 1].unjail_time = block.time
              }
            }
            numMissed = 0
            _jailed = false
          }
          else {
            numMissed++
          }

          if (numMissed > maxMissed && !_jailed) {
            _jailed_data.push(block)
            _jailed = true
          }
        }

        jailedData = {
          times_jailed: _jailed_data.length,
          avg_jail_response_time: _jailed_data.filter(b => b.unjail_time).length > 0 ? _.meanBy(_jailed_data.filter(b => b.unjail_time).map(b => { return { ...b, response_time: b.unjail_time - b.time }}), 'response_time') : -1,
        }
      }

      dispatch({
        type: JAILED_SYNC_DATA,
        value: null,
      })

      setJailed({ data: jailed_data || {}, address })
    }
  }, [jailed_sync_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && status_data && (!uptime || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const data = validator?.data
          const response = await getUptime(Number(status_data.latest_block_height), data?.consensus_address)
          setUptime({ data: response?.data || [], address })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && validator.broadcaster_loaded && status_data && (!heartbeat || (validator.data && 'tss_illegibility_info' in validator.data))) {
        if (!controller.signal.aborted) {
          const data = validator.data
          const latestBlock = Number(status_data.latest_block_height)
          let beginBlock = latestBlock - Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
          beginBlock = beginBlock > (data?.start_proxy_height || 0) ? beginBlock : (data?.start_proxy_height || 0)
          beginBlock = firstHeartbeatBlock(beginBlock)

          let heartbeats = []
          for (let height = latestBlock; height >= beginBlock; height--) {
            if (height % Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT) === 1 && heartbeats.length < Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)) {
              heartbeats.push({ height })
            }
          }

          if (data?.broadcaster_address) {
            let response = await getHeartbeat(beginBlock, latestBlock, data.broadcaster_address)
            if (response?.data) {
              heartbeats = heartbeats.map(h => response.data.find(_h => (_h?.height - (_h?.height % blocksPerHeartbeat) + blockFraction) === (h?.height - (h?.height % blocksPerHeartbeat) + blockFraction)) || h)
            }

            heartbeats = heartbeats.map(h => {
              const _ineligibilities = null
              return {
                ...h,
                up: (h?.sender && h.sender === data.broadcaster_address) || _ineligibilities,
                height: _ineligibilities?.height ? Number(_ineligibilities?.height) : h.height,
                key_ids: _ineligibilities?.key_IDs?.split(',') || h.key_ids,
                ineligibilities: {
                  ..._ineligibilities?.ineligibilities,
                },
              }
            })
          }
          setHeartbeat({ data: heartbeats, address })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && validator.broadcaster_loaded) {
        if (!controller.signal.aborted) {
          const v = validator.data
          let data, all_data
          if (v?.broadcaster_address) {
            const response = await getEvmVotes({
              aggs: {
                votes: {
                  terms: { field: 'sender.keyword', size: 10000 },
                  aggs: {
                    chains: {
                      terms: { field: 'sender_chain.keyword', size: 1000 },
                      aggs: {
                        confirms: {
                          terms: { field: 'confirmed' },
                        },
                      },
                    },
                  },
                },
              },
              query: { match: { sender: v.broadcaster_address } },
            })
            data = response?.data?.[v?.broadcaster_address] || {}
          }
          else {
            data = {}
          }
          if (v?.broadcaster_address) {
            const response = await getEvmVotes({
              aggs: {
                all_votes: {
                  terms: { field: 'sender_chain.keyword', size: 10000 },
                  aggs: {
                    polls: {
                      cardinality: { field: 'poll_id.keyword' },
                    },
                  },
                },
              },
              query: {
                bool: {
                  must: [
                    { match: { poll_initial: true } },
                    { range: { height: { gte: v?.start_height || 1 } } },
                  ],
                },
              },
            })
            all_data = response?.all_data || {}
          }
          else {
            all_data = {}
          }
          setEvmVotes({ data, all_data, address })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address && validator?.address === address && validator.broadcaster_loaded && status_data) {
        if (!controller.signal.aborted) {
          const v = validator.data
          let data, all_data
          if (v?.broadcaster_address) {
            const response = await getEvmVotes({
              query: {
                bool: {
                  must: [
                    { match: { sender: v.broadcaster_address } },
                    { range: { height: { gte: Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_BLOCKS) } } },
                  ],
                },
              },
              sort: [{ 'created_at.ms': 'desc' }],
              size: Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS),
            })
            data = response?.data || []
          }
          else {
            data = []
          }
          if (v?.broadcaster_address) {
            const response = await getEvmVotes({
              aggs: {
                all_polls: {
                  terms: { field: 'poll_id.keyword', size: 10000 },
                  aggs: {
                    sender_chain: {
                      terms: { field: 'sender_chain.keyword' },
                    },
                    height: {
                      min: { field: 'height' },
                    },
                    created_at: {
                      min: { field: 'created_at.ms' },
                    },
                  },
                },
              },
              query: {
                bool: {
                  must: [
                    { match: { poll_initial: true } },
                    { range: { height: { gte: Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_BLOCKS) } } },
                  ],
                },
              },
            })
            all_data = response?.all_polls || []
          }
          else {
            all_data = []
          }
          setEvmVotePolls({ data, all_data, address })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address, validator])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (address) {
        let response, keygens_data, signs_data, total_participated_signs, total_not_participated_signs
        if (!controller.signal.aborted) {
          response = await getKeygensByValidator(address)
          if (response) {
            setKeyShares({ data: response, address })
          }
        }

        if (!controller.signal.aborted) {
          response = await getSuccessKeygens({ size: 1000, sort: [{ height: 'desc' }] })
          let data = Array.isArray(response?.data) ? response.data : []
          for (let i = 0; i < data.length; i++) {
            const keygen = data[i]
            data[i] = {
              ...keygen,
              key_chain: keygen.key_chain || (keygen?.key_id?.split('-').length > 1 && getName(keygen.key_id.split('-')[0])),
              key_role: keygen.key_role || (keygen?.key_id?.split('-').length > 2 && `${keygen.key_id.split('-')[1].toUpperCase()}_KEY`),
              participated: keygen.snapshot_validators?.validators?.findIndex(v => v?.validator?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              not_participated: keygen.snapshot_non_participant_validators?.validators?.findIndex(v => v?.validator?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              success: true,
            }
          }
          keygens_data = _.orderBy(_.concat(keygens_data || [], data.filter(k => k.participated || k.not_participated)), ['height'], ['desc'])

          response = await getFailedKeygens({ size: 1000, sort: [{ height: 'desc' }] })
          data = Array.isArray(response?.data) ? response.data : []
          for (let i = 0; i < data.length; i++) {
            const keygen = data[i]
            data[i] = {
              ...keygen,
              key_chain: keygen.key_chain || (keygen?.key_id?.split('-').length > 1 && getName(keygen.key_id.split('-')[0])),
              key_role: keygen.key_role || (keygen?.key_id?.split('-').length > 2 && `${keygen.key_id.split('-')[1].toUpperCase()}_KEY`),
              participated: keygen.snapshot_validators?.validators?.findIndex(v => v?.validator?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              not_participated: keygen.snapshot_non_participant_validators?.validators?.findIndex(v => v?.validator?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              success: false,
            }
          }
          keygens_data = _.orderBy(_.concat(keygens_data || [], data.filter(k => k.participated || k.not_participated)), ['height'], ['desc'])
          setKeygens({ data: keygens_data, total: keygens_data.length, address })
        }

        if (!controller.signal.aborted) {
          response = await getSignAttempts({
            size: 1000,
            query: { match: { participants: address } },
            sort: [{ height: 'desc' }],
            aggs: { total: { terms: { field: 'result' } } },
          })
          let data = Array.isArray(response?.data) ? response.data : []
          total_participated_signs = response?.total

          for (let i = 0; i < data.length; i++) {
            const sign = data[i]
            data[i] = {
              ...sign,
              key_chain: sign.key_chain || (sign?.key_id?.split('-').length > 1 && getName(sign.key_id.split('-')[0])),
              key_role: sign.key_role || (sign?.key_id?.split('-').length > 2 && `${sign.key_id.split('-')[1].toUpperCase()}_KEY`),
              participated: sign.participants?.findIndex(a => a?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              not_participated: sign.non_participants?.findIndex(a => a?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              success: true,
            }
          }
          signs_data = _.orderBy(_.concat(signs_data || [], data.filter(s => s.participated || s.not_participated)), ['height'], ['desc'])

          response = await getSignAttempts({
            size: 1000,
            query: { match: { non_participants: address } },
            sort: [{ height: 'desc' }],
            aggs: { total: { terms: { field: 'result' } } },
          })
          data = Array.isArray(response?.data) ? response.data : []
          total_not_participated_signs = response?.total

          for (let i = 0; i < data.length; i++) {
            const sign = data[i]
            data[i] = {
              ...sign,
              key_chain: sign.key_chain || (sign?.key_id?.split('-').length > 1 && getName(sign.key_id.split('-')[0])),
              key_role: sign.key_role || (sign?.key_id?.split('-').length > 2 && `${sign.key_id.split('-')[1].toUpperCase()}_KEY`),
              participated: sign.participants?.findIndex(a => a?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              not_participated: sign.non_participants?.findIndex(a => a?.toLowerCase() === address?.toLowerCase()) > -1 ? true : false,
              success: false,
            }
          }
          signs_data = _.orderBy(_.concat(signs_data || [], data.filter(s => s.participated || s.not_participated)), ['height'], ['desc'])
          setSigns({ data: signs_data, total: total_participated_signs + total_not_participated_signs, total_participated_signs, total_not_participated_signs, address })
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [address])

  useEffect(() => {
    if (address && validators_chains_data) {
      setSupportedChains({
        data: Object.entries(validators_chains_data || {}).filter(([key, value]) => value?.includes(address.toLowerCase())).map(([key, value]) => key),
        address,
      })
    }
  }, [address, validators_chains_data])

  return (
    <>
      <div className="my-4">
        <Information data={validator?.address === address && validator?.data} />
      </div>
      <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        <VotingPower data={votingPower?.address === address && votingPower?.data} />
        <Widget
          title={<span className="text-lg font-medium">Delegations</span>}
          className="dark:border-gray-900"
        >
          <div className="mt-2">
            <DelegationsTable data={delegations?.address === address && delegations?.data} />
          </div>
        </Widget>
      </div>
      <div className="grid grid-flow-row grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 my-4">
        <div className="md:col-span-2 grid grid-flow-row grid-col-1 md:grid-cols-2 gap-4" style={{ height: 'fit-content' }}>
          <div className="space-y-4">
            <CosmosGeneric
              data={validator?.address === address && validator?.data}
              jailed={jailed?.address === address && jailed?.data}
            />
            <Uptime
              data={uptime?.address === address && uptime?.data}
              validator_data={validator?.address === address && validator?.data}
            />
          </div>
          <div className="space-y-4">
            <HealthCheck
              data={validator?.address === address && validator?.data}
              health={health?.address === address && health?.data}
            />
            <Heartbeat
              data={heartbeat?.address === address && heartbeat?.data}
              validator_data={validator?.address === address && validator?.data}
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <EVMSupport
              supportedChains={supportedChains?.address === address && supportedChains?.data}
              evmVotes={evmVotes?.address === address && evmVotes}
              validator_data={validator?.address === address && validator?.data}
            />
            <Polls
              data={evmVotePolls?.address === address && evmVotePolls}
              validator_data={validator?.address === address && validator?.data}
            />
          </div>
        </div>
        <div className="space-y-4">
          <AxelarSpecific
            data={validator?.address === address && validator?.data}
            keygens={keygens?.address === address && keygens?.data}
            signs={signs?.address === address && signs}
            rewards={rewards?.address === address && rewards?.data}
          />
          <Widget
            title={<div className="grid grid-flow-row grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:flex flex-row items-center space-x-1">
              {['key_share', 'keygen', 'sign'].map((t, i) => (
                <div
                  key={i}
                  onClick={() => setTab(t)}
                  className={`max-w-min sm:max-w-max md:max-w-min lg:max-w-max btn btn-default btn-rounded cursor-pointer whitespace-nowrap bg-trasparent ${t === tab ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 text-white dark:hover:text-gray-100'}`}
                >
                  {getName(t)}
                </div>
              ))}
            </div>}
            className="dark:border-gray-900 px-2 md:px-4"
          >
            <div className="mt-1">
              {tab === 'keygen' ?
                <KeysTable
                  data={keygens}
                  page="validator-keygen"
                  className="no-border"
                />
                :
                tab === 'sign' ?
                  <KeysTable
                    data={signs}
                    page="validator-sign"
                    className="no-border"
                  />
                  :
                  <KeysTable
                    data={keyShares}
                    page="validator"
                    className="no-border"
                  />
              }
            </div>
          </Widget>
        </div>
      </div>
    </>
  )
}