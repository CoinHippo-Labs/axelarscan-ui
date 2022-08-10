import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, Contract, constants, providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Environments from './environments'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { coin } from '../../lib/api/coingecko'
import { status as getStatus } from '../../lib/api/rpc'
import { staking_params, bank_supply, staking_pool, slashing_params, distribution_params, mint_inflation, all_validators, all_validators_broadcaster, all_validators_status, chain_maintainer } from '../../lib/api/cosmos'
import { ens as getEns } from '../../lib/api/ens'
import { heartbeats as getHeartbeats, evm_votes as getEvmVotes, evm_polls as getEvmPolls } from '../../lib/api/index'
import { type } from '../../lib/object/id'
import { getChain } from '../../lib/object/chain'
import { denom_manager } from '../../lib/object/denom'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { equals_ignore_case } from '../../lib/utils'
import { EVM_CHAINS_DATA, COSMOS_CHAINS_DATA, ASSETS_DATA, ENS_DATA, CHAIN_DATA, STATUS_DATA, TVL_DATA, VALIDATORS_DATA, VALIDATORS_CHAINS_DATA, RPCS } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const { evm_chains, cosmos_chains, assets, ens, chain, _status, tvl, validators, rpc_providers } = useSelector(state => ({ evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, ens: state.ens, chain: state.chain, _status: state.status, tvl: state.tvl, validators: state.validators, rpc_providers: state.rpc_providers }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { chain_data } = { ...chain }
  const { status_data } = { ..._status }
  const { tvl_data } = { ...tvl }
  const { validators_data } = { ...validators }
  const { rpcs } = { ...rpc_providers }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { status, address } = { ...query }

  const [validatorsTrigger, setValidatorsTrigger] = useState(null)

  // chains
  useEffect(() => {
    const getData = async () => {
      const response = await getChains()
      if (response) {
        dispatch({
          type: EVM_CHAINS_DATA,
          value: response.evm,
        })
        dispatch({
          type: COSMOS_CHAINS_DATA,
          value: response.cosmos,
        })
      }
    }
    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await getAssets()
      if (response) {
        const assets_data = response
        // price
        let updated_ids = assets_data.filter(a => a?.id === 'uaxl' || typeof a?.price === 'number').map(a => a.id)
        if (updated_ids.length < assets_data.length) {
          let updated = false
          const denoms = assets_data.filter(a => a?.id && !updated_ids.includes(a.id)).map(a => {
            const chain = _.head(a?.contracts?.map(c => c?.chain))
            if (chain) {
              return {
                denom: a.id,
                chain,
              }
            }
            return a.id
          })
          if (denoms.length > 0) {
            const response = await getAssetsPrice({ denoms })
            if (response) {
              response.forEach(t => {
                const asset_index = assets_data.findIndex(a => equals_ignore_case(a?.id, t?.denom))
                if (asset_index > -1) {
                  const asset_data = assets_data[asset_index]
                  asset_data.price = asset_data.id === 'uaxl' ? null : (t?.price || asset_data.price || 0)
                  assets_data[asset_index] = asset_data
                  updated_ids = _.uniq(_.concat(updated_ids, asset_data.id))
                  updated = true
                }
              })
            }
          }
          if (updated) {
            dispatch({
              type: ASSETS_DATA,
              value: _.cloneDeep(assets_data),
            })
          }
        }
      }
    }
    getData()
  }, [])

  // status
  useEffect(() => {
    const getData = async is_interval => {
      if (!status_data || is_interval) {
        const response = await getStatus(null, is_interval && status_data)
        if (response) {
          dispatch({
            type: STATUS_DATA,
            value: response,
          })
          if (!is_interval) {
            setValidatorsTrigger(moment().valueOf())
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 6 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [status_data])

  // chain
  useEffect(() => {
    const getData = async () => {
      if (cosmos_chains_data && assets_data) {
        const chain_data = getChain('axelarnet', cosmos_chains_data)
        dispatch({
          type: CHAIN_DATA,
          value: { ...chain_data },
        })
        let response = await staking_params()
        if (response) {
          dispatch({
            type: CHAIN_DATA,
            value: { staking_params: { ...response?.params } },
          })
          if (response?.params?.bond_denom) {
            response = await bank_supply(response.params.bond_denom)
            dispatch({
              type: CHAIN_DATA,
              value: {
                bank_supply: Object.fromEntries(
                  Object.entries({ ...response?.amount }).map(([k, v]) =>
                    [k, k === 'denom' ? denom_manager.symbol(v, assets_data) : denom_manager.amount(v, response.amount.denom, assets_data)]
                  )
                ),
              },
            })
          }
        }
        response = await staking_pool()
        if (response) {
          dispatch({
            type: CHAIN_DATA,
            value: {
              staking_pool: Object.fromEntries(
                Object.entries({ ...response?.pool }).map(([k, v]) =>
                  [k, denom_manager.amount(v, assets_data[0]?.id, assets_data)]
                )
              ),
            },
          })
        }
        response = await slashing_params()
        if (response) {
          dispatch({
            type: CHAIN_DATA,
            value: { slashing_params: { ...response?.params } },
          })
        }
        response = await distribution_params()
        if (response) {
          dispatch({
            type: CHAIN_DATA,
            value: { distribution_params: { ...response?.params } },
          })
        }
        response = await mint_inflation()
        if (response) {
          dispatch({
            type: CHAIN_DATA,
            value: { inflation: Number(response?.inflation || 0) },
          })
        }
        if (chain_data?.coingecko_id) {
          const response = await coin(chain_data.coingecko_id)
          chain_data.token_data = !response?.error && response
          dispatch({
            type: CHAIN_DATA,
            value: { ...chain_data },
          })
        }
        const res = await fetch(process.env.NEXT_PUBLIC_RELEASES_URL)
        response = await res.text()
        if (response?.includes('`axelar-core` version')) {
          response = response.split('\n').filter(l => l?.includes('`axelar-core` version'))
          dispatch({
            type: CHAIN_DATA,
            value: { ...Object.fromEntries(
              [_.head(response).split('|').map(s => s?.trim().split('`').join('').split(' ').join('_')).filter(s => s)]
            ) },
          })
        }
        else {
          dispatch({
            type: CHAIN_DATA,
            value: { 'axelar-core_version': '-' },
          })
        }
      }
    }
    getData()
  }, [cosmos_chains_data, assets_data])

  // rpcs
  useEffect(() => {
    const init = async => {
      if (evm_chains_data && ['/tvl'].includes(pathname)) {
        const _rpcs = {}
        for (let i = 0; i < evm_chains_data.length; i++) {
          const chain_data = evm_chains_data[i]
          if (!chain_data?.disabled) {
            const chain_id = chain_data?.chain_id
            const rpc_urls = chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || []
            _rpcs[chain_id] = new providers.FallbackProvider(rpc_urls.map(url => new providers.JsonRpcProvider(url)))
          }
        }
        if (!rpcs) {
          dispatch({
            type: RPCS,
            value: _rpcs,
          })
        }
      }
    }
    init()
  }, [evm_chains_data, pathname])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (['evm_address'].includes(type(address))) {
        const addresses = [address].filter(a => a && !ens_data?.[a])
        const ens_data = await getEns(addresses)
        if (ens_data) {
          dispatch({
            type: ENS_DATA,
            value: ens_data,
          })
        }
      }
    }
    getData()
  }, [address])

  // tvl
  useEffect(() => {
    const controller = new AbortController()
    const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
    const getContractSupply = async (contract_data, rpc) => {
      let supply, decimals = 18
      if (contract_data && rpc) {
        const { contract_address } = { ...contract_data }
        decimals = contract_data.decimals
        const contract = new Contract(contract_address, ['function totalSupply() view returns (uint256)'], rpc)
        supply = await contract.totalSupply()
      }
      return Number(utils.formatUnits(BigNumber.from((supply || 0).toString()), decimals))
    }
    const getBalance = async (address, contract_data, rpc) => {
      let balance, decimals = 18
      if (address && contract_data && rpc) {
        const { contract_address } = { ...contract_data }
        decimals = contract_data.decimals
        if (contract_address === constants.AddressZero) {
          balance = await rpc.getBalance(address)
        }
        else {
          const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], rpc)
          balance = await contract.balanceOf(address)
        }
      }
      return Number(utils.formatUnits(BigNumber.from((balance || 0).toString()), decimals))
    }
    const getChainData = async (chain_id, rpc) => {
      if (!controller.signal.aborted) {
        if (chain_id && rpc && assets_data) {
          chain_id = Number(chain_id)
          const chain_data = evm_chains_data?.find(c => c?.chain_id === chain_id)
          if (chain_data) {
            for (let i = 0; i < assets_data.length; i++) {
              const asset_data = assets_data[i]
              if (asset_data) {
                const contract_data = (!asset_data.is_staging || staging) && asset_data.contracts?.find(c => c?.chain_id === chain_id)
                if (contract_data) {
                  const supply = !contract_data.is_native ? await getContractSupply(contract_data, rpc) : 0
                  const balance = await getBalance(chain_data.gateway_address, contract_data, rpc)
                  dispatch({
                    type: TVL_DATA,
                    value: {
                      [`${chain_data.id}_${asset_data.id}`]: {
                        supply,
                        gateway_balance: balance,
                        total: supply + balance,
                      },
                    },
                  })
                }
              }
            }
          }
        }
      }
    }
    const getData = is_interval => {
      if (assets_data && rpcs) {
        if (['/[height]', '/[address]', '/[tx]', '/[id]', '/tier'].findIndex(p => pathname?.includes(p)) < 0 && ['/tvl'].includes(pathname) && (!tvl_data || is_interval)) {
          Object.entries(rpcs).forEach(([k, v]) => getChainData(k, v))
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [assets_data, rpcs, pathname])

  // validators
  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (assets_data &&
        status_data &&
        ['/address', '/transfers', '/tvl', '/sent', '/gmp', '/batch', '/assets'].findIndex(p => pathname?.startsWith(p)) < 0
      ) {
        if (!controller.signal.aborted) {
          let response
          switch (pathname) {
            case '/validators':
            case '/validators/[status]':
            case '/validator/[address]':
            case '/account/[address]':
            case '/evm-votes':
            case '/participations':
            case '/block/[height]':
            case '/transactions':
            case '/transactions/search':
            case '/tx/[tx]':
              const latest_block = Number(status_data.latest_block_height)
              response = await all_validators(null, validators_data, status || (address ? null : 'active'), address, latest_block, assets_data)
              if (response) {
                if (!validators_data) {
                  dispatch({
                    type: VALIDATORS_DATA,
                    value: response?.data || [],
                  })
                }
                if (!['/participations'].includes(pathname)) {
                  response = await all_validators_broadcaster(response?.data, null, assets_data)
                  if (response?.data?.length > 0) {
                    let vs = response.data
                    if (['/validators', '/validators/[status]', '/validator/[address]'].includes(pathname)) {
                      const num_heartbeat_blocks = Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
                      const num_blocks_per_heartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
                      const first = firstHeartbeatBlock(latest_block - num_heartbeat_blocks)
                      const last = lastHeartbeatBlock(latest_block)
                      response = await getHeartbeats({
                        query: {
                          bool: {
                            must: [
                              { range: { height: {
                                gte: first,
                                lte: latest_block,
                              } } },
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
                      })
                      for (let i = 0; i < vs.length; i++) {
                        const v = vs[i]
                        const total = Math.floor((last - first) / num_blocks_per_heartbeat) + 1
                        const up = response?.data?.[v?.broadcaster_address] || 0
                        let uptime = total > 0 ? up * 100 / total : 0
                        uptime = uptime > 100 ? 100 : uptime
                        v.heartbeats_uptime = uptime
                        vs[i] = v
                      }
                      response.data = vs
                      dispatch({
                        type: VALIDATORS_DATA,
                        value: response.data,
                      })

                      const num_evm_votes_blocks = Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS)
                      response = await getEvmVotes({
                        query: {
                          range: { height: {
                            gte: latest_block - num_evm_votes_blocks,
                          } },
                        },
                        aggs: {
                          voters: {
                            terms: { field: 'voter.keyword', size: 1000 },
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
                          },
                        },
                      })
                      for (let i = 0; i < vs.length; i++) {
                        const v = vs[i]
                        v.votes = { ...response?.data?.[v?.broadcaster_address] }
                        v.total_votes = v.votes.total || 0
                        const get_votes = vote => _.sum(Object.entries({ ...v.votes?.chains }).map(c => Object.entries({ ...c[1]?.votes }).find(_v => _v[0] === vote?.toString())?.[1] || 0))
                        v.total_yes_votes = get_votes(true)
                        v.total_no_votes = get_votes(false)
                        vs[i] = v
                      }
                      response = await getEvmPolls({
                        query: {
                          range: { height: {
                            gte: latest_block - num_evm_votes_blocks,
                          } },
                        },
                        aggs: {
                          chains: {
                            terms: { field: 'sender_chain.keyword', size: 1000 },
                          },
                        },
                        track_total_hits: true,
                      })
                      const { data, total } = { ...response }
                      const total_polls = total || _.maxBy(vs, 'total_votes')?.total_votes || 0
                      vs = vs.map(v => {
                        const { votes, total_votes, total_yes_votes, total_no_votes } = { ...v }
                        const { chains } = { ...votes }
                        Object.entries({ ...chains }).forEach(([k, _v]) => {
                          chains[k] = {
                            ..._v,
                            total_polls: data?.[k] || _v?.total,
                          }
                        })
                        return {
                          ...v,
                          votes: {
                            ...votes,
                            chains,
                          },
                          total_votes: total_votes > total_polls ? total_polls : total_votes,
                          total_yes_votes: total_yes_votes > total_polls ? total_polls : total_yes_votes,
                          total_no_votes: total_no_votes > total_polls ? total_polls : total_no_votes,
                          total_polls,
                        }
                      })
                    }
                    response.data = vs
                    dispatch({
                      type: VALIDATORS_DATA,
                      value: response.data,
                    })
                  }
                }
                response = await all_validators_status(response?.data || [])
              }
              break
            default:
              response = await all_validators(['/validators/tier'].includes(pathname) ? {} : null, validators_data, null, null, null, assets_data)
              if (['/validators/tier'].includes(pathname)) {
                response = await all_validators_broadcaster(response?.data, null, assets_data)
              }
              break
          }
          if (response) {
            dispatch({
              type: VALIDATORS_DATA,
              value: response?.data || [],
            })
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [assets_data, pathname, validatorsTrigger])

  // chain maintainner
  useEffect(() => {
    const controller = new AbortController()
    const getChainData = async (id, chains_data) => {
      if (!controller.signal.aborted) {
        const response = await chain_maintainer(id, chains_data)
        if (response) {
          dispatch({
            type: VALIDATORS_CHAINS_DATA,
            value: response,
          })
        }
      }
    }
    const getData = () => {
      const is_validator_path = ['/validator', '/participations', '/proposals', '/evm-votes'].findIndex(p => pathname?.includes(p)) > -1
      if (evm_chains_data && is_validator_path) {
        evm_chains_data.map(c => c?.id).forEach(id => getChainData(id, evm_chains_data))
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [evm_chains_data, pathname])

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
            <Environments />
            <Theme />
          </div>
        </div>
      </div>
      <SubNavbar />
    </>
  )
}