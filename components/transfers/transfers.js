import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { CSVLink } from 'react-csv'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { BiCheckCircle, BiXCircle, BiCircle, BiTime } from 'react-icons/bi'
import { TiArrowRight } from 'react-icons/ti'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import TimeAgo from '../time-ago'
import { transfers as getTransfers } from '../../lib/api/transfer'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { number_format, name, ellipse, equalsIgnoreCase, total_time_string, params_to_obj, loader_color } from '../../lib/utils'

const LIMIT = 50

export default (
  {
    n,
  },
) => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    cosmos_chains_data,
  } = { ...cosmos_chains }
  const {
    assets_data,
  } = { ...assets }

  const router = useRouter()
  const {
    pathname,
    query,
    asPath,
  } = { ...router }
  const {
    address,
  } = { ...query }

  const [data, setData] = useState(null)
  const [total, setTotal] = useState(null)
  const [dataForExport, setDataForExport] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState(null)

  useEffect(
    () => {
      if (evm_chains_data && cosmos_chains_data && assets_data && asPath) {
        const params = params_to_obj(asPath.indexOf('?') > -1 && asPath.substring(asPath.indexOf('?') + 1))

        const {
          txHash,
          type,
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

        setFilters(
          {
            txHash,
            type: ['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type?.toLowerCase()) ? type.toLowerCase() : undefined,
            confirmed: ['confirmed', 'unconfirmed'].includes(confirmed?.toLowerCase()) ? confirmed.toLowerCase() : undefined,
            state: ['completed', 'pending'].includes(state?.toLowerCase()) ? state.toLowerCase() : undefined,
            sourceChain: getChain(sourceChain, chains_data)?.id || sourceChain,
            destinationChain: getChain(destinationChain, chains_data)?.id || destinationChain,
            asset: getAsset(asset, assets_data)?.id || asset,
            depositAddress,
            senderAddress,
            recipientAddress,
            fromTime: fromTime && moment(Number(fromTime)).unix(),
            toTime: toTime && moment(Number(toTime)).unix(),
            sortBy,
          }
        )
      }
    },
    [evm_chains_data, cosmos_chains_data, assets_data, asPath],
  )

  useEffect(
    () => {
      const triggering = is_interval => {
        setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
      }

      if (pathname && filters) {
        triggering()
      }

      const interval = setInterval(() => triggering(true), (address || ['/transfers/search'].includes(pathname) ? 3 : 0.25) * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, address, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (filters && (!((pathname || '').includes('/[address]')) || address)) {
          setFetching(true)

          if (!fetchTrigger) {
            setTotal(null)
            setData(null)
            setDataForExport(null)
            setOffet(0)
          }

          const _data = !fetchTrigger ? [] : data || []
          const size = n || LIMIT
          const from = fetchTrigger === true || fetchTrigger === 1 ? _data.length : 0

          const {
            sortBy,
          } = { ...filters }

          let response

          if (address) {
            const must = []
            const should = []
            const must_not = []

            should.push({ match: { 'send.sender_address': address } })
            should.push({ match: { 'wrap.sender_address': address } })
            should.push({ match: { 'erc20_transfer.recipient_address': address } })
            should.push({ match: { 'send.recipient_address': address } })
            should.push({ match: { 'unwrap.recipient_address': address } })
            should.push({ match: { 'link.recipient_address': address } })

            response =
              await getTransfers(
                {
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
                  sort: [{ 'send.created_at.ms': 'desc' }],
                },
              )
          }
          else if (filters) {
            response =
              await getTransfers(
                {
                  ...filters,
                  size,
                  from,
                  sort:
                    [
                      ['value'].includes(sortBy) && { 'send.value': 'desc' },
                      { 'send.created_at.ms': 'desc' },
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

            response =
              _.orderBy(
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
                  'send.txhash',
                ),
                [
                  ['value'].includes(sortBy) && 'send.value',
                  'send.created_at.ms',
                ].filter(s => s),
                [
                  ['value'].includes(sortBy) && 'desc',
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
    },
    [fetchTrigger],
  )

  const toCSV = async data => {
    data =
      (data || [])
        .filter(d => d)
        .map(d => {
          const {
            send,
            link,
          } = { ...d }

          const {
            source_chain,
            recipient_address,
            denom,
            created_at,
          } = { ...send }

          const {
            original_source_chain,
          } = { ...link }

          const chain_data = getChain(recipient_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : original_source_chain || source_chain, chains_data)

          const {
            id,
            chain_id,
          } = { ...chain_data }

          const asset_data = getAsset(denom, assets_data)

          const {
            contracts,
            ibc,
          } = { ...asset_data }

          const contract_data = (contracts || []).find(c => c?.chain_id === chain_id)
          const ibc_data = (ibc || []).find(c => c?.chain_id === id)

          const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom

          return {
            ...d,
            symbol,
            timestamp_utc_string: moment(created_at?.ms).format('DD-MM-YYYY HH:mm:ss A'),
          }
        })

    return data
  }

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const data_filtered = _.slice(data, 0, n || undefined)

  return (
    data ?
      <div className="grid gap-2 mt-2">
        {
          !n &&
          (
            <div className="flex items-center justify-between space-x-2 -mt-2">
              {
                typeof total === 'number' &&
                (
                  <div className="flex items-center space-x-1.5 sm:mb-1">
                    <span className="tracking-wider font-semibold">
                      {number_format(total, '0,0')}
                    </span>
                    <span className="tracking-wider">
                      Results
                    </span>
                  </div>
                )
              }
              {
                dataForExport?.length > 0 &&
                (
                  <CSVLink
                    headers={
                      [
                        { label: 'Tx Hash', key: 'send.txhash' },
                        { label: 'Type', key: 'type' },
                        { label: 'Source Chain', key: 'send.source_chain' },
                        { label: 'Sender Address', key: 'send.sender_address' },
                        { label: 'Symbol', key: 'symbol' },
                        { label: 'Amount', key: 'send.amount' },
                        { label: 'Price (USD)', key: 'link.price' },
                        { label: 'Value (USD)', key: 'send.value' },
                        { label: 'Fee', key: 'send.fee' },
                        { label: 'Deposit Address', key: 'send.recipient_address' },
                        { label: 'Destination Chain', key: 'send.recipient_chain' },
                        { label: 'Recipient Address', key: 'link.recipient_address' },
                        { label: 'Status', key: 'simplified_status' },
                        { label: 'Time (ms)', key: 'send.created_at.ms' },
                        { label: 'Time (DD-MM-YYYY HH:mm:ss A)', key: 'timestamp_utc_string' },
                      ]
                    }
                    data={dataForExport}
                    filename={
                      `transfers${
                        Object.entries({ ...filters })
                          .filter(([k, v]) => v)
                          .map(([k, v]) => `_${k === 'time' ? v.map(t => t.format('DD-MM-YYYY')).join('_') : v}`)
                          .join('') ||
                        (address ? `_${address}` : '')
                      }.csv`
                    }
                    className={`${fetching ? 'bg-slate-100 dark:bg-slate-800 pointer-events-none cursor-not-allowed text-slate-400 dark:text-slate-600' : 'bg-blue-50 hover:bg-blue-100 dark:bg-black dark:hover:bg-slate-900 cursor-pointer text-blue-400 hover:text-blue-500 dark:text-slate-200 dark:hover:text-white'} rounded-lg mb-1 py-1 px-2.5`}
                  >
                    <span className="whitespace-nowrap font-semibold">
                      Export CSV
                    </span>
                  </CSVLink>
                )
              }
            </div>
          )
        }
        <Datatable
          columns={
            [
              {
                Header: 'Tx Hash',
                accessor: 'send.txhash',
                disableSortBy: true,
                Cell: props => {
                  let {
                    value,
                  } = { ...props }

                  const {
                    send,
                    link,
                    wrap,
                    unwrap,
                    erc20_transfer,
                  } = { ...props.row.original }
                  let {
                    type,
                  } = { ...props.row.original }

                  type = wrap ? 'wrap' : unwrap ? 'unwrap' : erc20_transfer ? 'erc20_transfer' : type || 'deposit_address'

                  const {
                    source_chain,
                  } = { ...send }

                  const {
                    original_source_chain,
                  } = { ...link }

                  const chain_data = getChain(original_source_chain, chains_data) || getChain(source_chain, chains_data)

                  const {
                    explorer,
                  } = { ...chain_data }

                  const {
                    url,
                    transaction_path,
                    icon,
                  } = { ...explorer }

                  value = wrap?.txhash || erc20_transfer?.txhash || value

                  return (
                    <div className="flex flex-col space-y-2 mb-3">
                      <div className="min-w-max flex items-center space-x-1">
                        <Link href={`/transfer/${value}`}>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 dark:text-blue-500 font-medium"
                          >
                            {ellipse(value)}
                          </a>
                        </Link>
                        <Copy
                          value={value}
                        />
                        {
                          url &&
                          (
                            <a
                              href={`${url}${transaction_path?.replace('{tx}', value)}`}
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
                      {
                        type &&
                        (
                          <div className="w-fit bg-slate-200 dark:bg-slate-800 bg-opacity-75 dark:bg-opacity-75 rounded whitespace-nowrap uppercase text-xs font-semibold py-0.5 px-1.5">
                            {['deposit_address', 'send_token', 'wrap', 'unwrap', 'erc20_transfer'].includes(type) ?
                              <span className="normal-case">
                                via {['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'Deposit Service' : name(type)}
                              </span> :
                              type
                            }
                          </div>
                        )
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Source',
                accessor: 'send.source_chain',
                disableSortBy: true,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }

                  const {
                    send,
                    link,
                    wrap,
                    erc20_transfer,
                  } = { ...props.row.original }

                  let {
                    sender_address,
                  } = { ...send }

                  let {
                    original_source_chain,
                  } = { ...link }

                  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address
                  original_source_chain = send?.original_source_chain || original_source_chain

                  const chain_data = getChain(original_source_chain, chains_data) || getChain(value, chains_data)

                  const {
                    name,
                    image,
                    explorer,
                    prefix_address,
                  } = { ...chain_data }

                  const {
                    url,
                    address_path,
                  } = { ...explorer }

                  return (
                    <div className="flex flex-col space-y-2 mb-3">
                      <div className="h-6 flex items-center space-x-2">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-6 h-6 rounded-full"
                            />
                          )
                        }
                        <span className="font-semibold">
                          {name || value}
                        </span>
                      </div>
                      {
                        sender_address &&
                        (
                          <div className="flex flex-col">
                            <span className="text-slate-400 dark:text-slate-200 font-medium">
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
                                    fallback={
                                      <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                        {ellipse(sender_address, 8, prefix_address)}
                                      </div>
                                    }
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
                        )
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Asset',
                accessor: 'send.denom',
                disableSortBy: true,
                Cell: props => {
                  const {
                    type,
                    send,
                    link,
                    wrap,
                    unwrap,
                    erc20_transfer,
                  } = { ...props.row.original }

                  const {
                    source_chain,
                    denom,
                    amount,
                    fee,
                  } = { ...send }

                  let {
                    original_source_chain,
                    deposit_address,
                  } = { ...link }

                  original_source_chain = send?.original_source_chain || original_source_chain
                  deposit_address = wrap?.deposit_address || unwrap?.deposit_address_link || erc20_transfer?.deposit_address || send?.recipient_address || deposit_address

                  const chain_data = getChain(deposit_address?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? 'axelarnet' : original_source_chain || source_chain, chains_data)

                  const {
                    id,
                    chain_id,
                    explorer,
                    prefix_address,
                  } = { ...chain_data }

                  const {
                    url,
                    address_path,
                  } = { ...explorer }

                  const asset_data = getAsset(denom, assets_data)

                  const {
                    contracts,
                    ibc,
                  } = { ...asset_data }

                  const contract_data = (contracts || []).find(c => c?.chain_id === chain_id)
                  const ibc_data = (ibc || []).find(c => c?.chain_id === id)

                  let symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom
                  let image = contract_data?.image || ibc_data?.image || asset_data?.image

                  if (['wrap', 'unwrap'].includes(type) || wrap || unwrap) {
                    if (['W', 'axlW'].findIndex(p => symbol?.startsWith(p)) > -1) {
                      symbol = symbol.substring(symbol.indexOf('W') + 1)

                      if (image) {
                        image = image.split('/').map(p => p.substring(p?.includes('.') && p.startsWith('w') ? 1 : 0)).join('/')
                      }
                    }
                  }

                  return (
                    <div className="flex flex-col space-y-2 mb-3">
                      {
                        typeof amount === 'number' &&
                        (
                          <div className="flex items-center space-x-2">
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  className="w-6 h-6 rounded-full"
                                />
                              )
                            }
                            <div className="flex flex-col space-y-0.5">
                              <span className="leading-3 text-xs font-semibold">
                                <span className="mr-1">
                                  {number_format(amount, '0,0.000', true)}
                                </span>
                                <span>
                                  {ellipse(symbol)}
                                </span>
                              </span>
                              {
                                fee > 0 &&
                                (
                                  <span className="leading-3 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                    (
                                    <span className="mr-0.5">
                                      Fee:
                                    </span>
                                    <span>
                                      {number_format(fee, '0,0.000000', true)}
                                    </span>
                                    )
                                  </span>
                                )
                              }
                            </div>
                          </div>
                        )
                      }
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-200 font-medium">
                          {['send_token'].includes(type) ? 'Gateway address' : ['wrap', 'erc20_transfer'].includes(type) ? 'Contract address' : 'Deposit address'}
                        </span>
                        {deposit_address.startsWith('0x') ?
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${address_path?.replace('{address}', deposit_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile
                                address={deposit_address}
                                no_copy={true}
                                fallback={
                                  <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                    {ellipse(deposit_address, 8, prefix_address)}
                                  </div>
                                }
                              />
                            </a>
                            <Copy
                              value={deposit_address}
                            />
                          </div> :
                          <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                            <AccountProfile
                              address={deposit_address}
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
                accessor: 'send.destination_chain',
                disableSortBy: true,
                Cell: props => {
                  let {
                    value,
                  } = { ...props }

                  const {
                    send,
                    link,
                    unwrap,
                  } = { ...props.row.original }

                  let {
                    original_destination_chain,
                    recipient_address,
                  } = { ...link }

                  value = unwrap?.destination_chain || value || link?.destination_chain
                  original_destination_chain = send?.original_destination_chain || original_destination_chain
                  recipient_address = unwrap?.recipient_address || recipient_address

                  const chain_data = getChain(original_destination_chain, chains_data) || getChain(value, chains_data)

                  const {
                    name,
                    image,
                    explorer,
                    prefix_address,
                  } = { ...chain_data }

                  const {
                    url,
                    address_path,
                  } = { ...explorer }

                  return (
                    <div className="flex flex-col space-y-2 mb-3">
                      <div className="h-6 flex items-center space-x-2">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-6 h-6 rounded-full"
                            />
                          )
                        }
                        <span className="font-semibold">
                          {name || value}
                        </span>
                      </div>
                      {
                        recipient_address &&
                        (
                          <div className="flex flex-col">
                            <span className="text-slate-400 dark:text-slate-200 font-medium">
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
                                    fallback={
                                      <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                        {ellipse(recipient_address, 8, prefix_address)}
                                      </div>
                                    }
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
                        )
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Status',
                accessor: 'status',
                disableSortBy: true,
                Cell: props => {
                  const {
                    type,
                    send,
                    link,
                    confirm,
                    vote,
                    command,
                    ibc_send,
                    axelar_transfer,
                    wrap,
                    unwrap,
                    erc20_transfer,
                  } = { ...props.row.original }

                  const {
                    source_chain,
                    denom,
                    amount,
                    fee,
                    insufficient_fee,
                    status,
                  } = { ...send }
                  let {
                    destination_chain,
                    sender_address,
                  } = { ...send }
 
                  destination_chain = unwrap?.destination_chain || destination_chain || link?.destination_chain
                  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address

                  let {
                    original_source_chain,
                    original_destination_chain,
                  } = { ...link }

                  original_source_chain = send?.original_source_chain || original_source_chain
                  original_destination_chain = send?.original_destination_chain || original_destination_chain

                  const source_chain_data = getChain(original_source_chain, chains_data) || getChain(source_chain, chains_data)
                  const destination_chain_data = getChain(original_destination_chain, chains_data) || getChain(destination_chain, chains_data)
                  const axelar_chain_data = getChain('axelarnet', chains_data)
                  const asset_data = getAsset(denom, assets_data)

                  const {
                    contracts,
                    ibc,
                  } = { ...asset_data }

                  const contract_data = (contracts || []).find(c => c?.chain_id === source_chain_data?.chain_id)
                  const ibc_data = (ibc || []).find(c => c?.chain_id === source_chain_data?.id)

                  const symbol = contract_data?.symbol || ibc_data?.symbol || asset_data?.symbol || denom

                  const steps = [
                    ['deposit_address'].includes(type) &&
                    {
                      id: 'link',
                      title: 'Linked',
                      chain_data: axelar_chain_data,
                      data: link,
                      id_field: 'txhash',
                    },
                    {
                      id: 'send',
                      title: 'Sent',
                      chain_data: source_chain_data,
                      data: type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send,
                      id_field: 'txhash',
                    },
                    ['wrap'].includes(type) &&
                    {
                      id: 'wrap',
                      title: 'Wrapped',
                      chain_data: source_chain_data,
                      data: send,
                      // id_field: 'tx_hash_wrap',
                      id_field: 'txhash',
                    },
                    ['erc20_transfer'].includes(type) &&
                    {
                      id: 'erc20_transfer',
                      title: 'ERC20 Transferred',
                      chain_data: source_chain_data,
                      data: send,
                      // id_field: 'tx_hash_transfer',
                      id_field: 'txhash',
                    },
                    !['send_token', 'wrap', 'erc20_transfer'].includes(type) &&
                    {
                      id: 'confirm',
                      title: 'Confirmed',
                      chain_data: axelar_chain_data,
                      data: confirm,
                      id_field: 'txhash',
                    },
                    (evm_chains_data || []).findIndex(c => c?.id === source_chain_data?.id) > -1 &&
                    {
                      id: 'vote',
                      title: 'Approved',
                      chain_data: axelar_chain_data,
                      data: vote,
                      id_field: 'poll_id',
                      path: '/evm-poll/{id}',
                    },
                    (evm_chains_data || []).findIndex(c => c?.id === destination_chain_data?.id) > -1 &&
                    {
                      id: 'command',
                      title: 'Received',
                      data: command,
                      ...(
                        command?.transactionHash ?
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
                    },
                    (cosmos_chains_data || []).filter(c => c?.id !== axelar_chain_data.id).findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
                    {
                      id: 'ibc_send',
                      title: 'Received',
                      chain_data: ibc_send?.recv_txhash ? destination_chain_data : axelar_chain_data,
                      data: ibc_send,
                      id_field: ibc_send?.recv_txhash ? 'recv_txhash' : ibc_send?.ack_txhash ? 'ack_txhash' : ibc_send?.failed_txhash ? 'failed_txhash' : 'txhash',
                    },
                    [axelar_chain_data].findIndex(c => c?.id === destination_chain_data?.id || destination_chain_data?.overrides?.[c?.id]) > -1 &&
                    {
                      id: 'axelar_transfer',
                      title: 'Received',
                      chain_data: axelar_chain_data,
                      data: axelar_transfer,
                      id_field: 'txhash',
                    },
                    ['unwrap'].includes(type) &&
                    {
                      id: 'unwrap',
                      title: 'Unwrapped',
                      chain_data: destination_chain_data,
                      data: unwrap,
                      id_field: 'tx_hash_unwrap',
                      // id_field: 'txhash',
                    },
                  ]
                  .filter(s => s)
                  .map((s, i) => {
                    const {
                      id,
                      data,
                    } = { ...s }

                    return {
                      ...s,
                      i,
                      finish:
                        !!(id === 'command' ?
                          data?.executed || data?.transactionHash :
                          id === 'ibc_send' ?
                            data?.ack_txhash || (data?.recv_txhash && !data.failed_txhash) :
                            id === 'send' ?
                              status !== 'failed' : id === 'unwrap' ?
                                data?.tx_hash_unwrap :
                                data
                        ),
                    }
                  })

                  const current_step =
                    steps.findIndex(s => s.finish) < 0 ?
                      -1 :
                      (_.maxBy(steps.filter(s => s.finish), 'i')?.i || 0) +
                      (!insufficient_fee && status !== 'failed' && (amount > fee || !fee) && (ibc_send?.ack_txhash || !ibc_send?.failed_txhash) ? 1 : 0)

                  const time_spent =
                    _.last(steps)?.finish &&
                    total_time_string(
                      steps.find(s => s?.id === 'send')?.data?.created_at?.ms / 1000,
                      _.last(steps)?.data?.block_timestamp || (_.last(steps)?.data?.received_at?.ms /  1000) || (_.last(steps)?.data?.created_at?.ms / 1000),
                    )

                  return (
                    <div className="min-w-max flex flex-col mb-3">
                      {steps
                        .map((s, i) => {
                          const {
                            chain_data,
                            data,
                            id_field,
                            path,
                            params,
                            finish,
                          } = { ...s }
                          let {
                            title,
                          } = { ...s }

                          title = ['Approved'].includes(title) ? 'Confirmed' : s?.id === 'confirm' && !data ? 'Waiting for Finality' : title

                          const id = data?.[id_field]

                          const {
                            explorer,
                          } = { ...chain_data }

                          const {
                            url,
                            transaction_path,
                            icon,
                          } = { ...explorer }

                          let _path = (path || '').replace('{id}', id) || (transaction_path || '').replace('{tx}', id)

                          if (_path) {
                            Object.entries({ ...params })
                              .forEach(([k, v]) => {
                                _path = _path.replace(`{${k}}`, v)
                              })
                          }

                          const text_color =
                            finish ?
                              'text-green-500 dark:text-green-400' :
                              data?.status === 'failed' ?
                                'text-red-500 dark:text-red-400' :
                                i === current_step ?
                                  'text-yellow-500 dark:text-yellow-400' :
                                  'text-slate-300 dark:text-slate-700'

                          const hidden = ['confirm'].includes(s?.id) && data && ['vote'].includes(steps[i + 1]?.id)

                          return (
                            !hidden &&
                            (
                              <div
                                key={i}
                                className="flex items-center space-x-1 pb-0.5"
                              >
                                {finish ?
                                  <BiCheckCircle
                                    size={18}
                                    className="text-green-500 dark:text-green-400"
                                  /> :
                                  data?.status === 'failed' ?
                                    <BiXCircle
                                      size={18}
                                      className="text-red-500 dark:text-red-400"
                                    /> :
                                    i === current_step ?
                                      <ProgressBar
                                        borderColor="#ca8a04"
                                        barColor="#facc15"
                                        width="18"
                                        height="18"
                                      /> :
                                      <BiCircle
                                        size={18}
                                        className="text-slate-300 dark:text-slate-700"
                                      />
                                }
                                <div className="flex items-center space-x-0.5">
                                  {id ?
                                    <Copy
                                      value={id}
                                      title={
                                        <span className={`cursor-pointer uppercase ${text_color} text-xs font-semibold`}>
                                          {title}
                                        </span>
                                      }
                                    /> :
                                    <span className={`uppercase ${text_color} text-xs font-medium`}>
                                      {title}
                                    </span>
                                  }
                                  {
                                    id && url &&
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
                          )
                        })
                        .filter(s => s)
                      }
                      {
                        insufficient_fee &&
                        (['deposit_address', 'unwrap'].includes(type) ?
                          <Tooltip
                            placement="top"
                            content={`Send more ${ellipse(symbol)} to the same recipient to cover the min fee`}
                            className="w-56 z-50 bg-black bg-opacity-75 text-white text-xs"
                          >
                            <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 cursor-pointer border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                              Insufficient Fee
                            </div>
                          </Tooltip> :
                          <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                            Insufficient Fee
                          </div>
                        )
                      }
                      {
                        ibc_send?.failed_txhash && !ibc_send.ack_txhash &&
                        (
                          <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                            Timeout
                          </div>
                        )
                      }
                      {
                        time_spent &&
                        (
                          <Tooltip
                            placement="bottom"
                            content="Time spent"
                            className="z-50 bg-black bg-opacity-75 text-white text-xs -ml-7"
                          >
                            <div className="flex items-center space-x-1">
                              <BiTime
                                size={18}
                                className="text-green-500 dark:text-green-400"
                              />
                              <span className="whitespace-nowrap text-xs font-bold">
                                {time_spent}
                              </span>
                            </div>
                          </Tooltip>
                        )
                      }
                    </div>
                  )
                },
              },
              {
                Header: 'Created at',
                accessor: 'send.created_at.ms',
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
            ]
          }
          data={data_filtered}
          noPagination={data.length <= 10 || (!n && !(address || ['/transfers/search'].includes(pathname)))}
          defaultPageSize={n ? 10 : 25}
          className="min-h-full no-border"
        />
        {
          data.length > 0 && !n && (typeof total !== 'number' || data.length < total) &&
          (!fetching ?
            <button
              onClick={
                () => {
                  setOffet(data.length)
                  setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                }
              }
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
      <ProgressBar
        borderColor={loader_color(theme)}
        width="36"
        height="36"
      />
  )
}