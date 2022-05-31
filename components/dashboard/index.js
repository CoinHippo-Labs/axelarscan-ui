import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { MdOutlineArrowBackIos, MdOutlineArrowForwardIos } from 'react-icons/md'

import CosmosMetrics from './cosmos-metrics'
// import NetworkGraph from '../transfers/network-graph'
import Blocks from '../blocks'
import Transactions from '../transactions'
import Image from '../image'
import { consensus_state } from '../../lib/api/rpc'
import { transfers as getTransfers } from '../../lib/api/index'
import { getChain, chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { hexToBech32 } from '../../lib/object/key'
import { currency } from '../../lib/object/currency'
import { number_format, equals_ignore_case } from '../../lib/utils'

export default () => {
  const { evm_chains, cosmos_chains, assets, status, chain, validators } = useSelector(state => ({ evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, status: state.status, chain: state.chain, validators: state.validators }), shallowEqual)
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { status_data } = { ...status }
  const { chain_data } = { ...chain }
  const { validators_data } = { ...validators }

  const [consensusState, setConsensusState] = useState(null)
  const [cosmosMetrics, setCosmosMetrics] = useState(null)
  const [transfers, setTransfers] = useState(null)

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
  const axelarChain = getChain('axelarnet', cosmos_chains_data)

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
          pre_votes: _.max((votes || []).map(v => Number(_.last(v?.prevotes_bit_array?.split(' = ') || [])))),
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
      if (evm_chains_data && cosmos_chains_data && assets_data) {
        if (!controller.signal.aborted) {
          let response, data
          response = await getTransfers({
            aggs: {
              from_chains: {
                terms: { field: 'send.sender_chain.keyword', size: 10000 },
                aggs: {
                  to_chains: {
                    terms: { field: 'send.recipient_chain.keyword', size: 10000 },
                    aggs: {
                      assets: {
                        terms: { field: 'send.denom.keyword', size: 10000 },
                        aggs: {
                          amounts: {
                            sum: {
                              field: 'send.amount',
                            },
                          },
                          avg_amounts: {
                            avg: {
                              field: 'send.amount',
                            },
                          },
                          max_amounts: {
                            max: {
                              field: 'send.amount',
                            },
                          },
                          since: {
                            min: {
                              field: 'send.created_at.ms',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          })
          data = _.orderBy(response?.data?.map(t => {
            const asset = getDenom(t?.asset, assets_data)
            return {
              ...t,
              from_chain: getChain(t?.from_chain, evm_chains_data) || getChain(t?.from_chain, cosmos_chains_data),
              to_chain: getChain(t?.to_chain, evm_chains_data) || getChain(t?.to_chain, cosmos_chains_data),
              asset,
              amount: denom_manager.amount(t?.amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, evm_chains_data)),
              avg_amount: denom_manager.amount(t?.avg_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, evm_chains_data)),
              max_amount: denom_manager.amount(t?.max_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, evm_chains_data)),
            }
          }).map(t => {
            const price = t?.asset?.token_data?.[currency] || 0
            return {
              ...t,
              value: (price * t.amount) || 0,
              avg_value: (price * t.avg_amount) || 0,
              max_value: (price * t.max_amount) || 0,
            }
          }), ['tx'], ['desc']).filter(t => assets_data?.findIndex(a => a?.id === t?.asset?.id && (!a.is_staging || staging)) > -1)
          let _data = [], ng_data = []
          for (let i = 0; i < data.length; i++) {
            const transfer = data[i]
            if (transfer?.from_chain?.id !== axelarChain?.id && transfer?.to_chain?.id !== axelarChain?.id) {
              const from_transfer = _.cloneDeep(transfer)
              from_transfer.to_chain = axelarChain
              from_transfer.id = `${from_transfer.from_chain?.id}_${from_transfer.to_chain?.id}_${from_transfer.asset?.id}`
              ng_data.push(from_transfer)

              const to_transfer = _.cloneDeep(transfer)
              to_transfer.from_chain = axelarChain
              to_transfer.id = `${to_transfer.from_chain?.id}_${to_transfer.to_chain?.id}_${to_transfer.asset?.id}`
              ng_data.push(to_transfer)

              transfer.id = `${transfer.from_chain?.id}_${transfer.to_chain?.id}_${transfer.asset?.id}`
              _data.push(transfer)
            }
            else {
              transfer.id = `${transfer.from_chain?.id}_${transfer.to_chain?.id}_${transfer.asset?.id}`
              ng_data.push(transfer)
              _data.push(transfer)
            }
          }

          _data = Object.entries(_.groupBy(_data, 'id')).map(([key, value]) => {
            return {
              id: key,
              ..._.head(value),
              tx: _.sumBy(value, 'tx'),
              amount: _.sumBy(value, 'amount'),
              value: _.sumBy(value, 'value'),
              avg_amount: _.sumBy(value, 'amount') / _.sumBy(value, 'tx'),
              avg_value: _.sumBy(value, 'value') / _.sumBy(value, 'tx'),
              max_amount: _.maxBy(value, 'max_amount')?.max_amount,
              max_value: _.maxBy(value, 'max_value')?.max_value,
              since: _.minBy(value, 'since')?.since,
            }
          })
          data = _.orderBy(_data, ['tx'], ['desc'])

          ng_data = Object.entries(_.groupBy(ng_data, 'id')).map(([key, value]) => {
            return {
              id: key,
              ..._.head(value),
              tx: _.sumBy(value, 'tx'),
              amount: _.sumBy(value, 'amount'),
              value: _.sumBy(value, 'value'),
              avg_amount: _.sumBy(value, 'amount') / _.sumBy(value, 'tx'),
              avg_value: _.sumBy(value, 'value') / _.sumBy(value, 'tx'),
              max_amount: _.maxBy(value, 'max_amount')?.max_amount,
              max_value: _.maxBy(value, 'max_value')?.max_value,
              since: _.minBy(value, 'since')?.since,
            }
          })
          ng_data = _.orderBy(ng_data, ['tx'], ['desc'])

          setTransfers({ data, ng_data })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data])

  return (
    <div className="space-y-6 mt-2 mb-6 mx-auto pb-10">
      <CosmosMetrics data={cosmosMetrics} />
      {/*<div
        title={<span className="text-black dark:text-white text-lg font-semibold ml-1">Cross-Chain Asset Transfers</span>}
        className="bg-transparent border-0 mt-6 mb-0 py-0 px-3 sm:px-0"
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-4 mt-2 gap-5">
          <div
            title={<span className="text-black dark:text-white text-base font-semibold">Transactions</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Number of cross-chain transactions</span>}
            className="md:col-span-2 lg:col-span-1 bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
          >
            <div className="flex flex-col space-y-2 mt-1">
              {transfersData ?
                <div className="h-52 md:h-88 flex flex-col overflow-y-auto space-y-3">
                  {transfersData.data?.map((t, i) => (
                    <div key={i} className="flex items-center justify-between my-1">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={t.from_chain?.image}
                          className="w-7 md:w-8 h-7 md:h-8 rounded-full"
                        />
                        <div className="flex items-center space-x-0.5 md:space-x-1">
                          <MdOutlineArrowBackIos size={20} />
                          <Image
                            src={t.asset?.image}
                            className="w-4 md:w-5 h-4 md:h-5 rounded-full"
                          />
                          <MdOutlineArrowForwardIos size={20} />
                        </div>
                        <Image
                          src={t.to_chain?.image}
                          className="w-7 md:w-8 h-7 md:h-8 rounded-full"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-mono uppercase text-gray-800 dark:text-gray-100 text-base font-semibold">
                          {number_format(t.tx, t.tx >= 100000 ? '0,0.00a' : '0,0')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                :
                <div className="flex flex-col space-y-3">
                  {[...Array(8).keys()].map(i => (
                    <div key={i} className="flex items-center justify-between my-1">
                      <div className="flex items-center space-x-2">
                        <div className="skeleton w-7 md:w-8 h-7 md:h-8 rounded-full" />
                        <div className="flex items-center space-x-0.5 md:space-x-1">
                          <MdOutlineArrowBackIos size={20} />
                          <div className="skeleton w-4 md:w-5 h-4 md:h-5 rounded-full" />
                          <MdOutlineArrowForwardIos size={20} />
                        </div>
                        <div className="skeleton w-7 md:w-8 h-7 md:h-8 rounded-full" />
                      </div>
                      <div className="skeleton w-16 h-5 ml-auto" />
                    </div>
                  ))}
                </div>
              }
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-2 ml-auto">
                <span>total</span>
                {transfersData ?
                  <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono text-white font-semibold py-0.5 px-1.5">
                    {number_format(_.sumBy(transfersData.data, 'tx'), '0,0')}
                  </div>
                  :
                  <div className="skeleton w-12 h-6" />
                }
                <span>transactions</span>
              </span>
            </div>
          </div>
          <div className="md:col-span-2 hidden sm:block bg-transaparent sm:bg-white dark:bg-black rounded-2xl shadow border-0 sm:px-6 sm:py-4">
            <NetworkGraph data={transfersData?.ng_data} mini={true} />
          </div>
        </div>
      </div>*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Link href="/blocks">
            <a className="uppercase text-base font-bold">
              Latest Blocks
            </a>
          </Link>
          <Blocks n={10} />
        </div>
        <div className="space-y-2">
          <Link href="/transactions">
            <a className="uppercase text-base font-bold">
              Latest Transactions
            </a>
          </Link>
          <Transactions n={10} />
        </div>
      </div>
    </div>
  )
}