import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, constants, providers, utils } from 'ethers'
import Linkify from 'react-linkify'
import parse from 'html-react-parser'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { tvl as getTVL } from '../../lib/api/transfer'
import { getStatus } from '../../lib/api/rpc'
import { staking_params, bank_supply, staking_pool, slashing_params, all_validators, all_validators_broadcaster, all_validators_status, chain_maintainer } from '../../lib/api/lcd'
import { token } from '../../lib/api/coingecko'
import { ens as getEns } from '../../lib/api/ens'
import { escrow_addresses } from '../../lib/api/escrow-addresses'
import { validators_evm_votes } from '../../lib/api/validators-evm-votes'
import { heartbeats as getHeartbeats } from '../../lib/api/index'
import { type } from '../../lib/object/id'
import { getChain } from '../../lib/object/chain'
import { native_asset_id, assetManager } from '../../lib/object/asset'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/heartbeat'
import { equalsIgnoreCase } from '../../lib/utils'
import { EVM_CHAINS_DATA, COSMOS_CHAINS_DATA, ASSETS_DATA, ENS_DATA, ACCOUNTS_DATA, CHAIN_DATA, STATUS_DATA, TVL_DATA, VALIDATORS_DATA, VALIDATORS_CHAINS_DATA, RPCS } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    evm_chains,
    cosmos_chains,
    assets,
    ens,
    chain,
    _status,
    tvl,
    validators,
    rpc_providers,
  } = useSelector(
    state => (
      {
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
        ens: state.ens,
        chain: state.chain,
        _status: state.status,
        tvl: state.tvl,
        validators: state.validators,
        rpc_providers: state.rpc_providers,
      }
    ),
    shallowEqual,
  )
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    ens_data,
  } = { ...ens }
  const {
    chain_data,
  } = { ...chain }
  const {
    status_data,
  } = { ..._status }
  const {
    tvl_data,
  } = { ...tvl }
  const {
    validators_data,
  } = { ...validators }
  const {
    rpcs,
  } = { ...rpc_providers }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    status,
    address,
  } = { ...query }

  const [validatorsTrigger, setValidatorsTrigger] = useState(null)

  // chains
  useEffect(
    () => {
      const getData = async () => {
        const {
          evm,
          cosmos,
        } = { ...await getChains() }

        if (evm) {
          dispatch(
            {
              type: EVM_CHAINS_DATA,
              value: evm,
            }
          )
        }

        if (cosmos) {
          dispatch(
            {
              type: COSMOS_CHAINS_DATA,
              value: cosmos,
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async () => {
        const assets_data = await getAssets()

        if (assets_data) {
          // price
          let updated_ids = assets_data.filter(a => typeof a?.price === 'number').map(a => a.id)

          if (updated_ids.length < assets_data.length) {
            let updated = false

            const denoms =
              assets_data
                .filter(a => a?.id && !updated_ids.includes(a.id))
                .map(a => {
                  const {
                    id,
                    contracts,
                  } = { ...id }

                  const chain = _.head((contracts || []).map(c => c?.chain))

                  if (chain) {
                    return {
                      denom: id,
                      chain,
                    }
                  }

                  return a.id
                })

            if (denoms.length > 0) {
              const response = await getAssetsPrice({ denoms })

              if (Array.isArray(response)) {
                response.forEach(a => {
                  const {
                    denom,
                    price,
                  } = { ...a }

                  const asset_index = assets_data.findIndex(_a => equalsIgnoreCase(_a?.id, denom))

                  if (asset_index > -1) {
                    const asset_data = assets_data[asset_index]

                    const {
                      id,
                    } = { ...asset_data }

                    asset_data.price = price || asset_data.price || 0
                    assets_data[asset_index] = asset_data

                    updated_ids = _.uniq(_.concat(updated_ids, id))
                    updated = true
                  }
                })
              }
            }

            if (updated) {
              dispatch(
                {
                  type: ASSETS_DATA,
                  value: _.cloneDeep(assets_data),
                }
              )
            }
          }
        }
      }

      getData()
    },
    [],
  )

  // status
  useEffect(
    () => {
      const getData = async is_interval => {
        if (!status_data || is_interval) {
          const response = await getStatus(undefined, is_interval && status_data)

          if (response) {
            dispatch(
              {
                type: STATUS_DATA,
                value: response,
              }
            )

            if (!is_interval) {
              setValidatorsTrigger(moment().valueOf())
            }
          }
        }
      }

      getData()

      const interval = setInterval(() => getData(true), 6 * 1000)
      return () => clearInterval(interval)
    },
    [status_data],
  )

  // chain
  useEffect(
    () => {
      const getData = async is_interval => {
        if (cosmos_chains_data && assets_data) {
          const chain_data = getChain('axelarnet', cosmos_chains_data)

          const {
            coingecko_id,
          } = { ...chain_data }

          dispatch(
            {
              type: CHAIN_DATA,
              value: {
                ...chain_data,
              },
            }
          )

          let response = await staking_params()

          if (response) {
            const {
              params,
            } = { ...response }

            const {
              bond_denom,
            } = { ...params }

            dispatch(
              {
                type: CHAIN_DATA,
                value: {
                  staking_params: {
                    ...params,
                  },
                },
              }
            )

            if (bond_denom) {
              response = await bank_supply(bond_denom)

              const {
                amount,
              } = { ...response }
              const {
                denom,
              } = { ...amount }

              dispatch(
                {
                  type: CHAIN_DATA,
                  value: {
                    bank_supply:
                      Object.fromEntries(
                        Object.entries({ ...amount })
                          .map(([k, v]) =>
                            [
                              k,
                              k === 'denom' ? assetManager.symbol(v, assets_data) : assetManager.amount(v, denom, assets_data),
                            ]
                          )
                      ),
                  },
                }
              )
            }
          }

          response = await staking_pool()

          if (response) {
            const {
              pool,
            } = { ...response }

            dispatch(
              {
                type: CHAIN_DATA,
                value: {
                  staking_pool:
                    Object.fromEntries(
                      Object.entries({ ...pool })
                        .map(([k, v]) =>
                          [
                            k,
                            assetManager.amount(v, native_asset_id, assets_data),
                          ]
                        )
                    ),
                },
              }
            )
          }

          if (!is_interval) {
            response = await slashing_params()

            if (response) {
              const {
                params,
              } = { ...response }

              dispatch(
                {
                  type: CHAIN_DATA,
                  value: {
                    slashing_params: {
                      ...params,
                    },
                  },
                }
              )
            }

            response = await (await fetch(process.env.NEXT_PUBLIC_RELEASES_URL)).text()

            if (response?.includes('`axelar-core` version')) {
              response = response.split('\n').filter(l => l?.includes('`axelar-core` version'))

              dispatch(
                {
                  type: CHAIN_DATA,
                  value: {
                    ...Object.fromEntries(
                      [
                        _.head(response)
                          .split('|')
                          .map(s =>
                            (s || '').trim().split('`').join('').split(' ').join('_')
                          )
                          .filter(s => s),
                      ]
                    ),
                  },
                }
              )
            }
            else {
              dispatch(
                {
                  type: CHAIN_DATA,
                  value: { 'axelar-core_version': '-' },
                }
              )
            }
          }

          /*
          if (coingecko_id) {
            response = await token(coingecko_id)

            if (response) {
              dispatch(
                {
                  type: CHAIN_DATA,
                  value: { token_data: { ...response } },
                }
              )
            }
          }
          */
        }
      }

      getData()

      const interval = setInterval(() => getData(true), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [cosmos_chains_data, assets_data],
  )

  // rpcs
  useEffect(
    () => {
      const init = async => {
        if (evm_chains_data && ['/tvl'].includes(pathname)) {
          const _rpcs = {}

          for (const chain_data of evm_chains_data) {
            const {
              disabled,
              chain_id,
              provider_params,
            } = { ...chain_data }

            if (!disabled) {
              const {
                rpcUrls,
              } = { ..._.head(provider_params) }
   
              const rpc_urls = (rpcUrls || []).filter(url => url)

              const provider =
                rpc_urls.length > 0 ?
                  rpc_urls.length === 1 ?
                    new providers.StaticJsonRpcProvider(_.head(rpc_urls), chain_id) :
                    new providers.FallbackProvider(
                      rpc_urls.map((url, i) => {
                        return {
                          provider: new providers.StaticJsonRpcProvider(url, chain_id),
                          priority: i + 1,
                          stallTimeout: 1000,
                        }
                      }),
                      rpc_urls.length / 3,
                    ) :
                  null

              _rpcs[chain_id] = provider
            }
          }

          if (!rpcs) {
            dispatch(
              {
                type: RPCS,
                value: _rpcs,
              }
            )
          }
        }
      }

      init()
    },
    [evm_chains_data, pathname],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (['evm_address'].includes(type(address))) {
          const addresses = [address].filter(a => a && !ens_data?.[a])

          const ens_data = await getEns(addresses)

          if (ens_data) {
            dispatch(
              {
                type: ENS_DATA,
                value: ens_data,
              }
            )
          }
        }
      }

      getData()
    },
    [address],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        const response = await escrow_addresses()

        const {
          data,
        } = { ...response }

        if (data) {
          dispatch(
            {
              type: ACCOUNTS_DATA,
              value: data,
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // tvl
  useEffect(
    () => {
      const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

      const getAssetData = async asset_data => {
        if (asset_data) {
          const {
            id,
          } = { ...asset_data }

          for (let i = 0; i < 3; i++) {
            const response = await getTVL({ asset: id })

            const {
              data,
              updated_at,
            } = { ...response }

            if (data) {
              dispatch(
                {
                  type: TVL_DATA,
                  value: {
                    [id]: { ..._.head(data), updated_at },
                  },
                }
              )
              break
            }
          }
        }
      }

      const getData = is_interval => {
        if (assets_data) {
          if (['/tvl'].includes(pathname) && (!tvl_data || is_interval)) {
            assets_data.filter(a => a && !a.no_tvl && (!a.is_staging || staging)).forEach(a => getAssetData(a))
          }
        }
      }

      getData()

      const interval = setInterval(() => getData(true), 3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [assets_data, pathname],
  )

  // validators
  useEffect(
    () => {
      const getData = async () => {
        if (
          assets_data && status_data &&
          [
            '/address',
            '/transfer',
            '/tvl',
            '/gmp',
            '/batch',
            '/assets',
          ]
          .findIndex(p => pathname?.startsWith(p)) < 0
        ) {
          let response

          switch (pathname) {
            case '/':
            case '/validators':
            case '/validators/[status]':
            case '/validator/[address]':
            case '/account/[address]':
            case '/evm-polls':
            case '/evm-poll/[id]':
            case '/participations':
            case '/block/[height]':
            case '/transactions':
            case '/transactions/search':
            case '/tx/[tx]':
              const {
                latest_block_height,
              } = { ...status_data }

              response =
                await all_validators(
                  null,
                  validators_data,
                  status || (address ? null : 'active'),
                  address,
                  latest_block_height,
                  assets_data,
                )

              if (response) {
                if (!validators_data) {
                  dispatch(
                    {
                      type: VALIDATORS_DATA,
                      value: response,
                    }
                  )
                }

                if (!['/participations'].includes(pathname)) {
                  response = await all_validators_broadcaster(response, null, assets_data)

                  if (response?.length > 0) {
                    let _response = response

                    if (['/validators', '/validators/[status]', '/validator/[address]'].includes(pathname)) {
                      const num_heartbeat_blocks = Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
                      const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)

                      const first = firstHeartbeatBlock(latest_block_height - num_heartbeat_blocks)
                      const last = lastHeartbeatBlock(latest_block_height)

                      response =
                        await getHeartbeats(
                          {
                            query: {
                              bool: {
                                must: [
                                  { range: { height: { gte: first, lte: latest_block_height } } },
                                ],
                              },
                            },
                            aggs: {
                              heartbeats: {
                                terms: { field: 'sender.keyword', size: 1000 },
                                aggs: {
                                  period_height: {
                                    terms: { field: 'period_height', size: 1000 },
                                  },
                                },
                              },
                            },
                            _source: false,
                          },
                        )

                      for (let i = 0; i < _response.length; i++) {
                        const v = _response[i]

                        const {
                          broadcaster_address,
                        } = { ...v }

                        const total = Math.floor((last - first) / num_blocks_per_heartbeat) + 1
                        const up = response?.data?.[broadcaster_address] || 0

                        let uptime = total > 0 ? up * 100 / total : 0
                        uptime = uptime > 100 ? 100 : uptime

                        v.heartbeats_uptime = uptime
                        _response[i] = v
                      }

                      response = _response

                      dispatch(
                        {
                          type: VALIDATORS_DATA,
                          value: response,
                        }
                      )

                      const num_evm_votes_blocks = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS)

                      response =
                        await validators_evm_votes(
                          {
                            fromBlock: latest_block_height - num_evm_votes_blocks,
                            toBlock: latest_block_height - 10,
                          },
                        )

                      const {
                        data,
                        total,
                      } = { ...response }

                      for (let i = 0; i < _response.length; i++) {
                        const v = _response[i]

                        const {
                          broadcaster_address,
                        } = { ...v }

                        v.votes = { ...response?.data?.[broadcaster_address] }
                        v.total_votes = v.votes.total || 0

                        const get_votes = vote =>
                          _.sum(
                            Object.entries({ ...v.votes?.chains })
                              .map(c =>
                                Object.entries({ ...c[1]?.votes }).find(_v => equalsIgnoreCase(_v[0], vote?.toString()))?.[1] || 0
                              )
                          )

                        v.total_yes_votes = get_votes(true)
                        v.total_no_votes = get_votes(false)
                        v.total_unsubmitted_votes = get_votes('unsubmitted')
                        v.total_polls = total

                        _response[i] = v
                      }
                    }

                    response = _response

                    dispatch(
                      {
                        type: VALIDATORS_DATA,
                        value: response,
                      }
                    )
                  }
                }

                response = await all_validators_status(response)
              }
              break
            default:
              response =
                await all_validators(
                  null,
                  validators_data,
                  null,
                  null,
                  null,
                  assets_data,
                )
              break
          }

          if (response) {
            dispatch(
              {
                type: VALIDATORS_DATA,
                value: response,
              }
            )
          }
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [assets_data, pathname, validatorsTrigger],
  )

  // chain maintainner
  useEffect(
    () => {
      const getChainData = async (
        id,
        chains_data,
      ) => {
        const response = await chain_maintainer(id, chains_data)

        if (response) {
          dispatch(
            {
              type: VALIDATORS_CHAINS_DATA,
              value: response,
            }
          )
        }
      }

      const getData = () => {
        if (
          evm_chains_data &&
          [
            '/validator',
            '/participations',
            '/proposals',
          ]
          .findIndex(p => pathname?.includes(p)) > -1
        ) {
          evm_chains_data.map(c => c?.id).forEach(id => getChainData(id, evm_chains_data))
        }
      }

      getData()

      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [evm_chains_data, pathname],
  )

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations />
          </div>
          <div className="flex items-center justify-center">
            <Navigations />
          </div>
          <div className="flex items-center justify-end">
            <Search />
            <Theme />
          </div>
        </div>
      </div>
      {
        process.env.NEXT_PUBLIC_STATUS_MESSAGE &&
        (
          <div className="w-full h-8 bg-slate-100 dark:bg-zinc-900 overflow-auto flex items-center justify-center">
            <span className="status-message whitespace-nowrap text-slate-500 dark:text-slate-300">
              <Linkify>
                {parse(process.env.NEXT_PUBLIC_STATUS_MESSAGE)}
              </Linkify>
            </span>
          </div>
        )
      }
      {
        process.env.NEXT_PUBLIC_REINDEXING === 'true' &&
        (
          <div className="w-full h-8 bg-slate-100 dark:bg-zinc-900 overflow-auto flex items-center justify-center">
            <span className="whitespace-nowrap text-slate-500 dark:text-slate-300">
              We're reindexing the recent data. It will be updated shortly.
            </span>
          </div>
        )
      }
      <SubNavbar />
    </>
  )
}