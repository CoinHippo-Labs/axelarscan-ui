import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Info from './info'
import Delegations from './delegations'
import CosmosGeneric from './cosmos-generic'
import HealthCheck from './health-check'
import AxelarSpecific from './axelar-specific'
import Uptimes from './uptimes'
import Heartbeats from './heartbeats'
import Participations from '../participations/participations'
import EVMSupport from './evm-support'
import Polls from './polls'
import { all_bank_balances, validator_sets, all_delegations } from '../../lib/api/cosmos'
import { keygens_by_validator } from '../../lib/api/executor'
import { uptimes as getUptimes, heartbeats as getHeartbeats, evm_votes as getEvmVotes, evm_polls as getEvmPolls, keygens as getKeygens, sign_attempts as getSignAttempts } from '../../lib/api/index'
import { chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { base64ToBech32 } from '../../lib/object/key'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { name, equals_ignore_case } from '../../lib/utils'

export default () => {
  const { assets, status, chain, validators, validators_chains } = useSelector(state => ({ assets: state.assets, status: state.status, chain: state.chain, validators: state.validators, validators_chains: state.validators_chains }), shallowEqual)
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
  const [heartbeats, setHeartbeats] = useState(null)
  const [evmVotes, setEvmVotes] = useState(null)
  const [evmPolls, setEvmPolls] = useState(null)
  const [table, setTable] = useState('keyshares')
  const [keyshares, setKeyshares] = useState(null)
  const [keygens, setKeygens] = useState(null)
  const [signs, setSigns] = useState(null)
  const [supportedChains, setSupportedChains] = useState(null)

  // validator & health
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (address && assets_data && status_data && validators_data) {
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
            const num_heartbeat_blocks = Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
            const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
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
          const latest_block = Number(status_data.latest_block_height)
          const num_uptime_display_blocks = Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS)
          const response = await getUptimes({
            query: { range: { height: {
              gt: latest_block - num_uptime_display_blocks,
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
          const num_heartbeat_blocks = Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
          const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
          const first = firstHeartbeatBlock(latest_block - num_heartbeat_blocks > start_proxy_height ? latest_block - num_heartbeat_blocks : start_proxy_height)
          const heartbeats = []
          let data
          if (broadcaster_address) {
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
              size: num_heartbeat_blocks / num_blocks_per_heartbeat + 1 + 50,
              sort: [{ period_height: 'desc' }],
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
          const { broadcaster_address, start_height } = { ...validator.data }
          let votes = {}, polls = {}
          if (broadcaster_address) {
            let response = await getEvmVotes({
              query: {
                match: { voter: broadcaster_address },
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
            votes = { ...response?.data }
            response = await getEvmPolls({
              query: {
                range: { height: {
                  gte: start_height || 1,
                } },
              },
              aggs: {
                chains: {
                  terms: { field: 'sender_chain.keyword', size: 1000 },
                },
              },
            })
            polls = { ...response?.data }
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
          const { broadcaster_address } = { ...validator.data }
          let votes = [], polls = []
          if (broadcaster_address) {
            const latest_block = Number(status_data.latest_block_height)
            const num_evm_votes_blocks = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS)
            const num_evm_votes_polls = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS)
            let response = await getEvmVotes({
              query: {
                bool: {
                  must: [
                    { match: { voter: broadcaster_address } },
                    { range: { height: {
                      gte: latest_block - num_evm_votes_blocks,
                    } } },
                  ],
                },
              },
              size: num_evm_votes_polls,
              sort: [{ 'created_at.ms': 'desc' }],
            })
            votes = response?.data || []
            response = await getEvmPolls({
              query: {
                range: { height: {
                  gte: latest_block - num_evm_votes_blocks,
                } },
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
  }, [address, validator])

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
          let data, total = 0
          const results = [true, false]
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const response = await getKeygens({
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
          }
          setKeygens({
            data,
            total,
            total_participations: data?.filter(d => d.participated).length || 0,
            address,
          })
        }
        if (!controller.signal.aborted) {
          let data, total = 0, total_participations = 0
          const results = [true, false]
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const response = await getSignAttempts({
              query: { match: { [`${!result ? 'non_' : ''}participants`]: address } },
              size: 1000,
              sort: [{ height: 'desc' }],
              track_total_hits: true,
            })
            total += (response?.total || 0)
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

  const metricClassName = 'bg-white dark:bg-black border dark:border-slate-400 shadow dark:shadow-slate-200 rounded-lg p-4'

  return (
    <div className="space-y-6 mt-2 mb-6 mx-auto">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        <div className={`${metricClassName}`}>
        </div>
        <div className={`${metricClassName}`}>
        </div>
        <div className={`${metricClassName}`}>
        </div>
        <div className={`${metricClassName} sm:col-span-2`}>
        </div>
        <div className={`${metricClassName} xl:col-span-2`}>
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-2">
          <span className="text-sm sm:text-lg font-bold">
            Uptimes
          </span>
          <Uptimes
            data={uptimes?.address === address && uptimes?.data}
            validator_data={validator?.address === address && validator?.data}
          />
        </div>
        <div className="space-y-2">
          <span className="text-sm sm:text-lg font-bold">
            Heartbeats
          </span>
          <Heartbeats
            data={heartbeats?.address === address && heartbeats?.data}
            validator_data={validator?.address === address && validator?.data}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-1 space-y-2">
          <span className="text-sm sm:text-lg font-bold">
            EVM votes
          </span>
          <Polls
            data={evmPolls?.address === address && evmPolls}
            validator_data={validator?.address === address && validator?.data}
          />
        </div>
      </div>
    {/*<div className="space-y-4">
        <AxelarSpecific
          data={validator?.address === address && validator?.data}
          keygens={keygens?.address === address && keygens?.data}
          signs={signs?.address === address && signs}
          rewards={rewards?.address === address && rewards?.data}
        />
        <div
          title={<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:flex flex-row items-center space-x-1">
            {['keyshares', 'keygens', 'signs'].map((t, i) => (
              <div
                key={i}
                onClick={() => setTable(t)}
                className={`max-w-min sm:max-w-max md:max-w-min lg:max-w-max btn btn-default btn-rounded cursor-pointer whitespace-nowrap bg-trasparent ${t === tab ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 text-white dark:hover:text-gray-100'}`}
              >
                {name(t)}
              </div>
            ))}
          </div>}
          className="dark:border-gray-900 px-2 md:px-4"
        >
          <div className="mt-1">
            <Participations
              table={table}
              _data={table === 'keygens' ?
                keygens :
                table === 'signs' ?
                  signs : keyshares
              }
            />
          </div>
        </div>
      </div>*/}
    </div>
  )
}