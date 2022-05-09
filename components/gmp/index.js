import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { BigNumber as EthersBigNumber, constants } from 'ethers'
import BigNumber from 'bignumber.js'
import {Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa'

import GMPFilter from './gmp-filter'
import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'

import { search } from '../../lib/api/gmp'
import { chain_manager, chainTitle } from '../../lib/object/chain'
import { paramsToObject, numberFormat, ellipseAddress, sleep } from '../../lib/utils'

const PAGE_SIZE = 100
const MAX_PAGE = 50

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function GMP({ addTokenToMetaMask, className }) {
  const { preferences, chains, assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, asPath } = { ...router }

  const [page, setPage] = useState(0)
  const [moreLoading, setMoreLoading] = useState(false)
  const [gmps, setGmps] = useState(null)
  const [gmpsTrigger, setGmpsTrigger] = useState(null)
  const [gmpsFilter, setGmpsFilter] = useState(null)

  useEffect(() => {
    if (asPath && !gmpsFilter) {
      const query = paramsToObject(asPath?.indexOf('?') > -1 && asPath?.substring(asPath.indexOf('?') + 1))
      if (query) {
        const filter = { ...query }
        if (filter.fromTime && filter.toTime) {
          filter.time = [moment(Number(filter.fromTime)), moment(Number(filter.toTime))]
        }
        setGmpsFilter(filter)
      }
      setGmpsTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const controller = new AbortController()

    const getData = async is_interval => {
      if (!controller.signal.aborted) {
        if (page && !is_interval) {
          setMoreLoading(true)
        }

        if (!is_interval && gmpsTrigger && typeof gmpsTrigger !== 'boolean') {
          setGmps(null)

          if (gmps && gmps.data?.length < 1) {
            await sleep(0.5 * 1000)
          }
        }

        let data = page === 0 ? [] : _.cloneDeep(gmps?.data), _page = page
        const size = PAGE_SIZE
        const _gmpsFilter = Object.fromEntries(Object.entries({ ...gmpsFilter }).filter(([k, v]) => v))
        let queryParams = { ..._gmpsFilter }
        let searchParams = { ..._gmpsFilter }
        if (_gmpsFilter?.time?.length > 1) {
          queryParams = { ...queryParams, fromTime: _gmpsFilter.time[0].valueOf(), toTime: _gmpsFilter.time[1].valueOf() }
          searchParams = { ...searchParams, fromTime: _gmpsFilter.time[0].unix(), toTime: _gmpsFilter.time[1].unix() }
          delete queryParams.time
          delete searchParams.time
        }

        router.push(`${pathname}${Object.keys(queryParams).length > 0 ? '?' : ''}${Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&')}`)

        while (_page <= page) {
          if (!controller.signal.aborted) {
            const params = {
              size,
              from: _page * size,
              ...searchParams,
            }
            const response = await search(params)
            data = _.orderBy(_.uniqBy(_.concat(data || [], response?.data || []), 'call.id'), ['call.block_timestamp'], ['desc'])
            _page++
          }
        }

        setGmps({ data })

        if (page && !is_interval) {
          setMoreLoading(false)
        }
      }
    }

    if (gmpsTrigger) {
      getData()
    }

    const interval = setInterval(() => getData(true), 30 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [gmpsTrigger])

  return (
    <>
      <div className="flex items-center justify-end -mt-12 mb-4 mr-2">
        <GMPFilter
          applied={Object.values(gmpsFilter || {}).filter(v => v).length > 0}
          disabled={!chains_data}
          initialFilter={gmpsFilter}
          updateFilter={f => {
            setGmpsFilter(f)
            setGmpsTrigger(moment().valueOf())
            setPage(0)
          }}
        />
      </div>
      <Datatable
        columns={[
          {
            Header: 'Tx Hash',
            accessor: 'call.transactionHash',
            disableSortBy: true,
            Cell: props => {
              const chain = props.row.original.call?.chain
              const chain_data = chains_data?.find(c => c?.id === chain)
              return !props.row.original.skeleton ?
                <>
                  <div className="min-w-max flex items-center space-x-1">
                    <Link href={`/gmp/${props.value}`}>
                      <a className="text-blue-500 dark:text-blue-400 text-xs font-medium">
                        {ellipseAddress(props.value, 8)}
                      </a>
                    </Link>
                    <Copy text={props.value} />
                    {chain_data?.explorer?.url && (
                      <a
                        href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', props.value)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-max text-blue-600 dark:text-white"
                      >
                        {chain_data.explorer.icon ?
                          <Img
                            src={chain_data.explorer.icon}
                            alt=""
                            className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={16} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                </>
                :
                <div className="skeleton w-32 h-5" />
            },
          },
          {
            Header: 'Source',
            accessor: 'call.returnValues.sender',
            disableSortBy: true,
            Cell: props => {
              const chain = props.row.original.call?.chain
              const chain_data = chains_data?.find(c => c?.id === chain)
              return !props.row.original.skeleton ?
                props.value ?
                  <div className="min-w-max">
                    <div className="flex items-center space-x-1">
                      <Copy
                        text={props.value}
                        copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {ellipseAddress(props.value, 8)}
                        </span>}
                      />
                      {chain_data?.explorer?.url && (
                        <a
                          href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', props.value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {chain_data.explorer.icon ?
                            <Img
                              src={chain_data.explorer.icon}
                              alt=""
                              className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={16} className="transform -rotate-45" />
                          }
                        </a>
                      )}
                    </div>
                    {chain_data && (
                      <div className="flex items-center space-x-2 mt-1.5">
                        <Img
                          src={chain_data.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(chain_data)}</span>
                      </div>
                    )}
                  </div>
                  :
                  <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                :
                <div className="space-y-2.5">
                  <div className="skeleton w-32 h-5" />
                  <div className="skeleton w-24 h-4" />
                </div>
            },
          },
          {
            Header: 'Method',
            accessor: 'call.event',
            disableSortBy: true,
            Cell: props => {
              const from_chain = props.row.original.call?.chain
              const to_chain = props.row.original.call?.returnValues?.destinationChain?.toLowerCase()
              const from_chain_data = chains_data?.find(c => c?.id === from_chain)
              const to_chain_data = chains_data?.find(c => c?.id === to_chain)
              const asset = assets_data?.find(a => a?.symbol?.toLowerCase() === props.row.original.call?.returnValues?.symbol?.toLowerCase())
              const from_contract = asset?.contracts?.find(c => c.chain_id === from_chain_data?.chain_id)
              const to_contract = asset?.contracts?.find(c => c.chain_id === to_chain_data?.chain_id)
              const addToMetaMaskButton = from_contract && (
                <button
                  onClick={() => addTokenToMetaMask(from_chain_data?.chain_id, { ...asset, ...from_contract })}
                  className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center py-1.5 px-2"
                >
                  <Img
                    src="/logos/wallets/metamask.png"
                    alt=""
                    className="w-4 h-4"
                  />
                </button>
              )
              return !props.row.original.skeleton ?
                <div className="min-w-max">
                  <div className="max-w-min bg-blue-100 dark:bg-blue-800 border border-blue-500 dark:border-blue-700 rounded-lg py-0.5 px-2 mb-1.5">
                    {props.value === 'ContractCall' ?
                      'callContract'
                      :
                      props.value === 'ContractCallWithToken' ?
                        'callContractWithToken'
                        :
                        props.value
                    }
                  </div>
                  {asset && (
                    <>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <div className="min-w-max max-w-min bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center space-x-2 py-1 px-3">
                          {asset?.image && (
                            <Img
                              src={asset.image}
                              alt=""
                              className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                            />
                          )}
                          <span className="flex items-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
                            <span className="font-mono mr-1.5">
                              {props.row.original.call?.returnValues?.amount ?
                                numberFormat(BigNumber(EthersBigNumber.from(props.row.original.call.returnValues.amount).toString())
                                  .shiftedBy(-(from_contract?.contract_decimals || to_contract?.contract_decimals || 6)).toNumber()
                                , '0,0.00000000', true)
                                :
                                '-'
                              }
                            </span>
                            <span className="normal-case">
                              {ellipseAddress(asset?.symbol || props.row.original.call?.returnValues?.symbol, 12)}
                            </span>
                          </span>
                        </div>
                        {addToMetaMaskButton && (
                          <Popover
                            placement="top"
                            title={<span className="normal-case text-xs">Add token</span>}
                            content={<div className="w-36 text-xs">Add <span className="font-semibold">{asset.symbol}</span> to MetaMask</div>}
                            titleClassName="py-1"
                          >
                            {addToMetaMaskButton}
                          </Popover>
                        )}
                      </div>
                      {from_contract && (
                        <div className="flex items-center space-x-1">
                          <Copy
                            size={14}
                            text={from_contract.contract_address}
                            copyTitle={<span className="normal-case text-gray-600 dark:text-gray-400 text-2xs font-medium">
                              {ellipseAddress(from_contract.contract_address, 8)}
                            </span>}
                          />
                          {from_chain_data?.explorer?.url && (
                            <a
                              href={`${from_chain_data.explorer.url}${from_chain_data.explorer[`contract${from_contract.contract_address === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', from_contract.contract_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {from_chain_data.explorer.icon ?
                                <Img
                                  src={from_chain_data.explorer.icon}
                                  alt=""
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                :
                <div className="space-y-2.5">
                  <div className="skeleton w-32 h-5" />
                  <div className="skeleton w-24 h-4" />
                </div>
            },
          },
          {
            Header: 'Destination Contract',
            accessor: 'call.returnValues.destinationContractAddress',
            disableSortBy: true,
            Cell: props => {
              const chain = props.row.original.call?.returnValues?.destinationChain?.toLowerCase()
              const chain_data = chains_data?.find(c => c?.id === chain)
              return !props.row.original.skeleton ?
                props.value ?
                  <div className="min-w-max">
                    <div className="flex items-center space-x-1">
                      <Copy
                        text={props.value}
                        copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {ellipseAddress(props.value, 8)}
                        </span>}
                      />
                      {chain_data?.explorer?.url && (
                        <a
                          href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', props.value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {chain_data.explorer.icon ?
                            <Img
                              src={chain_data.explorer.icon}
                              alt=""
                              className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={16} className="transform -rotate-45" />
                          }
                        </a>
                      )}
                    </div>
                    {chain_data && (
                      <div className="flex items-center space-x-2 mt-1.5">
                        <Img
                          src={chain_data.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(chain_data)}</span>
                      </div>
                    )}
                  </div>
                  :
                  <span className="text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                :
                <div className="space-y-2.5">
                  <div className="skeleton w-32 h-5" />
                  <div className="skeleton w-24 h-4" />
                </div>
            },
          },
          {
            Header: 'Status',
            accessor: 'status',
            disableSortBy: true,
            Cell: props => {
              const from_chain = props.row.original.call?.chain
              const to_chain = props.row.original.call?.returnValues?.destinationChain?.toLowerCase()
              const from_chain_data = chains_data?.find(c => c?.id === from_chain)
              const to_chain_data = chains_data?.find(c => c?.id === to_chain)
              const steps = [
                { id: 'call', title: 'Contract Call', chain: from_chain_data },
                { id: 'gas_paid', title: 'Gas Paid',chain: from_chain_data },
                { id: 'approved', title: 'Call Approved', chain: to_chain_data },
                { id: 'executed', title: 'Executed', chain: to_chain_data },
              ]
              const current_step = props.row.original.executed || props.row.original.error ?
                4 : props.row.original.approved ?
                3 : props.row.original.gas_paid ?
                2 : 1

              const call_timestamp = (props.row.original.call?.block_timestamp || 0) * 1000
              const executed_timestamp = (props.row.original.executed?.block_timestamp || 0) * 1000
              const time_spent = call_timestamp && executed_timestamp && moment(executed_timestamp).diff(moment(call_timestamp), 'seconds')

              return !props.row.original.skeleton ?
                <div className="min-w-max flex flex-col space-y-2 mb-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center space-x-1.5">
                      {props.row.original[step.id] ?
                        <FaCheckCircle size={20} className="text-green-500" />
                        :
                        i === current_step ?
                          <Loader type="Puff" color={theme === 'dark' ? 'white' : '#9CA3AF'} width="20" height="20" />
                          :
                          step.id === 'executed' && props.row.original.error ?
                            <FaTimesCircle size={20} className="text-red-500" />
                            :
                            <FaClock size={20} className="text-gray-200 dark:text-gray-800" />
                      }
                      <div key={i} className="flex items-center space-x-1">
                        {props.row.original[step.id]?.transactionHash ?
                          <Copy
                            size={16}
                            text={props.row.original[step.id]?.transactionHash}
                            copyTitle={<span className="uppercase text-gray-800 dark:text-gray-200 text-xs font-semibold">{step.title}</span>}
                          />
                          :
                          <span className="uppercase text-gray-600 dark:text-gray-400 text-xs">{step.title}</span>
                        }
                        {props.row.original[step.id]?.transactionHash && step.chain?.explorer?.url && (
                          <a
                            href={`${step.chain.explorer.url}${step.chain.explorer.transaction_path?.replace('{tx}', props.row.original[step.id].transactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {step.chain.explorer.icon ?
                              <Img
                                src={step.chain.explorer.icon}
                                alt=""
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={16} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {time_spent > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="whitespace-nowrap text-gray-400 dark:text-gray-500">
                        time spent:
                      </span>
                      <span className="whitespace-nowrap font-semibold">
                        {time_spent < 60 ?
                          `${time_spent}s` : time_spent < 60 * 60 ?
                          `${Math.floor(time_spent / 60)} min${time_spent % 60 > 0 ? ` ${time_spent % 60}s` : ''}` : time_spent < 24 * 60 * 60 ?
                          moment.utc(time_spent * 1000).format('HH:mm:ss') : `${moment(executed_timestamp).diff(moment(call_timestamp), 'days')} day`
                        }
                      </span>
                    </div>
                  )}
                </div>
                :
                <div className="flex-col space-y-2 mb-4">
                  {[...Array(4).keys()].map(i => (
                    <div key={i} className="skeleton w-32 h-5" />
                  ))}
                </div>
            },
          },
          {
            Header: 'Updated',
            accessor: 'call.block_timestamp',
            disableSortBy: true,
            Cell: props => {
              const timestamp = (props.row.original.executed?.block_timestamp ?
                props.row.original.executed.block_timestamp : props.row.original.error?.block_timestamp ?
                props.row.original.error.block_timestamp : props.row.original.approved?.block_timestamp ?
                props.row.original.approved.block_timestamp : props.row.original.gas_paid?.block_timestamp ?
                props.row.original.gas_paid.block_timestamp : props.row.original.call?.block_timestamp ?
                props.row.original.call.block_timestamp : 0) * 1000
              return !props.row.original.skeleton ?
                timestamp && (
                  <Popover
                    placement="top"
                    title={<span className="normal-case">Updated at</span>}
                    content={<div className="w-36 text-xs">{moment(timestamp).format('MMM D, YYYY h:mm:ss A')}</div>}
                    titleClassName="h-8"
                    className="ml-auto"
                  >
                    <div className="text-right">
                      <span className="normal-case text-gray-400 dark:text-gray-600 font-normal">
                        {Number(moment().diff(moment(timestamp), 'second')) > 59 ?
                          moment(timestamp).fromNow()
                          :
                          <>{moment().diff(moment(timestamp), 'second')}s ago</>
                        }
                      </span>
                    </div>
                  </Popover>
                )
                :
                <div className="skeleton w-20 h-5 ml-auto" />
            },
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={gmps ?
          gmps.data?.map((v, i) => { return { ...v, i } }) || []
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={false}
        defaultPageSize={PAGE_SIZE}
        className={`${className}`}
      />
      {gmps && !(gmps.data?.length > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Transfers
        </div>
      )}
      {!moreLoading && page < MAX_PAGE && (
        <div
          onClick={() => {
            setPage(page + 1)
            setGmpsTrigger(true)
          }}
          className="btn btn-default btn-rounded max-w-max bg-trasparent bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer text-gray-900 dark:text-white font-semibold mb-8 mx-auto"
        >
          Load More
        </div>
      )}
      {moreLoading && (
        <div className="flex justify-center mb-8">
          <Loader type="ThreeDots" color={theme === 'dark' ? 'white' : '#3B82F6'} width="32" height="32" />
        </div>
      )}
    </>
  )
}