import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TailSpin, ThreeDots, Puff } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { transfers as getTransfers } from '../../lib/api/index'
import { getChain } from '../../lib/object/chain'
import { getDenom, denom_manager } from '../../lib/object/denom'
import { number_format, ellipse, equals_ignore_case, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 100

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

  useEffect(() => {
    if (asPath) {
      const params = params_to_obj(asPath?.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))
      const { txHash, sourceChain, destinationChain, depositAddress, senderAddress, recipientAddress, fromTime, toTime } = { ...params }
      setFilters({
        txHash,
        sourceChain,
        destinationChain,
        depositAddress,
        senderAddress,
        recipientAddress,
        time: fromTime && toTime && [moment(Number(fromTime)), moment(Number(toTime))],
      })
      setFetchTrigger(moment().valueOf())
    }
  }, [asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
    }
    triggering()
    const interval = setInterval(() => triggering(true), (address || ['/transfers/search'].includes(pathname) ? 3 : 0.5) * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [pathname, address, filters])

  useEffect(() => {
    const controller = new AbortController()
    const getData = async () => {
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
        const must = [], should = [], must_not = []
        must.push({ exists: { 'field': 'link' } })
        if (address) {
          should.push({ match: { 'source.recipient_address': address } })
          should.push({ match: { 'source.sender_address': address } })
          should.push({ match: { 'link.recipient_address': address } })
        }
        else if (filters) {
          const { txHash, sourceChain, destinationChain, depositAddress, senderAddress, recipientAddress, time } = { ...filters }
          if (txHash) {
            must.push({ match: { 'source.id': txHash } })
          }
          if (sourceChain) {
            must.push({ match: { 'source.sender_chain': sourceChain } })
          }
          if (destinationChain) {
            must.push({ match: { 'source.recipient_chain': destinationChain } })
          }
          if (depositAddress) {
            must.push({ match: { 'source.recipient_address': depositAddress } })
          }
          if (senderAddress) {
            must.push({ match: { 'source.sender_address': senderAddress } })
          }
          if (recipientAddress) {
            must.push({ match: { 'link.recipient_address': recipientAddress } })
          }
          if (time?.length > 1) {
            must.push({ range: { 'source.created_at.ms': { gte: time[0].valueOf(), lte: time[1].valueOf() } } })
          }
        }
        const response = await getTransfers({
          query: {
            bool: {
              must,
              should,
              must_not,
            },
          },
          size,
          from,
          sort: [{ 'source.created_at.ms': 'desc' }],
        })
        if (response) {
          setTotal(response.total)
          response = _.orderBy(_.uniqBy(_.concat(_data, response.data?.map(d => {
            return {
              ...d,
            }
          }) || []), 'source.id'), ['source.created_at.ms'], ['desc'])
          setData(response)
        }
        else if (!fetchTrigger) {
          setTotal(0)
          setData([])
        }
        setFetching(false)
      }
    }
    getData()
    return () => {
      controller?.abort()
    }
  }, [fetchTrigger])

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const data_filtered = _.slice(data, 0, n || undefined)

  return (
    data ?
      <div className="min-h-full grid gap-2">
        <div className="flex items-center space-x-2 -mt-3">
          <span className="text-lg font-bold">
            {number_format(total, '0,0')}
          </span>
          <span className="text-base">
            Results
          </span>
        </div>
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'source.id',
              disableSortBy: true,
              Cell: props => {
                const { source } = { ...props.row.original }
                const { sender_chain } = { ...source }
                const chain_data = getChain(sender_chain, chains_data)
                const { explorer } = { ...chain_data }
                const { url, transaction_path, icon } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <Link href={`/transfer/${props.value}`}>
                      <a className="text-blue-600 dark:text-white font-bold">
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
              Header: 'Source',
              accessor: 'source.sender_chain',
              disableSortBy: true,
              Cell: props => {
                const { source } = { ...props.row.original }
                const { sender_address } = { ...source }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path, icon } = { ...explorer }
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
                    {sender_address && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', sender_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={sender_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(sender_address, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(sender_address, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={sender_address}
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
              Header: 'Asset',
              accessor: 'source',
              disableSortBy: true,
              Cell: props => {
                const { sender_chain, recipient_address, amount, denom } = { ...props.value }
                const chain_data = getChain(recipient_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : sender_chain, chains_data)
                const asset_data = getDenom(denom, assets_data)
                const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
                const ibc_data = asset_data?.ibc?.find(c => c?.chain_id === chain_data?.id)
                const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
                const _image = contract_data?.image || ibc_data?.image || asset_data?.image
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path, icon } = { ...explorer }
                return (
                  <div className="flex flex-col space-y-1 mb-3">
                    {amount && symbol && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {_image && (
                          <Image
                            src={_image}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm font-semibold">
                          {asset_data && (
                            <>
                              <span className="mr-1">
                                {number_format(amount, '0,0.000', true)}
                              </span>
                              <span>
                                {ellipse(symbol)}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Deposit address
                      </span>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${url}${address_path?.replace('{address}', recipient_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          <EnsProfile
                            address={recipient_address}
                            no_copy={true}
                            fallback={(
                              <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                <span className="xl:hidden">
                                  {ellipse(recipient_address, 6, prefix_address)}
                                </span>
                                <span className="hidden xl:block">
                                  {ellipse(recipient_address, 8, prefix_address)}
                                </span>
                              </div>
                            )}
                          />
                        </a>
                        <Copy
                          value={recipient_address}
                          size={18}
                        />
                      </div>
                    </div>
                  </div>
                )
              },
            },
            {
              Header: 'Destination',
              accessor: 'link.recipient_chain',
              disableSortBy: true,
              Cell: props => {
                const { link } = { ...props.row.original }
                const { recipient_address } = { ...link }
                const chain_data = getChain(props.value, chains_data)
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path, icon } = { ...explorer }
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
                    {recipient_address && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Recipient address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', recipient_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={recipient_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(recipient_address, 6, prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(recipient_address, 8, prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={recipient_address}
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
                  title: 'Contract Call',
                  chain_data: source_chain_data,
                  data: call,
                }, {
                  title: 'Gas Paid',
                  chain_data: source_chain_data,
                  data: gas_paid,
                }, {
                  title: 'Call Approved',
                  chain_data: destination_chain_data,
                  data: approved,
                }, {
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
                            {s.data?.transactionHash && s.chain_data?.explorer?.url && (
                              <a
                                href={`${s.chain_data.explorer.url}${s.chain_data.explorer.transaction_path?.replace('{tx}', s.data.transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {s.chain_data.explorer.icon ?
                                  <Image
                                    src={s.chain_data.explorer.icon}
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
                  </div>
                )
              },
            },
            {
              Header: 'Created At',
              accessor: 'source.created_at.ms',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  title="Created Time"
                  className="ml-auto"
                />
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={data_filtered}
          noPagination={data_filtered.length <= 10 || (!n && !(address || ['/transfers/search'].includes(pathname)))}
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