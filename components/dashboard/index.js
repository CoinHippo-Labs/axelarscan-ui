import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { FallingLines, TailSpin } from 'react-loader-spinner'
import { FiBox, FiCode } from 'react-icons/fi'
import { BiFileBlank, BiMessageDots } from 'react-icons/bi'

import CosmosMetrics from './cosmos-metrics'
import NetworkGraph from './network-graph'
import CrossChainQuantity from './cross-chain-quantity'
import Blocks from '../blocks'
import Transactions from '../transactions'
import Image from '../image'
import AddChain from '../add-chain'
import { consensus_state } from '../../lib/api/rpc'
import { transfers as getTransfers } from '../../lib/api/index'
import { search as searchGMP } from '../../lib/api/gmp'
import { getChain, chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { hexToBech32 } from '../../lib/object/key'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets, status, chain, validators } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, status: state.status, chain: state.chain, validators: state.validators }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { status_data } = { ...status }
  const { chain_data } = { ...chain }
  const { validators_data } = { ...validators }

  const [consensusState, setConsensusState] = useState(null)
  const [cosmosMetrics, setCosmosMetrics] = useState(null)
  const [transfers, setTransfers] = useState(null)
  const [gmps, setGmps] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await consensus_state()
        setConsensusState(response)
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.075 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (assets_data && status_data && chain_data && consensusState?.validators?.proposer?.address) {
      const { validators, votes } = { ...consensusState }
      const { proposer } = { ...validators }
      const validator_data = validators_data?.find(v => equals_ignore_case(v.consensus_address, hexToBech32(proposer.address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS)))
      const { operator_address, description } = { ...validator_data }
      const { staking_pool, voting_power, staking_params, bank_supply } = { ...chain_data }
      const { bonded_tokens } = { ...staking_pool }
      const { bond_denom } = { ...staking_params }
      const { amount } = { ...bank_supply }
      const {
        latest_block_height,
        latest_block_time,
        earliest_block_height_for_cal,
        earliest_block_time_for_cal,
        earliest_block_height,
        earliest_block_time,
      } = { ...status_data }
      setCosmosMetrics({
        latest_block: {
          ...consensusState,
          operator_address,
          validator_description: description,
          voting_power: proposer.voting_power,
          voting_power_percentage: bonded_tokens && (voting_power * 100 / Math.floor(bonded_tokens)),
          // pre_votes: _.max((votes || []).map(v => Number(_.last(v?.prevotes_bit_array?.split(' = ') || [])))),
        },
        block_height: Number(latest_block_height),
        block_time: moment(latest_block_time).valueOf(),
        avg_block_time: moment(latest_block_time).diff(moment(earliest_block_time_for_cal || earliest_block_time), 'seconds') /
          (Number(latest_block_height) - Number(earliest_block_height_for_cal || earliest_block_height)),
        active_validators: validators_data?.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)).length,
        total_validators: validators_data?.length,
        denom: denom_manager.symbol(bond_denom, assets_data),
        online_voting_power: staking_pool && Math.floor(bonded_tokens),
        online_voting_power_percentage: staking_pool && amount && (Math.floor(bonded_tokens) * 100 / amount),
        total_voting_power: bank_supply && amount,
      })
    }
  }, [assets_data, status_data, chain_data, validators_data, consensusState])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (evm_chains_data && cosmos_chains_data/* && assets_data*/) {
        if (!controller.signal.aborted) {
          const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
          const axelar_chain_data = getChain('axelarnet', chains_data)
          const response = await getTransfers({
            aggs: {
              source_chains: {
                terms: { field: 'source.original_sender_chain.keyword', size: 1000 },
                aggs: {
                  destination_chains: {
                    terms: { field: 'source.original_recipient_chain.keyword', size: 1000 },
                    aggs: {
                      volume: {
                        sum: { field: 'source.value' },
                      },
                    },
                    // aggs: {
                    //   assets: {
                    //     terms: { field: 'source.denom.keyword', size: 1000 },
                    //   },
                    // },
                  },
                },
              },
            },
          })
          const data = _.orderBy(response?.data?.map(t => {
            const { source_chain, destination_chain/*, asset*/ } = { ...t }
            return {
              ...t,
              source_chain_data: getChain(source_chain, chains_data),
              destination_chain_data: getChain(destination_chain, chains_data),
              // asset_data: getDenom(asset, assets_data),
            }
          }) || [], ['num_txs'], ['desc'])
          const network_graph_data = []
          data.forEach(t => {
            const { source_chain, destination_chain/*, asset*/ } = { ...t }
            if (!equals_ignore_case(source_chain, axelar_chain_data?.id) && !equals_ignore_case(destination_chain, axelar_chain_data?.id)) {
              const x = ['source', 'destination']
              x.forEach(_x => {
                const _t = _.cloneDeep(t)
                const id_field = `${_x}_chain`, data_field = `${_x}_chain_data`
                _t[id_field] = axelar_chain_data?.id
                _t[data_field] = axelar_chain_data
                _t.source_chain = _t.source_chain_data?.id
                _t.destination_chain = _t.destination_chain_data?.id
                _t.id = `${_t.source_chain_data?.id}_${_t.destination_chain_data?.id}`//_${asset}`
                network_graph_data.push(_t)
              })
            }
            else {
              t.id = `${t.source_chain_data?.id}_${t.destination_chain_data?.id}`//_${asset}`
              network_graph_data.push(t)
            }
          })
          setTransfers({
            data: _.orderBy(Object.entries(_.groupBy(data, 'id')).map(([k, v]) => {
              const d = {
                ..._.head(v),
                id: k,
                num_txs: _.sumBy(v, 'num_txs'),
                // assets: v.map(_v => _v?.asset),
                // assets_data: v.map(_v => _v?.asset_data),
              }
              // delete d.asset
              // delete d.asset_data
              return {
                ...d,
              }
            }), ['num_txs'], ['desc']),
            network_graph_data: _.orderBy(Object.entries(_.groupBy(network_graph_data, 'id')).map(([k, v]) => {
              const n = {
                ..._.head(v),
                id: k,
                num_txs: _.sumBy(v, 'num_txs'),
                // assets: v.map(_v => _v?.asset),
                // assets_data: v.map(_v => _v?.asset_data),
              }
              // delete n.asset
              // delete n.asset_data
              return {
                ...n,
              }
            }), ['num_txs'], ['desc']),
          })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [evm_chains_data, cosmos_chains_data/*, assets_data*/])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (evm_chains_data && cosmos_chains_data) {
        if (!controller.signal.aborted) {
          const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
          const axelar_chain_data = getChain('axelarnet', chains_data)
          const response = await searchGMP({
            aggs: {
              source_chains: {
                terms: { field: 'call.chain.keyword', size: 1000 },
                aggs: {
                  destination_chains: {
                    terms: { field: 'call.returnValues.destinationChain.keyword', size: 1000 },
                  },
                },
              },
            },
            size: 0,
          })
          const data = _.orderBy(response?.data?.map(t => {
            const { source_chain, destination_chain } = { ...t }
            return {
              ...t,
              source_chain_data: getChain(source_chain, chains_data),
              destination_chain_data: getChain(destination_chain, chains_data),
            }
          }).filter(t => t?.source_chain_data && t.destination_chain_data) || [], ['num_txs'], ['desc'])
          const network_graph_data = []
          data.forEach(t => {
            const { source_chain, destination_chain/*, asset*/ } = { ...t }
            if (!equals_ignore_case(source_chain, axelar_chain_data?.id) && !equals_ignore_case(destination_chain, axelar_chain_data?.id)) {
              const x = ['source', 'destination']
              x.forEach(_x => {
                const _t = _.cloneDeep(t)
                const id_field = `${_x}_chain`, data_field = `${_x}_chain_data`
                _t[id_field] = axelar_chain_data?.id
                _t[data_field] = axelar_chain_data
                _t.source_chain = _t.source_chain_data?.id
                _t.destination_chain = _t.destination_chain_data?.id
                _t.id = `${_t.source_chain_data?.id}_${_t.destination_chain_data?.id}`
                network_graph_data.push(_t)
              })
            }
            else {
              t.id = `${t.source_chain_data?.id}_${t.destination_chain_data?.id}`
              network_graph_data.push(t)
            }
          })
          setGmps({
            data: _.orderBy(Object.entries(_.groupBy(data, 'id')).map(([k, v]) => {
              const d = {
                ..._.head(v),
                id: k,
                num_txs: _.sumBy(v, 'num_txs'),
              }
              return {
                ...d,
              }
            }), ['num_txs'], ['desc']),
            network_graph_data: _.orderBy(Object.entries(_.groupBy(network_graph_data, 'id')).map(([k, v]) => {
              const n = {
                ..._.head(v),
                id: k,
                num_txs: _.sumBy(v, 'num_txs'),
              }
              return {
                ...n,
              }
            }), ['num_txs'], ['desc']),
          })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 1 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [evm_chains_data, cosmos_chains_data])

  const metricClassName = 'bg-white dark:bg-black border hover:border-transparent dark:border-slate-900 hover:dark:border-transparent shadow hover:shadow-lg dark:shadow-slate-400 rounded-lg py-4 px-5'

  return (
    <div className="space-y-8 mt-2 mb-6 mx-auto pb-10">
      <CosmosMetrics data={cosmosMetrics} />
      {(process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' || process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true') && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
          {process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' && (
            <div className="space-y-3">
              <div className="sm:flex items-center justify-between space-y-1.5 sm:space-y-0 sm:space-x-2">
                <Link href="/transfers">
                  <a className="flex items-center space-x-2">
                    <FiCode size={20} />
                    <span className="uppercase text-base font-bold">
                      Cross-chain transfers
                    </span>
                  </a>
                </Link>
                {/*transfers?.data && (
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-50 dark:bg-black border-2 border-blue-400 dark:border-slate-200 rounded-lg flex items-center justify-between text-blue-400 dark:text-slate-200 space-x-2 py-0.5 px-3">
                      <span className="text-base font-semibold">
                        Volume:
                      </span>
                      <span className="uppercase text-base font-bold">
                        {currency_symbol}{number_format(_.sumBy(transfers.data, 'volume'), _.sumBy(transfers.data, 'volume') > 50000000 ? '0,0.00a' : _.sumBy(transfers.data, 'volume') > 10000000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-black border-2 border-blue-400 dark:border-slate-200 rounded-lg flex items-center justify-between text-blue-400 dark:text-slate-200 space-x-2 py-0.5 px-3">
                      <span className="text-base font-semibold">
                        Total:
                      </span>
                      <span className="text-base font-bold">
                        {number_format(_.sumBy(transfers.data, 'num_txs'), '0,0')}
                      </span>
                    </div>
                  </div>
                )*/}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="order-1 lg:order-2 flex flex-col space-y-5">
                  <Link href="/transfers">
                    <a className={`${metricClassName}`}>
                      <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                        Transactions
                      </span>
                      <div className="h-9 text-3xl font-bold my-0.5">
                        {transfers?.data ?
                          number_format(_.sumBy(transfers.data, 'num_txs'), '0,0') :
                          <FallingLines color={loader_color(theme)} width="36" height="36" />
                        }
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        total cross-chain transfers
                      </span>
                    </a>
                  </Link>
                  <Link href="/transfers">
                    <a className={`${metricClassName}`}>
                      <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                        Volume
                      </span>
                      <div className="h-9 uppercase text-3xl font-bold my-0.5">
                        {transfers?.data ?
                          <>
                            {currency_symbol}
                            {number_format(_.sumBy(transfers.data, 'volume'), _.sumBy(transfers.data, 'volume') > 1000000000 ? '0,0.00a' : _.sumBy(transfers.data, 'volume') > 10000000 ? '0,0' : '0,0.00')}
                          </> :
                          <FallingLines color={loader_color(theme)} width="36" height="36" />
                        }
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        cumulative transfers volume
                      </span>
                    </a>
                  </Link>
                  <Link href="/transfers">
                    <a className={`${metricClassName}`}>
                      <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                        Chains
                      </span>
                      <div className="h-9 text-3xl font-bold my-0.5">
                        {evm_chains_data && cosmos_chains_data ?
                          number_format(evm_chains_data.length + cosmos_chains_data.length, '0,0') :
                          <FallingLines color={loader_color(theme)} width="36" height="36" />
                        }
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        supported chains
                      </span>
                    </a>
                  </Link>
                </div>
                <div className="order-3 lg:order-1 sm:col-span-2 overflow-x-auto flex justify-between space-x-2 -ml-12">
                  <NetworkGraph
                    id="transfers"
                    data={transfers?.network_graph_data}
                  />
                  <CrossChainQuantity
                    data={transfers?.data}
                    pathname="/transfers/search"
                  />
                </div>
                <div className="order-2 lg:order-3">
                  <div className={`${metricClassName}`}>
                    <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                      Supported Chains
                    </span>
                    <div className="min-w-max h-84 overflow-auto flex flex-col">
                      {evm_chains_data && cosmos_chains_data ?
                        _.orderBy(_.concat(evm_chains_data, cosmos_chains_data).map(c => {
                          return {
                            ...c,
                            is_axelar: c?.id === 'axelarnet',
                          }
                        }), ['is_axelar', 'name'], ['desc', 'asc']).map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between space-x-5 py-2"
                          >
                            <a
                              href={d?.website}
                              className="flex items-center space-x-2"
                            >
                              <Image
                                src={d?.image}
                                title={d?.name}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-base font-semibold hover:font-bold">
                                {d?.name}
                              </span>
                            </a>
                            {evm_chains_data.findIndex(c => c?.id === d?.id) > -1 && (
                              <AddChain chain_data={d} />
                            )}
                          </div>
                        ))
                        :
                        <div className="mt-2">
                          <TailSpin color={loader_color(theme)} width="36" height="36" />
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true' && (
            <div className="space-y-3">
              <div className="sm:flex items-center justify-between space-y-1.5 sm:space-y-0 sm:space-x-2">
                <Link href="/gmp">
                  <a className="flex items-center space-x-2">
                    <BiMessageDots size={20} />
                    <span className="uppercase text-base font-bold">
                      General Message Passing
                    </span>
                  </a>
                </Link>
                {/*gmps?.data && (
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-50 dark:bg-black border-2 border-blue-400 dark:border-slate-200 rounded-lg flex items-center justify-between text-blue-400 dark:text-slate-200 space-x-2 py-0.5 px-3">
                      <span className="text-base font-semibold">
                        Total:
                      </span>
                      <span className="text-base font-bold">
                        {number_format(_.sumBy(gmps.data, 'num_txs'), '0,0')}
                      </span>
                    </div>
                  </div>
                )*/}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="order-1 lg:order-2 flex flex-col space-y-5">
                  <Link href="/gmp">
                    <a className={`${metricClassName}`}>
                      <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                        Transactions
                      </span>
                      <div className="h-9 text-3xl font-bold my-0.5">
                        {gmps?.data ?
                          number_format(_.sumBy(gmps.data, 'num_txs'), '0,0') :
                          <FallingLines color={loader_color(theme)} width="36" height="36" />
                        }
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        total GMP transactions
                      </span>
                    </a>
                  </Link>
                  <Link href="/gmp">
                    <a className={`${metricClassName}`}>
                      <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                        Chains
                      </span>
                      <div className="h-9 text-3xl font-bold my-0.5">
                        {evm_chains_data && cosmos_chains_data ?
                          number_format(evm_chains_data.length/* + cosmos_chains_data.length*/, '0,0') :
                          <FallingLines color={loader_color(theme)} width="36" height="36" />
                        }
                      </div>
                      <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        supported chains
                      </span>
                    </a>
                  </Link>
                </div>
                <div className="order-3 lg:order-1 sm:col-span-2 overflow-x-auto flex justify-between space-x-2 -ml-12">
                  <NetworkGraph
                    id="gmp"
                    data={gmps?.network_graph_data}
                  />
                  <CrossChainQuantity
                    data={gmps?.data}
                    pathname="/gmp/search"
                  />
                </div>
                <div className="order-2 lg:order-3">
                  <div className={`${metricClassName}`}>
                    <span className="text-slate-500 dark:text-slate-300 text-base font-semibold">
                      Supported Chains
                    </span>
                    <div className="min-w-max h-84 overflow-auto flex flex-col">
                      {evm_chains_data && cosmos_chains_data ?
                        _.orderBy(_.concat(evm_chains_data/*, cosmos_chains_data*/).map(c => {
                          return {
                            ...c,
                            is_axelar: c?.id === 'axelarnet',
                          }
                        }), ['is_axelar', 'name'], ['desc', 'asc']).map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between space-x-5 py-2"
                          >
                            <a
                              href={d?.website}
                              className="flex items-center space-x-2"
                            >
                              <Image
                                src={d?.image}
                                title={d?.name}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-base font-semibold hover:font-bold">
                                {d?.name}
                              </span>
                            </a>
                            {evm_chains_data.findIndex(c => c?.id === d?.id) > -1 && (
                              <AddChain chain_data={d} />
                            )}
                          </div>
                        ))
                        :
                        <div className="mt-2">
                          <TailSpin color={loader_color(theme)} width="36" height="36" />
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Link href="/blocks">
            <a className="flex items-center space-x-2">
              <FiBox size={20} />
              <span className="uppercase text-base font-bold">
                Latest blocks
              </span>
            </a>
          </Link>
          <Blocks n={10} />
        </div>
        <div className="space-y-3">
          <Link href="/transactions">
            <a className="flex items-center space-x-2">
              <BiFileBlank size={20} />
              <span className="uppercase text-base font-bold">
                Latest transactions
              </span>
            </a>
          </Link>
          <Transactions n={10} />
        </div>
      </div>
    </div>
  )
}