'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { Contract } from 'ethers'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import toast, { Toaster } from 'react-hot-toast'
import { MdClose, MdCheck, MdOutlineTimer, MdKeyboardArrowRight } from 'react-icons/md'
import { PiClock, PiWarningCircle, PiCheckCircleFill, PiXCircleFill, PiInfo } from 'react-icons/pi'
import { RiTimerFlashLine } from 'react-icons/ri'
import { FiPlus } from 'react-icons/fi'
import { RxCaretDown, RxCaretUp } from 'react-icons/rx'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Tooltip } from '@/components/Tooltip'
import { Spinner } from '@/components/Spinner'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile, AssetProfile } from '@/components/Profile'
import { TimeAgo, TimeSpent, TimeUntil } from '@/components/Time'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useEVMWalletStore, EVMWallet, useCosmosWalletStore, CosmosWallet } from '@/components/Wallet'
import { getParams } from '@/components/Pagination'
import { getEvent, normalizeEvent, customData } from '@/components/GMPs'
import { useGlobalStore } from '@/components/Global'
import { searchGMP, estimateTimeSpent } from '@/lib/api/gmp'
import { getProvider } from '@/lib/chain/evm'
import { ENVIRONMENT, getChainData, getAssetData } from '@/lib/config'
import { split, toArray, parseError } from '@/lib/parser'
import { sleep } from '@/lib/operator'
import { isString, equalsIgnoreCase, ellipse, toTitle } from '@/lib/string'
import { isNumber, toNumber, toBigNumber, numberFormat } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import IAxelarExecutable from '@/data/contract/interfaces/gmp/IAxelarExecutable.json'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A z'

export function getStep(data, chains) {
  const { call, gas_paid, gas_paid_to_callback, express_executed, confirm, confirm_failed, confirm_failed_event, approved, executed, error, refunded, is_executed, is_invalid_call } = { ...data }
  const { proposal_id } = { ...call }

  const sourceChain = call?.chain
  const destinationChain = call?.returnValues?.destinationChain

  const sourceChainData = getChainData(sourceChain, chains)
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  const errored = error && timeDiff((error?.block_timestamp || approved?.block_timestamp || confirm?.block_timestamp) * 1000) > 120
  return toArray([
    {
      id: 'send',
      title: call ? 'Sent' : 'Send',
      status: call ? 'success' : 'pending',
      data: call,
      chainData: sourceChainData,
    },
    (!proposal_id || (gas_paid || gas_paid_to_callback)) && {
      id: 'pay_gas',
      title: gas_paid || gas_paid_to_callback ? 'Gas Paid' : timeDiff(call?.block_timestamp * 1000) < 30 ? 'Checking Gas Paid' : 'Pay Gas',
      status: gas_paid || gas_paid_to_callback ? 'success' : 'pending',
      data: gas_paid || gas_paid_to_callback,
      chainData: gas_paid_to_callback ? destinationChainData : sourceChainData,
    },
    express_executed && {
      id: 'express',
      title: 'Express Executed',
      status: 'success',
      data: express_executed,
      chainData: destinationChainData,
    },
    (confirm || !approved || !(executed || is_executed || error)) && {
      id: 'confirm',
      title: (confirm && (sourceChainData?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id)) || approved || executed || is_executed || error ? 'Confirmed' : is_invalid_call ? 'Invalid Call' : confirm_failed ? 'Failed to Confirm' : gas_paid || gas_paid_to_callback || express_executed ? 'Waiting for Finality' : 'Confirm',
      status: (confirm && (sourceChainData?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id)) || approved || executed || is_executed || error ? 'success' : is_invalid_call || confirm_failed ? 'failed' : 'pending',
      data: confirm || confirm_failed_event,
      chainData: axelarChainData,
    },
    destinationChainData?.chain_type === 'evm' && {
      id: 'approve',
      title: approved ? 'Approved' : confirm && (sourceChainData?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id) ? 'Approving' : 'Approve',
      status: approved ? 'success' : 'pending',
      data: approved,
      chainData: destinationChainData,
    },
    {
      id: 'execute',
      title: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'Executed' : errored ? 'Error' : executed?.axelarTransactionHash && timeDiff((confirm?.block_timestamp || call?.block_timestamp) * 1000) > 60 ? 'Waiting for IBC' : 'Execute',
      status: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'success' : errored ? 'failed' : 'pending',
      data: executed || is_executed || error,
      chainData: executed?.axelarTransactionHash && !executed.transactionHash ? axelarChainData : destinationChainData,
    },
    refunded?.receipt?.status && {
      id: 'refund',
      title: 'Gas Refunded',
      status: 'success',
      data: refunded,
      chainData: sourceChainData,
    },
  ])
}

function Info({ data, estimatedTimeSpent, executeData, buttons, tx, lite }) {
  const [seeMore, setSeeMore] = useState(false)
  const { chains, assets } = useGlobalStore()

  const { call, gas_paid, gas_paid_to_callback, express_executed, confirm, approved, executed, error, refunded, token_sent, token_deployment_initialized, token_deployed, interchain_transfer, interchain_transfer_with_data, token_manager_deployment_started, interchain_token_deployment_started, is_executed, amount, fees, gas, is_insufficient_fee, is_invalid_destination_chain, is_invalid_contract_address, not_enough_gas_to_execute, status, simplified_status, time_spent, callbackData, originData } = { ...data }
  const { proposal_id } = { ...call }
  const txhash = call?.transactionHash || tx

  const sourceChain = approved?.returnValues?.sourceChain || getChainData(call?.chain, chains)?.chain_name || call?.chain
  const destinationChain = call?.returnValues?.destinationChain || getChainData(approved?.chain, chains)?.chain_name || approved?.chain

  const senderAddress = call?.transaction?.from
  const contractAddress = approved?.returnValues?.contractAddress || call?.returnValues?.destinationContractAddress

  const sourceChainData = getChainData(sourceChain, chains)
  const { url, transaction_path } = { ...sourceChainData?.explorer }

  const symbol = call?.returnValues?.symbol || token_sent?.symbol || interchain_transfer?.symbol || interchain_transfer_with_data?.symbol || token_deployed?.symbol || token_deployment_initialized?.tokenSymbol || token_manager_deployment_started?.symbol || interchain_token_deployment_started?.tokenSymbol
  const { addresses } = { ...getAssetData(symbol, assets) }
  const isMultihop = !!(data.originData || data.callbackData)

  const messageId = call?.returnValues?.messageId || (call?.transactionHash && isNumber(call._logIndex) ? `${call.transactionHash}-${call._logIndex}` : undefined)
  const commandId = approved?.returnValues?.commandId || data.command_id
  const sourceAddress = call?.returnValues?.sender
  const destinationContractAddress = contractAddress
  const payloadHash = call?.returnValues?.payloadHash
  const payload = call?.returnValues?.payload
  const version = call?.destination_chain_type === 'cosmos' && payload ? toBigNumber(payload.substring(0, 10)) : undefined
  const sourceSymbol = call?.returnValues?.symbol
  const destinationSymbol = approved?.returnValues?.symbol || addresses?.[destinationChain?.toLowerCase()]?.symbol || sourceSymbol
  const amountInUnits = approved?.returnValues?.amount || call?.returnValues?.amount

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          General Message Passing
        </h3>
        <div className="max-w-2xl text-zinc-400 dark:text-zinc-500 text-sm leading-6 mt-1">
          {txhash && (
            <div className="flex items-center gap-x-1">
              <Copy value={txhash}>
                {url ?
                  <Link
                    href={proposal_id ? `/proposal/${proposal_id}` : `${url}${transaction_path?.replace('{tx}', txhash)}`}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500 font-semibold"
                  >
                    {ellipse(txhash)}{call.chain_type === 'evm' && call.receipt ? isNumber(call._logIndex) ? `-${call._logIndex}` : isNumber(call.logIndex) ? `:${call.logIndex}` : '' : call.chain_type === 'cosmos' && isNumber(call.messageIdIndex) ? `-${call.messageIdIndex}` : ''}
                  </Link> :
                  `${ellipse(txhash)}${call.chain_type === 'evm' && call.receipt ? isNumber(call._logIndex) ? `-${call._logIndex}` : isNumber(call.logIndex) ? `:${call.logIndex}` : '' : call.chain_type === 'cosmos' && isNumber(call.messageIdIndex) ? `-${call.messageIdIndex}` : ''}`
                }
              </Copy>
              {!proposal_id && <ExplorerLink value={txhash} chain={sourceChain} hasEventLog={call.chain_type === 'evm' && isNumber(call.logIndex)} />}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-700">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Method</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Tag className={clsx('w-fit capitalize')}>
                {toTitle(normalizeEvent(getEvent(data)))}
              </Tag>
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-3">
                {toArray([data.originData, data, data.callbackData]).map((d, i) => {
                  const sourceChain = d.call?.chain
                  const destinationChain = d.call?.returnValues?.destinationChain || d.approved?.chain
                  const steps = getStep(d, chains)

                  return (
                    <div key={i} className="flex flex-col gap-y-1.5">
                      {isMultihop && (
                        <div className="flex items-center gap-x-2">
                          <ChainProfile
                            value={sourceChain}
                            width={20}
                            height={20}
                            titleClassName="text-sm font-semibold"
                          />
                          <MdKeyboardArrowRight size={20} />
                          <ChainProfile
                            value={destinationChain}
                            width={20}
                            height={20}
                            titleClassName="text-sm font-semibold"
                          />
                        </div>
                      )}
                      <nav aria-label="Progress" className="h-20 overflow-x-auto">
                        <ol role="list" className="flex items-center">
                          {steps.map((d, i) => {
                            const { confirmation_txhash, poll_id, axelarTransactionHash, receipt, proposal_id } = { ...d.data }
                            const { url, transaction_path } = { ...d.chainData?.explorer }
                            const transactionHash = d.data?.transactionHash || receipt?.transactionHash || receipt?.hash

                            let stepURL
                            if (url && transaction_path) {
                              switch (d.id) {
                                case 'pay_gas':
                                  if (transactionHash || originData?.call?.transactionHash) stepURL = `${url}${transaction_path.replace('{tx}', transactionHash || originData?.call?.transactionHash)}`
                                  break
                                case 'confirm':
                                  if (confirmation_txhash) stepURL = `/tx/${confirmation_txhash}`
                                  else if (poll_id) stepURL = `/evm-poll/${poll_id}`
                                  else if (d.title === 'Waiting for Finality') {
                                    const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : 600
                                    if (timeDiff(call?.block_timestamp * 1000) >= finalityTime) d.title = 'Confirm'
                                  }
                                  break
                                case 'executed':
                                  if (transactionHash || axelarTransactionHash) stepURL = `${url}${transaction_path.replace('{tx}', transactionHash || axelarTransactionHash)}`
                                  break
                                default:
                                  if (proposal_id) stepURL = `/proposal/${proposal_id}`
                                  else if (transactionHash) stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                                  break
                              }
                            }

                            const element = (
                              <>
                                <div className={clsx('relative w-8 h-8 rounded-full flex items-center justify-center', d.status === 'failed' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400')}>
                                  {d.status === 'failed' ? <MdClose className="w-5 h-5 text-white" /> : <MdCheck className="w-5 h-5 text-white" />}
                                </div>
                                <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-1', d.status === 'failed' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-500', d.title?.length <= 5 ? 'ml-1' : '')}>{d.title}</span>
                                {d.id === 'express' && <div className="absolute mt-3"><span className="text-2xs font-medium text-green-600 dark:text-green-500">Received</span></div>}
                              </>
                            )

                            return (
                              <li key={d.id} className={clsx('relative', i !== steps.length - 1 ? 'pr-16 sm:pr-24' : '')}>
                                {d.status === 'pending' ?
                                  <>
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                      <div className="w-full h-0.5 bg-zinc-200 dark:bg-zinc-700" />
                                    </div>
                                    <div className={clsx('relative w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full border-2 flex items-center justify-center', steps[i - 1]?.status === 'pending' ? 'border-zinc-200 dark:border-zinc-700' : 'border-blue-600 dark:border-blue-500')} aria-current="step">
                                      {steps[i - 1]?.status !== 'pending' && <PiClock className={clsx('w-5 h-5', steps[i - 1]?.status === 'pending' ? 'text-zinc-200 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-500')} />}
                                      <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-12 pt-1', steps[i - 1]?.status !== 'pending' ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 dark:text-zinc-500', d.title?.length <= 5 ? 'ml-1' : '')}>{d.title}</span>
                                      {d.id === 'confirm' && !express_executed && estimatedTimeSpent?.confirm && timeDiff(moment(), 'seconds', (call?.block_timestamp + estimatedTimeSpent.confirm) * 1000) > 0 && (
                                        <div className="absolute mt-20">
                                          <TimeUntil
                                            timestamp={(call.block_timestamp + estimatedTimeSpent.confirm) * 1000}
                                            prefix="("
                                            suffix=")"
                                            noTooltip={true}
                                            className="text-2xs !font-medium ml-1"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </> :
                                  <>
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                      <div className={clsx('w-full h-0.5', d.status === 'failed' ? 'bg-red-600 dark:bg-red-500' : 'bg-blue-600 dark:bg-blue-500')} />
                                    </div>
                                    {stepURL ?
                                      <Link href={stepURL} target="_blank">
                                        {element}
                                      </Link> :
                                      element
                                    }
                                  </>
                                }
                              </li>
                            )
                          })}
                        </ol>
                      </nav>
                      {d.is_insufficient_fee && !d.approved && (
                        <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                          <PiWarningCircle size={16} />
                          <span className="text-xs">Insufficient Fee</span>
                        </div>
                      )}
                      {d.not_enough_gas_to_execute && !d.executed && !d.is_executed && (
                        <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                          <PiWarningCircle size={16} />
                          <span className="text-xs">Insufficient Gas</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </dd>
          </div>
          {Object.keys({ ...buttons }).length > 0 && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Recovery</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex flex-col gap-y-2">
                  {Object.entries(buttons).map(([k, v]) => (
                    <div key={k} className="w-72 grid grid-cols-3 gap-x-4">
                      <span className="font-semibold capitalize">{toTitle(k)}:</span>
                      <div className="col-span-2 flex items-center">{v}</div>
                    </div>
                  ))}
                </div>
              </dd>
            </div>
          )}
          {isMultihop ?
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Path</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-3">
                  <ChainProfile value={data.originData?.call?.chain || sourceChain} titleClassName="text-base font-semibold" />
                  <MdKeyboardArrowRight size={24} />
                  <ChainProfile value={data.originData?.call?.returnValues?.destinationChain || destinationChain} titleClassName="text-base font-semibold" />
                  <MdKeyboardArrowRight size={24} />
                  <ChainProfile value={data.callbackData?.call?.returnValues?.destinationChain || destinationChain} titleClassName="text-base font-semibold" />
                </div>
              </dd>
            </div> :
            <>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Source Chain</dt>
                <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <ChainProfile value={sourceChain} />
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Destination Chain</dt>
                <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <div className="flex flex-col gap-y-2">
                    <ChainProfile value={destinationChain} />
                    {is_invalid_destination_chain && (
                      <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                        <PiWarningCircle size={20} />
                        <span>Invalid Chain</span>
                      </div>
                    )}
                  </div>
                </dd>
              </div>
            </>
          }
          {symbol && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Asset</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <AssetProfile
                  value={symbol}
                  chain={sourceChain}
                  amount={amount}
                  ITSPossible={true}
                  onlyITS={!getEvent(data)?.includes('ContractCall')}
                  width={16}
                  height={16}
                  className="w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2.5 py-1"
                  titleClassName="text-xs"
                />
              </dd>
            </div>
          )}
          {interchain_transfer?.contract_address && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Token Address</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Profile address={interchain_transfer.contract_address} chain={data.originData?.call?.chain || sourceChain} />
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Sender</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={data.originData?.call?.transaction?.from || senderAddress} chain={data.originData?.call?.chain || sourceChain} />
            </dd>
          </div>
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Contract</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-2">
                <Profile address={data.callbackData?.call?.returnValues?.destinationContractAddress || contractAddress} chain={data.callbackData?.call?.returnValues?.destinationChain || destinationChain} />
                {data.callbackData?.is_invalid_contract_address || is_invalid_contract_address && (
                  <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                    <PiWarningCircle size={20} />
                    <span>Invalid Contract</span>
                  </div>
                )}
              </div>
            </dd>
          </div>
          {data.customValues?.recipientAddress && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Recipient</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Profile address={data.callbackData?.customValues?.recipientAddress || data.customValues.recipientAddress} chain={data.callbackData?.call?.returnValues?.destinationChain || destinationChain} />
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {moment((data.originData?.call || call)?.block_timestamp * 1000).format(TIME_FORMAT)}
            </dd>
          </div>
          {isMultihop ?
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-4">
                  {toArray([data.originData, data, data.callbackData]).filter(d => (d.time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(d.status)) || (d.time_spent?.total > 0 && ['executed'].includes(d.status))).map((d, i) => (
                    <div key={i} className="flex items-center gap-x-4">
                      {i > 0 && <FiPlus size={18} className="text-zinc-400 dark:text-zinc-500" />}
                      <div className="flex flex-col gap-y-2">
                        {d.time_spent.call_express_executed > 0 && ['express_executed', 'executed'].includes(d.status) && (
                          <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                            <RiTimerFlashLine size={20} />
                            <TimeSpent fromTimestamp={0} toTimestamp={d.time_spent.call_express_executed * 1000} />
                          </div>
                        )}
                        {d.time_spent.total > 0 && ['executed'].includes(d.status) && (
                          <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                            <MdOutlineTimer size={20} />
                            <TimeSpent fromTimestamp={0} toTimestamp={d.time_spent.total * 1000} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </dd>
            </div> :
            (time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(status)) || (time_spent?.total > 0 && ['executed'].includes(status)) ?
              <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
                <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                  <div className="flex flex-col gap-y-2">
                    {time_spent.call_express_executed > 0 && ['express_executed', 'executed'].includes(status) && (
                      <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                        <RiTimerFlashLine size={20} />
                        <TimeSpent fromTimestamp={0} toTimestamp={time_spent.call_express_executed * 1000} />
                      </div>
                    )}
                    {time_spent.total > 0 && ['executed'].includes(status) && (
                      <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                        <MdOutlineTimer size={20} />
                        <TimeSpent fromTimestamp={0} toTimestamp={time_spent.total * 1000} />
                      </div>
                    )}
                  </div>
                </dd>
              </div> :
              estimatedTimeSpent && (
                <>
                  <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                    <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Estimated Time Spent</dt>
                    <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                      <div className="flex flex-col gap-y-2">
                        {fees?.express_supported && !(confirm || approved) && estimatedTimeSpent.express_execute > 0 && timeDiff(call?.block_timestamp * 1000) < estimatedTimeSpent.express_execute && (
                          <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                            <RiTimerFlashLine size={20} />
                            <TimeSpent fromTimestamp={0} toTimestamp={estimatedTimeSpent.express_execute * 1000} />
                          </div>
                        )}
                        {estimatedTimeSpent.total > 0 && (
                          <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                            <MdOutlineTimer size={20} />
                            <TimeSpent fromTimestamp={0} toTimestamp={estimatedTimeSpent.total * 1000} />
                          </div>
                        )}
                      </div>
                    </dd>
                  </div>
                  {!['express_executed', 'executed'].includes(status) && (
                    <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                      <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
                      <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                        <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                          <MdOutlineTimer size={20} />
                          <TimeSpent fromTimestamp={call?.block_timestamp * 1000} />
                        </div>
                      </dd>
                    </div>
                  )}
                </>
              )
          }
          {isMultihop ?
            <>
              {toArray([data.originData, data, data.callbackData]).findIndex(d => d.fees?.base_fee > 0) > -1 && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Base Fee</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="overflow-x-auto flex items-center gap-x-4">
                      {toArray([data.originData, data, data.callbackData]).filter(d => d.fees).map((d, i) => (
                        <div key={i} className="flex items-center gap-x-4">
                          {i > 0 && <FiPlus size={18} className="text-zinc-400 dark:text-zinc-500" />}
                          <div className="flex flex-col gap-y-1">
                            <div className="flex items-center gap-x-2">
                              <Number
                                value={d.fees.base_fee}
                                format="0,0.000000"
                                suffix={` ${d.fees.source_token?.symbol}`}
                                noTooltip={true}
                                className="font-medium"
                              />
                              {d.fees.base_fee_usd > 0 && (
                                <Number
                                  value={d.fees.base_fee_usd}
                                  format="0,0.00"
                                  prefix="($"
                                  suffix=")"
                                  noTooltip={true}
                                  className="text-zinc-400 dark:text-zinc-500 font-normal"
                                />
                              )}
                            </div>
                            {d.fees.source_confirm_fee > 0 && (
                              <>
                                <div className="flex items-center gap-x-1 ml-3">
                                  <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Confirm Fee:</span>
                                  <Number
                                    value={d.fees.source_confirm_fee}
                                    format="0,0.000000"
                                    suffix={` ${d.fees.source_token?.symbol}`}
                                    noTooltip={true}
                                    className="text-xs font-medium"
                                  />
                                  {d.fees.source_token?.token_price?.usd > 0 > 0 && (
                                    <Number
                                      value={d.fees.source_confirm_fee * d.fees.source_token.token_price.usd}
                                      format="0,0.00"
                                      prefix="($"
                                      suffix=")"
                                      noTooltip={true}
                                      className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-x-1 ml-3">
                                  <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Approve Fee:</span>
                                  <Number
                                    value={d.fees.base_fee - d.fees.source_confirm_fee}
                                    format="0,0.000000"
                                    suffix={` ${d.fees.source_token?.symbol}`}
                                    noTooltip={true}
                                    className="text-xs font-medium"
                                  />
                                  {d.fees.source_token?.token_price?.usd > 0 > 0 && (
                                    <Number
                                      value={(d.fees.base_fee - d.fees.source_confirm_fee) * d.fees.source_token.token_price.usd}
                                      format="0,0.00"
                                      prefix="($"
                                      suffix=")"
                                      noTooltip={true}
                                      className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                    />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
              {toArray([data.originData, data, data.callbackData]).findIndex(d => d.express_executed && d.fees?.express_supported && d.fees.express_fee > 0) > -1 && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Express Fee</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="overflow-x-auto flex items-center gap-x-4">
                      {toArray([data.originData, data, data.callbackData]).filter(d => d.fees?.express_supported).map((d, i) => (
                        <div key={i} className="flex items-center gap-x-4">
                          {i > 0 && <FiPlus size={18} className="text-zinc-400 dark:text-zinc-500" />}
                          <div className="flex flex-col gap-y-1">
                            <div className="flex items-center gap-x-2">
                              <Number
                                value={d.fees.express_fee}
                                format="0,0.000000"
                                suffix={` ${d.fees.source_token?.symbol}`}
                                noTooltip={true}
                                className="font-medium"
                              />
                              {d.fees.express_fee_usd > 0 && (
                                <Number
                                  value={d.fees.express_fee_usd}
                                  format="0,0.00"
                                  prefix="($"
                                  suffix=")"
                                  noTooltip={true}
                                  className="text-zinc-400 dark:text-zinc-500 font-normal"
                                />
                              )}
                            </div>
                            {d.fees.source_express_fee && (
                              <>
                                {isNumber(d.fees.source_express_fee.relayer_fee) && (
                                  <div className="flex items-center gap-x-1 ml-3">
                                    <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Relayer Fee:</span>
                                    <Number
                                      value={d.fees.source_express_fee.relayer_fee}
                                      format="0,0.000000"
                                      suffix={` ${d.fees.source_token?.symbol}`}
                                      noTooltip={true}
                                      className="text-xs font-medium"
                                    />
                                    {d.fees.source_express_fee.relayer_fee_usd > 0 && (
                                      <Number
                                        value={d.fees.source_express_fee.relayer_fee_usd}
                                        format="0,0.00"
                                        prefix="($"
                                        suffix=")"
                                        noTooltip={true}
                                        className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                      />
                                    )}
                                  </div>
                                )}
                                {isNumber(d.fees.source_express_fee.express_gas_overhead_fee) && (
                                  <div className="flex items-center gap-x-1 ml-3">
                                    <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Overhead Fee:</span>
                                    <Number
                                      value={d.fees.source_express_fee.express_gas_overhead_fee}
                                      format="0,0.000000"
                                      suffix={` ${d.fees.source_token?.symbol}`}
                                      noTooltip={true}
                                      className="text-xs font-medium"
                                    />
                                    {d.fees.source_express_fee.express_gas_overhead_fee_usd > 0 && (
                                      <Number
                                        value={d.fees.source_express_fee.express_gas_overhead_fee_usd}
                                        format="0,0.00"
                                        prefix="($"
                                        suffix=")"
                                        noTooltip={true}
                                        className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                      />
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </> :
            <>
              {fees?.base_fee > 0 && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Base Fee</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="flex flex-col gap-y-1">
                      <div className="flex items-center gap-x-2">
                        <Number
                          value={fees.base_fee}
                          format="0,0.000000"
                          suffix={` ${fees.source_token?.symbol}`}
                          noTooltip={true}
                          className="font-medium"
                        />
                        {fees.base_fee_usd > 0 && (
                          <Number
                            value={fees.base_fee_usd}
                            format="0,0.00"
                            prefix="($"
                            suffix=")"
                            noTooltip={true}
                            className="text-zinc-400 dark:text-zinc-500 font-normal"
                          />
                        )}
                      </div>
                      {fees.source_confirm_fee > 0 && (
                        <>
                          <div className="flex items-center gap-x-1 ml-3">
                            <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Confirm Fee:</span>
                            <Number
                              value={fees.source_confirm_fee}
                              format="0,0.000000"
                              suffix={` ${fees.source_token?.symbol}`}
                              noTooltip={true}
                              className="text-xs font-medium"
                            />
                            {fees.source_token?.token_price?.usd > 0 > 0 && (
                              <Number
                                value={fees.source_confirm_fee * fees.source_token.token_price.usd}
                                format="0,0.00"
                                prefix="($"
                                suffix=")"
                                noTooltip={true}
                                className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-x-1 ml-3">
                            <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Approve Fee:</span>
                            <Number
                              value={fees.base_fee - fees.source_confirm_fee}
                              format="0,0.000000"
                              suffix={` ${fees.source_token?.symbol}`}
                              noTooltip={true}
                              className="text-xs font-medium"
                            />
                            {fees.source_token?.token_price?.usd > 0 > 0 && (
                              <Number
                                value={(fees.base_fee - fees.source_confirm_fee) * fees.source_token.token_price.usd}
                                format="0,0.00"
                                prefix="($"
                                suffix=")"
                                noTooltip={true}
                                className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                              />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </dd>
                </div>
              )}
              {express_executed && fees?.express_supported && fees.express_fee > 0 && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Express Fee</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="flex flex-col gap-y-1">
                      <div className="flex items-center gap-x-2">
                        <Number
                          value={fees.express_fee}
                          format="0,0.000000"
                          suffix={` ${fees.source_token?.symbol}`}
                          noTooltip={true}
                          className="font-medium"
                        />
                        {fees.express_fee_usd > 0 && (
                          <Number
                            value={fees.express_fee_usd}
                            format="0,0.00"
                            prefix="($"
                            suffix=")"
                            noTooltip={true}
                            className="text-zinc-400 dark:text-zinc-500 font-normal"
                          />
                        )}
                      </div>
                      {fees.source_express_fee && (
                        <>
                          {isNumber(fees.source_express_fee.relayer_fee) && (
                            <div className="flex items-center gap-x-1 ml-3">
                              <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Relayer Fee:</span>
                              <Number
                                value={fees.source_express_fee.relayer_fee}
                                format="0,0.000000"
                                suffix={` ${fees.source_token?.symbol}`}
                                noTooltip={true}
                                className="text-xs font-medium"
                              />
                              {fees.source_express_fee.relayer_fee_usd > 0 && (
                                <Number
                                  value={fees.source_express_fee.relayer_fee_usd}
                                  format="0,0.00"
                                  prefix="($"
                                  suffix=")"
                                  noTooltip={true}
                                  className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                />
                              )}
                            </div>
                          )}
                          {isNumber(fees.source_express_fee.express_gas_overhead_fee) && (
                            <div className="flex items-center gap-x-1 ml-3">
                              <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">- Overhead Fee:</span>
                              <Number
                                value={fees.source_express_fee.express_gas_overhead_fee}
                                format="0,0.000000"
                                suffix={` ${fees.source_token?.symbol}`}
                                noTooltip={true}
                                className="text-xs font-medium"
                              />
                              {fees.source_express_fee.express_gas_overhead_fee_usd > 0 && (
                                <Number
                                  value={fees.source_express_fee.express_gas_overhead_fee_usd}
                                  format="0,0.00"
                                  prefix="($"
                                  suffix=")"
                                  noTooltip={true}
                                  className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </dd>
                </div>
              )}
            </>
          }
          {((gas_paid && gas?.gas_paid_amount > 0) || gas_paid_to_callback) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Gas Paid</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-2">
                  <Number
                    value={data.originData ? data.originData.gas?.gas_paid_amount : gas_paid ? gas.gas_paid_amount : gas_paid_to_callback * fees?.source_token?.gas_price}
                    format="0,0.000000"
                    suffix={` ${(data.originData?.fees || fees)?.source_token?.symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                  {(data.originData?.fees || fees)?.source_token?.token_price?.usd > 0 && (
                    <Number
                      value={(data.originData ? data.originData.gas?.gas_paid_amount : gas_paid ? gas.gas_paid_amount : gas_paid_to_callback * fees.source_token.gas_price) * (data.originData?.fees || fees).source_token.token_price.usd}
                      format="0,0.00"
                      prefix="($"
                      suffix=")"
                      noTooltip={true}
                      className="text-zinc-400 dark:text-zinc-500 font-normal"
                    />
                  )}
                </div>
              </dd>
            </div>
          )}
          {(!data.originData || data.originData.executed) && executed && isNumber((data.originData?.gas || gas)?.gas_used_amount) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="flex items-center text-zinc-900 dark:text-zinc-100 text-sm font-medium">
                <span className="whitespace-nowrap mr-1">Gas Used</span>
                <Tooltip content="The total gas used to accommodate the cross-chain transaction." className="w-44 text-xs">
                  <PiInfo className="text-zinc-400 dark:text-zinc-500" />
                </Tooltip>
              </dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-2">
                  <Number
                    value={(data.originData?.gas || gas).gas_used_amount}
                    format="0,0.000000"
                    suffix={` ${(data.originData?.fees || fees)?.source_token?.symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                  {(data.originData?.fees || fees)?.source_token?.token_price?.usd > 0 && (
                    <Number
                      value={(data.originData?.gas || gas).gas_used_amount * (data.originData?.fees || fees).source_token.token_price.usd}
                      format="0,0.00"
                      prefix="($"
                      suffix=")"
                      noTooltip={true}
                      className="text-zinc-400 dark:text-zinc-500 font-normal"
                    />
                  )}
                </div>
              </dd>
            </div>
          )}
          {(!data.originData || data.originData.executed) && executed && ((data.originData?.refunded || refunded)?.receipt?.status || ((((!data.originData || data.originData.executed) && executed) || is_executed || error) && timeDiff(((data.originData?.executed || executed).block_timestamp || (data.originData?.error || error)?.block_timestamp || (data.originData?.approved || approved)?.block_timestamp || (data.originData?.confirm || confirm)?.block_timestamp) * 1000) >= 300)) && isNumber((data.originData?.gas || gas)?.gas_paid_amount) && isNumber((data.originData?.gas || gas).gas_remain_amount) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="flex items-center text-zinc-900 dark:text-zinc-100 text-sm font-medium">
                <span className="whitespace-nowrap mr-1">Gas Charged</span>
                <Tooltip content="The total gas charged to users. This amount may be less than the gas used (Gas Used) due to Axelar's gas subsidy policy." className="w-40 text-xs">
                  <PiInfo className="text-zinc-400 dark:text-zinc-500" />
                </Tooltip>
              </dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-2">
                  <Number
                    value={(data.originData?.gas || gas).gas_paid_amount - ((data.originData?.refunded || refunded)?.receipt?.status ? isNumber((data.originData?.refunded || refunded).amount) ? (data.originData?.refunded || refunded).amount : (data.originData?.gas || gas).gas_remain_amount : 0)}
                    format="0,0.000000"
                    suffix={` ${(data.originData?.fees || fees)?.source_token?.symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                  {(data.originData?.fees || fees)?.source_token?.token_price?.usd > 0 && (
                    <Number
                      value={((data.originData?.gas || gas).gas_paid_amount - ((data.originData?.refunded || refunded)?.receipt?.status ? isNumber((data.originData?.refunded || refunded).amount) ? (data.originData?.refunded || refunded).amount : (data.originData?.gas || gas).gas_remain_amount : 0)) * (data.originData?.fees || fees).source_token.token_price.usd}
                      format="0,0.00"
                      prefix="($"
                      suffix=")"
                      noTooltip={true}
                      className="text-zinc-400 dark:text-zinc-500 font-normal"
                    />
                  )}
                </div>
              </dd>
            </div>
          )}
          {!lite && seeMore && (
            <>
              {messageId && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">messageId</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={messageId} childrenClassName="min-w-min">
                      <span className="break-all">{messageId}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {commandId && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">commandId</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={commandId} childrenClassName="min-w-min">
                      <span className="break-all">{commandId}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {sourceChain && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceChain</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={sourceChain}>
                      <span>{sourceChain}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {destinationChain && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationChain</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={destinationChain}>
                      <span>{destinationChain}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {sourceAddress && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceAddress</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={sourceAddress} childrenClassName="min-w-min">
                      <span className="break-all">{sourceAddress}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {destinationContractAddress && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationContractAddress</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={destinationContractAddress} childrenClassName="min-w-min">
                      <span className="break-all">{destinationContractAddress}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {payloadHash && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">payloadHash</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={payloadHash} childrenClassName="min-w-min">
                      <span className="break-all">{payloadHash}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {payload && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">payload</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy size={16} value={payload} childrenClassName="min-w-min !items-start">
                      <span className="text-xs break-all">{payload}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {sourceSymbol && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceSymbol</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={sourceSymbol}>
                      <span>{sourceSymbol}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {destinationSymbol && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationSymbol</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={destinationSymbol}>
                      <span>{destinationSymbol}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {amountInUnits && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">amount</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy value={amountInUnits}>
                      <span>{amountInUnits}</span>
                    </Copy>
                  </dd>
                </div>
              )}
              {executeData && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">executeData</dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <Copy size={16} value={executeData} childrenClassName="min-w-min !items-start">
                      <span className="text-xs break-all">{executeData}</span>
                    </Copy>
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>
      </div>
      {!lite && (
        <div className="px-4 sm:px-6 pb-4">
          <button
            onClick={() => setSeeMore(!seeMore)}
            className="flex items-center text-blue-600 dark:text-blue-500 text-xs font-medium gap-x-1"
          >
            <span>See {seeMore ? 'Less' : 'More'}</span>
            {seeMore ? <RxCaretUp size={14} /> : <RxCaretDown size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}

function Details({ data }) {
  const { chains } = useGlobalStore()

  const { call, gas_paid, approved, refunded, gas_added_transactions, refunded_more_transactions, fees, gas } = { ...data }
  const sourceChain = call?.chain
  const destinationChain = approved?.chain || call?.returnValues?.destinationChain
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)

  const steps = getStep(data, chains)
  return steps.length > 0 && (
    <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-8">
      {(data.originData || data.callbackData) && (
        <div className="flex items-center gap-x-2">
          <ChainProfile
            value={sourceChain}
            width={20}
            height={20}
            titleClassName="text-sm font-semibold"
          />
          <MdKeyboardArrowRight size={20} />
          <ChainProfile
            value={destinationChain}
            width={20}
            height={20}
            titleClassName="text-sm font-semibold"
          />
        </div>
      )}
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
          <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
            <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
              Step
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Tx Hash
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Height
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Address
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Status
            </th>
            <th scope="col" className="px-3 py-3.5 text-left">
              Gas
            </th>
            <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {steps.filter(d => d.status !== 'pending' || d.data?.axelarTransactionHash).map((d, i) => {
            const { logIndex, _logIndex, chain_type, confirmation_txhash, poll_id, axelarTransactionHash, blockNumber, axelarBlockNumber, transaction, receipt, returnValues, error, contract_address, block_timestamp, created_at, proposal_id } = { ...(d.id === 'pay_gas' && isString(d.data) ? data.originData?.gas_paid : d.data) }
            const transactionHash = d.data?.transactionHash || receipt?.transactionHash || receipt?.hash
            const height = d.data?.blockNumber || blockNumber
            const { url, block_path, transaction_path } = { ...d.chainData?.explorer }

            let stepTX
            let stepURL
            const stepMoreInfos = []
            const stepMoreTransactions = []
            if (url && transaction_path) {
              switch (d.id) {
                case 'confirm':
                  if (confirmation_txhash) {
                    stepTX = confirmation_txhash
                    stepURL = `/tx/${confirmation_txhash}`
                  }
                  else if (poll_id) {
                    stepTX = poll_id
                    stepURL = `/evm-poll/${poll_id}`
                  }

                  if (confirmation_txhash && poll_id) {
                    stepMoreInfos.push((
                      <Copy size={16} key={stepMoreInfos.length} value={poll_id}>
                        <Link
                          href={`/evm-poll/${poll_id}`}
                          target="_blank"
                          className="text-blue-600 dark:text-blue-500 text-xs underline"
                        >
                          Poll: {poll_id}
                        </Link>
                      </Copy>
                    ))
                  }
                  break
                default:
                  if (proposal_id) {
                    stepTX = returnValues?.messageId || transactionHash
                    stepURL = `/proposal/${proposal_id}`
                  }
                  else {
                    if (transactionHash) {
                      stepTX = transactionHash
                      stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                    }
                    else if (axelarTransactionHash && axelarChainData?.explorer?.url) {
                      stepTX = axelarTransactionHash
                      stepURL = `${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', axelarTransactionHash)}`
                    }

                    if (transactionHash && axelarTransactionHash && axelarChainData?.explorer?.url) {
                      stepMoreInfos.push((
                        <div key={stepMoreInfos.length} className="flex items-center gap-x-1">
                          <Copy size={16} value={axelarTransactionHash}>
                            <Link
                              href={`${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', axelarTransactionHash)}`}
                              target="_blank"
                              className="text-blue-600 dark:text-blue-500 text-xs underline"
                            >
                              {['send', 'pay_gas'].includes(d.id) ? 'MessageReceived' : 'RouteMessage'}
                            </Link>
                          </Copy>
                          <ExplorerLink
                            value={axelarTransactionHash}
                            chain={axelarChainData.id}
                            width={14}
                            height={14}
                          />
                        </div>
                      ))
                    }

                    if (['send', 'pay_gas', 'approve'].includes(d.id) && chain_type === 'evm') {
                      if (isNumber(logIndex)) {
                        stepMoreInfos.push((
                          <div key={stepMoreInfos.length} className="flex items-center gap-x-1">
                            <span className="text-zinc-700 dark:text-zinc-300 text-xs">LogIndex:</span>
                            <ExplorerLink
                              value={transactionHash}
                              chain={d.chainData.id}
                              hasEventLog={true}
                              title={numberFormat(logIndex, '0,0')}
                              iconOnly={false}
                              width={14}
                              height={14}
                              containerClassName="!gap-x-1.5"
                              nonIconClassName="text-blue-600 dark:text-blue-500 text-xs"
                            />
                          </div>
                        ))
                      }
                      if (d.id === 'send' && isNumber(_logIndex)) {
                        stepMoreInfos.push((
                          <div key={stepMoreInfos.length} className="flex items-center gap-x-1">
                            <span className="text-zinc-700 dark:text-zinc-300 text-xs">EventIndex:</span>
                            <ExplorerLink
                              value={transactionHash}
                              chain={d.chainData.id}
                              hasEventLog={true}
                              title={numberFormat(_logIndex, '0,0')}
                              iconOnly={false}
                              width={14}
                              height={14}
                              containerClassName="!gap-x-1.5"
                              nonIconClassName="text-blue-600 dark:text-blue-500 text-xs"
                            />
                          </div>
                        ))
                      }
                    }

                    if (d.id === 'approve' && returnValues?.commandId) {
                      stepMoreInfos.push((
                        <Copy key={stepMoreInfos.length} size={16} value={returnValues.commandId}>
                          <Link
                            href={`/evm-batches?commandId=${returnValues.commandId}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 text-xs underline"
                          >
                            Command ID
                          </Link>
                        </Copy>
                      ))
                    }

                    if (d.id === 'execute' && d.status === 'failed' && error) {
                      const message = error?.data?.message || error?.message
                      const reason = error?.reason
                      const code = error?.code
                      const body = error?.body?.replaceAll('"""', '')

                      stepMoreInfos.push((
                        <div key={stepMoreInfos.length} className="w-64 flex flex-col gap-y-1">
                          {message && (
                            <div className="whitespace-pre-wrap text-red-600 dark:text-red-500 text-xs font-normal">
                              {ellipse(message, 256)}
                            </div>
                          )}
                          {reason && (
                            <div className="whitespace-pre-wrap text-red-600 dark:text-red-500 text-xs font-medium">
                              Reason: {ellipse(reason, 256)}
                            </div>
                          )}
                          <div className="flex flex-col gap-y-4">
                            {code && (
                              <Link
                                href={isNumber(code) ? 'https://docs.metamask.io/guide/ethereum-provider.html#errors' : `https://docs.ethers.io/v5/api/utils/logger/#errors-${isString(code) ? `-${split(code, { toCase: 'lower', delimiter: '_' }).join('-')}` : 'ethereum'}`}
                                target="_blank"
                                className="w-fit h-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center text-2xs px-2.5 py-1"
                              >
                                {code}
                              </Link>
                            )}
                            {body && (
                              <div className="w-fit bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all text-xs p-2.5">
                                {ellipse(body, 256)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    }

                    if ((d.id === 'pay_gas' && gas_added_transactions) || (d.id === 'refund' && refunded_more_transactions)) {
                      for (const tx of toArray(d.id === 'pay_gas' ? gas_added_transactions : refunded_more_transactions)) {
                        stepMoreTransactions.push((
                          <div key={stepMoreTransactions.length} className="flex items-center gap-x-1">
                            <Copy size={16} value={tx.transactionHash}>
                              <Link
                                href={`${url}${transaction_path.replace('{tx}', tx.transactionHash)}`}
                                target="_blank"
                                className="text-blue-600 dark:text-blue-500 text-xs font-medium"
                              >
                                {ellipse(tx.transactionHash)}
                              </Link>
                            </Copy>
                            <ExplorerLink
                              value={tx.transactionHash}
                              chain={d.chainData?.id}
                              width={14}
                              height={14}
                            />
                          </div>
                        ))
                      }
                    }
                  }
                  break
              }
            }

            const fromAddress = transaction?.from
            let toAddress = contract_address
            switch (d.id) {
              case 'send':
                if (!toAddress && chain_type === 'cosmos') toAddress = returnValues?.sender
                break
              case 'pay_gas':
                if (!toAddress && chain_type === 'cosmos') toAddress = returnValues?.recipient
                break
              case 'execute':
                if (!toAddress && chain_type === 'cosmos') toAddress = returnValues?.destinationContractAddress || returnValues?.receiver
                break
              case 'refund':
                toAddress = gas_paid?.returnValues?.refundAddress || toAddress
                break
              default:
                break
            }

            let gasAmount
            switch (d.id) {
              case 'pay_gas':
                gasAmount = isString(d.data) ? d.data * fees?.source_token?.gas_price : gas?.gas_paid_amount
                break
              case 'express':
                gasAmount = gas?.gas_express_amount
                break
              case 'confirm':
                gasAmount = fees?.source_confirm_fee
                break
              case 'approve':
                gasAmount = gas?.gas_approve_amount - fees?.source_confirm_fee
                break
              case 'execute':
                gasAmount = gas?.gas_execute_amount
                break
              case 'refund':
                gasAmount = refunded?.amount + _.sum(toArray(refunded_more_transactions).map(d => toNumber(d.amount)))
                break
              default:
                break
            }
            const gasElement = isNumber(gasAmount) && (
              <Number
                value={gasAmount}
                format="0,0.000000"
                suffix={` ${fees?.source_token?.symbol}`}
                noTooltip={true}
                className="text-zinc-900 dark:text-zinc-100 font-medium"
              />
            )
            const gasConvertedElement = data.originData?.fees?.source_token?.token_price?.usd > 0 && gasElement && (
              <Number
                value={gasAmount * fees?.source_token?.token_price?.usd / data.originData.fees.source_token.token_price.usd}
                format="0,0.000000"
                suffix={` ${data.originData.fees.source_token.symbol}`}
                noTooltip={true}
                className="text-zinc-400 dark:text-zinc-500 text-xs font-medium"
              />
            )

            return (
              <tr key={i} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{d.title}</span>
                </td>
                <td className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-2">
                    {stepTX && (
                      <div className="flex items-center gap-x-1">
                        <Copy value={stepTX}>
                          {stepURL ?
                            <Link
                              href={stepURL}
                              target="_blank"
                              className="text-blue-600 dark:text-blue-500 font-medium"
                            >
                              {ellipse(stepTX)}
                            </Link> :
                            ellipse(stepTX)
                          }
                        </Copy>
                        {!proposal_id && <ExplorerLink value={stepTX} chain={d.chainData?.id} />}
                      </div>
                    )}
                    {stepMoreInfos.length > 0 && (
                      <div className="flex items-center gap-x-3">
                        {stepMoreInfos}
                      </div>
                    )}
                    {stepMoreTransactions.length > 0 && (
                      <div className="flex flex-col gap-y-1.5">
                        {stepMoreTransactions}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-2">
                    {toNumber(height) > 0 && (url && block_path ?
                      <Link
                        href={`${url}${block_path.replace('{block}', height)}`}
                        target="_blank"
                        className="text-blue-600 dark:text-blue-500 font-medium"
                      >
                        <Number value={height} />
                      </Link> :
                      <Number value={height} />
                    )}
                    {axelarBlockNumber && (axelarChainData?.explorer?.url && axelarChainData.explorer.block_path ?
                      <Link
                        href={`${axelarChainData.explorer.url}${axelarChainData.explorer.block_path.replace('{block}', axelarBlockNumber)}`}
                        target="_blank"
                        className="text-blue-600 dark:text-blue-500 font-medium"
                      >
                        <Number value={axelarBlockNumber} />
                      </Link> :
                      <Number value={axelarBlockNumber} />
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-1.5">
                    {fromAddress && (
                      <div className="flex items-center gap-x-4">
                        <span className="w-8">From:</span>
                        <Profile address={fromAddress} chain={d.chainData?.id} />
                      </div>
                    )}
                    {toAddress && (
                      <div className="flex items-center gap-x-4">
                        <span className="w-8">To:</span>
                        <Profile address={toAddress} chain={d.data?.axelarTransactionHash ? destinationChainData?.id : d.chainData?.id} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  {d.status && (
                    <Tag className={clsx('w-fit capitalize', ['success'].includes(d.status) ? 'bg-green-600 dark:bg-green-500' : ['failed'].includes(d.status) ? 'bg-red-600 dark:bg-red-500' : '')}>
                      {d.status}
                    </Tag>
                  )}
                </td>
                <td className="px-3 py-4 text-left">
                  <div className="flex flex-col gap-y-2">
                    {gasElement}
                    {gasConvertedElement}
                  </div>
                </td>
                <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                  <TimeAgo timestamp={block_timestamp * 1000 || created_at?.ms} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const MIN_GAS_REMAIN_AMOUNT = 0.000001

export function GMP({ tx, lite }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(null)
  const [ended, setEnded] = useState(null)
  const [estimatedTimeSpent, setEstimatedTimeSpent] = useState(null)
  const [executeData, setExecuteData] = useState(null)
  const [estimatedGasUsed, setEstimatedGasUsed] = useState(null)
  const [sdk, setSDK] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [response, setResponse] = useState(null)
  const { chains, assets } = useGlobalStore()
  const { chainId, address, signer } = useEVMWalletStore()
  const cosmosWalletStore = useCosmosWalletStore()

  const getData = useCallback(async () => {
    const { commandId } = { ...getParams(searchParams) }
    if (commandId) {
      const { data } = { ...await searchGMP({ commandId }) }
      const d = await customData(_.head(data))

      if (d?.call?.transactionHash) router.push(`/gmp/${d.call.transactionHash}`)
      else setData({ ...d })
    }
    else if (tx) {
      if (!ended) {
        const { data } = { ...await searchGMP(tx.includes('-') ? { messageId: tx } : { txHash: tx }) }
        const d = await customData(_.head(data))

        if (d) {
          if (['received', 'failed'].includes(d.simplified_status) && (d.executed || d.error) && (d.refunded || d.not_to_refund)) setEnded(true)

          // callback
          if (d.callback?.transactionHash) {
            const { data } = { ...await searchGMP({ txHash: d.callback.transactionHash, txIndex: d.callback.transactionIndex, txLogIndex: d.callback.logIndex }) }
            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.callback.transactionHash))
            d.callbackData = await customData(d.callbackData)
          }
          else if (d.executed?.transactionHash) {
            const { data } = { ...await searchGMP({ txHash: d.executed.transactionHash }) }
            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.executed.transactionHash))
            d.callbackData = await customData(d.callbackData)
          }

          // origin
          if (d.call && (d.gas_paid_to_callback || d.is_call_from_relayer)) {
            const { data } = { ...await searchGMP({ txHash: d.call.transactionHash }) }
            d.originData = toArray(data).find(_d => toArray([_d.express_executed?.transactionHash, _d.executed?.transactionHash]).findIndex(tx => equalsIgnoreCase(tx, d.call.transactionHash)) > -1)
            d.originData = await customData(d.originData)
          }

          if (d.call) {
            // estimated time spent
            if (d.call.chain && !estimatedTimeSpent) {
              const response = await estimateTimeSpent({ sourceChain: d.call.chain, destinationChain: d.call.returnValues?.destinationChain })
              setEstimatedTimeSpent(toArray(response).find(_d => _d.key === d.call.chain))
            }

            // execute data
            if (!executeData && d.approved) {
              try {
                const { addresses } = { ...getAssetData(d.call.returnValues?.symbol, assets) }
                const symbol = d.approved.returnValues?.symbol || addresses?.[d.call.returnValues?.destinationChain?.toLowerCase()]?.symbol || d.call.returnValues?.symbol
                const commandId = d.approved.returnValues?.commandId || d.command_id
                const sourceChain = d.approved.returnValues?.sourceChain || getChainData(d.call.chain, chains)?.chain_name
                const sourceAddress = d.approved.returnValues?.sourceAddress || d.call.returnValues?.sender
                const contractAddress = d.approved.returnValues?.contractAddress || d.call.returnValues?.destinationContractAddress
                const payload = d.call.returnValues?.payload
                const amount = toBigNumber(d.approved.returnValues?.amount || d.call.returnValues?.amount)

                const contract = new Contract(contractAddress, IAxelarExecutable.abi, getProvider(d.call.returnValues?.destinationChain, chains))
                const { data } = { ...(symbol ? await contract/*.executeWithToken*/.populateTransaction.executeWithToken(commandId, sourceChain, sourceAddress, payload, symbol, amount) : await contract/*.execute*/.populateTransaction.execute(commandId, sourceChain, sourceAddress, payload)) }
                setExecuteData(data)
              } catch (error) {}
            }

            // find estimated gas used from latest call
            if (!estimatedGasUsed && d.is_insufficient_fee && !d.confirm && !d.approved && d.call.returnValues?.destinationChain && d.call.returnValues.destinationContractAddress) {
              const { destinationChain, destinationContractAddress } = { ...d.call.returnValues }
              const { data } = { ...await searchGMP({ destinationChain, destinationContractAddress, status: 'executed', size: 1 }) }
              const { express_executed, executed } = { ..._.head(data) }
              const { gasUsed } = { ...(express_executed || executed)?.receipt }
              setEstimatedGasUsed(gasUsed ? toNumber(gasUsed) : {
                ethereum: 400000,
                binance: 150000,
                polygon: 400000,
                'polygon-sepolia': 400000,
                avalanche: 500000,
                fantom: 400000,
                arbitrum: 1000000,
                'arbitrum-sepolia': 1000000,
                optimism: 400000,
                'optimism-sepolia': 400000,
                base: 400000,
                'base-sepolia': 400000,
                mantle: 3000000000,
                'mantle-sepolia': 3000000000,
                celo: 400000,
                kava: 400000,
                filecoin: 200000000,
                'filecoin-2': 200000000,
                linea: 400000,
                'linea-sepolia': 400000,
                centrifuge: 1000000,
                'centrifuge-2': 1000000,
                scroll: 500000,
                fraxtal: 400000,
              }[destinationChain?.toLowerCase()] || 700000)
            }
          }

          console.log('[data]', d)
          setData(d)
          return d
        }
      }
    }
    return
  }, [tx, router, searchParams, chains, assets, ended, estimatedTimeSpent, executeData])

  useEffect(() => {
    getData()
    const interval = !ended && setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tx, searchParams, ended, setData, setEnded, getData])

  useEffect(() => {
    try {
      setSDK(new AxelarGMPRecoveryAPI({ environment: ENVIRONMENT, axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL, axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL }))
    } catch (error) {
      setSDK(undefined)
    }
  }, [])

  useEffect(() => {
    const { status, message, hash, chain } = { ...response }
    const chainData = getChainData(chain, chains)

    toast.remove()
    if (message) {
      if (hash && chainData?.explorer) {
        let icon
        switch (status) {
          case 'success':
            icon = <PiCheckCircleFill size={20} className="text-green-600" />
            break
          case 'failed':
            icon = <PiXCircleFill size={20} className="text-red-600" />
            break
          default:
            break
        }

        toast.custom((
          <div className="bg-white rounded-lg shadow-lg flex flex-col gap-y-1 sm:gap-y-0 px-3 py-2.5">
            <div className="flex items-center gap-x-1.5 sm:gap-x-2">
              {icon}
              <span className="text-zinc-700">{message}</span>
            </div>
            <div className="flex items-center justify-between gap-x-4 ml-6 sm:ml-7 pl-0.5 sm:pl-0">
              <ExplorerLink
                value={hash}
                chain={chain}
                iconOnly={false}
                nonIconClassName="text-zinc-700 text-xs sm:text-sm"
              />
              <button onClick={() => setResponse(null)} className="underline text-zinc-400 text-xs sm:text-sm font-light">
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 60000 })
      }
      else {
        const duration = 10000
        switch (status) {
          case 'pending':
            toast.loading(message)
            break
          case 'success':
            toast.success(message, { duration })
            break
          case 'failed':
            toast.error(message, { duration })
            break
          default:
            break
        }
      }
    }
  }, [response, chains])

  const addGas = async data => {
    if (data?.call && sdk && (data.call.chain_type === 'cosmos' ? cosmosWalletStore?.signer : signer)) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Adding gas...' })
      try {
        const { chain, chain_type, destination_chain_type, transactionHash, logIndex } = { ...data.call }
        const { destinationChain, messageId } = { ...data.call.returnValues }

        const token = 'autocalculate'
        const sendOptions = chain_type === 'cosmos' && {
          environment: ENVIRONMENT,
          offlineSigner: cosmosWalletStore.signer,
          txFee: { gas: '250000', amount: [{ denom: getChainData(chain, chains)?.native_token?.denom, amount: '30000' }] },
        }

        console.log('[addGas request]', { chain, destinationChain, transactionHash, logIndex, messageId, estimatedGasUsed, refundAddress: address, token, sendOptions })
        const response = chain_type === 'cosmos' ? await sdk.addGasToCosmosChain({ txHash: transactionHash, messageId, gasLimit: estimatedGasUsed, chain, token, sendOptions }) : await sdk.addNativeGas(chain, transactionHash, estimatedGasUsed, { evmWalletDetails: { useWindowEthereum: true, signer }, destChain: destinationChain, logIndex, refundAddress: address })
        console.log('[addGas response]', response)

        const { success, error, transaction, broadcastResult } = { ...response }
        if (success) await sleep(1 * 1000)
        setResponse({
          status: success ? 'success' : 'failed',
          message: error?.message || error || 'Pay gas successful',
          hash: (chain_type === 'cosmos' ? broadcastResult : transaction)?.transactionHash,
          chain,
        })

        const _data = success && await getData()
        if (_data && success && !broadcastResult?.code && (destination_chain_type === 'cosmos' ? !data.executed && !_data.executed : !data.approved && !_data.approved)) await approve(_data, true)
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const approve = async (data, afterPayGas = false) => {
    if (data?.call && sdk) {
      setProcessing(true)
      if (!afterPayGas) setResponse({ status: 'pending', message: !data.confirm ? 'Confirming...' : data.call.destination_chain_type === 'cosmos' ? 'Executing...' : 'Approving...' })
      try {
        const { destination_chain_type, transactionHash, logIndex, _logIndex } = { ...data.call }
        let { messageId } = { ...data.call.returnValues }
        const eventIndex = _logIndex
        messageId = messageId || (transactionHash && isNumber(_logIndex) ? `${transactionHash}-${_logIndex}` : undefined)

        const escapeAfterConfirm = false

        console.log('[manualRelayToDestChain request]', { transactionHash, logIndex, eventIndex, escapeAfterConfirm, messageId })
        const response = await sdk.manualRelayToDestChain(transactionHash, logIndex, eventIndex, { useWindowEthereum: true, signer }, escapeAfterConfirm, messageId)
        console.log('[manualRelayToDestChain response]', response)

        const { success, error, confirmTx, signCommandTx, routeMessageTx } = { ...response }
        if (success) await sleep(15 * 1000)
        if (success || !afterPayGas) {
          setResponse({
            status: success || !error ? 'success' : 'failed',
            message: error?.message || error || `${destination_chain_type === 'cosmos' ? 'Execute' : 'Approve'} successful`,
            hash: routeMessageTx?.transactionHash || signCommandTx?.transactionHash || confirmTx?.transactionHash,
            chain: 'axelarnet',
          })
        }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const execute = async data => {
    if (data?.approved && sdk && signer) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Executing...' })
      try {
        const { transactionHash, logIndex } = { ...data.call }
        const gasLimitBuffer = '200000'

        console.log('[execute request]', { transactionHash, logIndex, gasLimitBuffer })
        const response = await sdk.execute(transactionHash, logIndex, { useWindowEthereum: true, signer, gasLimitBuffer })
        console.log('[execute response]', response)

        const { success, error, transaction } = { ...response }
        setResponse({
          status: success && transaction ? 'success' : 'failed',
          message: error?.message || error || (transaction ? 'Execute successful' : 'Error Execution. Please see the error on console.'),
          hash: transaction?.transactionHash,
          chain: data.approved.chain,
        })

        if (success && transaction) getData()
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const needSwitchChain = (id, type) => id !== (type === 'cosmos' ? cosmosWalletStore?.chainId : chainId)

  const { call, gas_paid, gas_paid_to_callback, confirm, confirm_failed, confirm_failed_event, approved, executed, error, gas, is_executed, is_insufficient_fee, is_call_from_relayer, is_invalid_destination_chain, is_invalid_call, not_enough_gas_to_execute } = { ...data }
  const { proposal_id } = { ...call }
  const sourceChainData = getChainData(call?.chain, chains)
  const destinationChainData = getChainData(call?.returnValues?.destinationChain, chains)

  const addGasButton = call && !executed && !is_executed && !approved && (call.chain_type !== 'cosmos' || timeDiff(call.block_timestamp * 1000) >= 60) && (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee || not_enough_gas_to_execute || gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT) && (
    <div key="addGas" className="flex items-center gap-x-1">
      {(call.chain_type === 'cosmos' ? cosmosWalletStore?.signer : signer) && !needSwitchChain(sourceChainData?.chain_id, call.chain_type) && (
        <button
          disabled={processing}
          onClick={() => addGas(data)}
          className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
        >
          {gas_paid ? 'Add' : 'Pay'}{processing ? 'ing' : ''} gas{processing ? '...' : ''}
        </button>
      )}
      {call.chain_type === 'cosmos' ? <CosmosWallet connectChainId={sourceChainData?.chain_id} /> : <EVMWallet connectChainId={sourceChainData?.chain_id} />}
    </div>
  )

  const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : 600
  const approveButton = call && !(call.destination_chain_type === 'cosmos' ? confirm && (sourceChainData?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id) : approved) && (!executed || (error && executed.axelarTransactionHash && !executed.transactionHash)) && !is_executed && (confirm || confirm_failed || timeDiff(call.block_timestamp * 1000) >= finalityTime) && timeDiff((confirm || call).block_timestamp * 1000) >= 60 && !(is_invalid_destination_chain || is_invalid_call || is_insufficient_fee || (!gas?.gas_remain_amount && !gas_paid_to_callback && !is_call_from_relayer && !proposal_id)) && (
    <div key="approve" className="flex items-center gap-x-1">
      <button
        disabled={processing}
        onClick={() => approve(data)}
        className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
      >
        {!confirm ? 'Confirm' : 'Approv'}{processing ? 'ing...' : !confirm ? '' : 'e'}
      </button>
    </div>
  )

  const executeButton = call && (call.destination_chain_type === 'cosmos' ? confirm : approved) && !executed?.transactionHash && !is_executed && (error || timeDiff(((call.destination_chain_type === 'cosmos' ? confirm?.block_timestamp : approved.block_timestamp) || call.block_timestamp) * 1000) >= (call.destination_chain_type === 'cosmos' ? 300 : 120)) && call.returnValues?.payload && (
    <div key="execute" className="flex items-center gap-x-1">
      {(call.destination_chain_type === 'cosmos' || (signer && !needSwitchChain(destinationChainData?.chain_id, call.destination_chain_type))) && (
        <button
          disabled={processing}
          onClick={() => call.destination_chain_type === 'cosmos' ? approve(data) : execute(data)}
          className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
        >
          Execut{processing ? 'ing...' : 'e'}
        </button>
      )}
      {call.destination_chain_type === 'evm' && <EVMWallet connectChainId={destinationChainData?.chain_id} />}
    </div>
  )

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div className="max-w-7xl flex flex-col gap-y-4">
          <Toaster />
          <Info
            data={data}
            estimatedTimeSpent={estimatedTimeSpent}
            executeData={executeData}
            buttons={Object.fromEntries(Object.entries({
              pay_gas: addGasButton,
              [!confirm ? 'confirm' : 'approve']: approveButton,
              execute: executeButton,
            }).filter(([k, v]) => v))}
            tx={tx}
            lite={lite}
          />
          {!lite && (
            <>
              {data.originData && <Details data={{ ...data.originData, callbackData: Object.fromEntries(Object.entries(data).filter(([k, v]) => !['originData', 'callbackData'].includes(k))) }} />}
              <Details data={data} />
              {data.callbackData && <Details data={{ ...data.callbackData, originData: Object.fromEntries(Object.entries(data).filter(([k, v]) => !['originData', 'callbackData'].includes(k))) }} />}
            </>
          )}
        </div>
      }
    </Container>
  )
}
