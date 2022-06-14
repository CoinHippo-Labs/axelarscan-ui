import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { TailSpin, ThreeDots, Puff } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { search } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, total_time_string, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 25

export default ({ n }) => {
  const { preferences, evm_chains, cosmos_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
      const { txHash, sourceChain, destinationChain, method, status, senderAddress, sourceAddress, contractAddress, relayerAddress, fromTime, toTime } = { ...params }
      setFilters({
        txHash,
        sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
        destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
        method: ['callContract', 'callContractWithToken'].includes(method) ? method : undefined,
        status: ['called', 'approved', 'executed', 'error'].includes(status?.toLowerCase()) ? status.toLowerCase() : undefined,
        senderAddress,
        sourceAddress,
        contractAddress,
        relayerAddress,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      setFetchTrigger(moment().valueOf())
    }
  }, [evm_chains_data, cosmos_chains_data, asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    if (pathname && filters) {
      triggering()
    }
    const interval = setInterval(() => triggering(true), (address || ['/gmp/search'].includes(pathname) ? 3 : 0.25) * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [pathname, address, filters])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
      if (filters && (!pathname?.includes('/[address]') || address)) {
        if (!controller.signal.aborted) {
          setFetching(true)
          if (!fetchTrigger) {
            setTotal(null)
            setData(null)
            setOffet(0)
          }
          const _data = !fetchTrigger ? [] : (data || []),
            size = n || LIMIT
          const from = fetchTrigger === 'true' || fetchTrigger === 1 ? _data.length : 0
          let params
          if (address) {
            params = {
              senderAddress: address,
            }
          }
          else if (filters) {
            const { txHash, sourceChain, destinationChain, method, status, senderAddress, sourceAddress, contractAddress, relayerAddress, time } = { ...filters }
            let event, fromTime, toTime
            switch (method) {
              case 'callContract':
                event = 'ContractCall'
                break
              case 'callContractWithToken':
                event = 'ContractCallWithToken'
                break
              default:
                event = undefined
                break
            }
            if (time?.length > 1) {
              fromTime = time[0].unix()
              toTime = time[1].unix()
            }
            params = {
              txHash,
              sourceChain,
              destinationChain,
              event,
              status,
              senderAddress,
              sourceAddress,
              contractAddress,
              relayerAddress,
              fromTime,
              toTime,
            }
          }
          const response = await search({
            ...params,
            size,
            from,
          })
          if (response) {
            setTotal(response.total)
            response = _.orderBy(_.uniqBy(_.concat(_data, response.data?.map(d => {
              return {
                ...d,
              }
            }) || []), 'call.id'), ['call.block_timestamp'], ['desc'])
            setData(response)
          }
          else if (!fetchTrigger) {
            setTotal(0)
            setData([])
          }
          setFetching(false)
        }
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [fetchTrigger])

  useEffect(() => {
    if (data) {
      setTypes(_.countBy(_.uniqBy(data, 'call.id').map(t => t?.call?.event).filter(t => t)))
    }
  }, [data])

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const data_filtered = _.slice(data?.filter(d => !(filterTypes?.length > 0) || filterTypes.includes(d?.call?.event) || (filterTypes.includes('undefined') && !d?.call?.event)), 0, n || undefined)

  return (
    data ?
      <div className="min-h-full grid gap-2">
        <div className="flex items-center justify-between space-x-2 -mt-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold">
              {number_format(total, '0,0')}
            </span>
            <span className="text-base">
              Results
            </span>
          </div>
          <div className="block sm:flex sm:flex-wrap items-center justify-end overflow-x-auto space-x-1">
            {Object.entries({ ...types }).map(([k, v]) => (
              <div
                key={k}
                onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equals_ignore_case(t, k)) : _.concat(filterTypes || [], k)))}
                className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'bg-slate-200 dark:bg-slate-800 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium'} rounded-lg cursor-pointer whitespace-nowrap flex items-center space-x-1.5 text-xs ml-1 mb-1 py-0.5 px-1.5`}
                style={{ textTransform: 'none' }}
              >
                <span>
                  {k === 'undefined' ?
                    'Failed' : k
                  }
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {number_format(v, '0,0')}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'call.transactionHash',
              disableSortBy: true,
              Cell: props => {
                const { call } = { ...props.row.original }
                const { chain } = { ...call }
                const chain_data = getChain(chain, chains_data)
                const { explorer } = { ...chain_data }
                const { url, transaction_path, icon } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <Link href={`/gmp/${props.value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-white font-bold"
                      >
                        {ellipse(props.value)}
                      </a>
                    </Link>
                    <Copy
                      value={props.value}
                      size={18}
                    />
                    {url && (
                      <a
                        href={`${url}${transaction_path?.replace('{tx}', props.value)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-max text-blue-600 dark:text-white"
                      >
                        {icon ?
                          <Image
                            src={icon}
                            className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={16} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Method',
              accessor: 'call.event',
              disableSortBy: true,
              Cell: props => {
                const { call, chain } = { ...props.row.original }
                const { returnValues } = { ...call }
                const { symbol, amount } = { ...returnValues }
                const chain_data = getChain(chain, chains_data)
                const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol) || a?.contracts?.findIndex(c => c?.chain_id === chain_data?.chain_id && equals_ignore_case(c.symbol, symbol)) > -1)
                const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
                const decimals = contract_data?.decimals || asset_data?.decimals || 18
                const _symbol = contract_data?.symbol || asset_data?.symbol || symbol
                const image = contract_data?.image || asset_data?.image
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg text-xs lg:text-sm font-semibold -mt-0.5 py-0.5 px-1.5">
                      {props.value === 'ContractCall' ?
                        'callContract' :
                        props.value === 'ContractCallWithToken' ?
                          'callContractWithToken' :
                          props.value || '-'
                      }
                    </div>
                    {amount && _symbol && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {image && (
                          <Image
                            src={image}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm font-semibold">
                          {asset_data && (
                            <span className="mr-1">
                              {number_format(utils.formatUnits(BigNumber.from(amount), decimals), '0,0.000', true)}
                            </span>
                          )}
                          <span>
                            {_symbol}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Source',
              accessor: 'call.chain',
              disableSortBy: true,
              Cell: props => {
                const { call } = { ...props.row.original }
                const { returnValues, transaction } = { ...call }
                const { sender } = { ...returnValues }
                const { from } = { ...transaction }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path } = { ...explorer }
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="flex items-center space-x-1.5">
                      {image && (
                        <Image
                          src={image}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-bold">
                        {name || props.value}
                      </span>
                    </div>
                    {from && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', from)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={from}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(from, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(from, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={from}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                    {sender && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Source address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', sender)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={sender}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(sender, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(sender, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={sender}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Destination',
              accessor: 'call.returnValues.destinationChain',
              disableSortBy: true,
              Cell: props => {
                const { call, executed, status } = { ...props.row.original }
                const { returnValues } = { ...call }
                const { destinationContractAddress } = { ...returnValues }
                const { transaction } = { ...executed }
                const { from } = { ...transaction }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path } = { ...explorer }
                return (
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="flex items-center space-x-1.5">
                      {image && (
                        <Image
                          src={image}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="font-bold">
                        {name || props.value}
                      </span>
                    </div>
                    {destinationContractAddress && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Contract address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', destinationContractAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={destinationContractAddress}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(destinationContractAddress, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(destinationContractAddress, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={destinationContractAddress}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                    {equals_ignore_case(status, 'executed') && from && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Relayer address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', from)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={from}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(from, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(from, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={from}
                            size={18}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Status',
              accessor: 'status',
              disableSortBy: true,
              Cell: props => {
                const { call, gas_paid, approved, executed, is_executed, error, status } = { ...props.row.original }
                const { chain, returnValues } = { ...call }
                const { destinationChain } = { ...returnValues }
                const source_chain_data = getChain(chain, chains_data)
                const destination_chain_data = getChain(destinationChain, chains_data)
                const steps = [{
                  id: 'call',
                  title: 'Contract Call',
                  chain_data: source_chain_data,
                  data: call,
                }, {
                  id: 'gas_paid',
                  title: 'Gas Paid',
                  chain_data: source_chain_data,
                  data: gas_paid,
                }, {
                  id: 'approved',
                  title: 'Call Approved',
                  chain_data: destination_chain_data,
                  data: approved,
                }, {
                  id: 'executed',
                  title: 'Executed',
                  chain_data: destination_chain_data,
                  data: executed,
                }]
                let current_step
                switch (status) {
                  case 'called':
                    current_step = gas_paid ? 2 : 1
                    break
                  case 'approved':
                    current_step = 3
                    break
                  case 'executed':
                  case 'error':
                    current_step = 4
                    break
                  default:
                    break
                }
                const time_spent = total_time_string(call?.block_timestamp, executed?.block_timestamp)
                return (
                  <div className="min-w-max flex flex-col space-y-1 mb-4">
                    {steps.map((s, i) => {
                      const text_color = s.data || (i === 3 && is_executed) ?
                        'text-green-500 dark:text-green-600' :
                        i === current_step ?
                          'text-blue-500 dark:text-white' :
                          i === 3 && error ?
                            'text-red-500 dark:text-red-600' :
                            'text-slate-400 dark:text-slate-600'
                      const { explorer } = { ...s.chain_data }
                      const { url, transaction_path, icon } = { ...explorer }
                      return (
                        <div
                          key={i}
                          className="flex items-center space-x-1.5 pb-0.5"
                        >
                          {s.data || (i === 3 && is_executed) ?
                            <BiCheckCircle size={20} className="text-green-500 dark:text-green-600" /> :
                            i === current_step ?
                              <Puff color={loader_color(theme)} width="20" height="20" /> :
                              i === 3 && error ?
                                <BiXCircle size={20} className="text-red-500 dark:text-red-600" /> :
                                <FiCircle size={20} className="text-slate-400 dark:text-slate-600" />
                          }
                          <div className="flex items-center space-x-1">
                            {s.data?.transactionHash ?
                              <Copy
                                value={s.data.transactionHash}
                                title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                  {s.title}
                                </span>}
                                size={18}
                              />
                              :
                              <span className={`uppercase ${text_color} text-xs font-medium`}>
                                {s.title}
                              </span>
                            }
                            {s.data?.transactionHash && url && (
                              <a
                                href={`${url}${transaction_path?.replace('{tx}', s.data.transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {icon ?
                                  <Image
                                    src={icon}
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={16} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {time_spent && (
                      <div className="flex items-center space-x-1 mx-1 pt-0.5">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                          time spent:
                        </span>
                        <span className="whitespace-nowrap font-bold">
                          {time_spent}
                        </span>
                      </div>
                    )}
                  </div>
                )
              },
            },
            {
              Header: 'Contract Call Time',
              accessor: 'call.block_timestamp',
              disableSortBy: true,
              Cell: props => {
                const { call, gas_paid, approved, executed, error } = { ...props.row.original }
                const updated_at = executed?.block_timestamp || error?.block_timestamp || approved?.block_timestamp
                return (
                  <div className="space-y-2">
                    <TimeAgo
                      time={props.value * 1000}
                      title="Contract Call Time"
                      className="ml-auto"
                    />
                    {updated_at && (
                      <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg flex flex-col items-end py-1 px-2 ml-auto -mr-1">
                        <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                          Updated at
                        </span>
                        <TimeAgo
                          time={updated_at * 1000}
                          title="Updated Time"
                          className="text-xs ml-auto"
                        />
                      </div>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data_filtered}
          noPagination={data_filtered.length <= 10 || (!n && !(address || ['/gmp/search'].includes(pathname)))}
          defaultPageSize={n ? 10 : 25}
          className="min-h-full no-border"
        />
        {data.length > 0 && (
          !fetching ?
            <button
              onClick={() => {
                setOffet(data.length)
                setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
              }}
              className="max-w-min hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg whitespace-nowrap font-medium hover:font-bold mx-auto py-1.5 px-2.5"
            >
              Load more
            </button>
            :
            <div className="flex justify-center p-1.5">
              <ThreeDots color={loader_color(theme)} width="24" height="24" />
            </div>
        )}
      </div>
      :
      <TailSpin color={loader_color(theme)} width="32" height="32" />
  )
}