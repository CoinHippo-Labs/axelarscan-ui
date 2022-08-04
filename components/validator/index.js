import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { FallingLines } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Info from './info'
import Delegations from './delegations'
import Uptimes from './uptimes'
import Heartbeats from './heartbeats'
import EVMVotes from './evm-votes'
import Participations from '../participations/participations'
import Image from '../image'
import { all_bank_balances, validator_sets, all_delegations } from '../../lib/api/cosmos'
import { keygens_by_validator } from '../../lib/api/executor'
import { heartbeats as searchHeartbeats } from '../../lib/api/heartbeat'
import { uptimes as getUptimes, transactions as getTransactions, heartbeats as getHeartbeats, evm_votes as getEvmVotes, evm_polls as getEvmPolls, keygens as getKeygens, sign_attempts as getSignAttempts } from '../../lib/api/index'
import { chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { base64ToBech32 } from '../../lib/object/key'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { number_format, name, equals_ignore_case, loader_color } from '../../lib/utils'

const num_uptime_blocks = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS)
const num_uptime_display_blocks = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS)
const num_heartbeat_blocks = Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
const min_broadcaster_fund = Number(process.env.NEXT_PUBLIC_MIN_BROADCASTER_FUND)
const num_evm_votes_blocks = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS)
const num_evm_votes_polls = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS)

export default () => {
  const { preferences, evm_chains, assets, status, chain, validators, validators_chains } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets, status: state.status, chain: state.chain, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }
  const { status_data } = { ...status }
  const { chain_data } = { ...chain }
  const { validators_data } = { ...validators }
  const { validators_chains_data } = { ...validators_chains }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [validator, setValidator] = useState(null)
  const [health, setHealth] = useState(null)
  const [votingPower, setVotingPower] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [uptimes, setUptimes] = useState(null)
  const [numberTimeJailed, setNumberTimeJailed] = useState(null)
  const [heartbeats, setHeartbeats] = useState(null)
  const [evmVotes, setEvmVotes] = useState(null)
  const [evmPolls, setEvmPolls] = useState(null)
  const [keyshares, setKeyshares] = useState(null)
  const [keygens, setKeygens] = useState(null)
  const [signs, setSigns] = useState(null)
  const [supportedChains, setSupportedChains] = useState(null)

  // validator & health
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && assets_data && status_data && validators_data) {
        if (!controller.signal.aborted) {
          const validator_data = validators_data.find(v => equals_ignore_case(v?.operator_address, address))
          if (validator_data?.start_proxy_height || validator_data?.start_height || validator_data?.deregistering) {
            const {
              start_height,
              start_proxy_height,
              broadcaster_loaded,
              broadcaster_address,
              tss_illegibility_info,
            } = { ...validator_data }
            setValidator({
              data: validator_data,
              address,
              broadcaster_loaded,
            })
            if (broadcaster_loaded && 'tss_illegibility_info' in validator_data) {
              const _health = {
                broadcaster_registration: !tss_illegibility_info?.no_proxy_registered && broadcaster_address ? true : false,
              }
              if (broadcaster_address) {
                const response = await all_bank_balances(broadcaster_address)
                if (response?.data) {
                  _health.broadcaster_funded = _.head(response.data.filter(b => b?.denom === 'uaxl').map(b => {
                    const { denom, amount } = { ...b }
                    return {
                      denom: denom_manager.symbol(denom, assets_data),
                      amount: denom_manager.amount(amount, denom, assets_data),
                    }
                  }))
                }
              }
              else {
                _health.broadcaster_funded = 'No Proxy'
              }
              const latest_block = Number(status_data.latest_block_height)
              const first = firstHeartbeatBlock(latest_block - num_heartbeat_blocks)
              const last = lastHeartbeatBlock(latest_block)
              const response = await getHeartbeats({
                query: {
                  bool: {
                    must: [
                      { match: { sender: broadcaster_address } },
                      { range: { height: {
                        gte: first,
                        lte: latest_block,
                      } } },
                    ],
                  },
                },
                aggs: {
                  heartbeats: {
                    terms: { field: 'sender.keyword' },
                    aggs: {
                      period_height: {
                        terms: { field: 'period_height', size: 1000 },
                      },
                    },
                  },
                },
                _source: false,
              })
              const total = Math.floor((last - first) / num_blocks_per_heartbeat) + 1
              const up = response?.data?.[broadcaster_address] || 0
              let missed = total - up
              missed = missed < 0 ? 0 :missed
              let uptime = total > 0 ? up * 100 / total : 0
              uptime = uptime > 100 ? 100 : uptime
              setHealth({
                data: {
                  ..._health,
                  total,
                  up,
                  missed,
                  heartbeats_uptime: uptime,
                },
                address,
              })
            }
          }
          else {
            setValidator({
              data: null,
              address,
              broadcaster_loaded: true,
            })
          }
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validators_data])

  // voting power
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && (!votingPower || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const { data } = { ...validator }
          const { consensus_address } = { ...data }
          const response = await validator_sets()
          const v = response?.result?.validators?.find(_v => equals_ignore_case(_v?.address, consensus_address))
          const { proposer_priority, voting_power } = { ...v }
          setVotingPower({
            data: {
              ...data,
              proposer_priority,
              voting_power: Number(voting_power),
            },
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator])

  // delegations
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && assets_data && (!delegations || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const response = await all_delegations(address)
          setDelegations({
            data: _.orderBy(response?.data?.map(d => {
              const { delegation, balance } = { ...d }
              const { delegator_address, shares } = { ...delegation }
              const { denom, amount } = { ...balance }
              return {
                ...delegation,
                self: equals_ignore_case(delegator_address, validator.data?.delegator_address),
                shares: isNaN(shares) ? -1 : denom_manager.amount(shares, denom, assets_data),
                ...balance,
                denom: denom_manager.symbol(denom, assets_data),
                amount: isNaN(amount) ? -1 : denom_manager.amount(amount, denom, assets_data),
                asset_data: getDenom(denom, assets_data),
              }
            }) || [], ['self', 'shares'], ['desc', 'desc']),
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator, assets_data])

  // uptimes
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && status_data && (!uptimes || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const { consensus_address } = { ...validator.data }
          const latest_block = Number(status_data.latest_block_height) - 1
          const response = await getUptimes({
            query: { range: { height: {
              gt: latest_block - num_uptime_display_blocks,
              lte: latest_block,
            } } },
            size: num_uptime_display_blocks,
            sort: [{ height: 'desc' }],
          })
          const data = response?.data || []
          setUptimes({
            data: [...Array(num_uptime_display_blocks).keys()].map(i => {
              const height = latest_block - i
              const u = data.find(d => d?.height === height)
              const { validators } = { ...u }
              return {
                ...u,
                height,
                up: !!validators?.map(v => base64ToBech32(v, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)).includes(consensus_address),
              }
            }),
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator])

  // number time jailed
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && status_data && (typeof numberTimeJailed !== 'number' || !validator.broadcaster_loaded)) {
        if (!controller.signal.aborted) {
          const { operator_address, jailed } = { ...validator.data }
          const response = await getTransactions({
            query: {
              bool: {
                must: [
                  { match: { types: 'MsgUnjail' } },
                  { match: { addresses: operator_address } },
                  { match: { code: 0 } },
                ],
              },
            },
            size: 0,
            track_total_hits: true,
          })
          setNumberTimeJailed((response?.total || 0) + (jailed ? 1 : 0))
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator])

  // heartbeats
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && status_data && validator.broadcaster_loaded && (!heartbeats || 'tss_illegibility_info' in { ...validator.data })) {
        if (!controller.signal.aborted) {
          const { broadcaster_address } = { ...validator.data }
          let { start_proxy_height } = { ...validator.data }
          start_proxy_height = start_proxy_height || 0
          const latest_block = Number(status_data.latest_block_height)
          const first = firstHeartbeatBlock(latest_block - num_heartbeat_blocks > start_proxy_height ? latest_block - num_heartbeat_blocks : start_proxy_height)
          const heartbeats = []
          let data
          if (broadcaster_address) {
            const response = await searchHeartbeats({
              sender: broadcaster_address,
              fromBlock: first,
              toBlock: latest_block,
              size: num_heartbeat_blocks / num_blocks_per_heartbeat + 1 + 50,
            })
            data = response?.data || []
          }
          for (let height = latest_block; height >= first; height--) {
            if (height % num_blocks_per_heartbeat === 1 && heartbeats.length < num_heartbeat_blocks / num_blocks_per_heartbeat) {
              const h = data?.find(d => d?.period_height === height)
              const { sender } = { ...h }
              heartbeats.push({
                ...h,
                height,
                up: equals_ignore_case(sender, broadcaster_address),
              })
            }
          }
          setHeartbeats({
            data: heartbeats,
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator])

  // evm votes
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && validator.broadcaster_loaded) {
        if (!controller.signal.aborted) {
          const {
            broadcaster_address,
            start_height,
          } = { ...validator.data }
          let votes = {}, polls = {}
          if (broadcaster_address) {
            let response = await getEvmVotes({
              query: {
                bool: {
                  must: [
                    { match: { voter: broadcaster_address } },
                  ],
                },
              },
              aggs: {
                chains: {
                  terms: { field: 'sender_chain.keyword', size: 1000 },
                  aggs: {
                    votes: {
                      terms: { field: 'vote' },
                    },
                  },
                },
              },
            })
            votes = {
              ...response?.data,
            }

            response = await getEvmPolls({
              query: {
                bool: {
                  must: [
                    { range: { height: { gte: start_height || 1 } } },
                  ],
                },
              },
              aggs: {
                chains: {
                  terms: { field: 'sender_chain.keyword', size: 1000 },
                },
              },
            })
            polls = {
              ...response?.data,
            }
          }
          setEvmVotes({
            votes,
            polls,
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator])

  // evm polls
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && equals_ignore_case(validator?.address, address) && status_data && validator.broadcaster_loaded) {
        if (!controller.signal.aborted) {
          const {
            broadcaster_address,
          } = { ...validator.data }
          let votes = [], polls = []
          if (broadcaster_address) {
            const latest_block = Number(status_data.latest_block_height)
            let response = await getEvmVotes({
              query: {
                bool: {
                  must: [
                    { match: { voter: broadcaster_address } },
                    { range: { height: { gte: latest_block - num_evm_votes_blocks } } },
                  ],
                },
              },
              size: num_evm_votes_polls,
              sort: [{ 'created_at.ms': 'desc' }],
            })
            votes = response?.data || []
            response = await getEvmPolls({
              query: {
                bool: {
                  must: [
                    { range: { height: { gte: latest_block - num_evm_votes_blocks } } },
                  ],
                }
              },
              size: num_evm_votes_polls,
              sort: [{ 'created_at.ms': 'desc' }],
            })
            polls = response?.data || []
          }
          setEvmPolls({
            votes,
            polls,
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address, validator, supportedChains])

  // keyshares & keygens & signs
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address) {
        if (!controller.signal.aborted) {
          const response = await keygens_by_validator(address)
          if (response) {
            setKeyshares({
              data: _.orderBy(response, ['snapshot_block_number'], ['desc']),
              address,
            })
          }
        }
        if (!controller.signal.aborted) {
          let data, total = 0, total_participations = 0
          const results = [true, false]
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            let response = await getKeygens({
              size: 1000,
              sort: [{ height: 'desc' }],
              track_total_hits: true,
            }, result)
            total += (response?.total || 0)
            data = _.orderBy(_.uniqBy(_.concat(data || [], response?.data?.map(d => {
              const { key_id, key_role, snapshot_validators, snapshot_non_participant_validators } = { ...d }
              return {
                ...d,
                key_role: key_role || (key_id?.split('-').length > 1 && `${key_id.split('-')[0].toUpperCase()}_KEY`),
                result,
                participated: snapshot_validators?.validators?.findIndex(v => equals_ignore_case(v?.validator, address)) > -1 &&
                  snapshot_non_participant_validators?.validators?.findIndex(v => equals_ignore_case(v?.validator, address)) < 0,
              }
            }) || []), 'key_id'), ['height'], ['desc'])
            if (result) {
              response = await getKeygens({
                query: { match: { 'snapshot_validators.validators.validator': address } },
                size: 0,
                track_total_hits: true,
              }, result)
              total_participations += (response?.total || 0)
            }
          }
          setKeygens({
            data,
            total,
            total_participations,
            address,
          })
        }
        if (!controller.signal.aborted) {
          let data, total = 0, total_participations = 0
          const results = [true, false]
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            let response = await getSignAttempts({
              query: { match: { [`${!result ? 'non_' : ''}participants`]: address } },
              size: 1000,
              sort: [{ height: 'desc' }],
              track_total_hits: true,
            })
            if (result) {
              total_participations += (response?.total || 0)
            }
            data = _.orderBy(_.uniqBy(_.concat(data || [], response?.data?.map(d => {
              const { key_id, key_role, participants, non_participants } = { ...d }
              return {
                ...d,
                key_role: key_role || (key_id?.split('-').length > 1 && `${key_id.split('-')[0].toUpperCase()}_KEY`),
                participated: participants?.findIndex(a => equals_ignore_case(a, address)) > -1 &&
                  non_participants?.findIndex(a => equals_ignore_case(a, address)) < 0,
              }
            }) || []), 'sig_id'), ['height'], ['desc'])
            if (result) {
              response = await getSignAttempts({
                size: 0,
                track_total_hits: true,
              })
              total += (response?.total || 0)
            }
          }
          setSigns({
            data,
            total,
            total_participations,
            address,
          })
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [address])

  // supported chains
  useEffect(() => {
    if (address && validators_chains_data) {
      setSupportedChains({
        data: Object.entries(validators_chains_data).filter(([k, v]) => v?.findIndex(_v => equals_ignore_case(_v, address)) > -1).map(([k, v]) => k),
        address,
      })
    }
  }, [address, validators_chains_data])

  const { uptime, heartbeats_uptime } = { ...validator?.data }
  const { broadcaster_funded } = { ...health?.data }
  const supported_chains = supportedChains?.data
  const metricClassName = 'bg-white dark:bg-black border dark:border-slate-600 shadow dark:shadow-slate-600 rounded-lg p-4'

  return (
    <div className="space-y-6 mt-2 mb-6 mx-auto pb-16">
      <div className="sm:grid sm:grid-cols-2 space-y-6 sm:space-y-0 gap-6">
        <Info
          data={validator?.address === address && validator?.data}
          votingPower={votingPower}
        />
        <div className="space-y-4">
          <div className="text-lg font-bold lg:mt-1">
            Delegations
          </div>
          <Delegations data={delegations?.address === address && delegations?.data} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Uptimes
          </span>
          <div className="text-3xl font-bold">
            {typeof uptime === 'number' ?
              `${number_format(uptime, '0,0.00')}%`
              :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            Last {number_format(num_uptime_blocks, '0,0')} Blocks
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Jailed
          </span>
          <div className="text-3xl font-bold">
            {typeof numberTimeJailed === 'number' ?
              number_format(numberTimeJailed, '0,0')
              :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            Number time jailed
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Heartbeats
          </span>
          <div className="text-3xl font-bold">
            {typeof heartbeats_uptime === 'number' ?
              `${number_format(heartbeats_uptime, '0,0.00')}%`
              :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            Last {number_format(num_heartbeat_blocks, '0,0')} Blocks
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Broadcaster
          </span>
          <div className={`h-9 flex items-center ${broadcaster_funded ? broadcaster_funded.amount >= min_broadcaster_fund ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600' : ''} text-3xl font-bold space-x-1.5`}>
            {broadcaster_funded ?
              <>
                <span className={`${number_format(broadcaster_funded.amount, '0,0.00').length > 6 ? 'lg:text-xl' : ''}`}>
                  {number_format(broadcaster_funded.amount, '0,0.00')}
                </span>
                {broadcaster_funded.amount >= min_broadcaster_fund ?
                  <BiCheckCircle size={28} /> :
                  <BiXCircle size={28} />
                }
              </>
              :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            Balance {broadcaster_funded?.denom && (
              <>
                ({broadcaster_funded.denom})
              </>
            )}
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Supported
          </span>
          <div className="h-9 flex items-center overflow-x-auto text-3xl font-bold space-x-1.5">
            {supportedChains ?
              supported_chains?.length > 0 ?
                supported_chains.filter(c => chain_manager.image(c, evm_chains_data)).map((c, i) => (
                  <Image
                    key={i}
                    src={chain_manager.image(c, evm_chains_data)}
                    title={chain_manager.name(c, evm_chains_data)}
                    className="w-6 h-6 rounded-full"
                  />
                ))
                :
                <span className="lg:text-xl font-semibold">
                  No EVM Supported
                </span>
              :
              <FallingLines color={loader_color(theme)} width="36" height="36" />
            }
          </div>
          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
            EVM Chains
          </span>
        </div>
        <div className={`${metricClassName} px-3 col-span-2 lg:col-span-1 xl:col-span-1`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            EVM votes
          </span>
          <div className="flex flex-wrap items-center">
            {evmVotes ?
              Object.keys({ ...evmVotes?.votes }).length > 0 ?
                Object.entries(evmVotes.votes).map(([k, v]) => (
                  <div
                    key={k}
                    className="min-w-max flex items-center justify-between text-2xs space-x-1 my-0.5 mr-2"
                  >
                    <div className="flex items-center space-x-1">
                      {chain_manager.image(k, evm_chains_data) && (
                        <Image
                          src={chain_manager.image(k, evm_chains_data)}
                          title={chain_manager.name(k, evm_chains_data)}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className={`${v?.votes?.true ? 'text-green-500 dark:text-green-600 font-bold' : 'text-slate-300 dark:text-slate-700 font-medium'}`}>
                        {number_format(v?.votes?.true || 0, '0,0')} Y
                      </span>
                      <span className={`${v?.votes?.false ? 'text-red-500 dark:text-red-600 font-bold' : 'text-slate-300 dark:text-slate-700 font-medium'}`}>
                        {number_format(v?.votes?.false || 0, '0,0')} N
                      </span>
                      {evmVotes?.polls?.[k] - v?.total > 0 && (
                        <span className="text-slate-400 dark:text-slate-500 font-bold">
                          {number_format(evmVotes.polls[k] - v.total, '0,0')} UN
                        </span>
                      )}
                    </div>
                    <span className="text-blue-400 dark:text-blue-200 font-semibold">
                      [{number_format(evmVotes?.polls?.[k] || 0, '0,0')}]
                    </span>
                  </div>
                ))
                :
                <span className="text-3xl font-semibold">
                  No Votes
                </span>
              :
              <div className="h-9">
                <FallingLines color={loader_color(theme)} width="36" height="36" />
              </div>
            }
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-bold">
              Uptimes
            </span>
            {typeof uptime === 'number' && (
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                {number_format(uptime * num_uptime_blocks / 100, '0,0')} / {number_format(num_uptime_blocks, '0,0')}
              </span>
            )}
          </div>
          <Uptimes data={uptimes?.address === address && uptimes?.data} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-bold">
              Heartbeats
            </span>
            {heartbeats?.data && (
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                {number_format(heartbeats.data.filter(h => h?.up).length, '0,0')} / {number_format(num_heartbeat_blocks / num_blocks_per_heartbeat, '0,0')}
              </span>
            )}
          </div>
          <Heartbeats data={heartbeats?.address === address && heartbeats?.data} />
        </div>
        <div className="md:col-span-2 xl:col-span-1 space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-bold">
              Votes
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                Last {number_format(num_evm_votes_blocks, '0,0')} Blocks
              </span>
              {evmPolls?.votes && evmPolls.polls && (
                <>
                  :
                  <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                    {number_format(evmPolls.votes.length, '0,0')} / {number_format(evmPolls.polls.length, '0,0')}
                  </span>
                </>
              )}
            </div>
          </div>
          <EVMVotes
            data={evmPolls?.address === address && evmPolls}
            supportedChains={supportedChains?.data}
          />
        </div>
      </div>
      <div className="sm:grid sm:grid-cols-2 xl:grid-cols-3 space-y-6 sm:space-y-0 gap-6 sm:gap-y-12">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-lg font-bold">
              Key Shares
            </span>
          </div>
          <Participations
            table="keyshares"
            _data={keyshares?.address === address && keyshares}
            className="min-h-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-lg font-bold">
              Keygens
            </span>
            {typeof keygens?.total_participations === 'number' && (
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                {number_format(keygens.total_participations, '0,0')} / {number_format(keygens.total, '0,0')}
              </span>
            )}
          </div>
          <Participations
            table="keygens"
            _data={keygens?.address === address && keygens}
            className="min-h-full"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-lg font-bold">
              Signs
            </span>
            {typeof signs?.total_participations === 'number' && (
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                {number_format(signs.total_participations, '0,0')} / {number_format(signs.total, '0,0')}
              </span>
            )}
          </div>
          <Participations
            table="signs"
            _data={signs?.address === address && signs}
            className="min-h-full"
          />
        </div>
      </div>
    </div>
  )
}