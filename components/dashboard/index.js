import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { Img } from 'react-image'
import { MdOutlineArrowBackIos, MdOutlineArrowForwardIos } from 'react-icons/md'
import { HiOutlineSearchCircle } from 'react-icons/hi'
import { BsWindow } from 'react-icons/bs'

import Summary from './summary'
import NetworkGraph from '../transfers/network-graph'
import BlocksTable from '../blocks/blocks-table'
import TransactionsTable from '../transactions/transactions-table'

import { consensus_state } from '../../lib/api/rpc'
import { transfers } from '../../lib/api/index'
import { getChain, chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { hexToBech32 } from '../../lib/object/key'
import { currency } from '../../lib/object/currency'
import { number_format } from '../../lib/utils'

export default function Dashboard() {
  const { chains, cosmos_chains, assets, denoms, status, env, validators } = useSelector(state => ({ chains: state.chains, cosmos_chains: state.cosmos_chains, assets: state.assets, denoms: state.denoms, status: state.status, env: state.env, validators: state.validators }), shallowEqual)
  const { chains_data } = { ...chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { denoms_data } = { ...denoms }
  const { status_data } = { ...status }
  const { env_data } = { ...env }
  const { validators_data } = { ...validators }

  const [web3, setWeb3] = useState(null)
  const [consensusStateData, setConsensusStateData] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [transfersData, setTransfersData] = useState(null)

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
  const axelarChain = getChain('axelarnet', cosmos_chains_data)

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
  }, [web3])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (!controller.signal.aborted) {
        const response = await consensus_state()
        setConsensusStateData(response)
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const getData = async () => {
      if (denoms_data && consensusStateData?.validators?.proposer?.address) {
        const validator_data = validators_data?.find(v => v.consensus_address === hexToBech32(consensusStateData.validators.proposer.address, process.env.NEXT_PUBLIC_PREFIX_CONSENSUS))
        if (validator_data) {
          consensusStateData.operator_address = validator_data.operator_address
          if (validator_data.description) {
            consensusStateData.proposer_name = validator_data.description.moniker
            consensusStateData.proposer_image = validator_data.description.image
          }
        }
        consensusStateData.voting_power = consensusStateData.validators.proposer.voting_power
        if (env_data?.staking_pool) {
          consensusStateData.voting_power_percentage = env_data.voting_power * 100 / Math.floor(env_data.staking_pool.bonded_tokens)
        }
        consensusStateData.pre_votes = _.max((consensusStateData.votes || []).map(v => Number(_.last(v?.prevotes_bit_array?.split(' = ') || []))))

        setSummaryData({
          latest_block: { ...consensusStateData },
          block_height: status_data && Number(status_data.latest_block_height),
          block_height_at: status_data && moment(status_data.latest_block_time).valueOf(),
          avg_block_time: status_data && moment(status_data.latest_block_time).diff(moment(status_data.earliest_block_time_for_cal || status_data.earliest_block_time), 'seconds') / (Number(status_data.latest_block_height) - Number(status_data.earliest_block_height_for_cal || status_data.earliest_block_height)),
          active_validators: validators_data?.filter(v => ['BOND_STATUS_BONDED'].includes(v.status)).length,
          total_validators: validators_data?.length,
          denom: denom_manager.symbol(env_data?.staking_params?.bond_denom, denoms_data),
          online_voting_power_now: env_data?.staking_pool && number_format(Math.floor(env_data.staking_pool.bonded_tokens), '0,0.00a'),
          online_voting_power_now_percentage: env_data?.staking_pool && env_data.bank_supply && (Math.floor(env_data.staking_pool.bonded_tokens) * 100 / env_data.bank_supply.amount),
          total_voting_power: env_data?.bank_supply && number_format(env_data.bank_supply.amount, '0,0.00a'),
        })
      }
    }

    getData()
  }, [denoms_data, status_data, env_data, validators_data, consensusStateData])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (chains_data && cosmos_chains_data && denoms_data) {
        let response, data

        if (!controller.signal.aborted) {
          response = await transfers({
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
        }

        data = _.orderBy(response?.data?.map(t => {
          const asset = getDenom(t?.asset, denoms_data)
          return {
            ...t,
            from_chain: getChain(t?.from_chain, chains_data) || getChain(t?.from_chain, cosmos_chains_data),
            to_chain: getChain(t?.to_chain, chains_data) || getChain(t?.to_chain, cosmos_chains_data),
            asset,
            amount: denom_manager.amount(t?.amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
            avg_amount: denom_manager.amount(t?.avg_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
            max_amount: denom_manager.amount(t?.max_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
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

        setTransfersData({ data, ng_data })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 30 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, cosmos_chains_data, denoms_data])

  const addNetwork = async chain_id => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_addEthereumChain',
        params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
      })
    } catch (error) {}
  }

  const supportedChains = (chains_data || cosmos_chains_data) && _.uniq(_.concat(axelarChain, _.orderBy(_.concat(chains_data, cosmos_chains_data), 'title')), 'id').filter(c => c)

  return (
    <div className="sm:mb-4 mx-auto pb-2">
      <Summary data={summaryData} />
      <div
        title={<span className="text-black dark:text-white text-lg font-semibold ml-1">Cross-Chain Asset Transfers</span>}
        className="bg-transparent border-0 mt-6 mb-0 py-0 px-3 sm:px-0"
      >
        <div className="w-full grid grid-flow-row grid-cols-1 md:grid-cols-4 mt-2 gap-5">
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
                        <img
                          src={t.from_chain?.image}
                          alt=""
                          className="w-7 md:w-8 h-7 md:h-8 rounded-full"
                        />
                        <div className="flex items-center space-x-0.5 md:space-x-1">
                          <MdOutlineArrowBackIos size={20} />
                          <img
                            src={t.asset?.image}
                            alt=""
                            className="w-4 md:w-5 h-4 md:h-5 rounded-full"
                          />
                          <MdOutlineArrowForwardIos size={20} />
                        </div>
                        <img
                          src={t.to_chain?.image}
                          alt=""
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
          <div
            title={<span className="text-black dark:text-white text-base font-semibold">Supported Chains</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">List of chains supported on Axelar Network</span>}
            className="md:col-span-2 lg:col-span-1 bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
          >
            <div className="flex flex-col space-y-2 mt-1">
              {supportedChains ?
                <div className="h-52 md:h-88 flex flex-col overflow-y-auto space-y-3">
                  {supportedChains.map((c, i) => (
                    <div key={i} className="flex items-center justify-between my-1">
                      <div className="flex items-center space-x-3">
                        <img
                          src={c.image}
                          alt=""
                          className="w-7 md:w-8 h-7 md:h-8 rounded-full"
                        />
                        <div className="text-base font-semibold">{c.title}</div>
                      </div>
                      <div className="flex items-center space-x-0.5 md:space-x-1.5">
                        {c.provider_params && (
                          <button
                            onClick={() => addNetwork(c.chain_id)}
                            className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center py-1.5 px-2"
                          >
                            <Img
                              src="/logos/wallets/metamask.png"
                              alt=""
                              className="w-4 h-4"
                            />
                          </button>
                        )}
                        {c.explorer?.url && (
                          <a
                            href={c.explorer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <HiOutlineSearchCircle size={20} />
                          </a>
                        )}
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <BsWindow size={20} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                :
                <div className="flex flex-col space-y-3">
                  {[...Array(8).keys()].map(i => (
                    <div key={i} className="flex items-center justify-between my-1">
                      <div className="flex items-center space-x-3">
                        <div className="skeleton w-7 md:w-8 h-7 md:h-8 rounded-full" />
                        <div className="skeleton w-16 sm:w-24 h-5" />
                      </div>
                      <div className="flex items-center justify-end space-x-0.5 md:space-x-1.5">
                        {[...Array(3).keys()].map(j => (
                          <div key={j} className="skeleton w-4 md:w-6 h-4 md:h-6 rounded-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              }
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-2 ml-auto">
                <span>total</span>
                {supportedChains ?
                  <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono text-white font-semibold py-0.5 px-1.5">
                    {number_format(supportedChains.length, '0,0')}
                  </div>
                  :
                  <div className="skeleton w-12 h-6" />
                }
                <span>chains</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full grid grid-flow-row grid-cols-1 lg:grid-cols-2 gap-5 my-0 md:my-4">
        <div className="mt-8 md:mt-4">
          <Link href="/blocks">
            <a className="text-gray-900 dark:text-gray-100 text-base font-semibold mx-3">Latest Blocks</a>
          </Link>
          <div className="h-1" />
          <div className="min-h-full contents p-0">
            <BlocksTable
              n={10}
              className="bg-white dark:bg-black no-border"
            />
          </div>
        </div>
        <div className="mt-8 md:mt-4">
          <Link href="/transactions">
            <a className="text-gray-900 dark:text-gray-100 text-base font-semibold mx-3">Latest Transactions</a>
          </Link>
          <div className="h-1" />
          <div className="min-h-full contents p-0">
            <TransactionsTable
              location="index"
              className="bg-white dark:bg-black no-border"
            />
          </div>
        </div>
      </div>
    </div>
  )
}