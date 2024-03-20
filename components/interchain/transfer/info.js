import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Stepper, Step, Tooltip } from '@material-tailwind/react'
import moment from 'moment'
import { RiErrorWarningLine } from 'react-icons/ri'

import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import { getChainData, getAssetData } from '../../../lib/config'
import { split, toArray, getTitle, ellipse, equalsIgnoreCase } from '../../../lib/utils'

const WRAP_PREFIXES = ['w', 'axl']
const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'
const normalizeType = type => ['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'deposit_service' : type || 'deposit_address'

export default ({ data, buttons }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const {
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
    type,
  } = { ...data }
  const { txhash, source_chain, denom, amount, fee, insufficient_fee, created_at, status } = { ...send }
  let { destination_chain, sender_address } = { ...send }
  let { original_source_chain, original_destination_chain, deposit_address, recipient_address } = { ...link }
  destination_chain = unwrap?.destination_chain || destination_chain || link?.destination_chain
  sender_address = wrap?.sender_address || erc20_transfer?.sender_address || sender_address
  original_source_chain = send?.original_source_chain || original_source_chain
  original_destination_chain = send?.original_destination_chain || original_destination_chain
  deposit_address = wrap?.deposit_address || unwrap?.deposit_address_link || erc20_transfer?.deposit_address || send?.recipient_address || deposit_address
  recipient_address = unwrap?.recipient_address || recipient_address

  const source_chain_data = getChainData(original_source_chain, chains_data) || getChainData(source_chain, chains_data)
  const destination_chain_data = getChainData(original_destination_chain, chains_data) || getChainData(destination_chain, chains_data)
  const axelar_chain_data = getChainData('axelarnet', chains_data)
  const deposit_chain_data = getChainData(deposit_address?.startsWith('axelar') ? 'axelarnet' : original_source_chain || source_chain, chains_data)
  const asset_data = getAssetData(denom, assets_data)
  const { addresses } = { ...asset_data }
  let { symbol, image } = { ...addresses?.[source_chain_data?.id] }
  symbol = symbol || asset_data?.symbol || denom
  image = image || asset_data?.image
  if (symbol && (['wrap', 'unwrap'].includes(type) || wrap || unwrap)) {
    const index = WRAP_PREFIXES.findIndex(p => symbol.toLowerCase().startsWith(p) && !equalsIgnoreCase(p, symbol))
    if (index > -1) {
      const prefix = WRAP_PREFIXES[index]
      symbol = symbol.substring(prefix.length)
      if (image) {
        image = split(image, 'normal', '/').map(s => {
          if (s?.includes('.')) {
            const index = WRAP_PREFIXES.findIndex(p => s.toLowerCase().startsWith(p))
            if (index > -1) {
              const prefix = WRAP_PREFIXES[index]
              s = s.substring(prefix.length)
            }
          }
          return s
        }).join('/')
        image = image.startsWith('/') ? image : `/${image}`
      }
    }
  }

  const steps = toArray([
    type === 'deposit_address' && link && {
      id: 'link',
      title: 'Linked',
      status: 'success',
      data: link,
      chain_data: axelar_chain_data,
    },
    {
      id: 'send',
      title: (type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send) ? 'Sent' : 'Send',
      status: (type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send) ? 'success' : 'pending',
      data: type === 'wrap' ? wrap : type === 'erc20_transfer' ? erc20_transfer : send,
      chain_data: source_chain_data,
    },
    type === 'wrap' && {
      id: 'wrap',
      title: send ? 'Wrapped' : 'Wrap',
      status: send ? 'success' : 'pending',
      data: send,
      chain_data: source_chain_data,
    },
    type === 'erc20_transfer' && {
      id: 'erc20_transfer',
      title: send ? 'ERC20 Transferred' : 'ERC20 Transfer',
      status: send ? 'success' : 'pending',
      data: send,
      chain_data: source_chain_data,
    },
    !['send_token', 'wrap', 'erc20_transfer'].includes(type) && {
      id: 'confirm',
      title: confirm ? 'Deposit Confirmed' : send && source_chain_data?.chain_type === 'evm' ? 'Waiting for Finality' : 'Confirm Deposit',
      status: confirm ? 'success' : 'pending',
      data: confirm,
      chain_data: axelar_chain_data,
    },
    getChainData(source_chain_data?.id, chains_data)?.chain_type === 'evm' && {
      id: 'vote',
      title: vote ? vote.success ? 'Confirmed' : 'Confirm Failed' : confirm ? 'Confirming' : 'Confirm',
      status: vote ? vote.success ? 'success' : 'failed' : 'pending',
      data: vote,
      chain_data: axelar_chain_data,
    },
    getChainData(destination_chain_data?.id, chains_data)?.chain_type === 'evm' && {
      id: 'command',
      title: command?.executed || command?.transactionHash ? 'Received' : 'Approve',
      status: command?.executed || command?.transactionHash ? 'success' : 'pending',
      data: command,
      chain_data: command?.transactionHash ? destination_chain_data : axelar_chain_data,
    },
    getChainData(destination_chain_data?.id, chains_data)?.chain_type === 'cosmos' && destination_chain_data.id !== 'axelarnet' && {
      id: 'ibc_send',
      title: ibc_send?.ack_txhash || (ibc_send?.recv_txhash && !ibc_send.failed_txhash) ? 'Received' : ibc_send?.failed_txhash ? 'Error' : 'Execute',
      status: ibc_send?.ack_txhash || (ibc_send?.recv_txhash && !ibc_send.failed_txhash) ? 'success' : ibc_send?.failed_txhash ? 'failed' : 'pending',
      data: ibc_send,
      chain_data: ibc_send?.recv_txhash ? destination_chain_data : axelar_chain_data,
    },
    destination_chain_data?.id === 'axelarnet' && {
      id: 'axelar_transfer',
      title: axelar_transfer ? 'Received' : 'Execute',
      status: axelar_transfer ? 'success' : 'pending',
      data: axelar_transfer,
      chain_data: axelar_chain_data,
    },
    type === 'unwrap' && {
      id: 'unwrap',
      title: unwrap?.tx_hash_unwrap ? 'Unwrapped' : 'Unwrap',
      status: unwrap?.tx_hash_unwrap ? 'success' : 'pending',
      data: unwrap,
      chain_data: destination_chain_data,
    },
  ])

  return (
    <Card className="card">
      <CardBody className="pb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-8">
          <div className="order-1 flex flex-col space-y-2">
            <div className="flex items-center space-x-1">
              <Tooltip content={txhash}>
                <span className="text-black dark:text-white font-semibold">
                  {ellipse(txhash, 8)}
                </span>
              </Tooltip>
              {txhash && <Copy value={txhash} />}
              <ExplorerLink value={txhash} explorer={source_chain_data?.explorer} />
            </div>
            <Tooltip content="Method">
              <div className="w-fit h-6 bg-slate-50 dark:bg-slate-800 rounded flex items-center text-slate-600 dark:text-slate-200 font-medium py-1 px-2">
                {getTitle(normalizeType(type))}
              </div>
            </Tooltip>
            {deposit_address && (
              <Tooltip placement="bottom-start" content={type === 'send_token' ? 'Gateway' : ['wrap', 'unwrap', 'erc20_transfer'].includes(type) ? 'Contract' : 'Deposit Address'}>
                <div>
                  <AccountProfile
                    address={deposit_address}
                    ellipseLength={8}
                    noCopy={true}
                    explorer={deposit_chain_data?.explorer}
                    chain={deposit_chain_data?.id}
                  />
                </div>
              </Tooltip>
            )}
          </div>
          <div className="order-3 lg:order-2 sm:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-800 rounded sm:rounded-lg flex flex-col justify-center space-y-1 p-2 sm:p-3">
            <div className="flex items-center justify-between space-x-3">
              <div className="w-fit min-w-max h-6 flex items-center text-slate-600 dark:text-slate-200 text-sm space-x-2">
                {source_chain_data?.image && (
                  <Image
                    src={source_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="font-semibold">
                  {source_chain_data?.name || getTitle(original_source_chain)}
                </span>
              </div>
              <div className="w-full h-6 flex items-center space-x-3">
                <div className="w-full h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
                <div className="w-fit flex items-center space-x-2">
                  <div className="min-w-max">
                    <div className="block dark:hidden">
                      <Image
                        src="/logos/logo.png"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                    <div className="hidden dark:block">
                      <Image
                        src="/logos/logo_white.png"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                  <span className="hidden sm:block text-black dark:text-white font-semibold">
                    Axelar
                  </span>
                </div>
                <div className="w-full h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-0.5" />
              </div>
              <div className="w-fit min-w-max h-6 flex items-center text-slate-600 dark:text-slate-200 text-sm space-x-2">
                {destination_chain_data?.image && (
                  <Image
                    src={destination_chain_data.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <span className="font-semibold">
                  {destination_chain_data?.name || getTitle(original_destination_chain)}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-600 dark:text-slate-200 text-sm sm:space-x-3">
              <div className="h-6 flex items-center">
                <AccountProfile
                  address={sender_address}
                  ellipseLength={8}
                  noCopy={true}
                  explorer={source_chain_data?.explorer}
                  chain={source_chain_data?.id}
                />
              </div>
              <div className="h-6 flex items-center">
                <AccountProfile
                  address={recipient_address}
                  ellipseLength={8}
                  noCopy={true}
                  explorer={destination_chain_data?.explorer}
                  chain={destination_chain_data?.id}
                />
              </div>
            </div>
          </div>
          <div className="order-2 lg:order-3 flex flex-col text-slate-600 dark:text-slate-200 text-sm space-y-1">
            <div className="h-6 flex items-center space-x-2">
              {image && (
                <Image
                  src={image}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              )}
              {typeof amount === 'number' && (
                <NumberDisplay
                  value={amount}
                  format="0,0.00"
                  suffix={` ${symbol}`}
                />
              )}
            </div>
            {typeof amount === 'number' && (typeof fee === 'number' || insufficient_fee) && (
              <div className="h-6 flex items-center space-x-2">
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  Transfer Fee:
                </span>
                {typeof fee === 'number' && (
                  <NumberDisplay
                    value={fee}
                    format="0,0.000000"
                  />
                )}
                {insufficient_fee && (
                  <Tooltip content="Insufficient transfer fee">
                    <div>
                      <RiErrorWarningLine size={18} className="text-red-500 dark:text-red-600" />
                    </div>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
      <CardFooter className="card-footer">
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex flex-col justify-end space-y-1">
            {created_at?.ms > 0 && (
              <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium">
                {moment(created_at.ms).format(TIME_FORMAT)}
              </span>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-4 space-y-0.5">
            <div className="text-slate-600 dark:text-slate-200 font-semibold">
              Status
            </div>
            <Stepper activeStep={-1} className="stepper">
              {steps.map((s, i) => {
                const { id, title, status, data, chain_data } = { ...s }
                const { txhash, poll_id, batch_id, transactionHash, recv_txhash, ack_txhash, failed_txhash, tx_hash_unwrap } = { ...data }
                const { explorer } = { ...chain_data }
                const { url, transaction_path } = { ...explorer }

                let _url
                if (url && transaction_path) {
                  switch (id) {
                    case 'link':
                    case 'send':
                    case 'wrap':
                    case 'erc20_transfer':
                    case 'confirm':
                    case 'axelar_transfer':
                      if (txhash) {
                        _url = `${url}${transaction_path.replace('{tx}', txhash)}`
                      }
                      break
                    case 'vote':
                      if (txhash) {
                        _url = `/tx/${txhash}`
                      }
                      else if (poll_id) {
                        _url = `/evm-poll/${poll_id}`
                      }
                      break
                    case 'command':
                      if (transactionHash) {
                        _url = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                      }
                      else if (batch_id && destination_chain_data) {
                        _url = `/evm-batch/${destination_chain_data.id}/${batch_id}`
                      }
                      break
                    case 'ibc_send':
                      if (recv_txhash) {
                        _url = `${url}${transaction_path.replace('{tx}', recv_txhash)}`
                      }
                      else if (ack_txhash) {
                        _url = `${url}${transaction_path.replace('{tx}', ack_txhash)}`
                      }
                      else if (failed_txhash) {
                        _url = `${url}${transaction_path.replace('{tx}', failed_txhash)}`
                      }
                      break
                    case 'unwrap':
                      if (tx_hash_unwrap) {
                        _url = `${url}${transaction_path.replace('{tx}', tx_hash_unwrap)}`
                      }
                      break
                    default:
                      break
                  }
                }

                let bgColor
                let color
                switch (status) {
                  case 'success':
                    bgColor = 'bg-green-500 dark:bg-green-600'
                    color = 'text-green-500 dark:text-green-400'
                    break
                  case 'failed':
                    bgColor = 'bg-red-400 dark:bg-red-500'
                    color = 'text-red-400 dark:text-red-500'
                    break
                  default:
                    bgColor = `bg-blue-400 dark:bg-blue-500 ${steps.findIndex(s => s.status === 'pending') === i ? 'ring-4 ring-blue-100 dark:ring-blue-900' : ''}`
                    color = 'text-blue-400 dark:text-blue-500'
                    break
                }

                const button = buttons?.[id]
                const component = (
                  <div className="flex flex-col items-center">
                    <span className="text-white mt-0.5">
                      {i + 1}
                    </span>
                    <div className={`w-max whitespace-nowrap ${color} text-2xs sm:text-xs font-medium mt-1`}>
                      {title}
                    </div>
                  </div>
                )

                return (
                  <Step key={i} className={`w-6 h-6 ${bgColor} flex flex-col items-center`}>
                    {_url ?
                      <Link href={_url} target="_blank" rel="noopener noreferrer">
                        {component}
                      </Link> :
                      component
                    }
                    {button && (
                      <div className="w-max flex flex-col items-center text-xs font-medium space-y-1 mt-0.5">
                        {button}
                      </div>
                    )}
                  </Step>
                )
              })}
            </Stepper>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}