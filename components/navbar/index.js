// import { heartbeats as getHeartbeats, evm_votes as getEvmVotes } from '../../lib/api/index'
// import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'

import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { Bignumber, Contract, constants, providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Environments from './environments'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { status as getStatus } from '../../lib/api/rpc'
import { staking_params, bank_supply, staking_pool, slashing_params, distribution_params, all_validators, chain_maintainer, validatorProfile, allValidatorsStatus, allValidatorsBroadcaster } from '../../lib/api/cosmos'
import { ens as getEns } from '../../lib/api/ens'
import { coin } from '../../lib/api/coingecko'
import { type } from '../../lib/object/id'
import { denom_manager } from '../../lib/object/denom'
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
        dispatch({
          type: ASSETS_DATA,
          value: response,
        })
      }
    }
    getData()
  }, [])

  // price
  useEffect(() => {
    const getData = async is_interval => {
      if (assets_data) {
        let updated_ids = is_interval ? [] : assets_data.filter(a => a?.price).map(a => a.id)
        if (updated_ids.length < assets_data.length) {
          let updated = false
          const denoms = assets_data.filter(a => a?.id && !updated_ids.includes(a.id)).map(a => a.id)
          if (denoms.length > 0) {
            const response = await getAssetsPrice({ denoms })
            response?.forEach(t => {
              const asset_index = assets_data.findIndex(a => equals_ignore_case(a?.id, t?.denom))
              if (asset_index > -1) {
                const asset = assets_data[asset_index]
                asset.price = t?.price || asset.price
                assets_data[asset_index] = asset
                updated_ids = _.uniq(_.concat(updated_ids, asset.id))
                updated = true
              }
            })
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
    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [assets_data])

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
        const chain_data = cosmos_chains_data.find(c => equals_ignore_case(c?.id, 'axelarnet'))
        dispatch({
          type: CHAIN_DATA,
          value: { ...chain_data },
        })
        if (chain_data?.coingecko_id) {
          const response = await coin(chain_data.coingecko_id)
          chain_data.token_data = !response?.error && response
          dispatch({
            type: CHAIN_DATA,
            value: { ...chain_data },
          })
        }
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
      if (evm_chains_data) {
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
  }, [evm_chains_data])

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
      let supply
      if (contract_data && rpc) {
        const { contract_address, decimals } = { ...contract_data }
        const contract = new Contract(contract_address, ['function totalSupply() view returns (uint256)'], rpc)
        supply = await contract.totalSupply()
      }
      return Number(utils.formatUnits(BigNumber.from((supply || 0).toString()), decimals))
    }
    const getBalance = async (address, contract_data, rpc) => {
      let balance
      if (address && contract_data && rpc) {
        const { contract_address, decimals } = { ...contract_data }
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
                    value: { [`${chain_data.id}_${asset_data.id}`]: supply + balance },
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
        if (['/[address]', '/[tx]'].findIndex(p => pathname?.includes(p)) < 0 && (!tvl_data || is_interval)) {
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
      if (assets_data?.findIndex(a => a?.price) > -1 &&
        status_data &&
        ['/address', '/transfers', '/gmp'].findIndex(p => pathname?.startsWith(p)) < 0
      ) {
        if (!controller.signal.aborted) {
          let response
          switch (pathname) {
            case '/validators':
            case '/validators/[status]':
            case '/validator/[address]':
            case '/account/[address]':
            case '/block/[height]':
            case '/transactions':
            case '/transactions/search':
            case '/tx/[tx]':
            case '/evm-votes':
            case '/participations':
              response = await all_validators(null, validators_data, status || (address ? null : 'active'), address, Number(status_data.latest_block_height), assets_data)
              if (response) {
                if (!validators_data) {
                  dispatch({
                    type: VALIDATORS_DATA,
                    value: response?.data || [],
                  })
                }

                if (!['/participations'].includes(pathname)) {
                  response = await allValidatorsBroadcaster(response?.data, null, denoms_data)
                  if (response?.data?.length > 0) {
                    const vs = response.data
                    if (['/validators', '/validators/[status]', '/validator/[address]'].includes(pathname)) {
                      response = await getHeartbeats({
                        _source: false,
                        aggs: {
                          heartbeats: {
                            terms: { field: 'sender.keyword', size: 10000 },
                            aggs: {
                              period_height: {
                                terms: { field: 'height_group', size: 100000 },
                              },
                            },
                          },
                        },
                        query: {
                          bool: {
                            must: [
                              { range: { height: { gte: firstHeartbeatBlock(Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)), lte: Number(status_data.latest_block_height) } } },
                            ],
                          },
                        },
                      })

                      for (let i = 0; i < vs.length; i++) {
                        const v = vs[i]
                        const _last = lastHeartbeatBlock(Number(status_data.latest_block_height))
                        // const _first = firstHeartbeatBlock(v?.start_proxy_height || v?.start_height)
                        let _first = Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_HEARTBEAT_BLOCKS)
                        _first = _first >= 0 ? firstHeartbeatBlock(_first) : firstHeartbeatBlock(_first)

                        const totalHeartbeats = Math.floor((_last - _first) / Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)) + 1
                        const up_heartbeats = response?.data?.[v?.broadcaster_address] || 0

                        let missed_heartbeats = totalHeartbeats - up_heartbeats
                        missed_heartbeats = missed_heartbeats < 0 ? 0 : missed_heartbeats

                        let heartbeats_uptime = totalHeartbeats > 0 ? up_heartbeats * 100 / totalHeartbeats : 0
                        heartbeats_uptime = heartbeats_uptime > 100 ? 100 : heartbeats_uptime
                        v.heartbeats_uptime = heartbeats_uptime
                        vs[i] = v
                      }

                      response.data = vs
                      dispatch({
                        type: VALIDATORS_DATA,
                        value: response.data,
                      })

                      response = await getEvmVotes({
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
                          all_votes: {
                            terms: { field: 'sender_chain.keyword', size: 10000 },
                            aggs: {
                              polls: {
                                cardinality: { field: 'poll_id.keyword' },
                              },
                            },
                          },
                        },
                        query: { range: { poll_start_height: { gte: Number(status_data.latest_block_height) - Number(process.env.NEXT_PUBLIC_NUM_EVM_VOTES_BLOCKS) } } },
                      })

                      for (let i = 0; i < vs.length; i++) {
                        const v = vs[i]
                        v.votes = response?.data?.[v?.broadcaster_address] || {}
                        v.total_votes = v.votes?.total || 0
                        v.total_yes_votes = _.sum(Object.entries(v.votes?.chains || {}).map(c => Object.entries(c[1]?.confirms || {}).find(cf => cf[0] === 'true')?.[1] || 0))
                        v.total_no_votes = _.sum(Object.entries(v.votes?.chains || {}).map(c => Object.entries(c[1]?.confirms || {}).find(cf => cf[0] === 'false')?.[1] || 0))
                        v.total_polls = response?.all_data || {}
                        vs[i] = v
                      }
                    }

                    response.data = vs
                    dispatch({
                      type: VALIDATORS_DATA,
                      value: response.data,
                    })
                  }
                }

                response = await all_validators(response?.data || [])
              }
              break
            default:
              response = await allValidators(null, validators_data, null, null, null, denoms_data)
              break
          }
          if (response) {
            dispatch({
              type: VALIDATORS_DATA,
              value: response?.data || [],
            })
            setLoadProfileTrigger(moment().valueOf())
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
      const is_validator_path = ['/validator', '/participations', '/proposals'].findIndex(p => pathname?.includes(p)) > -1
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