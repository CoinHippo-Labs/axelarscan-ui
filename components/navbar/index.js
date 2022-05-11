import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { providers, constants, Contract } from 'ethers'
import BigNumber from 'bignumber.js'
import { FiMoon, FiSun } from 'react-icons/fi'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Search from './search'
import Network from './network'
import SubNavbar from './sub-navbar'
import PageTitle from './page-title'

import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { status as getStatus } from '../../lib/api/rpc'
import { stakingParams, stakingPool, bankSupply, slashingParams, distributionParams, mintInflation, communityPool, allValidators, validatorProfile, allValidatorsStatus, allValidatorsBroadcaster, chainMaintainer } from '../../lib/api/cosmos'
import { heartbeats as getHeartbeats, evmVotes as getEvmVotes } from '../../lib/api/opensearch'
import { simplePrice } from '../../lib/api/coingecko'
import { currency } from '../../lib/object/currency'
import { denomer } from '../../lib/object/denom'
import { lastHeartbeatBlock, firstHeartbeatBlock } from '../../lib/object/hb'
import { randImage } from '../../lib/utils'

import { THEME, CHAINS_DATA, COSMOS_CHAINS_DATA, ASSETS_DATA, DENOMS_DATA, TVL_DATA, STATUS_DATA, ENV_DATA, VALIDATORS_DATA, VALIDATORS_CHAINS_DATA } from '../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Navbar() {
  const dispatch = useDispatch()
  const { preferences, chains, assets, denoms, status, validators } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, denoms: state.denoms, status: state.status, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { denoms_data } = { ...denoms }
  const { status_data } = { ...status }
  const { validators_data } = { ...validators }

  const router = useRouter()
  const { pathname, query } = { ...router }

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const [loadValidatorsTrigger, setLoadValidatorsTrigger] = useState(null)
  const [loadProfileTrigger, setLoadProfileTrigger] = useState(null)

  useEffect(() => {
    const getData = async () => {
      const response = await getChains()
      if (response) {
        dispatch({
          type: CHAINS_DATA,
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

  useEffect(() => {
    const getData = async () => {
      const response = await getAssets()
      if (response) {
        dispatch({
          type: ASSETS_DATA,
          value: response,
        })

        const resPrice = await simplePrice({
          ids: response.map(d => d?.coingecko_id).filter(id => id).join(','),
          vs_currencies: currency,
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true,
        })

        for (let i = 0; i < response.length; i++) {
          const denom = response[i]
          if (resPrice?.[denom.coingecko_id]) {
            denom.token_data = resPrice[denom.coingecko_id]
          }
          response[i] = denom
          if (denom.id === 'uaxl') {
            dispatch({
              type: ENV_DATA,
              value: { token_data: { ...denom.token_data } },
            })
          }
        }

        dispatch({
          type: DENOMS_DATA,
          value: response,
        })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const getData = async is_interval => {
      if ((!status_data || is_interval) && !['/gmp', '/gmp/[tx]'].includes(pathname)) {
        const response = await getStatus(null, is_interval && status_data)
        if (response) {
          dispatch({
            type: STATUS_DATA,
            value: response,
          })

          if (!is_interval) {
            setLoadValidatorsTrigger(moment().valueOf())
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 7.5 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [status_data])

  useEffect(() => {
    const getData = async () => {
      if (denoms_data) {
        let response = await stakingParams()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: { staking_params: response?.params || {} },
          })

          if (response?.params?.bond_denom) {
            response = await bankSupply(response.params.bond_denom)
            dispatch({
              type: ENV_DATA,
              value: {
                bank_supply: Object.fromEntries(Object.entries(response?.amount || {}).map(([key, value]) => {
                  return [key, key === 'denom' ? denomer.symbol(value, denoms_data) : denomer.amount(value, response.amount.denom, denoms_data)]
                })),
              },
            })
          }
        }

        response = await stakingPool()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: {
              staking_pool: Object.fromEntries(Object.entries(response?.pool || {}).map(([key, value]) => {
                return [key, denomer.amount(value, denoms_data?.[0]?.id, denoms_data)]
              })),
            },
          })
        }

        const res = await fetch(process.env.NEXT_PUBLIC_RELEASES_URL)
        response = await res.text()
        if (response?.includes('`axelar-core` version')) {
          response = response.split('\n').filter(line => line?.includes('`axelar-core` version'))
          dispatch({
            type: ENV_DATA,
            value: { ...Object.fromEntries([_.head(response).split('|').map(s => s?.trim().split('`').join('').split(' ').join('_')).filter(s => s)]) },
          })
        }
        else {
          dispatch({
            type: ENV_DATA,
            value: { 'axelar-core_version': '-' },
          })
        }

        response = await slashingParams()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: { slashing_params: response?.params || {} },
          })
        }

        response = await distributionParams()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: { distribution_params: response?.params || {} },
          })
        }

        response = await mintInflation()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: { inflation: Number(response?.inflation || 0) },
          })
        }

        response = await communityPool()
        if (response) {
          dispatch({
            type: ENV_DATA,
            value: {
              community_pool: response?.pool?.map(_pool => {
                return Object.fromEntries(Object.entries(_pool || {}).map(([key, value]) => {
                  return [key, key === 'denom' ? denomer.symbol(value, denoms_data) : denomer.amount(value, _pool.denom, denoms_data)]
                }))
              }) || [],
            },
          })
        }
      }
    }

    if (!['/gmp', '/gmp/[tx]'].includes(pathname)) {
      getData()
    }
  }, [denoms_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (denoms_data && status_data && !['/gmp', '/gmp/[tx]'].includes(pathname)) {
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
              response = await allValidators(null, validators_data, query.status || (query.address ? null : 'active'), query.address, Number(status_data.latest_block_height), denoms_data)
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
                              heightgroup: {
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

                response = await allValidatorsStatus(response?.data || [])
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
  }, [denoms_data, pathname, loadValidatorsTrigger])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async (id, chains) => {
      if (!controller.signal.aborted) {
        const response = await chainMaintainer(id, chains)
        if (response) {
          dispatch({
            type: VALIDATORS_CHAINS_DATA,
            value: response,
          })
        }
      }
    }

    const getMaintainersData = () => {
      if (chains_data && ['/validators', '/validator/[address]', '/participations'].includes(pathname)) {
        chains_data.map(c => c?.id).forEach(id => getData(id, chains_data))
      }
    }

    getMaintainersData()

    const interval = setInterval(() => getMaintainersData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, pathname])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (loadProfileTrigger && validators_data?.findIndex(v => v?.description && !v.description.image) > -1) {
        const data = _.cloneDeep(validators_data)
        for (let i = 0; i < data.length; i++) {
          if (!controller.signal.aborted) {
            const v = data[i]
            let updated = false
            if (v?.description) {
              if (v.description.identity && !v.description.image) {
                const responseProfile = await validatorProfile({ key_suffix: v.description.identity })
                if (responseProfile?.them?.[0]?.pictures?.primary?.url) {
                  v.description.image = responseProfile.them[0].pictures.primary?.url
                  if (!query.address || (['/validator/[address]'].includes(pathname) && query.address?.toLowerCase() === v.operator_address?.toLowerCase()) || ['/account/[address]'].includes(pathname)) {
                    updated = true
                  }
                }
              }
              v.description.image = v.description.image || (v.description.moniker?.toLowerCase().startsWith('axelar-core-') ? '/logos/chains/axelar.png' : randImage(i))
              data[i] = v
              if (updated) {
                dispatch({
                  type: VALIDATORS_DATA,
                  value: data,
                })
              }
            }
          }
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [loadProfileTrigger])

  useEffect(() => {
    const controller = new AbortController()

    const getContractSupply = async (chain, contract) => {
      let supply
      if (chain && contract) {
        const provider_urls = chain.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || []
        const provider = new providers.FallbackProvider(provider_urls)
        const _contract = new Contract(contract.contract_address, ['function totalSupply() view returns (uint256)'], provider)
        supply = await _contract.totalSupply()
      }
      return supply && BigNumber(supply.toString()).shiftedBy(-contract.contract_decimals).toNumber()
    }

    const getBalance = async (chain, contract) => {
      let balance
      if (chain && contract) {
        const provider_urls = chain.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || []
        const provider = new providers.FallbackProvider(provider_urls)
        const _contract = new Contract(contract.contract_address, ['function balanceOf(address owner) view returns (uint256)'], provider)
        balance = await _contract.balanceOf(chain.gateway_address)
      }
      return balance && BigNumber(balance.toString()).shiftedBy(-contract.contract_decimals).toNumber()
    }

    const getData = async (chain, assets) => {
      if (!controller.signal.aborted) {
        if (assets) {
          for (let i = 0; i < assets.length; i++) {
            const contract = (!assets[i]?.is_staging || staging) && assets[i]?.contracts?.find(contract => contract?.chain_id === chain.chain_id/* && !contract?.is_native*/)
            if (contract) {
              const supply = !contract.is_native ? await getContractSupply(chain, contract) : 0
              const balance = await getBalance(chain, contract)
              dispatch({
                type: TVL_DATA,
                value: { [`${chain.id}_${contract.contract_address}`]: supply + balance },
              })
            }
          }
        }
      }
    }

    const getTVLData = () => {
      if (chains_data && assets_data) {
        if (['/transfers'].includes(pathname)) {
          chains_data.forEach(c => getData(c, assets_data))
        }
      }
    }

    getTVLData()

    const interval = setInterval(() => getTVLData(), 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, assets_data, pathname])

  return (
    <>
      <div className="navbar border-b">
        <div className="navbar-inner w-full flex items-center">
          <Logo />
          <DropdownNavigation />
          <Navigation />
          <div className="flex items-center ml-auto">
            <Search />
            <Network />
            <button
              onClick={() => {
                dispatch({
                  type: THEME,
                  value: theme === 'light' ? 'dark' : 'light',
                })
              }}
              className="w-10 sm:w-12 h-16 btn-transparent flex items-center justify-center"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {theme === 'light' ? (
                  <FiMoon size={16} />
                ) : (
                  <FiSun size={16} />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
      {!['/gmp', '/gmp/[tx]'].includes(pathname) && (
        <SubNavbar />
      )}
      {false && (['/evm-votes', '/transfers'].includes(pathname) || pathname.startsWith('/validator')) && (
        <div className="w-full bg-red-100 dark:bg-red-500 border border-red-500 overflow-x-auto flex items-center justify-center text-xs py-1.5">
          {pathname.startsWith('/validator') ?
            <><span className="font-semibold mr-1.5">Reindexing in progress:</span>this may cause a slight delay in heartbeats and EVM votes updates displayed on this page.</>
            :
            <><span className="font-semibold mr-1.5">Reindexing in progress:</span>the data will be updated shortly.</>
          }
        </div>
      )}
      <PageTitle />
    </>
  )
}