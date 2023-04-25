import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'

import Info from './info'
import Delegations from './delegations'
import Uptimes from './uptimes'
import Heartbeats from './heartbeats'
import EVMVotes from './evm-votes'
import Image from '../image'
import { all_bank_balances, validator_sets, all_delegations } from '../../lib/api/lcd'
import { heartbeats as searchHeartbeats } from '../../lib/api/heartbeat'
import { evm_polls as searchEVMPolls } from '../../lib/api/evm-polls'
import { uptimes as getUptimes, transactions as getTransactions, heartbeats as getHeartbeats } from '../../lib/api/index'
import { chainManager } from '../../lib/object/chain'
import { native_asset_id, getAsset, assetManager } from '../../lib/object/asset'
import { hexToBech32, base64ToBech32, bech32ToBech32 } from '../../lib/object/key'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/heartbeat'
import { number_format, name, equalsIgnoreCase, loader_color } from '../../lib/utils'

const num_uptime_blocks =
  Number(
    process.env.NEXT_PUBLIC_NUM_UPTIME_BLOCKS
  )

const num_uptime_display_blocks =
  Number(process.env.NEXT_PUBLIC_NUM_UPTIME_DISPLAY_BLOCKS
  )

const num_heartbeat_blocks =
  Number(
    process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS
  )

const num_blocks_per_heartbeat =
  Number(
    process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT
  )

const min_broadcaster_fund =
  Number(
    process.env.NEXT_PUBLIC_MIN_BROADCASTER_FUND
  )

const num_evm_votes_blocks =
  Number(
    process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS
  )

const num_evm_votes_polls =
  Number(
    process.env.NEXT_PUBLIC_NUM_EVM_VOTES_DISPLAY_POLLS
  )

export default () => {
  const {
    preferences,
    evm_chains,
    assets,
    status,
    chain,
    validators,
    validators_chains,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        assets: state.assets,
        status: state.status,
        chain: state.chain,
        validators: state.validators,
        validators_chains: state.validators_chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    status_data,
  } = { ...status }
  const {
    chain_data,
  } = { ...chain }
  const {
    validators_data,
  } = { ...validators }
  const {
    validators_chains_data,
  } = { ...validators_chains }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    address,
  } = { ...query }

  const [validator, setValidator] = useState(null)
  const [health, setHealth] = useState(null)
  const [votingPower, setVotingPower] = useState(null)
  const [delegations, setDelegations] = useState(null)
  const [uptimes, setUptimes] = useState(null)
  const [numberTimeJailed, setNumberTimeJailed] = useState(null)
  const [heartbeats, setHeartbeats] = useState(null)
  const [evmPolls, setEvmPolls] = useState(null)
  const [supportedChains, setSupportedChains] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (
          address?.startsWith('"') ||
          address?.endsWith('"')
        ) {
          router
            .push(
              `${
                pathname
                  .replace(
                    '[address]',
                    address
                      .split('"')
                      .join('')
                  )
              }`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_CONSENSUS) &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                address,
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    address,
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address &&
          [
            process.env.NEXT_PUBLIC_PREFIX_ACCOUNT,
            process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
          ].findIndex(p =>
            address.startsWith(p)
          ) < 0 &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                hexToBech32(
                  address,
                  process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                ),
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    hexToBech32(
                      address,
                      process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                    ),
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
        else if (
          address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) &&
          validators_data &&
          validators_data
            .findIndex(v =>
              v?.operator_address &&
              equalsIgnoreCase(
                v.consensus_address,
                bech32ToBech32(
                  address,
                  process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                ),
              )
            ) > -1
        ) {
          const {
            operator_address,
          } = {
            ...(
              validators_data
                .find(v =>
                  v?.operator_address &&
                  equalsIgnoreCase(
                    v.consensus_address,
                    bech32ToBech32(
                      address,
                      process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                    ),
                  )
                )
            ),
          }

          router
            .push(
              `/validator/${operator_address}`
            )
        }
      }

      getData()
    },
    [address, validators_data],
  )

  // validator & health
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          assets_data &&
          status_data &&
          validators_data
        ) {
          const validator_data = validators_data
            .find(v =>
              equalsIgnoreCase(
                v?.operator_address,
                address,
              )
            )

          if (
            validator_data?.start_proxy_height ||
            validator_data?.start_height
          ) {
            const {
              start_height,
              start_proxy_height,
              broadcaster_loaded,
              broadcaster_address,
            } = { ...validator_data }

            setValidator(
              {
                data: validator_data,
                address,
                broadcaster_loaded,
              }
            )

            if (broadcaster_loaded) {
              const _health = {
                broadcaster_registration: !!broadcaster_address,
              }

              if (broadcaster_address) {
                const response = await all_bank_balances(broadcaster_address)

                const {
                  data,
                } = { ...response }

                if (Array.isArray(data)) {
                  _health.broadcaster_funded =
                    _.head(
                      data
                        .filter(b =>
                          b?.denom === native_asset_id
                        )
                        .map(b => {
                          const {
                            denom,
                            amount,
                          } = { ...b }

                          return {
                            denom:
                              assetManager
                                .symbol(
                                  denom,
                                  assets_data,
                                ),
                            amount:
                              assetManager
                                .amount(
                                  amount,
                                  denom,
                                  assets_data,
                                ),
                          }
                        })
                    )
                }
              }
              else {
                _health.broadcaster_funded = 'No Proxy'
              }

              const latest_block = Number(status_data.latest_block_height)
              const first = firstHeartbeatBlock(latest_block - num_heartbeat_blocks)
              const last = lastHeartbeatBlock(latest_block)

              const response =
                await getHeartbeats(
                  {
                    query: {
                      bool: {
                        must: [
                          { match: { sender: broadcaster_address } },
                          {
                            range: {
                              height: {
                                gte: first,
                                lte: latest_block,
                              },
                            },
                          },
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
                  }
                )

              const {
                data,
              } = { ...response }

              const total =
                Math.floor(
                  (last - first) /
                  num_blocks_per_heartbeat
                ) +
                1

              const up =
                data?.[broadcaster_address] ||
                0

              let missed = total - up

              missed =
                missed < 0 ?
                0 :
                missed

              let uptime =
                total > 0 ?
                  up * 100 / total :
                  0

              uptime =
                uptime > 100 ?
                  100 :
                  uptime

              setHealth(
                {
                  data: {
                    ..._health,
                    total,
                    up,
                    missed,
                    heartbeats_uptime: uptime,
                  },
                  address,
                }
              )
            }
          }
          else {
            setValidator(
              {
                data: null,
                address,
                broadcaster_loaded: true,
              }
            )
          }
        }
      }

      getData()
    },
    [address, validators_data],
  )

  // voting power
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          (
            !votingPower ||
            !validator.broadcaster_loaded
          )
        ) {
          const {
            data,
          } = { ...validator }
          const {
            consensus_address,
          } = { ...data }

          const response = await validator_sets()

          const {
            validators,
          } = { ...response?.result }

          const v = (validators || [])
            .find(_v =>
              equalsIgnoreCase(
                _v?.address,
                consensus_address,
              )
            )

          const {
            proposer_priority,
            voting_power,
          } = { ...v }

          setVotingPower(
            {
              data: {
                ...data,
                proposer_priority,
                voting_power: Number(voting_power),
              },
              address,
            }
          )
        }
      }

      getData()
    },
    [address, validator],
  )

  // delegations
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          assets_data &&
          (
            !delegations ||
            !validator.broadcaster_loaded
          )
        ) {
          const response = await all_delegations(address)

          const {
            data,
          } = { ...response }

          setDelegations(
            {
              data:
                _.orderBy(
                  (data || [])
                    .map(d => {
                      const {
                        delegation,
                        balance,
                      } = { ...d }
                      const {
                        delegator_address,
                        shares,
                      } = { ...delegation }
                      const {
                        denom,
                        amount,
                      } = { ...balance }

                      return {
                        ...delegation,
                        self:
                          equalsIgnoreCase(
                            delegator_address,
                            validator.data?.delegator_address,
                          ),
                        shares:
                          isNaN(shares) ?
                            -1 :
                            assetManager
                              .amount(
                                shares,
                                denom,
                                assets_data,
                              ),
                        ...balance,
                        denom:
                          assetManager
                            .symbol(
                              denom,
                              assets_data,
                            ),
                        amount:
                          isNaN(amount) ?
                            -1 :
                            assetManager
                              .amount(
                                amount,
                                denom,
                                assets_data,
                              ),
                        asset_data:
                          getAsset(
                            denom,
                            assets_data,
                          ),
                      }
                    }),
                  [
                    'self',
                    'shares',
                  ],
                  [
                    'desc',
                    'desc',
                  ],
                ),
              address,
            }
          )
        }
      }

      getData()
    },
    [address, validator, assets_data],
  )

  // uptimes
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          status_data &&
          (
            !uptimes ||
            !validator.broadcaster_loaded
          )
        ) {
          const {
            consensus_address,
          } = { ...validator.data }

          const latest_block = Number(status_data.latest_block_height) - 1

          const response =
            await getUptimes(
              {
                query: {
                  range: {
                    height: {
                      gt: latest_block - num_uptime_display_blocks,
                      lte: latest_block,
                    },
                  },
                },
                size: num_uptime_display_blocks,
                sort: [{ height: 'desc' }],
              },
            )

          const {
            data,
          } = { ...response }

          setUptimes(
            {
              data:
                [...Array(num_uptime_display_blocks).keys()]
                  .map(i => {
                    const height = latest_block - i

                    const u = (data || [])
                      .find(d =>
                        d?.height === height
                      )

                    const {
                      validators,
                    } = { ...u }

                    return {
                      ...u,
                      height,
                      up:
                        !!(
                          (validators || [])
                            .map(v =>
                              base64ToBech32(
                                v,
                                process.env.NEXT_PUBLIC_PREFIX_CONSENSUS,
                              )
                            )
                            .includes(consensus_address)
                        ),
                    }
                  }),
              address,
            }
          )
        }
      }

      getData()
    },
    [address, validator],
  )

  // number time jailed
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          status_data &&
          (
            typeof numberTimeJailed !== 'number' ||
            !validator.broadcaster_loaded
          )
        ) {
          const {
            operator_address,
            jailed,
          } = { ...validator.data }

          const response =
            await getTransactions(
              {
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
              },
            )

          setNumberTimeJailed(
            (
              response?.total ||
              0
            ) +
            (jailed ?
              1 :
              0
            )
          )
        }
      }

      getData()
    },
    [address, validator],
  )

  // heartbeats
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          status_data &&
          validator.broadcaster_loaded &&
          !heartbeats
        ) {
          const {
            broadcaster_address,
          } = { ...validator.data }
          let {
            start_proxy_height,
          } = { ...validator.data }

          start_proxy_height =
            start_proxy_height ||
            0

          const latest_block = Number(status_data.latest_block_height)
          const first =
            firstHeartbeatBlock(
              latest_block - num_heartbeat_blocks > start_proxy_height ?
                latest_block - num_heartbeat_blocks :
                start_proxy_height
            )

          const heartbeats = []

          let data

          if (broadcaster_address) {
            const response =
              await searchHeartbeats(
                {
                  sender: broadcaster_address,
                  fromBlock: first,
                  toBlock: latest_block,
                  size: num_heartbeat_blocks / num_blocks_per_heartbeat + 1 + 50,
                },
              )

            data =
              response?.data ||
              []
          }

          for (let height = latest_block; height >= first; height--) {
            if (
              height % num_blocks_per_heartbeat === 1 &&
              heartbeats.length < num_heartbeat_blocks / num_blocks_per_heartbeat
            ) {
              const h = (data || [])
                .find(d =>
                  d?.period_height === height
                )

              const {
                sender,
              } = { ...h }

              heartbeats
                .push(
                  {
                    ...h,
                    height,
                    up:
                      equalsIgnoreCase(
                        sender,
                        broadcaster_address,
                      ),
                  }
                )
            }
          }

          setHeartbeats(
            {
              data: heartbeats,
              address,
            }
          )
        }
      }

      getData()
    },
    [address, validator],
  )

  // evm polls
  useEffect(
    () => {
      const getData = async () => {
        if (
          address &&
          equalsIgnoreCase(
            validator?.address,
            address,
          ) &&
          status_data &&
          validator.broadcaster_loaded
        ) {
          const {
            broadcaster_address,
          } = { ...validator.data }

          let polls = [],
            votes = []

          if (broadcaster_address) {
            const latest_block = Number(status_data.latest_block_height)

            const response =
              await searchEVMPolls(
                {
                  voter: broadcaster_address,
                  fromBlock: latest_block - num_evm_votes_blocks,
                  size: num_evm_votes_polls,
                },
              )

            polls =
              response?.data ||
              []

            votes =
              polls
                .map(p =>
                  Object.fromEntries(
                    Object.entries(p)
                      .filter(([k, v]) =>
                        !k?.startsWith(`${process.env.NEXT_PUBLIC_PREFIX_ACCOUNT}1`) ||
                        equalsIgnoreCase(
                          k,
                          broadcaster_address,
                        )
                      )
                      .flatMap(([k, v]) =>
                        equalsIgnoreCase(
                          k,
                          broadcaster_address,
                        ) ?
                          Object.entries({ ...v })
                            .map(([_k, _v]) =>
                              [
                                _k === 'id' ?
                                  'txhash' :
                                  _k,
                                _v,
                              ]
                            ) :
                          [
                            [
                              k,
                              v,
                            ]
                          ]
                      )
                  )
                )
          }

          setEvmPolls(
            {
              polls,
              votes,
              address,
            }
          )
        }
      }

      getData()
    },
    [address, validator, supportedChains],
  )

  // supported chains
  useEffect(
    () => {
      if (
        address &&
        validators_chains_data
      ) {
        setSupportedChains(
          {
            data:
              Object.entries(validators_chains_data)
                .filter(([k, v]) =>
                  (v || [])
                    .findIndex(_v =>
                      equalsIgnoreCase(
                        _v,
                        address,
                      )
                    ) > -1
                )
                .map(([k, v]) => k),
            address,
          }
        )
      }
    },
    [address, validators_chains_data],
  )

  const {
    uptime,
    heartbeats_uptime,
    stale_heartbeats,
    votes,
  } = { ...validator?.data }

  const {
    broadcaster_funded,
  } = { ...health?.data }

  const supported_chains = supportedChains?.data

  const metricClassName = 'bg-white dark:bg-zinc-900 shadow shadow-zinc-200 dark:shadow-zinc-700 rounded py-4 xl:py-3 px-5 xl:px-4'
  const titleClassName = 'text-xl font-semibold space-x-1'
  const subtitleClassName = 'text-slate-500 dark:text-slate-200 text-xs font-normal ml-0.5'

  return (
    <div className="space-y-6 mt-2 mb-6 mx-auto pb-16">
      <div className="sm:grid sm:grid-cols-2 space-y-6 sm:space-y-0 gap-6 mb-16">
        <Info
          data={
            validator?.address === address &&
            validator?.data
          }
          votingPower={votingPower}
        />
        <div className="space-y-4">
          <div className="text-lg font-semibold lg:mt-1">
            Delegations
          </div>
          <Delegations
            data={
              delegations?.address === address &&
              delegations?.data
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Uptimes
          </span>
          <div className={titleClassName}>
            {typeof uptime === 'number' ?
              `${
                number_format(
                  uptime,
                  '0,0.00',
                )
              }%` :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          <span className={subtitleClassName}>
            Last {
              number_format(
                num_uptime_blocks,
                '0,0',
              )
            } Blocks
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Jailed
          </span>
          <div className={titleClassName}>
            {typeof numberTimeJailed === 'number' ?
              number_format(
                numberTimeJailed,
                '0,0',
              ) :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          <span className={subtitleClassName}>
            Number time jailed
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Heartbeats
          </span>
          <div className={`${titleClassName}`}>
            {typeof heartbeats_uptime === 'number' ?
              `${
                number_format(
                  heartbeats_uptime,
                  '0,0.00',
                )
              }%` :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          {
            stale_heartbeats &&
            (
              <div className="w-fit bg-red-200 dark:bg-red-400 text-red-500 dark:text-red-800 rounded-xl whitespace-nowrap text-xs font-semibold py-0.5 px-2">
                Stale Heartbeats
              </div>
            )
          }
          <span className={subtitleClassName}>
            Last {
              number_format(
                num_heartbeat_blocks,
                '0,0',
              )
            } Blocks
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Broadcaster
          </span>
          <div className={`flex items-center space-x-2 ${broadcaster_funded?.amount >= min_broadcaster_fund ? 'text-green-400 dark:text-green-300' : 'text-red-500 dark:text-red-600'} ${titleClassName}`}>
            {broadcaster_funded ?
              <>
                <span>
                  {number_format(
                    broadcaster_funded.amount,
                    '0,0.00',
                  )}
                </span>
                {broadcaster_funded.amount >= min_broadcaster_fund ?
                  <BiCheckCircle
                    size={20}
                  /> :
                  <BiXCircle
                    size={20}
                  />
                }
              </> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          <span className={subtitleClassName}>
            Balance {
              broadcaster_funded?.denom &&
              (
                <>
                  ({broadcaster_funded.denom})
                </>
              )
            }
          </span>
        </div>
        <div className={`${metricClassName}`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            Supported
          </span>
          <div className={`${titleClassName}`}>
            {supportedChains ?
              supported_chains?.length > 0 ?
                <div className="flex flex-wrap items-center overflow-x-auto -ml-1">
                  {supported_chains
                    .filter(c =>
                      chainManager
                        .image(
                          c,
                          evm_chains_data,
                        )
                    )
                    .map((c, i) => (
                      <Image
                        key={i}
                        src={
                          chainManager
                            .image(
                              c,
                              evm_chains_data,
                            )
                        }
                        title={
                          chainManager
                            .name(
                              c,
                              evm_chains_data,
                            )
                        }
                        className="w-5 h-5 rounded-full mt-1 mb-0.5 ml-1"
                      />
                    ))
                  }
                </div> :
                <span className="text-slate-300 dark:text-slate-600 font-normal">
                  No chains
                </span> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          <span className={subtitleClassName}>
            EVM Chains
          </span>
        </div>
        <div className={`${metricClassName} px-3 col-span-2 lg:col-span-1 xl:col-span-1`}>
          <span className="text-slate-500 dark:text-slate-300 text-sm font-semibold">
            EVM votes
          </span>
          <div className={`flex flex-wrap items-center ${titleClassName}`}>
            {votes ?
              Object.keys({ ...votes?.chains }).length > 0 ?
                <div className="flex flex-col">
                  {Object.entries(votes.chains)
                    .map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between space-x-2"
                      >
                        <div className="flex items-center space-x-1">
                          {
                            chainManager
                              .image(
                                k,
                                evm_chains_data,
                              ) &&
                            (
                              <Image
                                src={
                                  chainManager
                                    .image(
                                      k,
                                      evm_chains_data,
                                    )
                                }
                                title={
                                  chainManager
                                    .name(
                                      k,
                                      evm_chains_data,
                                    )
                                }
                                className="w-4 h-4 rounded-full"
                              />
                            )
                          }
                          <span className={`h-5 leading-5 whitespace-nowrap text-2xs ${v?.votes?.true ? 'text-green-400 dark:text-green-300' : 'text-slate-300 dark:text-slate-700'}`}>
                            {number_format(
                              v?.votes?.true ||
                              0,
                              '0,0',
                            )} Y
                          </span>
                          <span className={`h-5 leading-5 whitespace-nowrap text-2xs ${v?.votes?.false ? 'text-red-500 dark:text-red-600' : 'text-slate-300 dark:text-slate-700'}`}>
                            {number_format(
                              v?.votes?.false ||
                              0,
                              '0,0',
                            )} N
                          </span>
                          {
                            v?.votes?.unsubmitted > 0 &&
                            (
                              <span className="h-5 leading-5 whitespace-nowrap text-2xs text-slate-400 dark:text-slate-500">
                                {number_format(
                                  v.votes.unsubmitted,
                                  '0,0',
                                )} UN
                              </span>
                            )
                          }
                        </div>
                        <span className="h-5 leading-5 whitespace-nowrap text-2xs text-blue-400 dark:text-blue-200">
                          [{
                            number_format(
                              v?.total_polls ||
                              0,
                              '0,0',
                            )
                          }]
                        </span>
                      </div>
                    ))
                  }
                </div> :
                <span className="text-slate-300 dark:text-slate-600 font-normal">
                  No votes
                </span> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="28"
                height="28"
              />
            }
          </div>
          <span className={subtitleClassName}>
            Last {
              number_format(
                num_evm_votes_blocks,
                '0,0',
              )
            } Blocks
          </span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-semibold">
              Uptimes
            </span>
            {
              typeof uptime === 'number' &&
              (
                <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                  {
                    number_format(
                      uptime * num_uptime_blocks / 100,
                      '0,0',
                    )
                  } / {
                    number_format(
                      num_uptime_blocks,
                      '0,0',
                    )
                  }
                </span>
              )
            }
          </div>
          <Uptimes
            data={
              uptimes?.address === address &&
              uptimes?.data
            }
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-semibold">
              Heartbeats
            </span>
            {
              heartbeats?.data &&
              (
                <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                  {
                    number_format(
                      heartbeats.data
                        .filter(h => h?.up)
                        .length,
                      '0,0',
                    )
                  } / {
                    number_format(
                      num_heartbeat_blocks / num_blocks_per_heartbeat,
                      '0,0',
                    )
                  }
                </span>
              )
            }
          </div>
          <Heartbeats
            data={
              heartbeats?.address === address &&
              heartbeats?.data
            }
          />
        </div>
        <div className="md:col-span-2 xl:col-span-1 space-y-2">
          <div className="flex items-center justify-between mr-3 xl:mr-1.5">
            <span className="text-sm sm:text-lg font-semibold">
              Votes
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                Last {
                  number_format(
                    num_evm_votes_polls,
                    '0,0',
                  )
                } Polls
              </span>
              {
                evmPolls?.polls &&
                evmPolls.votes &&
                (
                  <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                    {
                      number_format(
                        evmPolls.votes.length,
                        '0,0',
                      )
                    } / {
                      number_format(
                        evmPolls.polls.length,
                        '0,0',
                      )
                    }
                  </span>
                )
              }
            </div>
          </div>
          <EVMVotes
            data={
              evmPolls?.address === address &&
              evmPolls
            }
          />
        </div>
      </div>
    </div>
  )
}