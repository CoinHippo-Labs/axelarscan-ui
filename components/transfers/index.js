import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Loader from 'react-loader-spinner'
import { MdOutlineArrowBackIos, MdOutlineArrowForwardIos } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import AssetSelect from './asset-select'
import TimelyTransactions from './charts/timely-transactions'
import TimelyVolume from './charts/timely-volume'
import TransactionsByChain from './charts/transactions-by-chain'
import TVLByChain from './charts/tvl-by-chain'
import NetworkGraph from './network-graph'
import TransfersTable from './transfers-table'
import Widget from '../widget'
import Copy from '../copy'
import Popover from '../popover'

import { transfers } from '../../lib/api/index'
import { chainTitle, getChain, chain_manager } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { currency, currency_symbol } from '../../lib/object/currency'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function Transfers() {
  const { chains, cosmos_chains, assets, denoms, tvl } = useSelector(state => ({ chains: state.chains, cosmos_chains: state.cosmos_chains, assets: state.assets, denoms: state.denoms, tvl: state.tvl }), shallowEqual)
  const { chains_data } = { ...chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { denoms_data } = { ...denoms }
  const { tvl_data } = { ...tvl }

  const [assetSelect, setAssetSelect] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [timeFocus, setTimeFocus] = useState(moment().utc().startOf('day').valueOf())
  const [transfersData, setTransfersData] = useState(null)
  const [crosschainSummaryData, setCrosschainSummaryData] = useState(null)
  const [crosschainTVLData, setCrosschainTVLData] = useState(null)

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
  const axelarChain = getChain('axelarnet', cosmos_chains_data)

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

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (chains_data && cosmos_chains_data && denoms_data) {
        const today = moment().utc().startOf('day')
        const daily_time_range = 30
        const day_ms = 24 * 60 * 60 * 1000

        let response, data

        if (!controller.signal.aborted) {
          response = await transfers({
            aggs: {
              assets: {
                terms: { field: 'send.denom.keyword', size: 10000 },
                aggs: {
                  to_chains: {
                    terms: { field: 'send.recipient_chain.keyword', size: 10000 },
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
                      times: {
                        terms: { field: 'send.created_at.day', size: 10000 },
                        aggs: {
                          amounts: {
                            sum: {
                              field: 'send.amount',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            query: { range: { 'send.created_at.ms': { gte: moment(today).subtract(daily_time_range, 'days').valueOf() } } },
          })
        }

        data = _.orderBy(response?.data?.map(t => {
          const asset = getDenom(t?.asset, denoms_data)
          return {
            ...t,
            to_chain: getChain(t?.to_chain, chains_data) || getChain(t?.to_chain, cosmos_chains_data),
            asset,
            amount: denom_manager.amount(t?.amount, asset?.id, denoms_data),
            avg_amount: denom_manager.amount(t?.avg_amount, asset?.id, denoms_data),
            max_amount: denom_manager.amount(t?.max_amount, asset?.id, denoms_data),
            times: t?.times?.map(time => {
              return {
                ...time,
                amount: denom_manager.amount(time?.amount, asset?.id, denoms_data),
                avg_amount: denom_manager.amount(time?.avg_amount, asset?.id, denoms_data),
                max_amount: denom_manager.amount(time?.max_amount, asset?.id, denoms_data),
              }
            }),
          }
        }).map(t => {
          const price = t?.asset?.token_data?.[currency] || 0
          return {
            ...t,
            value: (price * t.amount) || 0,
            avg_value: (price * t.avg_amount) || 0,
            max_value: (price * t.max_amount) || 0,
            times: t?.times?.map(time => {
              return {
                ...time,
                value: (price * time.amount) || 0,
                avg_value: (price * time.avg_amount) || 0,
                max_value: (price * time.max_amount) || 0,
              }
            }),
          }
        }), ['tx'], ['desc']).filter(t => assets_data?.findIndex(a => a?.id === t?.asset?.id && (!a.is_staging || staging)) > -1)

        let _data = []
        for (let i = 0; i < data.length; i++) {
          const transfer = data[i]
          transfer.id = `${transfer.asset?.id}_${transfer.to_chain?.id}`
          _data.push(transfer)
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
            times: Object.entries(_.groupBy(value?.flatMap(v => v.times || []) || [], 'time')).map(([_key, _value]) => {
              return {
                time: Number(_key),
                tx: _.sumBy(_value, 'tx'),
                amount: _.sumBy(_value, 'amount'),
                value: _.sumBy(_value, 'value'),
                avg_amount: _.sumBy(_value, 'amount') / _.sumBy(_value, 'tx'),
                avg_value: _.sumBy(_value, 'value') / _.sumBy(_value, 'tx'),
                max_amount: _.maxBy(_value, 'max_amount')?.max_amount,
                max_value: _.maxBy(_value, 'max_value')?.max_value,
              }
            }),
          }
        })

        data = _data
        data = Object.entries(_.groupBy(_.orderBy(data.map(t => {
          const times = []
          for (let time = moment(today).subtract(daily_time_range, 'days').valueOf(); time <= today.valueOf(); time += day_ms) {
            const time_data = t.times?.find(_t => _t.time === time) || { time, tx: 0, amount: 0, value: 0, avg_amount: 0, avg_value: 0 }
            times.push(time_data)
          }

          return {
            ...t,
            times,
          }
        }), ['tx'], ['desc']), 'asset.id')).map(([key, value]) => {
          return {
            id: key,
            asset: _.head(value)?.asset,
            times: Object.entries(_.groupBy(value?.flatMap(v => v.times || []) || [], 'time')).map(([_key, _value]) => {
              return {
                time: Number(_key),
                tx: _.sumBy(_value, 'tx'),
                amount: _.sumBy(_value, 'amount'),
                value: _.sumBy(_value, 'value'),
                avg_amount: _.sumBy(_value, 'amount') / _.sumBy(_value, 'tx'),
                avg_value: _.sumBy(_value, 'value') / _.sumBy(_value, 'tx'),
                max_amount: _.maxBy(_value, 'max_amount')?.max_amount,
                max_value: _.maxBy(_value, 'max_value')?.max_value,
              }
            }),
            data: value,
          }
        })

        setChartData({ data })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 30 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, cosmos_chains_data, denoms_data])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (chains_data && cosmos_chains_data && denoms_data) {
        let response

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

        let total_transfers = _.orderBy(response?.data?.map(t => {
          const asset = getDenom(t?.asset, denoms_data)
          return {
            ...t,
            from_chain: getChain(t?.from_chain, chains_data) || getChain(t?.from_chain, cosmos_chains_data),
            to_chain: getChain(t?.to_chain, chains_data) || getChain(t?.to_chain, cosmos_chains_data),
            asset,
            amount: denom_manager.amount(t?.amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
            avg_amount: denom_manager.amount(t?.avg_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
          }
        }).map(t => {
          const price = t?.asset?.token_data?.[currency] || 0
          return {
            ...t,
            value: (price * t.amount) || 0,
            avg_value: (price * t.avg_amount) || 0,
          }
        }) || [], ['tx'], ['desc']).filter(t => assets_data?.findIndex(a => a?.id === t?.asset?.id && (!a.is_staging || staging)) > -1)

        let _total_transfers = []
        for (let i = 0; i < total_transfers.length; i++) {
          const transfer = total_transfers[i]
          transfer.id = `${transfer.from_chain?.id}_${transfer.to_chain?.id}_${transfer.asset?.id}`
          _total_transfers.push(transfer)
        }
        _total_transfers = Object.entries(_.groupBy(_total_transfers, 'id')).map(([key, value]) => {
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
        total_transfers = _.orderBy(_total_transfers, ['tx'], ['desc'])

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
                          max_amounts: {
                            max: {
                              field: 'send.amount',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            query: { range: { 'send.created_at.ms': { gt: moment().subtract(24, 'hours').valueOf() } } },
          })
        }

        let highest_transfer_24h = _.orderBy(response?.data?.map(t => {
          const asset = getDenom(t?.asset, denoms_data)
          return {
            ...t,
            from_chain: getChain(t?.from_chain, chains_data) || getChain(t?.from_chain, cosmos_chains_data),
            to_chain: getChain(t?.to_chain, chains_data) || getChain(t?.to_chain, cosmos_chains_data),
            asset,
            max_amount: denom_manager.amount(t?.max_amount, asset?.id, assets_data, chain_manager.chain_id(t?.from_chain, chains_data)),
          }
        }).map(t => {
          const price = t?.asset?.token_data?.[currency] || 0
          return {
            ...t,
            max_value: (price * t.max_amount) || 0,
          }
        }) || [], ['max_value', 'max_amount'], ['desc', 'desc']).filter(t => assets_data?.findIndex(a => a?.id === t?.asset?.id && (!a.is_staging || staging)) > -1)

        let _highest_transfer_24h = []
        for (let i = 0; i < highest_transfer_24h.length; i++) {
          const transfer = highest_transfer_24h[i]
          transfer.id = `${transfer.from_chain?.id}_${transfer.to_chain?.id}_${transfer.asset?.id}`
          _highest_transfer_24h.push(transfer)
        }
        _highest_transfer_24h = Object.entries(_.groupBy(_highest_transfer_24h, 'id')).map(([key, value]) => {
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
        highest_transfer_24h = _.orderBy(_highest_transfer_24h, ['max_value', 'max_amount'], ['desc', 'desc'])

        setCrosschainSummaryData({
          total_transfers,
          highest_transfer_24h,
        })
      }
    }

    getData()

    const interval = setInterval(() => getData(), 30 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, cosmos_chains_data, denoms_data])

  useEffect(() => {
    if (tvl_data) {
      const data = Object.entries(tvl_data).map(([key, value]) => {
        const chain = chains_data?.find(c => c?.id === _.head(key.split('_')))
        const asset = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === chain?.chain_id && c.contract_address === _.last(key.split('_'))) > -1)
        const denom = denoms_data?.find(d => d?.id === asset?.id)
        const amount = value
        const price = denom?.token_data?.[currency] || 0
        const _value = (price * amount) || 0

        return {
          chain,
          asset,
          denom,
          amount,
          value: _value,
        }
      })

      setCrosschainTVLData({ data, updated_at: moment().valueOf() })
    }
  }, [denoms_data, tvl_data])

  useEffect(() => {
    if (!assetSelect && chartData?.data?.[0]?.id) {
      setAssetSelect(chartData.data[0].id)
    }
  }, [assetSelect, chartData])

  return (
    <div className="max-w-full space-y-8 sm:space-y-12 mx-auto">
      <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">Transactions</span>}
          description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Number of cross-chain transactions</span>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-2 mt-1">
            {crosschainSummaryData ?
              <div className="h-52 flex flex-col overflow-y-auto space-y-3">
                {crosschainSummaryData.total_transfers?.map((t, i) => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.from_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <img
                          src={t.asset?.image}
                          alt=""
                          onClick={() => setAssetSelect(t.asset?.id)}
                          className="w-4 h-4 rounded-full cursor-pointer"
                        />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <img
                        src={t.to_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono uppercase text-gray-800 dark:text-gray-100 text-base font-semibold">
                        {numberFormat(t.tx, t.tx >= 100000 ? '0,0.00a' : '0,0')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              :
              <div className="flex flex-col space-y-3">
                {[...Array(5).keys()].map(i => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <div className="skeleton w-7 h-7 rounded-full" />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <div className="skeleton w-4 h-4 rounded-full" />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <div className="skeleton w-7 h-7 rounded-full" />
                    </div>
                    <div className="skeleton w-16 h-5 ml-auto" />
                  </div>
                ))}
              </div>
            }
            <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1 ml-auto">
              <span>total</span>
              {crosschainSummaryData ?
                <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono text-white font-semibold py-0.5 px-1.5">
                  {numberFormat(_.sumBy(crosschainSummaryData.total_transfers, 'tx'), '0,0')}
                </div>
                :
                <div className="skeleton w-12 h-6" />
              }
              <span>transactions</span>
            </span>
          </div>
        </Widget>
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">Volume</span>}
          description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Transfer volume across chain</span>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-2 mt-1">
            {crosschainSummaryData ?
              <div className="h-52 flex flex-col overflow-y-auto space-y-3">
                {_.orderBy(crosschainSummaryData.total_transfers || [], ['value', 'amount', 'tx'], ['desc', 'desc', 'desc']).map((t, i) => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.from_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <img
                          src={t.asset?.image}
                          alt=""
                          onClick={() => setAssetSelect(t.asset?.id)}
                          className="w-4 h-4 rounded-full cursor-pointer"
                        />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <img
                        src={t.to_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      <span className="text-2xs space-x-1">
                        <span className="font-mono uppercase font-semibold">{numberFormat(t.amount, t.amount >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{t.asset?.symbol}</span>
                      </span>
                      {t.value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-3xs font-medium">
                          {currency_symbol}{numberFormat(t.value, t.value > 100000 ? '0,0.00a' : '0,0.00')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              :
              <div className="flex flex-col space-y-3">
                {[...Array(5).keys()].map(i => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <div className="skeleton w-7 h-7 rounded-full" />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <div className="skeleton w-4 h-4 rounded-full" />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <div className="skeleton w-7 h-7 rounded-full" />
                    </div>
                    <div className="skeleton w-16 h-5 ml-auto" />
                  </div>
                ))}
              </div>
            }
            <div className="flex items-center justify-between space-x-1.5">
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
                <span>since</span>
                {crosschainSummaryData ?
                  <span className="leading-4 whitespace-nowrap text-gray-700 dark:text-gray-300 text-2xs font-medium">{moment(_.minBy(crosschainSummaryData.total_transfers, 'since')?.since).format('MMM D, YYYY')}</span>
                  :
                  <div className="skeleton w-20 h-5" />
                }
              </span>
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1 ml-auto">
                <span>total</span>
                {crosschainSummaryData ?
                  <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono uppercase text-white font-semibold py-0.5 px-1.5">
                    {currency_symbol}{numberFormat(_.sumBy(crosschainSummaryData.total_transfers || [], 'value'), _.sumBy(crosschainSummaryData.total_transfers || [], 'value') >= 100000 ? '0,0.00a' : '0,0.000')}
                  </div>
                  :
                  <div className="skeleton w-12 h-6" />
                }
              </span>
            </div>
          </div>
        </Widget>
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">TVL on EVMs</span>}
          description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Total Value Locked on Axelar Network</span>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-2 mt-1">
            {crosschainTVLData ?
              <div className="h-52 flex flex-col overflow-y-auto space-y-3">
                {_.orderBy(Object.entries(_.groupBy(crosschainTVLData.data || [], 'asset.id')).map(([key, value]) => {
                  return {
                    asset: _.head(value)?.asset,
                    denom: _.head(value)?.denom,
                    amount: _.sumBy(value, 'amount'),
                    value: _.sumBy(value, 'value'),
                    contracts: value.map(v => {
                      return {
                        chain: v.chain,
                        contract: v.asset?.contracts?.find(c => c.chain_id === v.chain?.chain_id),
                        denom: v.denom,
                        amount: v.amount,
                        value: v.value,
                      }
                    })
                  }
                }), ['value', 'amount'], ['desc', 'desc']).map((t, i) => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.asset?.image}
                        alt=""
                        onClick={() => setAssetSelect(t.asset?.id)}
                        className="w-7 h-7 rounded-full cursor-pointer"
                      />
                      <div
                        onClick={() => setAssetSelect(t.asset?.id)}
                        className="cursor-pointer flex flex-col space-y-1.5"
                      >
                        <span className="text-2xs font-semibold">
                          {t.denom?.title}
                        </span>
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-3xs font-semibold">
                          {t.denom?.symbol}
                        </span>
                      </div>
                    </div>
                    <Popover
                      placement="bottom"
                      title={<span className="normal-case">Supply on EVMs</span>}
                      content={<div className="w-60 space-y-2">
                        {_.orderBy(t.contracts || [], ['amount'], ['desc']).map((c, j) => (
                          <div key={j} className="flex items-center justify-between space-x-2">
                            <div className="flex flex-col">
                              <span className="font-semibold">{chainTitle(c.chain)}</span>
                              <div className="flex items-center space-x-1">
                                {c.contract?.contract_address ?
                                  <>
                                    <Copy
                                      text={c.contract.contract_address}
                                      copyTitle={<span className="text-xs font-normal">
                                        {ellipseAddress(c.contract.contract_address, 6)}
                                      </span>}
                                    />
                                    {c.chain?.explorer?.url && (
                                      <a
                                        href={`${c.chain.explorer.url}${c.chain.explorer.contract_path?.replace('{address}', c.contract.contract_address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-max text-blue-600 dark:text-white"
                                      >
                                        {c.chain.explorer.icon ?
                                          <img
                                            src={c.chain.explorer.icon}
                                            alt=""
                                            className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                          />
                                          :
                                          <TiArrowRight size={16} className="transform -rotate-45" />
                                        }
                                      </a>
                                    )}
                                  </>
                                  :
                                  '-'
                                }
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1.5">
                              <span className="text-2xs space-x-1">
                                <span className="font-mono uppercase font-semibold">{numberFormat(c.amount, c.amount >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                                <span className="text-gray-400 dark:text-gray-600">{c.denom?.symbol}</span>
                              </span>
                              {c.value > 0 && (
                                <span className="font-mono uppercase text-gray-400 dark:text-gray-600 text-3xs font-medium">
                                  {currency_symbol}{numberFormat(c.value, c.value > 100000 ? '0,0.00a' : '0,0.00')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>}
                    >
                      <div className="flex flex-col items-end space-y-1.5">
                        <span className="text-2xs space-x-1">
                          <span className="font-mono uppercase font-semibold">{numberFormat(t.amount, t.amount >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                          <span className="normal-case text-gray-400 dark:text-gray-600 font-normal">{t.asset?.symbol}</span>
                        </span>
                        {t.value > 0 && (
                          <span className="font-mono text-gray-400 dark:text-gray-600 text-3xs font-medium">
                            {currency_symbol}{numberFormat(t.value, t.value > 100000 ? '0,0.00a' : '0,0.00')}
                          </span>
                        )}
                      </div>
                    </Popover>
                  </div>
                ))}
              </div>
              :
              <div className="flex flex-col space-y-3">
                {[...Array(5).keys()].map(i => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <div className="skeleton w-7 h-7 rounded-full" />
                      <div className="skeleton w-16 h-5" />
                    </div>
                    <div className="skeleton w-16 h-5 ml-auto" />
                  </div>
                ))}
              </div>
            }
            <div className="flex items-center justify-between space-x-1.5">
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
                <span>on</span>
                {crosschainTVLData ?
                  <span className="whitespace-nowrap leading-4 text-gray-700 dark:text-gray-300 text-2xs font-medium">{moment(crosschainTVLData.updated_at).format('MMM D, h:mm A')}</span>
                  :
                  <div className="skeleton w-20 h-5" />
                }
              </span>
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1 ml-auto">
                <span>total</span>
                {crosschainTVLData ?
                  <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono uppercase text-white font-semibold py-0.5 px-1.5">
                    {currency_symbol}{numberFormat(_.sumBy(crosschainTVLData.data || [], 'value'), _.sumBy(crosschainTVLData.data || [], 'value') >= 100000 ? '0,0.00a' : '0,0.000')}
                  </div>
                  :
                  <div className="skeleton w-12 h-6" />
                }
              </span>
            </div>
          </div>
        </Widget>
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">Size</span>}
          description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Average size of cross-chain transfers</span>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-2 mt-1">
            {crosschainSummaryData ?
              <div className="h-52 flex flex-col overflow-y-auto space-y-3">
                {_.orderBy(crosschainSummaryData.total_transfers || [], ['avg_value', 'avg_amount', 'tx'], ['desc', 'desc', 'desc']).map((t, i) => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.from_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <img
                          src={t.asset?.image}
                          alt=""
                          onClick={() => setAssetSelect(t.asset?.id)}
                          className="w-4 h-4 rounded-full cursor-pointer"
                        />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <img
                        src={t.to_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      <span className="text-2xs space-x-1">
                        <span className="font-mono uppercase font-semibold">{numberFormat(t.avg_amount, t.avg_amount >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{t.asset?.symbol}</span>
                      </span>
                      {t.avg_value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-3xs font-medium">
                          {currency_symbol}{numberFormat(t.avg_value, t.avg_value > 100000 ? '0,0.00a' : '0,0.00')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              :
              <div className="flex flex-col space-y-3">
                {[...Array(5).keys()].map(i => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <div className="skeleton w-7 h-7 rounded-full" />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <div className="skeleton w-4 h-4 rounded-full" />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <div className="skeleton w-7 h-7 rounded-full" />
                    </div>
                    <div className="skeleton w-16 h-5 ml-auto" />
                  </div>
                ))}
              </div>
            }
            <div className="flex items-center justify-between space-x-1.5">
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
                <span>from</span>
                {crosschainSummaryData ?
                  <span className="leading-5 font-mono uppercase text-gray-700 dark:text-gray-300 text-2xs font-semibold">{numberFormat(_.sumBy(crosschainSummaryData.total_transfers, 'tx'), _.sumBy(crosschainSummaryData.total_transfers, 'tx') >= 100000 ? '0,0.00a' : '0,0')}</span>
                  :
                  <div className="skeleton w-8 h-5" />
                }
                <span className="leading-5 text-2xs">TXs</span>
              </span>
              <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1 ml-auto">
                <span>Avg.</span>
                {crosschainSummaryData ?
                  <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono uppercase text-white font-semibold py-0.5 px-1.5">
                    {currency_symbol}{numberFormat(_.sumBy(crosschainSummaryData.total_transfers || [], 'value') / _.sumBy(crosschainSummaryData.total_transfers || [], 'tx'), _.sumBy(crosschainSummaryData.total_transfers || [], 'value') / _.sumBy(crosschainSummaryData.total_transfers || [], 'tx') >= 100000 ? '0,0.00a' : '0,0.000')}
                  </div>
                  :
                  <div className="skeleton w-12 h-6" />
                }
              </span>
            </div>
          </div>
        </Widget>
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">Highest Transfer</span>}
          description={<span className="flex items-center text-gray-400 dark:text-gray-500 text-xs font-normal space-x-1">
            <span>The highest transfer size in last</span>
            <span className="bg-gray-100 dark:bg-gray-800 rounded-lg uppercase text-gray-800 dark:text-gray-200 text-xs font-semibold px-2 py-0.5">
              24h
            </span>
          </span>}
          className="bg-transparent sm:bg-white sm:dark:bg-gray-900 shadow border-0 px-4 sm:py-4"
        >
          <div className="flex flex-col space-y-2 mt-1">
            {crosschainSummaryData ?
              <div className="h-52 flex flex-col overflow-y-auto space-y-3">
                {_.orderBy(crosschainSummaryData.highest_transfer_24h || [], ['max_value', 'max_amount', 'tx'], ['desc', 'desc', 'desc']).map((t, i) => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={t.from_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <img
                          src={t.asset?.image}
                          alt=""
                          onClick={() => setAssetSelect(t.asset?.id)}
                          className="w-4 h-4 rounded-full cursor-pointer"
                        />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <img
                        src={t.to_chain?.image}
                        alt=""
                        className="w-7 h-7 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      <span className="text-2xs space-x-1">
                        <span className="font-mono uppercase font-semibold">{numberFormat(t.max_amount, t.max_amount >= 100000 ? '0,0.00a' : '0,0.000')}</span>
                        <span className="text-gray-400 dark:text-gray-600">{t.asset?.symbol}</span>
                      </span>
                      {t.max_value > 0 && (
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-3xs font-medium">
                          {currency_symbol}{numberFormat(t.max_value, t.max_value > 100000 ? '0,0.00a' : '0,0.00')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              :
              <div className="flex flex-col space-y-3">
                {[...Array(5).keys()].map(i => (
                  <div key={i} className="flex items-center justify-between my-1">
                    <div className="flex items-center space-x-2">
                      <div className="skeleton w-7 h-7 rounded-full" />
                      <div className="flex items-center space-x-0.5">
                        <MdOutlineArrowBackIos size={14} />
                        <div className="skeleton w-4 h-4 rounded-full" />
                        <MdOutlineArrowForwardIos size={14} />
                      </div>
                      <div className="skeleton w-7 h-7 rounded-full" />
                    </div>
                    <div className="skeleton w-16 h-5 ml-auto" />
                  </div>
                ))}
              </div>
            }
            <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1 ml-auto">
              <span>from</span>
              {crosschainSummaryData ?
                <div className="bg-blue-600 dark:bg-blue-700 rounded-lg font-mono text-white font-semibold py-0.5 px-1.5">
                  {numberFormat(_.sumBy(crosschainSummaryData.highest_transfer_24h, 'tx'), '0,0')}
                </div>
                :
                <div className="skeleton w-12 h-6" />
              }
              <span>transactions</span>
            </span>
          </div>
        </Widget>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-semibold">Asset Transfers</span>
          {assetSelect ?
            <div className="flex justify-start">
              <AssetSelect
                assets={chartData?.data}
                assetSelect={assetSelect}
                setAssetSelect={a => setAssetSelect(a)}
              />
            </div>
            :
            <div className="skeleton w-28 h-7 mb-3 ml-auto" />
          }
        </div>
        <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <Widget
            title={<span className="text-black dark:text-white text-base font-semibold">Transactions</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Number of transactions by day</span>}
            right={[assetSelect && chartData?.data?.find(t => t?.id === assetSelect)?.times?.find(t => t.time === timeFocus)].filter(t => t).map((t, i) => (
              <div key={i} className="min-w-max text-right space-y-1">
                <div className="flex items-center justify-end space-x-1.5">
                  <span className="font-mono text-base font-semibold">
                    {typeof t.tx === 'number' ? numberFormat(t.tx, '0,0') : '- '}
                  </span>
                  <span className="text-gray-400 dark:text-gray-600 text-base">TXs</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-2xs font-medium">{moment(t.time).utc().format('MMM, D YYYY [(UTC)]')}</div>
              </div>
            ))}
            contentClassName="items-start"
            className="shadow border-0 pb-0 px-2 sm:px-4"
          >
            <TimelyTransactions
              txsData={chartData?.data?.find(t => t?.id === assetSelect)}
              setTimeFocus={t => setTimeFocus(t)}
            />
          </Widget>
          <Widget
            title={<span className="text-black dark:text-white text-base font-semibold">Volume</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Transfer volume by day</span>}
            right={[assetSelect && chartData?.data?.find(t => t?.id === assetSelect)?.times?.find(t => t.time === timeFocus)].filter(t => t).map((t, i) => (
              <div key={i} className="min-w-max text-right space-y-1">
                <div className="flex items-center justify-end space-x-1.5">
                  <span className="font-mono text-base font-semibold">
                    {typeof t.amount === 'number' ? numberFormat(t.amount, '0,0.00000000') : '- '}
                  </span>
                  <span className="text-gray-400 dark:text-gray-600 text-base">{chartData.data.find(_t => _t?.id === assetSelect)?.asset?.symbol}</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-2xs font-medium">{moment(t.time).utc().format('MMM, D YYYY [(UTC)]')}</div>
              </div>
            ))}
            contentClassName="items-start"
            className="shadow border-0 pb-0 px-2 sm:px-4"
          >
            <TimelyVolume
              volumeData={chartData?.data?.find(t => t?.id === assetSelect)}
              setTimeFocus={t => setTimeFocus(t)}
            />
          </Widget>
          <Widget
            title={<span className="text-black dark:text-white text-base font-semibold">Transactions</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Number of transactions by destination chain</span>}
            right={[assetSelect && chartData?.data?.find(t => t?.id === assetSelect)].filter(t => t).map((t, i) => (
              <div key={i} className="min-w-max text-right space-y-0.5">
                <div className="flex items-center justify-end space-x-1.5">
                  <span className="font-mono text-base font-semibold">
                    {typeof _.sumBy(t.data, 'tx') === 'number' ? numberFormat(_.sumBy(t.data, 'tx'), '0,0') : '- '}
                  </span>
                  <span className="text-gray-400 dark:text-gray-600 text-base">TXs</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-xs font-medium">{t.data?.length || 0} Chains</div>
              </div>
            ))}
            className="shadow border-0 pb-0 px-2 sm:px-4"
          >
            <TransactionsByChain
              txsData={chartData?.data?.find(t => t?.id === assetSelect)}
            />
          </Widget>
          <Widget
            title={<span className="text-black dark:text-white text-base font-semibold">TVL on EVMs</span>}
            description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Total Value Locked on Axelar Network</span>}
            right={assetSelect && crosschainTVLData?.updated_at && (
              <div className="min-w-max text-right space-y-1.5 -mt-0.5">
                <div className="flex items-center justify-end space-x-1.5">
                  <span className="font-mono text-base font-semibold">
                    {typeof _.sumBy(crosschainTVLData.data?.filter(d => d?.asset?.id === assetSelect), 'amount') === 'number' ? numberFormat(_.sumBy(crosschainTVLData.data?.filter(d => d?.asset?.id === assetSelect), 'amount'), '0,0.00000000') : '- '}
                  </span>
                  <span className="text-gray-400 dark:text-gray-600 text-base">{crosschainTVLData.data?.find(_t => _t?.asset?.id === assetSelect)?.asset?.symbol}</span>
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-2xs font-medium">{moment(crosschainTVLData.updated_at).format('MMM, D YYYY h:mm:ss A')}</div>
              </div>
            )}
            className="shadow border-0 pb-0 px-2 sm:px-4"
          >
            <TVLByChain
              tvlData={crosschainTVLData?.data?.filter(d => d?.asset?.id === assetSelect)}
            />
          </Widget>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <Widget
          title={<span className="text-black dark:text-white text-base font-semibold">Traffics</span>}
          description={<span className="text-gray-400 dark:text-gray-500 text-xs font-normal">Cross-Chain on Axelar Network</span>}
          className="shadow border-0 my-6 px-4 sm:py-4"
        >
          <NetworkGraph data={transfersData?.ng_data} />
        </Widget>
        <TransfersTable data={transfersData} />
      </div>
    </div>
  )
}