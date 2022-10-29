import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { CSVLink } from 'react-csv'
import { ProgressBar as ProgressBarSpinner, ColorRing } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import Popover from '../popover'
import TimeAgo from '../time-ago'
import { ProgressBar } from '../progress-bars'
import { transfers as getTransfers } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { number_format, ellipse, equals_ignore_case, total_time_string, params_to_obj, loader_color } from '../../lib/utils'

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
  const [dataForExport, setDataForExport] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)

  useEffect(() => {
    if (
      evm_chains_data &&
      cosmos_chains_data &&
      assets_data &&
      asPath
    ) {
      const params = params_to_obj(
        asPath.indexOf('?') > -1 &&
        asPath.substring(asPath.indexOf('?') + 1)
      )

      const chains_data = _.concat(
        evm_chains_data,
        cosmos_chains_data,
      )

      const {
        txHash,
        confirmed,
        state,
        sourceChain,
        destinationChain,
        asset,
        depositAddress,
        senderAddress,
        recipientAddress,
        fromTime,
        toTime,
        sortBy,
      } = { ...params }

      setFilters({
        txHash,
        confirmed: [
          'confirmed',
          'unconfirmed',
        ].includes(confirmed?.toLowerCase()) ?
          confirmed.toLowerCase() :
          undefined,
        state: [
          'completed',
          'pending',
        ].includes(state?.toLowerCase()) ?
          state.toLowerCase() :
          undefined,
        sourceChain: getChain(
          sourceChain,
          chains_data,
        )?.id ||
          sourceChain,
        destinationChain: getChain(
          destinationChain,
          chains_data,
        )?.id ||
          destinationChain,
        asset: getAsset(
          asset,
          assets_data,
        )?.id ||
          asset,
        depositAddress,
        senderAddress,
        recipientAddress,
        fromTime: fromTime &&
          moment(Number(fromTime)).unix(),
        toTime: toTime &&
          moment(Number(toTime)).unix(),
        sortBy,
      })
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, asPath])

  useEffect(() => {
    const triggering = is_interval => {
      setFetchTrigger(
        is_interval ?
          moment().valueOf() :
          typeof fetchTrigger === 'number' ?
            null :
            0
      )
    }

    if (
      pathname &&
      filters
    ) {
      triggering()
    }

    const interval = setInterval(() =>
      triggering(true),
      (address || ['/transfers/search'].includes(pathname) ? 3 : 0.25) * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [pathname, address, filters])

  useEffect(() => {
    const getData = async () => {
      if (
        filters &&
        (
          !pathname?.includes('/[address]') ||
          address
        )
      ) {
        setFetching(true)

        if (!fetchTrigger) {
          setTotal(null)
          setData(null)
          setDataForExport(null)
          setOffet(0)
        }

        const _data = !fetchTrigger ?
          [] :
          data || []
        const size = n ||
          LIMIT
        const from = fetchTrigger === true || fetchTrigger === 1 ?
          _data.length :
          0

        const {
          sortBy,
        } = { ...filters }

        const must = [],
          should = [],
          must_not = []

        let response

        if (address) {
          should.push({ match: { 'source.recipient_address': address } })
          should.push({ match: { 'source.sender_address': address } })
          should.push({ match: { 'link.recipient_address': address } })
          response = await getTransfers({
            query: {
              bool: {
                must,
                should,
                minimum_should_match: should.length > 0 ? 1 : 0,
                must_not,
              },
            },
            size,
            from,
            sort: [{ 'source.created_at.ms': 'desc' }],
          })
        }
        else if (filters) {
          response = await getTransfers(
            {
              ...filters,
              size,
              from,
              sort:
                [
                  sortBy === 'value' &&
                  { 'source.value': 'desc' },
                  { 'source.created_at.ms': 'desc' },
                ]
                .filter(s => s),
            },
          )
        }

        if (response) {
          const {
            data,
            total,
          } = { ...response }

          setTotal(total)

          response = _.orderBy(
            _.uniqBy(
              _.concat(
                (data || [])
                  .map(d => {
                    return {
                      ...d,
                    }
                  }),
                _data,
              ),
              'source.id',
            ),
            [
              sortBy === 'value' && 'source.value',
              'source.created_at.ms',
            ].filter(s => s),
            [
              sortBy === 'value' && 'desc',
              'desc',
            ].filter(o => o),
          )

          setData(response)
          setFetching(false)
          setDataForExport(
            await toCSV(response)
          )
        }
        else if (!fetchTrigger) {
          setTotal(0)
          setData([])
          setDataForExport([])
        }

        setFetching(false)
      }
    }

    getData()
  }, [fetchTrigger])

  const toCSV = async data => {
    data = (data || [])
      .filter(d => d)
      .map(d => {
        const {
          source,
          link,
        } = { ...d }
        const {
          sender_chain,
          recipient_address,
          denom,
          created_at,
        } = { ...source }
        const {
          original_sender_chain,
        } = { ...link }

        const chain_data = getChain(
          recipient_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ?
            'axelarnet' :
            original_sender_chain ||
              sender_chain,
          chains_data,
        )
        const {
          id,
          chain_id,
        } = { ...chain_data }

        const asset_data = getAsset(
          denom,
          assets_data,
        )
        const {
          contracts,
          ibc,
        } = { ...asset_data }

        const contract_data = contracts?.find(c => c?.chain_id === chain_id)
        const ibc_data = ibc?.find(c => c?.chain_id === id)
        const symbol = contract_data?.symbol ||
          ibc_data?.symbol ||
          asset_data?.symbol ||
          denom

        return {
          ...d,
          symbol,
          timestamp_utc_string:
            moment(created_at?.ms)
              .format('DD-MM-YYYY HH:mm:ss A'),
        }
      })

    return data
  }

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const chains_data = _.concat(
    evm_chains_data,
    cosmos_chains_data,
  )
  const data_filtered = _.slice(
    data,
    0,
    n || undefined,
  )

  return (
    data ?
      <div className="grid gap-2 mt-2">
        {!n && (
          <div className="flex items-center justify-between space-x-2 -mt-2">
            {typeof total === 'number' && (
              <div className="flex items-center space-x-1.5 ml-2 sm:mb-1 sm:ml-0">
                <span className="tracking-wider text-sm font-semibold">
                  {number_format(
                    total,
                    '0,0',
                  )}
                </span>
                <span className="tracking-wider text-sm">
                  Results
                </span>
              </div>
            )}
            {dataForExport?.length > 0 && (
              <CSVLink
                headers={[
                  { label: 'Tx Hash', key: 'source.id' },
                  { label: 'Source Chain', key: 'source.sender_chain' },
                  { label: 'Sender Address', key: 'source.sender_address' },
                  { label: 'Symbol', key: 'symbol' },
                  { label: 'Amount', key: 'source.amount' },
                  { label: 'Price (USD)', key: 'link.price' },
                  { label: 'Value (USD)', key: 'source.value' },
                  { label: 'Fee', key: 'source.fee' },
                  { label: 'Deposit Address', key: 'source.recipient_address' },
                  { label: 'Destination Chain', key: 'source.recipient_chain' },
                  { label: 'Recipient Address', key: 'link.recipient_address' },
                  { label: 'Status', key: 'status' },
                  { label: 'Time (ms)', key: 'source.created_at.ms' },
                  { label: 'Time (DD-MM-YYYY HH:mm:ss A)', key: 'timestamp_utc_string' },
                ]}
                data={dataForExport}
                filename={`transfers${Object.entries({ ...filters }).filter(([k, v]) => v).map(([k, v]) => `_${k === 'time' ? v.map(t => t.format('DD-MM-YYYY')).join('_') : v}`).join('') || (address ? `_${address}` : '')}.csv`}
                className={`${fetching ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-600' : 'bg-blue-50 hover:bg-blue-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer text-blue-400 hover:text-blue-500 dark:text-slate-200 dark:hover:text-white'} rounded-lg mb-1 py-1 px-2.5`}
              >
                <span className="whitespace-nowrap font-bold">
                  Export CSV
                </span>
              </CSVLink>
            )}
          </div>
        )}
        <Datatable
          columns={[
            {
              Header: 'Tx Hash',
              accessor: 'source.id',
              disableSortBy: true,
              Cell: props => {
                const { source, link } = { ...props.row.original }
                const { sender_chain } = { ...source }
                const { original_sender_chain } = { ...link }
                const chain_data = getChain(original_sender_chain, chains_data) || getChain(sender_chain, chains_data)
                const { explorer } = { ...chain_data }
                const { url, transaction_path, icon } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <Link href={`/transfer/${props.value}`}>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-500 font-medium"
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
              Header: 'Source',
              accessor: 'source.sender_chain',
              disableSortBy: true,
              Cell: props => {
                const { source, link } = { ...props.row.original }
                const { sender_address } = { ...source }
                const { original_sender_chain } = { ...link }
                const chain_data = getChain(original_sender_chain, chains_data) || getChain(props.value, chains_data)
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
                    {sender_address && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        {sender_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', sender_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={sender_address}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      sender_address,
                                      8,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={sender_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={sender_address}
                              ellipse_size={8}
                              prefix={prefix_address}
                            />
                          </div>
                        }
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
                const { sender_chain, recipient_address, amount, denom, fee } = { ...props.value }
                const { link } = { ...props.row.original }
                const { original_sender_chain } = { ...link }
                const chain_data = getChain(recipient_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : original_sender_chain || sender_chain, chains_data)
                const asset_data = getAsset(denom, assets_data)
                const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
                const ibc_data = asset_data?.ibc?.find(c => c?.chain_id === chain_data?.id)
                const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
                const _image = contract_data?.image || ibc_data?.image || asset_data?.image
                const { name, image, explorer, prefix_address } = { ...chain_data }
                const { url, address_path } = { ...explorer }

                return (
                  <div className="flex flex-col space-y-1 mb-3">
                    {typeof amount === 'number' && asset_data && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {
                          _image &&
                          (
                            <Image
                              src={_image}
                              className="w-5 h-5 rounded-full"
                            />
                          )
                        }
                        <span className="text-sm font-semibold">
                          <span className="mr-1">
                            {number_format(
                              amount,
                              '0,0.000',
                              true,
                            )}
                          </span>
                          <span>
                            {ellipse(symbol)}
                          </span>
                        </span>
                        {
                          fee > 0 &&
                          (
                            <span className="text-xs font-semibold">
                              (<span className="mr-1">
                                Fee:
                              </span>
                              <span>
                                {number_format(
                                  fee,
                                  '0,0.000000',
                                  true,
                                )}
                              </span>)
                            </span>
                          )
                        }
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-slate-400 dark:text-slate-600 font-semibold">
                        Deposit address
                      </span>
                      {recipient_address.startsWith('0x') ?
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', recipient_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EnsProfile
                              address={recipient_address}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  {ellipse(
                                    recipient_address,
                                    8,
                                    prefix_address,
                                  )}
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={recipient_address}
                          />
                        </div> :
                        <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                          <AccountProfile
                            address={recipient_address}
                            ellipse_size={8}
                            prefix={prefix_address}
                          />
                        </div>
                      }
                    </div>
                  </div>
                )
              },
            },
            {
              Header: 'Destination',
              accessor: 'source.recipient_chain',
              disableSortBy: true,
              Cell: props => {
                const { link } = { ...props.row.original }
                const { original_recipient_chain, recipient_address } = { ...link }
                const chain_data = getChain(original_recipient_chain, chains_data) || getChain(props.value, chains_data)
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
                    {recipient_address && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Recipient address
                        </span>
                        {recipient_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', recipient_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={recipient_address}
                                no_copy={true}
                                fallback={(
                                  <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(
                                      recipient_address,
                                      8,
                                      prefix_address,
                                    )}
                                  </div>
                                )}
                              />
                            </a>
                            <Copy
                              value={recipient_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={recipient_address}
                              ellipse_size={8}
                              prefix={prefix_address}
                            />
                          </div>
                        }
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
                const { source, confirm_deposit, vote, sign_batch, ibc_send, axelar_transfer, link } = { ...props.row.original }
                const { sender_chain, recipient_chain, amount, denom, fee, insufficient_fee } = { ...source }
                const { original_sender_chain, original_recipient_chain } = { ...link }

                const source_chain_data =
                  getChain(
                    original_sender_chain,
                    chains_data,
                  ) ||
                  getChain(
                    sender_chain,
                    chains_data,
                  )
                const destination_chain_data =
                  getChain(
                    original_recipient_chain,
                    chains_data,
                  ) ||
                  getChain(
                    recipient_chain,
                    chains_data,
                  )
                const axelar_chain_data =
                  getChain(
                    'axelarnet',
                    chains_data,
                  )

                const asset_data =
                  getAsset(
                    denom,
                    assets_data,
                  )
                const {
                  contracts,
                  ibc,
                } = { ...asset_data }

                const contract_data = contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
                const ibc_data = ibc?.find(c => c?.chain_id === source_chain_data?.id)
                const symbol = contract_data?.symbol ||
                  ibc_data?.symbol ||
                  asset_data?.symbol ||
                  denom

                const steps = [
                  {
                    id: 'source',
                    title: staging ?
                      'Deposited' :
                      'Send Asset',
                    chain_data: source_chain_data,
                    data: source,
                    id_field: 'id',
                  },
                  {
                    id: 'confirm_deposit',
                    title: staging ?
                      'Confirmed' :
                      'Confirm Deposit',
                    chain_data: axelar_chain_data,
                    data: confirm_deposit,
                    id_field: 'id',
                  },
                  evm_chains_data?.findIndex(c => c?.id === source_chain_data?.id) > -1 &&
                    {
                      id: 'vote',
                      title: staging ?
                        'Approved' :
                        'Vote Confirm',
                      chain_data: axelar_chain_data,
                      data: vote,
                      id_field: 'id',
                    },
                  evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
                    {
                      id: 'sign_batch',
                      title: staging ?
                        'Signed' :
                        'Sign Batch',
                      chain_data: axelar_chain_data,
                      data: sign_batch,
                      id_field: 'batch_id',
                      path: '/batch/{chain}/{id}',
                      params: {
                        chain: destination_chain_data?.id,
                      },
                    },
                  evm_chains_data?.findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
                    {
                      id: 'executed',
                      title: staging ?
                        'Received' :
                        'Executed',
                      ...(
                        sign_batch?.transactionHash ?
                          {
                            chain_data: destination_chain_data,
                            id_field: 'transactionHash',
                          } :
                          {
                            chain_data: axelar_chain_data,
                            id_field: 'batch_id',
                            path: '/batch/{chain}/{id}',
                            params: {
                              chain: destination_chain_data?.id,
                            },
                          },
                      ),
                      data: sign_batch,
                    },
                  cosmos_chains_data?.filter(c => c?.id !== 'axelarnet').findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
                    {
                      id: 'ibc_send',
                      title: staging ?
                        'Received' :
                        'IBC Transfer',
                      chain_data: ibc_send?.recv_txhash ?
                        destination_chain_data :
                        axelar_chain_data,
                      data: ibc_send,
                      id_field: ibc_send?.ack_txhash ?
                        'ack_txhash' :
                        ibc_send?.failed_txhash ?
                          'failed_txhash' :
                          ibc_send?.recv_txhash ?
                            'recv_txhash' :
                            'id',
                    },
                  [axelar_chain_data].findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
                    {
                      id: 'axelar_transfer',
                      title: staging ?
                        'Received' :
                        'Axelar Transfer',
                      chain_data: axelar_chain_data,
                      data: axelar_transfer,
                      id_field: 'id',
                    },
                ]
                .filter(s => s)
                .map((s, i) => {
                  return {
                    ...s,
                    i,
                    finish: !!(
                      s.id === 'executed' ?
                        s.data?.executed :
                        s.id === 'ibc_send' ?
                          s.data?.ack_txhash ||
                          (
                            s.data?.recv_txhash &&
                            !s.data.failed_txhash
                          ) :
                          s.id === 'source' ?
                            s.data?.status === 'success' :
                            s.data
                    ),
                  }
                })

                const current_step = steps.findIndex(s => s.finish) < 0 ?
                  -1 :
                  (
                    _.maxBy(
                      steps.filter(s => s.finish),
                      'i',
                    )?.i ||
                    0
                  ) +
                  (
                    !insufficient_fee &&
                    (
                      amount > fee ||
                      !fee
                    ) &&
                    (
                      ibc_send?.ack_txhash ||
                      !ibc_send?.failed_txhash
                    ) ?
                      1 :
                      0
                  )

                const time_spent = _.last(steps)?.finish &&
                  total_time_string(
                    _.head(steps)?.data?.created_at?.ms / 1000,
                    _.last(steps)?.data?.block_timestamp ||
                    (_.last(steps)?.data?.received_at?.ms / 1000) ||
                    (_.last(steps)?.data?.created_at?.ms / 1000),
                  )

                const step = _.last(steps.filter(s => s?.finish))
                const {
                  title,
                  chain_data,
                  id_field,
                  path,
                  params,
                  finish,
                } = { ...step }
                const id = step?.data?.[id_field]
                const {
                  explorer,
                } = { ...chain_data }
                const {
                  url,
                  transaction_path,
                  icon,
                } = { ...explorer }

                let _path = path?.replace('{id}', id) ||
                  transaction_path?.replace('{tx}', id)

                Object.entries({ ...params })
                  .forEach(([k, v]) => {
                    _path = _path?.replace(`{${k}}`, v)
                  })

                const text_color = finish ?
                  'text-green-400 dark:text-green-300' :
                  step?.data?.status === 'failed' ?
                    'text-red-500 dark:text-red-600' :
                    'text-slate-300 dark:text-slate-700'

                return (
                  <div className="min-w-max flex flex-col space-y-0 mb-4">
                    {staging ?
                      <div className="flex flex-col space-y-0.5 mt-2 px-1">
                        <ProgressBar
                          width={current_step * 100 / steps.length}
                          color="bg-green-400"
                          backgroundClassName="h-1.5 bg-yellow-400"
                          className="h-1.5"
                        />
                        <div className="flex items-center space-x-1.5">
                          {finish ?
                            <BiCheckCircle
                              size={20}
                              className="text-green-400 dark:text-green-300"
                            /> :
                            step?.data?.status === 'failed' ?
                              <BiXCircle
                                size={20}
                                className="text-red-500 dark:text-red-600"
                              /> :
                              <FiCircle
                                size={20}
                                className="text-slate-300 dark:text-slate-700"
                              />
                          }
                          <div className="flex items-center space-x-1">
                            {id ?
                              <Copy
                                value={id}
                                title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                  {title}
                                </span>}
                                size={18}
                              /> :
                              <span className={`uppercase ${text_color} text-xs font-medium`}>
                                {title}
                              </span>
                            }
                            {id && url && (
                              <a
                                href={`${url}${_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-500"
                              >
                                {icon ?
                                  <Image
                                    src={icon}
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  /> :
                                  <TiArrowRight
                                    size={16}
                                    className="transform -rotate-45"
                                  />
                                }
                              </a>
                            )}
                          </div>
                        </div>
                      </div> :
                      <>
                        {steps.map((s, i) => {
                          const { title, chain_data, data, id_field, path, params, finish } = { ...s }
                          const id = data?.[id_field]
                          const { explorer } = { ...chain_data }
                          const { url, transaction_path, icon } = { ...explorer }

                          let _path = path?.replace('{id}', id) ||
                            transaction_path?.replace('{tx}', id)

                          Object.entries({ ...params })
                            .forEach(([k, v]) => {
                              _path = _path?.replace(`{${k}}`, v)
                            })

                          const text_color = finish ?
                            'text-green-400 dark:text-green-300' :
                            i === current_step ?
                              'text-yellow-500 dark:text-yellow-400' :
                              data?.status === 'failed' ?
                                'text-red-500 dark:text-red-600' :
                                'text-slate-300 dark:text-slate-700'

                          return (
                            <div
                              key={i}
                              className="flex items-center space-x-1.5 pb-0.5"
                            >
                              {finish ?
                                <BiCheckCircle
                                  size={20}
                                  className="text-green-400 dark:text-green-300"
                                /> :
                                i === current_step ?
                                  <ProgressBarSpinner
                                    borderColor="#ca8a04"
                                    barColor="#facc15"
                                    width="20"
                                    height="20"
                                  /> :
                                  data?.status === 'failed' ?
                                    <BiXCircle
                                      size={20}
                                      className="text-red-500 dark:text-red-600"
                                    /> :
                                    <FiCircle
                                      size={20}
                                      className="text-slate-300 dark:text-slate-700"
                                    />
                              }
                              <div className="flex items-center space-x-1">
                                {id ?
                                  <Copy
                                    value={id}
                                    title={<span className={`cursor-pointer uppercase ${text_color} text-xs font-bold`}>
                                      {title}
                                    </span>}
                                  /> :
                                  <span className={`uppercase ${text_color} text-xs font-medium`}>
                                    {title}
                                  </span>
                                }
                                {
                                  id &&
                                  url &&
                                  (
                                    <a
                                      href={`${url}${_path}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-500"
                                    >
                                      {icon ?
                                        <Image
                                          src={icon}
                                          className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                        /> :
                                        <TiArrowRight
                                          size={16}
                                          className="transform -rotate-45"
                                        />
                                      }
                                    </a>
                                  )
                                }
                              </div>
                            </div>
                          )
                        })}
                      </>
                    }
                    {
                      insufficient_fee &&
                      (
                        <Popover
                          placement="bottom"
                          title={null}
                          content={<div className="w-40 whitespace-pre-wrap text-black dark:text-white text-xs font-normal">
                            Send more {ellipse(symbol)} to the same recipient to cover the min fee
                          </div>}
                        >
                          <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-semibold py-0.5 px-2">
                            Insufficient Fee
                          </div>
                        </Popover>
                      )
                    }
                    {
                      ibc_send?.failed_txhash &&
                      !ibc_send.ack_txhash
                      (
                        <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg whitespace-nowrap font-medium py-0.5 px-2">
                          Timeout
                        </div>
                      )
                    }
                    {
                      time_spent &&
                      (
                        <div className="flex items-center space-x-1 mx-1 pt-0.5">
                          <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                            Time spent:
                          </span>
                          <span className="whitespace-nowrap font-bold">
                            {time_spent}
                          </span>
                        </div>
                      )
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Created at',
              accessor: 'source.created_at.ms',
              disableSortBy: true,
              Cell: props => (
                <TimeAgo
                  time={props.value}
                  title="Created Time"
                  className="ml-auto"
                />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data_filtered}
          noPagination={
            data.length <= 10 ||
            (
              !n &&
              !(
                address ||
                [
                  '/transfers/search',
                ].includes(pathname)
              )
            )
          }
          defaultPageSize={
            n ?
              10 :
              25
          }
          className="min-h-full no-border"
        />
        {
          data.length > 0 &&
          (
            typeof total !== 'number' ||
            data.length < total
          ) &&
          (
            !fetching ?
              <button
                onClick={() => {
                  setOffet(data.length)
                  setFetchTrigger(
                    typeof fetchTrigger === 'number' ?
                      true :
                      1
                  )
                }}
                className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-500 font-normal hover:font-medium mx-auto"
              >
                Load more
              </button> :
              <div className="flex justify-center">
                <ColorRing
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              </div>
          )
        }
      </div> :
      <ProgressBarSpinner
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}