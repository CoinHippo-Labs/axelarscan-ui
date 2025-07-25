'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { useSignAndExecuteTransaction as useSuiSignAndExecuteTransaction } from '@mysten/dapp-kit'
import * as StellarSDK from '@stellar/stellar-sdk'
import { useSignAndSubmitTransaction as useXRPLSignAndSubmitTransaction } from '@xrpl-wallet-standard/react'
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
import { Response } from '@/components/Response'
import { Tag } from '@/components/Tag'
import { Number } from '@/components/Number'
import { Profile, ChainProfile, AssetProfile } from '@/components/Profile'
import { TimeAgo, TimeSpent, TimeUntil } from '@/components/Time'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useEVMWalletStore, EVMWallet, useCosmosWalletStore, CosmosWallet, useSuiWalletStore, SuiWallet, useStellarWalletStore, StellarWallet, useXRPLWalletStore, XRPLWallet } from '@/components/Wallet'
import { getEvent, customData, checkNeedMoreGasFromError } from '@/components/GMPs'
import { useGlobalStore } from '@/components/Global'
import { estimateITSFee, searchGMP, estimateTimeSpent } from '@/lib/api/gmp'
import { isAxelar } from '@/lib/chain'
import { getProvider } from '@/lib/chain/evm'
import { ENVIRONMENT, getChainData, getAssetData } from '@/lib/config'
import { toCase, split, toArray, parseError } from '@/lib/parser'
import { sleep, getParams } from '@/lib/operator'
import { isString, equalsIgnoreCase, headString, find, ellipse, toTitle } from '@/lib/string'
import { isNumber, toNumber, toBigNumber, formatUnits, parseUnits, numberFormat } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import IAxelarExecutable from '@/data/interfaces/gmp/IAxelarExecutable.json'

export function getStep(data, chains) {
  const { call, gas_paid, gas_paid_to_callback, express_executed, confirm, confirm_failed, confirm_failed_event, approved, executed, error, refunded, is_executed, is_invalid_call, originData } = { ...data }

  const sourceChain = call?.chain
  const destinationChain = call?.returnValues?.destinationChain

  const sourceChainData = getChainData(sourceChain, chains)
  const destinationChainData = getChainData(destinationChain, chains)
  const axelarChainData = getChainData('axelarnet', chains)
  const callbackGasChainData = getChainData(originData?.call?.chain, chains) || destinationChainData

  const errored = error && timeDiff((error?.block_timestamp || approved?.block_timestamp || confirm?.block_timestamp) * 1000) > 120

  return toArray([
    {
      id: 'send',
      title: call ? 'Sent' : 'Send',
      status: call ? 'success' : 'pending',
      data: call,
      chainData: sourceChainData,
    },
    (!call?.proposal_id || (gas_paid || gas_paid_to_callback)) && {
      id: 'pay_gas',
      title: gas_paid || gas_paid_to_callback ? 'Gas Paid' : timeDiff(call?.block_timestamp * 1000) < 30 ? 'Checking Gas Paid' : 'Pay Gas',
      status: gas_paid || gas_paid_to_callback ? 'success' : 'pending',
      data: gas_paid || gas_paid_to_callback,
      chainData: !gas_paid && gas_paid_to_callback ? callbackGasChainData : sourceChainData,
    },
    express_executed && {
      id: 'express',
      title: 'Express Executed',
      status: 'success',
      data: express_executed,
      chainData: destinationChainData,
    },
    !isAxelar(sourceChain) && (confirm || !approved || !(executed || is_executed || error)) && {
      id: 'confirm',
      title: (confirm && (call?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id)) || approved || executed || is_executed || error ? 'Confirmed' : is_invalid_call ? 'Invalid Call' : confirm_failed ? 'Failed to Confirm' : gas_paid || gas_paid_to_callback || express_executed ? 'Waiting for Finality' : 'Confirm',
      status: (confirm && (call?.chain_type === 'cosmos' || confirm.poll_id !== confirm_failed_event?.poll_id)) || approved || executed || is_executed || error ? 'success' : is_invalid_call || confirm_failed ? 'failed' : 'pending',
      data: confirm || confirm_failed_event,
      chainData: axelarChainData,
    },
    (['evm', 'vm'].includes(call?.destination_chain_type) || (['evm', 'vm'].includes(call?.chain_type) && isAxelar(destinationChain))) && (approved || (!executed && !error)) && {
      id: 'approve',
      title: approved ? 'Approved' : confirm && (['cosmos', 'vm'].includes(call?.chain_type) || confirm.poll_id !== confirm_failed_event?.poll_id) ? 'Approving' : 'Approve',
      status: approved ? 'success' : 'pending',
      data: approved,
      chainData: destinationChainData,
    },
    {
      id: 'execute',
      title: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'Executed' : errored ? 'Error' : executed?.axelarTransactionHash && timeDiff((confirm?.block_timestamp || call?.block_timestamp) * 1000) >= 60 ? 'Waiting for IBC' : 'Execute',
      status: (executed && (!executed.axelarTransactionHash || (executed.transactionHash && !error))) || is_executed ? 'success' : errored ? 'failed' : 'pending',
      data: executed || is_executed || error,
      chainData: executed?.axelarTransactionHash && !executed.transactionHash ? axelarChainData : destinationChainData,
    },
    refunded?.receipt?.status && {
      id: 'refund',
      title: 'Excess Gas Refunded',
      status: 'success',
      data: refunded,
      chainData: sourceChainData,
    },
  ])
}

function ContractCallData({ data, executeData, isMultihop }) {
  const { chains, assets } = useGlobalStore()

  if (!data) return

  const { call, approved, time_spent, status } = { ...data }

  const sourceChain = approved?.returnValues?.sourceChain || (isAxelar(call?.chain) ? call.chain : getChainData(call?.chain, chains)?.chain_name || call?.chain)
  const destinationChain = call?.returnValues?.destinationChain || getChainData(approved?.chain, chains)?.chain_name || approved?.chain
  const symbol = call?.returnValues?.symbol || data.interchain_transfer?.symbol || data.token_manager_deployment_started?.symbol || data.interchain_token_deployment_started?.tokenSymbol || data.link_token_started?.symbol || data.token_metadata_registered?.symbol
  const { addresses } = { ...getAssetData(symbol, assets) }

  const messageId = data.message_id
  const commandId = approved?.returnValues?.commandId || data.command_id
  const sourceAddress = call?.returnValues?.sender
  const destinationContractAddress = approved?.returnValues?.contractAddress || call?.returnValues?.destinationContractAddress
  const payloadHash = call?.returnValues?.payloadHash
  const payload = call?.returnValues?.payload
  const sourceSymbol = call?.returnValues?.symbol
  const destinationSymbol = approved?.returnValues?.symbol || addresses?.[toCase(destinationChain, 'lower')]?.symbol || sourceSymbol
  const amountInUnits = approved?.returnValues?.amount || call?.returnValues?.amount

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800">
      <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-4 sm:px-6 py-6 grid gap-2">
          <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6">
            <div className="flex items-center gap-x-2">
              <ChainProfile
                value={sourceChain}
                width={20}
                height={20}
                className="h-5"
                titleClassName="text-sm font-semibold"
              />
              <MdKeyboardArrowRight size={20} />
              <ChainProfile
                value={destinationChain}
                width={20}
                height={20}
                className="h-5"
                titleClassName="text-sm font-semibold"
              />
            </div>
          </dd>
        </div>
        {isMultihop && (
          <>
            <div className="px-4 sm:px-6 py-6 grid gap-2">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Status</dt>
              <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
                <Tag className={clsx('w-fit capitalize', data.simplified_status === 'received' ? 'bg-green-600 dark:bg-green-500' : data.simplified_status === 'approved' ? 'bg-orange-500 dark:bg-orange-600' : data.simplified_status === 'failed' ? 'bg-red-600 dark:bg-red-500' : 'bg-yellow-400 dark:bg-yellow-500')}>
                  {data.simplified_status === 'received' && (getEvent(data) === 'ContractCall' || (getEvent(data) === 'InterchainTransfer' && isAxelar(call.returnValues?.destinationChain))) ? 'Executed' : data.simplified_status}
                </Tag>
              </dd>
            </div>
            {((time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(status)) || (time_spent?.total > 0 && status === 'executed')) && (
              <div className="px-4 sm:px-6 py-6 grid gap-2">
                <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
                <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
                  <div className="flex flex-col gap-y-2">
                    {time_spent.call_express_executed > 0 && ['express_executed', 'executed'].includes(status) && (
                      <div className="flex items-center text-green-600 dark:text-green-500 gap-x-1">
                        <RiTimerFlashLine size={20} />
                        <TimeSpent fromTimestamp={0} toTimestamp={time_spent.call_express_executed * 1000} />
                      </div>
                    )}
                    {time_spent.total > 0 && status === 'executed' && (
                      <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                        <MdOutlineTimer size={20} />
                        <TimeSpent fromTimestamp={0} toTimestamp={time_spent.total * 1000} />
                      </div>
                    )}
                  </div>
                </dd>
              </div>
            )}
          </>
        )}
        {messageId && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">messageId</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={messageId} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {messageId}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {commandId && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">commandId</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={commandId} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {commandId}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {sourceChain && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceChain</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={sourceChain} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs">
                  {sourceChain}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {destinationChain && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationChain</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={destinationChain} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs">
                  {destinationChain}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {sourceAddress && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceAddress</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={sourceAddress} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {sourceAddress}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {destinationContractAddress && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationContractAddress</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={destinationContractAddress} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {destinationContractAddress}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {payloadHash && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">payloadHash</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={payloadHash} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {payloadHash}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {payload && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">payload</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={payload} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {payload}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {sourceSymbol && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">sourceSymbol</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={sourceSymbol} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs">
                  {sourceSymbol}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {destinationSymbol && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">destinationSymbol</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={destinationSymbol} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs">
                  {destinationSymbol}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {amountInUnits && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">amount</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={amountInUnits} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs">
                  {amountInUnits}
                </span>
              </Copy>
            </dd>
          </div>
        )}
        {executeData && (
          <div className="px-4 sm:px-6 py-6 grid gap-2">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">executeData</dt>
            <dd className="text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1">
              <Copy size={16} value={executeData} childrenClassName="min-w-min !items-start" className="!min-w-4">
                <span className="text-xs break-all">
                  {executeData}
                </span>
              </Copy>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function Info({ data, estimatedTimeSpent, executeData, buttons, tx, lite }) {
  const [seeMore, setSeeMore] = useState(false)
  const { chains, assets } = useGlobalStore()

  const { call, gas_paid, gas_paid_to_callback, express_executed, confirm, approved, executed, error, interchain_transfer, settlement_forwarded_events, settlement_filled_events, fees, gas, status, time_spent } = { ...data }

  const messageId = data.message_id
  const txhash = call?.transactionHash || tx

  const sourceChain = approved?.returnValues?.sourceChain || getChainData(call?.chain, chains)?.chain_name || call?.chain
  const destinationChain = call?.returnValues?.destinationChain || getChainData(approved?.chain, chains)?.chain_name || approved?.chain

  const senderAddress = call?.transaction?.from
  const sourceAddress = call?.returnValues?.sender
  const contractAddress = approved?.returnValues?.contractAddress || call?.returnValues?.destinationContractAddress

  const sourceChainData = getChainData(sourceChain, chains)
  const { url, transaction_path } = { ...sourceChainData?.explorer }

  let symbol = call?.returnValues?.symbol || interchain_transfer?.symbol || data.token_manager_deployment_started?.symbol || data.interchain_token_deployment_started?.tokenSymbol || data.link_token_started?.symbol || data.token_metadata_registered?.symbol

  if (!symbol && data.originData) {
    symbol = data.originData.call?.returnValues?.symbol || data.originData.interchain_transfer?.symbol || data.originData.token_manager_deployment_started?.symbol || data.originData.interchain_token_deployment_started?.tokenSymbol || data.originData.link_token_started?.symbol || data.originData.token_metadata_registered?.symbol
  }

  const isMultihop = !!(data.originData || data.callbackData)

  const gasData = data.originData?.gas || gas
  const refundedData = data.originData?.refunded || data.refunded
  const refundedMoreData = toArray(data.originData?.refunded_more_transactions || data.refunded_more_transactions)
  const executedGMPsData = toArray([data.originData, data, data.callbackData]).filter(d => (d.time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(d.status)) || (d.time_spent?.total > 0 && d.status === 'executed'))

  return (
    <div className="overflow-hidden bg-zinc-50/75 dark:bg-zinc-800/25 shadow sm:rounded-lg">
      <div className="px-4 sm:px-6 py-6">
        <h3 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-7">
          General Message Passing
        </h3>
        <div className="max-w-2xl text-zinc-400 dark:text-zinc-500 text-sm leading-6 mt-1">
          {txhash && (
            <div className="flex items-center gap-x-1">
              <Copy value={messageId || txhash}>
                {url && (call?.proposal_id || call?.transactionHash) ?
                  <Link
                    href={call?.proposal_id ? `/proposal/${call.proposal_id}` : `${url}${transaction_path?.replace('{tx}', txhash)}`}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500 font-semibold"
                  >
                    {ellipse(messageId || txhash, 12)}
                  </Link> :
                  ellipse(messageId || txhash, 12)
                }
              </Copy>
              {!call?.proposal_id && call?.transactionHash && (
                <ExplorerLink
                  value={txhash}
                  chain={sourceChain}
                  hasEventLog={call.chain_type === 'evm' && isNumber(call.logIndex)}
                />
              )}
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
                {getEvent(data)}
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
                            className="h-5"
                            titleClassName="text-sm font-semibold"
                          />
                          <MdKeyboardArrowRight size={20} />
                          <ChainProfile
                            value={destinationChain}
                            width={20}
                            height={20}
                            className="h-5"
                            titleClassName="text-sm font-semibold"
                          />
                        </div>
                      )}
                      <nav aria-label="Progress" className={clsx('overflow-x-auto', (isAxelar(sourceChain) && toArray(d.executed?.childMessageIDs).length > 0) || (isAxelar(destinationChain) && d.call.parentMessageID) ? 'h-24' : 'h-20')}>
                        <ol role="list" className="flex items-center">
                          {steps.map((d, i) => {
                            const { transactionHash, blockNumber, confirmation_txhash, contract_address, poll_id, axelarTransactionHash, proposal_id, parentMessageID, childMessageIDs } = { ...d.data }
                            const { url, block_path, transaction_path } = { ...d.chainData?.explorer }

                            let stepURL

                            if (url && transaction_path) {
                              switch (d.id) {
                                case 'pay_gas':
                                  if (transactionHash || data.originData?.call?.transactionHash) {
                                    stepURL = `${url}${transaction_path.replace('{tx}', transactionHash || data.originData?.call?.transactionHash)}`
                                  }
                                  break
                                case 'confirm':
                                  if (confirmation_txhash) {
                                    stepURL = `/tx/${confirmation_txhash}`
                                  }
                                  else if (contract_address && poll_id) {
                                    stepURL = `/amplifier-poll/${contract_address}_${poll_id}`
                                  }
                                  else if (poll_id) {
                                    stepURL = `/evm-poll/${poll_id}`
                                  }
                                  else if (d.title === 'Waiting for Finality') {
                                    const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : 600

                                    if (timeDiff(call?.block_timestamp * 1000) >= finalityTime) {
                                      d.title = 'Confirm'
                                    }
                                  }
                                  break
                                case 'executed':
                                  if (transactionHash || axelarTransactionHash) {
                                    if (block_path && isNumber(transactionHash) && isNumber(blockNumber) && toNumber(transactionHash) === toNumber(blockNumber)) {
                                      stepURL = `${url}${block_path.replace('{block}', transactionHash)}`
                                    }
                                    else {
                                      stepURL = `${url}${transaction_path.replace('{tx}', transactionHash || axelarTransactionHash)}`
                                    }
                                  }
                                  break
                                default:
                                  if (proposal_id) {
                                    stepURL = `/proposal/${proposal_id}`
                                  }
                                  else if (transactionHash) {
                                    if (block_path && isNumber(transactionHash) && isNumber(blockNumber) && toNumber(transactionHash) === toNumber(blockNumber)) {
                                      stepURL = `${url}${block_path.replace('{block}', transactionHash)}`
                                    }
                                    else {
                                      stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                                    }
                                  }
                                  break
                              }
                            }

                            const element = (
                              <>
                                <div className={clsx('relative w-8 h-8 rounded-full flex items-center justify-center', d.status === 'failed' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400')}>
                                  {d.status === 'failed' ? <MdClose className="w-5 h-5 text-white" /> : <MdCheck className="w-5 h-5 text-white" />}
                                </div>
                                <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-1', d.status === 'failed' ? 'text-red-600 dark:text-red-500' : 'text-blue-600 dark:text-blue-500', d.title?.length <= 5 ? 'ml-1' : '')}>
                                  {d.title}
                                </span>
                                {d.id === 'express' && (
                                  <div className="absolute mt-3">
                                    <span className="text-green-600 dark:text-green-500 text-2xs font-medium">
                                      Received
                                    </span>
                                  </div>
                                )}
                                {!isAxelar(sourceChain) && parentMessageID && (
                                  <div className="absolute mt-6">
                                    <Link
                                      href={`/gmp/${parentMessageID}`}
                                      target="_blank"
                                      className="border border-blue-600 dark:border-blue-500 rounded-md text-blue-600 dark:text-blue-500 text-base font-semibold whitespace-nowrap py-1.5 px-2"
                                    >
                                      ← prev Hop
                                    </Link>
                                  </div>
                                )}
                                {!isAxelar(destinationChain) && toArray(childMessageIDs).map(id => (
                                  <div key={id} className="absolute mt-6">
                                    <Link
                                      href={`/gmp/${id}`}
                                      target="_blank"
                                      className="border border-blue-600 dark:border-blue-500 rounded-md text-blue-600 dark:text-blue-500 text-base font-semibold whitespace-nowrap py-1.5 px-2"
                                    >
                                      next Hop →
                                    </Link>
                                  </div>
                                ))}
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
                                      {steps[i - 1]?.status !== 'pending' && (
                                        <PiClock className={clsx('w-5 h-5', steps[i - 1]?.status === 'pending' ? 'text-zinc-200 dark:text-zinc-700' : 'text-blue-600 dark:text-blue-500')} />
                                      )}
                                      <span className={clsx('absolute text-2xs font-medium whitespace-nowrap mt-12 pt-1', steps[i - 1]?.status !== 'pending' ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-400 dark:text-zinc-500', d.title?.length <= 5 ? 'ml-1' : '')}>
                                        {d.title}
                                      </span>
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
                      {d.is_insufficient_fee && !(d.confirm || d.approved) && ((!isAxelar(d.call.chain) && !isAxelar(d.call.returnValues?.destinationChain)) || timeDiff(d.call.created_at?.ms) > 120) && (
                        <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                          <PiWarningCircle size={16} />
                          <span className="text-xs">
                            Insufficient Fee
                          </span>
                        </div>
                      )}
                      {d.is_invalid_gas_paid && !(d.confirm || d.approved) && (
                        <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                          <PiWarningCircle size={16} />
                          <span className="text-xs">
                            Invalid Gas Paid (source address mismatch)
                          </span>
                        </div>
                      )}
                      {d.not_enough_gas_to_execute && !d.executed && !d.is_executed && (
                        <div className="flex items-center text-red-600 dark:text-red-500 gap-x-1">
                          <PiWarningCircle size={16} />
                          <span className="text-xs">
                            Insufficient Gas
                          </span>
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
                      <span className="font-semibold capitalize">
                        {toTitle(k)}:
                      </span>
                      <div className="col-span-2 flex items-center">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Path</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex items-center gap-x-3">
                {isMultihop ?
                  <>
                    <ChainProfile value={data.originData?.call?.chain || sourceChain} titleClassName="text-base font-semibold" />
                    <MdKeyboardArrowRight size={24} />
                    <ChainProfile value={data.originData?.call?.returnValues?.destinationChain || destinationChain} titleClassName="text-base font-semibold" />
                    <MdKeyboardArrowRight size={24} />
                    {data.originData?.call && data.callbackData?.call && (
                      <>
                        <ChainProfile value={data.callbackData.call.chain} titleClassName="text-base font-semibold" />
                        <MdKeyboardArrowRight size={24} />
                      </>
                    )}
                    <ChainProfile value={data.callbackData?.call?.returnValues?.destinationChain || destinationChain} titleClassName="text-base font-semibold" />
                  </> :
                  <>
                    <ChainProfile value={sourceChain} />
                    <MdKeyboardArrowRight size={24} />
                    <div className="flex flex-col gap-y-2">
                      <ChainProfile value={destinationChain} />
                      {data.is_invalid_destination_chain && (
                        <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                          <PiWarningCircle size={20} />
                          <span>Invalid Chain</span>
                        </div>
                      )}
                    </div>
                  </>
                }
              </div>
            </dd>
          </div>
          {((settlement_forwarded_events && executed) || (settlement_filled_events && data.settlementForwardedData)) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Settlement Status</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-4 sm:mt-1.5">
                <div className="overflow-x-auto flex flex-col sm:grid sm:grid-cols-4 gap-y-6 sm:gap-y-0 sm:gap-x-4">
                  <div className="flex justify-between gap-x-4">
                    <div className="flex flex-col gap-y-2 sm:gap-y-4">
                      <span className="text-blue-600 dark:text-blue-500 text-2xs font-medium whitespace-nowrap">
                        Settlement Forwarded
                      </span>
                      <div className="flex flex-col gap-y-3">
                        {settlement_forwarded_events ?
                          <ExplorerLink
                            value={txhash}
                            chain={sourceChain}
                            title={ellipse(txhash, 6, '0x')}
                            iconOnly={false}
                          /> :
                          toArray(data.settlementForwardedData).map((d, i) => (
                            <ExplorerLink
                              key={i}
                              value={d.call.transactionHash}
                              chain="axelarnet"
                              customURL={`/gmp/${d.message_id}`}
                              title={ellipse(d.call.transactionHash, 6, '0x')}
                              iconOnly={false}
                            />
                          ))
                        }
                      </div>
                    </div>
                    <MdKeyboardArrowRight size={14} />
                  </div>
                  <div className="flex justify-between gap-x-4">
                    <div className="flex flex-col gap-y-2 sm:gap-y-4">
                      <span className="text-blue-600 dark:text-blue-500 text-2xs font-medium whitespace-nowrap">
                        Settlement Processed
                      </span>
                      <div className="flex flex-col gap-y-3">
                        {settlement_forwarded_events ?
                          <ExplorerLink
                            value={executed.transactionHash}
                            chain={destinationChain}
                            title={ellipse(executed.transactionHash, 6, '0x')}
                            iconOnly={false}
                          /> :
                          toArray(data.settlementForwardedData).filter(d => d.executed).map((d, i) => (
                            <ExplorerLink
                              key={i}
                              value={d.executed.transactionHash}
                              chain={d.executed.chain}
                              title={ellipse(d.executed.transactionHash, 6, '0x')}
                              iconOnly={false}
                            />
                          ))
                        }
                      </div>
                    </div>
                    <MdKeyboardArrowRight size={14} />
                  </div>
                  <div className="flex justify-between gap-x-4">
                    <div className="flex flex-col gap-y-2 sm:gap-y-4">
                      <span className="text-blue-600 dark:text-blue-500 text-2xs font-medium whitespace-nowrap">
                        Settlement Filled
                      </span>
                      <div className="flex flex-col gap-y-3">
                        {settlement_filled_events ?
                          <ExplorerLink
                            value={txhash}
                            chain={sourceChain}
                            title={ellipse(txhash, 6, '0x')}
                            iconOnly={false}
                          /> :
                          toArray(data.settlementFilledData).map((d, i) => (
                            <ExplorerLink
                              key={i}
                              value={d.call.transactionHash}
                              chain="axelarnet"
                              customURL={`/gmp/${d.message_id}`}
                              title={ellipse(d.call.transactionHash, 6, '0x')}
                              iconOnly={false}
                            />
                          ))
                        }
                      </div>
                    </div>
                    <MdKeyboardArrowRight size={14} />
                  </div>
                  <div className="flex justify-between gap-x-4">
                    <div className="flex flex-col gap-y-2 sm:gap-y-4">
                      <span className="text-blue-600 dark:text-blue-500 text-2xs font-medium whitespace-nowrap">
                        Tokens Released
                      </span>
                      <div className="flex flex-col gap-y-3">
                        {settlement_filled_events ?
                          <ExplorerLink
                            value={executed?.transactionHash}
                            chain={destinationChain}
                            title={ellipse(executed?.transactionHash, 6, '0x')}
                            iconOnly={false}
                          /> :
                          toArray(data.settlementFilledData).map((d, i) => (
                            <ExplorerLink
                              key={i}
                              value={d.executed?.transactionHash}
                              chain={d.executed?.chain}
                              title={ellipse(d.executed?.transactionHash, 6, '0x')}
                              iconOnly={false}
                            />
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </dd>
            </div>
          )}
          {toArray(data.interchain_transfers).length > 0 && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Settlement Filled</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex flex-col gap-y-1.5">
                  {data.interchain_transfers.map((d, i) => {
                    const destinationChainData = getChainData(d.destinationChain, chains)

                    return (
                      <div key={i} className="flex items-center gap-x-1">
                        <AssetProfile
                          value={d.contract_address || d.symbol}
                          chain={d.destinationChain}
                          amount={d.amount}
                          customAssetData={d}
                          ITSPossible={true}
                          width={16}
                          height={16}
                          className="w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2.5 py-1"
                          titleClassName="text-xs"
                        />
                        <MdKeyboardArrowRight size={20} className="text-zinc-700 dark:text-zinc-300" />
                        {destinationChainData && d.recipient && (
                          <Tooltip content={destinationChainData.name} className="whitespace-nowrap">
                            <Image
                              src={destinationChainData.image}
                              alt=""
                              width={20}
                              height={20}
                            />
                          </Tooltip>
                        )}
                        <Profile
                          address={d.recipient}
                          chain={d.destinationChain}
                          width={20}
                          height={20}
                        />
                      </div>
                    )
                  })}
                </div>
              </dd>
            </div>
          )}
          {symbol && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Asset</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-4">
                  <AssetProfile
                    value={symbol}
                    chain={data.originData?.call.chain || sourceChain}
                    amount={data.originData?.amount || data.amount}
                    ITSPossible={true}
                    onlyITS={!getEvent(data)?.includes('ContractCall')}
                    width={16}
                    height={16}
                    className="w-fit h-6 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2.5 py-1"
                    titleClassName="text-xs"
                  />
                  {(data.originData?.interchain_transfer?.contract_address || interchain_transfer?.contract_address) && (
                    <Tooltip content="Token Address" className="whitespace-nowrap">
                      <Profile
                        address={data.originData?.interchain_transfer?.contract_address || interchain_transfer.contract_address}
                        chain={data.originData?.call?.chain || sourceChain}
                        noResolveName={true}
                      />
                    </Tooltip>
                  )}
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Created</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              {moment((data.originData?.call || call)?.block_timestamp * 1000).format('MMM D, YYYY h:mm:ss A z')}
            </dd>
          </div>
          {isMultihop ?
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Time Spent</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-4">
                  {executedGMPsData.length > 0 && (
                    <div className="flex items-center text-zinc-400 dark:text-zinc-500 gap-x-1">
                      <MdOutlineTimer size={20} />
                      <TimeSpent fromTimestamp={0} toTimestamp={_.sumBy(executedGMPsData, 'time_spent.total') * 1000} />
                    </div>
                  )}
                </div>
              </dd>
            </div> :
            (time_spent?.call_express_executed > 0 && ['express_executed', 'executed'].includes(status)) || (time_spent?.total > 0 && status === 'executed') ?
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
                    {time_spent.total > 0 && status === 'executed' && (
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
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Sender</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <Profile address={data.originData?.call?.transaction?.from || senderAddress} chain={data.originData?.call?.chain || sourceChain} />
            </dd>
          </div>
          {!lite && seeMore && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Source Address</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex flex-col gap-y-2">
                  <Profile address={data.originData?.call?.returnValues?.sender || sourceAddress} chain={data.originData?.call?.chain || sourceChain} />
                  {data.originData?.is_invalid_source_address || data.is_invalid_source_address && (
                    <div className="h-6 flex items-center text-red-600 dark:text-red-500 gap-x-1.5">
                      <PiWarningCircle size={20} />
                      <span>Invalid Address</span>
                    </div>
                  )}
                </div>
              </dd>
            </div>
          )}
          <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
            <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">Destination Contract</dt>
            <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
              <div className="flex flex-col gap-y-2">
                <Profile
                  address={data.callbackData?.call?.returnValues?.destinationContractAddress || contractAddress}
                  chain={data.callbackData?.call?.returnValues?.destinationChain || destinationChain}
                  useContractLink={true}
                />
                {data.callbackData?.is_invalid_contract_address || data.is_invalid_contract_address && (
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
              <dt className="text-zinc-900 dark:text-zinc-100 text-sm font-medium">{isAxelar(call.returnValues?.destinationChain) && data.customValues.projectName === 'ITS' ? 'Destination Address' : 'Recipient'}</dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <Profile address={data.callbackData?.customValues?.recipientAddress || data.customValues.recipientAddress} chain={data.callbackData?.call?.returnValues?.destinationChain || data.customValues.destinationChain || destinationChain} />
              </dd>
            </div>
          )}
          {(!data.originData || data.originData.executed) && executed && isNumber(gasData?.gas_paid_amount) && isNumber(gasData.gas_remain_amount) && (refundedData?.receipt?.status || timeDiff((data.originData?.executed || executed).block_timestamp * 1000) >= 300) && (
            <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
              <dt className="flex items-center text-zinc-900 dark:text-zinc-100 text-sm font-medium">
                <span className="whitespace-nowrap mr-1">
                  Gas Charged
                </span>
                <Tooltip content="The total gas charged to users. This amount may be less than the gas used (Gas Used) due to Axelar's gas subsidy policy." className="w-40 text-xs">
                  <PiInfo className="text-zinc-400 dark:text-zinc-500" />
                </Tooltip>
              </dt>
              <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                <div className="flex items-center gap-x-2">
                  <Number
                    value={gasData.gas_paid_amount - (refundedData?.receipt?.status ? isNumber(refundedData.amount) ? refundedData.amount : gasData.gas_remain_amount : 0) - _.sum(refundedMoreData.map(d => toNumber(d.amount)))}
                    format="0,0.000000"
                    suffix={` ${(data.originData?.fees || fees)?.source_token?.symbol}`}
                    noTooltip={true}
                    className="font-medium"
                  />
                  {(data.originData?.fees || fees)?.source_token?.token_price?.usd > 0 && (
                    <Number
                      value={(gasData.gas_paid_amount - (refundedData?.receipt?.status ? isNumber(refundedData.amount) ? refundedData.amount : gasData.gas_remain_amount : 0) - _.sum(refundedMoreData.map(d => toNumber(d.amount)))) * (data.originData?.fees || fees).source_token.token_price.usd}
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
              {(!data.originData || data.originData.executed) && executed && isNumber(gasData?.gas_used_amount) && (
                <div className="px-4 sm:px-6 py-6 sm:grid sm:grid-cols-4 sm:gap-4">
                  <dt className="flex items-center text-zinc-900 dark:text-zinc-100 text-sm font-medium">
                    <span className="whitespace-nowrap mr-1">
                      Gas Used
                    </span>
                    <Tooltip content="The total gas used to accommodate the cross-chain transaction." className="w-44 text-xs">
                      <PiInfo className="text-zinc-400 dark:text-zinc-500" />
                    </Tooltip>
                  </dt>
                  <dd className="sm:col-span-3 text-zinc-700 dark:text-zinc-300 text-sm leading-6 mt-1 sm:mt-0">
                    <div className="flex items-center gap-x-2">
                      <Number
                        value={gasData.gas_used_amount}
                        format="0,0.000000"
                        suffix={` ${(data.originData?.fees || fees)?.source_token?.symbol}`}
                        noTooltip={true}
                        className="font-medium"
                      />
                      {(data.originData?.fees || fees)?.source_token?.token_price?.usd > 0 && (
                        <Number
                          value={gasData.gas_used_amount * (data.originData?.fees || fees).source_token.token_price.usd}
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
                                      <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                        - Confirm Fee:
                                      </span>
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
                                          prefix="($"
                                          suffix=")"
                                          noTooltip={true}
                                          className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                        />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-x-1 ml-3">
                                      <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                        - Approve Fee:
                                      </span>
                                      <Number
                                        value={d.fees.base_fee - d.fees.source_confirm_fee > 0 ? d.fees.base_fee - d.fees.source_confirm_fee : 0}
                                        format="0,0.000000"
                                        suffix={` ${d.fees.source_token?.symbol}`}
                                        noTooltip={true}
                                        className="text-xs font-medium"
                                      />
                                      {d.fees.source_token?.token_price?.usd > 0 > 0 && (
                                        <Number
                                          value={(d.fees.base_fee - d.fees.source_confirm_fee > 0 ? d.fees.base_fee - d.fees.source_confirm_fee : 0) * d.fees.source_token.token_price.usd}
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
                                        <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                          - Relayer Fee:
                                        </span>
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
                                        <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                          - Overhead Fee:
                                        </span>
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
                                <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                  - Confirm Fee:
                                </span>
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
                                    prefix="($"
                                    suffix=")"
                                    noTooltip={true}
                                    className="text-zinc-400 dark:text-zinc-500 text-xs font-normal"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-x-1 ml-3">
                                <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                  - Approve Fee:
                                </span>
                                <Number
                                  value={fees.base_fee - fees.source_confirm_fee > 0 ? fees.base_fee - fees.source_confirm_fee : 0}
                                  format="0,0.000000"
                                  suffix={` ${fees.source_token?.symbol}`}
                                  noTooltip={true}
                                  className="text-xs font-medium"
                                />
                                {fees.source_token?.token_price?.usd > 0 > 0 && (
                                  <Number
                                    value={(fees.base_fee - fees.source_confirm_fee > 0 ? fees.base_fee - fees.source_confirm_fee : 0) * fees.source_token.token_price.usd}
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
                                  <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                    - Relayer Fee:
                                  </span>
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
                                  <span className="text-zinc-700 dark:text-zinc-300 text-xs whitespace-nowrap">
                                    - Overhead Fee:
                                  </span>
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
              <div className={clsx('grid gap-4 py-4', data.callbackData && 'md:grid-cols-2')}>
                {[data, data.callbackData].map((d, i) => (
                  <ContractCallData
                    key={i}
                    data={d}
                    executeData={i === 0 ? executeData : undefined}
                    isMultihop={isMultihop}
                  />
                ))}
              </div>
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

  const { call, gas_paid, approved, refunded, fees, gas } = { ...data }

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
            className="h-5"
            titleClassName="text-sm font-semibold"
          />
          <MdKeyboardArrowRight size={20} />
          <ChainProfile
            value={destinationChain}
            width={20}
            height={20}
            className="h-5"
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
            <th scope="col" className="px-3 py-3.5 text-left whitespace-nowrap">
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
            const { transactionHash, logIndex, eventIndex, chain_type, confirmation_txhash, poll_id, axelarTransactionHash, blockNumber, axelarBlockNumber, transaction, returnValues, contract_address, block_timestamp, created_at, proposal_id } = { ...(d.id === 'pay_gas' && isString(d.data) ? data.originData?.gas_paid : d.data) }
            const { url, block_path, transaction_path } = { ...d.chainData?.explorer }

            let stepTX
            let stepURL
            const stepMoreInfos = []
            const stepMoreTransactions = []

            // transaction
            switch (d.id) {
              case 'confirm':
                if (confirmation_txhash) {
                  stepTX = confirmation_txhash
                  stepURL = `/tx/${confirmation_txhash}`
                }
                else if (contract_address && poll_id) {
                  stepTX = poll_id
                  stepURL = `/amplifier-poll/${contract_address}_${poll_id}`
                }
                else if (poll_id) {
                  stepTX = poll_id
                  stepURL = `/evm-poll/${poll_id}`
                }

                if (confirmation_txhash && poll_id) {
                  stepMoreInfos.push((
                    <Copy key={stepMoreInfos.length} size={16} value={poll_id}>
                      <Link
                        href={contract_address ? `/amplifier-poll/${contract_address}_${poll_id}` : `/evm-poll/${poll_id}`}
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

                    if (url) {
                      if (block_path && isNumber(transactionHash) && isNumber(blockNumber) && toNumber(transactionHash) === toNumber(blockNumber)) {
                        stepURL = `${url}${block_path.replace('{block}', transactionHash)}`
                      }
                      else if (transaction_path) {
                        stepURL = `${url}${transaction_path.replace('{tx}', transactionHash)}`
                      }
                    }
                  }
                  // wait for IBC
                  else if (axelarTransactionHash && axelarChainData?.explorer?.url) {
                    stepTX = axelarTransactionHash
                    stepURL = `${axelarChainData.explorer.url}${axelarChainData.explorer.transaction_path.replace('{tx}', axelarTransactionHash)}`
                  }

                  // cosmos received
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
                          chain={axelarChainData?.id}
                          width={14}
                          height={14}
                        />
                      </div>
                    ))
                  }

                  // evm log index
                  if (['send', 'pay_gas', 'approve'].includes(d.id) && chain_type === 'evm') {
                    if (isNumber(logIndex)) {
                      stepMoreInfos.push((
                        <div key={stepMoreInfos.length} className="flex items-center gap-x-1">
                          <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                            LogIndex:
                          </span>
                          <ExplorerLink
                            value={transactionHash}
                            chain={d.chainData?.id}
                            hasEventLog={true}
                            title={numberFormat(logIndex, '0,0')}
                            iconOnly={false}
                            width={14}
                            height={14}
                            containerClassName="!gap-x-1.5"
                            nonIconClassName="text-blue-600 dark:text-blue-500 text-xs"
                            className="h-auto"
                          />
                        </div>
                      ))
                    }

                    if (d.id === 'send' && isNumber(eventIndex)) {
                      stepMoreInfos.push((
                        <div key={stepMoreInfos.length} className="flex items-center gap-x-1">
                          <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                            EventIndex:
                          </span>
                          <ExplorerLink
                            value={transactionHash}
                            chain={d.chainData?.id}
                            hasEventLog={true}
                            title={numberFormat(eventIndex, '0,0')}
                            iconOnly={false}
                            width={14}
                            height={14}
                            containerClassName="!gap-x-1.5"
                            nonIconClassName="text-blue-600 dark:text-blue-500 text-xs"
                            className="h-auto"
                          />
                        </div>
                      ))
                    }
                  }

                  // evm command id
                  if (d.id === 'approve' && returnValues?.commandId) {
                    stepMoreInfos.push((
                      <Copy key={stepMoreInfos.length} size={16} value={returnValues.commandId}>
                        {chain_type === 'vm' ?
                          <span className="text-xs">
                            Command ID
                          </span> :
                          <Link
                            href={`/evm-batches?commandId=${returnValues.commandId}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 text-xs underline"
                          >
                            Command ID
                          </Link>
                        }
                      </Copy>
                    ))
                  }

                  // error
                  if (d.id === 'execute' && d.status === 'failed' && data.error) {
                    const { error } = { ...data.error }

                    const message = error?.data?.message || error?.message
                    const reason = error?.reason
                    const code = error?.code
                    const body = error?.body?.replaceAll('"""', '')

                    stepMoreInfos.push((
                      <div key={stepMoreInfos.length} className="w-64 flex flex-col gap-y-1">
                        {message && (!reason || !axelarTransactionHash) && (
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
                          {code && (call.destination_chain_type === 'evm' ?
                            <Link
                              href={isNumber(code) ? 'https://docs.metamask.io/guide/ethereum-provider.html#errors' : `https://docs.ethers.io/v5/api/utils/logger/#errors-${isString(code) ? `-${split(code, { toCase: 'lower', delimiter: '_' }).join('-')}` : 'ethereum'}`}
                              target="_blank"
                              className="w-fit h-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center text-2xs px-2.5 py-1"
                            >
                              {code}
                            </Link> :
                            <div className="w-fit h-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center text-2xs px-2.5 py-1">
                              {code}
                            </div>
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

                  // gas added / refunded more
                  if ((d.id === 'pay_gas' && (isString(d.data) ? data.originData?.gas_added_transactions : data.gas_added_transactions)) || (d.id === 'refund' && data.refunded_more_transactions)) {
                    for (const { transactionHash } of toArray(d.id === 'pay_gas' ? isString(d.data) ? data.originData.gas_added_transactions : data.gas_added_transactions : data.refunded_more_transactions)) {
                      stepMoreTransactions.push((
                        <div key={stepMoreTransactions.length} className="flex items-center gap-x-1">
                          <Copy size={16} value={transactionHash}>
                            {url ?
                              <Link
                                href={`${url}${transaction_path.replace('{tx}', transactionHash)}`}
                                target="_blank"
                                className="text-blue-600 dark:text-blue-500 text-xs font-medium"
                              >
                                {ellipse(transactionHash)}
                              </Link> :
                              ellipse(transactionHash)
                            }
                          </Copy>
                          <ExplorerLink
                            value={transactionHash}
                            chain={d.chainData?.id}
                            width={14}
                            height={14}
                            className="h-auto"
                          />
                        </div>
                      ))
                    }
                  }
                }
                break
            }

            // address
            const fromAddress = transaction?.from
            let toAddress = contract_address

            switch (d.id) {
              case 'send':
                if (!toAddress && chain_type === 'cosmos') {
                  toAddress = returnValues?.sender
                }
                break
              case 'pay_gas':
                if (!toAddress && chain_type === 'cosmos') {
                  toAddress = returnValues?.recipient
                }
                break
              case 'execute':
                if (!toAddress && chain_type === 'cosmos') {
                  toAddress = returnValues?.destinationContractAddress || returnValues?.receiver
                }
                break
              case 'refund':
                toAddress = gas_paid?.returnValues?.refundAddress || toAddress
                break
              default:
                break
            }

            // gas
            let gasAmount

            switch (d.id) {
              case 'pay_gas':
                gasAmount = isString(d.data) ? d.data * fees?.destination_native_token?.gas_price * fees?.destination_native_token?.token_price?.usd / fees?.source_token?.token_price?.usd : gas?.gas_paid_amount
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
                gasAmount = refunded?.amount + _.sum(toArray(data.refunded_more_transactions).map(d => toNumber(d.amount)))
                break
              default:
                break
            }

            const gasElement = isNumber(gasAmount) && gasAmount >= 0 && (
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
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {d.title}
                  </span>
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
                        {!proposal_id && (
                          <ExplorerLink
                            value={stepTX}
                            chain={d.chainData?.id}
                            customURL={stepURL}
                          />
                        )}
                      </div>
                    )}
                    {stepMoreInfos.length > 0 && (
                      <div className="flex items-start gap-x-3">
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
                    {toNumber(blockNumber) > 0 && (url && block_path ?
                      <Link
                        href={`${url}${block_path.replace('{block}', blockNumber)}`}
                        target="_blank"
                        className="text-blue-600 dark:text-blue-500 font-medium"
                      >
                        <Number value={blockNumber} />
                      </Link> :
                      <Number value={blockNumber} />
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
                        <span className="w-8">
                          From:
                        </span>
                        <Profile address={fromAddress} chain={d.chainData?.id} />
                      </div>
                    )}
                    {toAddress && (
                      <div className="flex items-center gap-x-4">
                        <span className="w-8">
                          To:
                        </span>
                        <Profile
                          address={toAddress}
                          chain={d.data?.axelarTransactionHash ? destinationChainData?.id : d.chainData?.id}
                          useContractLink={d.id === 'execute' && ['stellar'].includes(headString(d.data?.axelarTransactionHash ? destinationChainData?.id : d.chainData?.id))}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-4 text-left">
                  {d.status && (
                    <Tag className={clsx('w-fit capitalize', d.status === 'success' ? 'bg-green-600 dark:bg-green-500' : d.status === 'failed' ? 'bg-red-600 dark:bg-red-500' : '')}>
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
  const { chainId, address, provider, signer } = useEVMWalletStore()
  const cosmosWalletStore = useCosmosWalletStore()
  const suiWalletStore = useSuiWalletStore()
  const stellarWalletStore = useStellarWalletStore()
  const xrplWalletStore = useXRPLWalletStore()
  const { mutateAsync: suiSignAndExecuteTransaction } = useSuiSignAndExecuteTransaction()
  const xrplSignAndSubmitTransaction = useXRPLSignAndSubmitTransaction()

  const getData = useCallback(async () => {
    const { commandId } = { ...getParams(searchParams) }

    if (commandId) {
      const { data } = { ...await searchGMP({ commandId }) }
      const d = await customData(data?.[0])

      if (d) {
        if (d.call?.transactionHash) {
          router.push(`/gmp/${d.call.transactionHash}`)
        }
        else {
          setData(d)
        }
      }
      else {
        setData({
          status: 'errorOnGetData',
          code: 404,
          message: `Command ID: ${commandId} not found`,
        })
      }
    }
    else if (tx && !ended) {
      const { data } = { ...await searchGMP(tx.includes('-') ? { messageId: tx } : { txHash: tx }) }
      const d = await customData(data?.[0])

      if (d) {
        if (d.call?.parentMessageID && (!d.executed?.childMessageIDs || isAxelar(d.call.chain))) {
          router.push(`/gmp/${d.call.parentMessageID}`)
        }
        else {
          if (['received', 'failed'].includes(d.simplified_status) && (d.executed || d.error) && (d.refunded || d.not_to_refund)) {
            setEnded(true)
          }

          // callback
          if (d.callback?.transactionHash) {
            const { data } = { ...await searchGMP({
              txHash: d.callback.transactionHash,
              txIndex: d.callback.transactionIndex,
              txLogIndex: d.callback.logIndex,
            }) }

            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.callback.transactionHash))
            d.callbackData = await customData(d.callbackData)
          }
          else if (d.executed?.transactionHash) {
            const { data } = { ...await searchGMP({ txHash: d.executed.transactionHash }) }

            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.transactionHash, d.executed.transactionHash))
            d.callbackData = await customData(d.callbackData)
          }
          else if (d.callback?.messageIdHash) {
            const messageId = `${d.callback.messageIdHash}-${d.callback.messageIdIndex}`
            const { data } = { ...await searchGMP({ messageId }) }

            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.returnValues?.messageId, messageId))
            d.callbackData = await customData(d.callbackData)
          }
          else if (toArray(d.executed?.childMessageIDs) > 0) {
            const { data } = { ...await searchGMP({ messageId: d.executed.childMessageIDs?.[0] }) }

            d.callbackData = toArray(data).find(_d => equalsIgnoreCase(_d.call?.returnValues?.messageId, d.executed.childMessageIDs?.[0]))
            d.callbackData = await customData(d.callbackData)
          }

          if (isAxelar(d.callbackData?.call?.returnValues?.destinationChain)) {
            d.callbackData = undefined
          }

          // origin
          if (d.call && (d.gas_paid_to_callback || (d.is_call_from_relayer && !isAxelar(d.call.returnValues?.destinationChain)))) {
            const { data } = { ...await searchGMP(d.call.transactionHash ? { txHash: d.call.transactionHash } : { messageId: d.call.parentMessageID }) }

            d.originData = toArray(data).find(_d => d.call.transactionHash ?
              toArray([_d.express_executed?.transactionHash, _d.executed?.transactionHash]).findIndex(tx => equalsIgnoreCase(tx, d.call.transactionHash)) > -1 :
              toArray([_d.express_executed?.messageId, _d.executed?.messageId, _d.executed?.returnValues?.messageId]).findIndex(id => equalsIgnoreCase(id, d.call.parentMessageID)) > -1
            )
            d.originData = await customData(d.originData)
          }

          if (isAxelar(d.originData?.call?.chain)) {
            d.originData = undefined
          }

          // settlement filled
          if (d.settlement_forwarded_events) {
            const size = 10
            let i = 0
            let from = 0
            let total
            let data = []

            while ((!isNumber(total) || total > data.length || from < total) && i < 10) {
              const response = { ...await searchGMP({
                event: 'SquidCoralSettlementFilled',
                squidCoralOrderHash: d.settlement_forwarded_events.map(e => e.orderHash),
                from,
                size,
              }) }

              if (isNumber(response.total)) {
                total = response.total
              }

              if (response.data) {
                data = _.uniqBy(_.concat(data, response.data), 'id')
                from = data.length
              }
              else {
                break
              }

              i++
            }

            if (data.length > 0) {
              d.settlementFilledData = data
            }
          }

          // settlement forwarded
          if (d.settlement_filled_events) {
            const size = 10
            let i = 0
            let from = 0
            let total
            let data = []

            while ((!isNumber(total) || total > data.length || from < total) && i < 10) {
              const response = { ...await searchGMP({
                event: 'SquidCoralSettlementForwarded',
                squidCoralOrderHash: d.settlement_filled_events.map(e => e.orderHash),
                from,
                size,
              }) }

              if (isNumber(response.total)) {
                total = response.total
              }

              if (response.data) {
                data = _.uniqBy(_.concat(data, response.data), 'id')
                from = data.length
              }
              else {
                break
              }

              i++
            }

            if (data.length > 0) {
              d.settlementForwardedData = data
            }
          }

          console.log('[data]', d)
          setData(d)

          return d
        }
      }
      else {
        setData({
          status: 'errorOnGetData',
          code: 404,
          message: `GMP: ${tx} not found`,
        })
      }
    }

    return
  }, [tx, router, searchParams, ended, setData])

  // set EstimatedTimeSpent
  useEffect(() => {
    const getEstimateTimeSpent = async () => {
      if (!estimatedTimeSpent && data?.call?.chain) {
        const response = await estimateTimeSpent({ sourceChain: data.call.chain })
        const chainEstimatedTimeSpent = toArray(response).find(d => d.key === data.call.chain)

        // fix finality time for cosmos chain
        if (data.call.chain_type === 'cosmos' && chainEstimatedTimeSpent?.confirm > 30) {
          chainEstimatedTimeSpent.confirm = 30
        }

        setEstimatedTimeSpent(chainEstimatedTimeSpent)
      }
    }

    getEstimateTimeSpent()
  }, [data, estimatedTimeSpent, setEstimatedTimeSpent])

  // set ExecuteData
  useEffect(() => {
    const getExecuteData = async () => {
      if (!executeData && data?.call && data.approved && chains && assets) {
        try {
          const { call, approved, command_id } = { ...data }
          const { addresses } = { ...getAssetData(call.returnValues?.symbol, assets) }

          const symbol = approved.returnValues?.symbol || addresses?.[toCase(call.returnValues?.destinationChain, 'lower')]?.symbol || call.returnValues?.symbol
          const commandId = approved.returnValues?.commandId || command_id
          const sourceChain = approved.returnValues?.sourceChain || getChainData(call.chain, chains)?.chain_name
          const sourceAddress = approved.returnValues?.sourceAddress || call.returnValues?.sender
          const contractAddress = approved.returnValues?.contractAddress || call.returnValues?.destinationContractAddress
          const payload = call.returnValues?.payload
          const amount = toBigNumber(approved.returnValues?.amount || call.returnValues?.amount)

          const contract = new Contract(contractAddress, IAxelarExecutable.abi, getProvider(call.returnValues?.destinationChain, chains))
          const transaction = symbol ?
            await contract/*.executeWithToken*/.populateTransaction.executeWithToken(commandId, sourceChain, sourceAddress, payload, symbol, amount) :
            await contract/*.execute*/.populateTransaction.execute(commandId, sourceChain, sourceAddress, payload)

          setExecuteData(transaction?.data)
        } catch (error) {}
      }
    }

    getExecuteData()
  }, [data, executeData, setExecuteData, chains, assets])

  // set EstimatedGasUsed
  useEffect(() => {
    const getEstimatedGasUsed = async () => {
      if (!estimatedGasUsed && (data?.is_insufficient_fee || (data?.call && !data.gas_paid)) && !data.confirm && !data.approved && data.call?.returnValues?.destinationChain && data.call.returnValues.destinationContractAddress) {
        const { destinationChain, destinationContractAddress } = { ...data.call.returnValues }

        const { express_executed, executed } = { ...(await searchGMP({
          destinationChain,
          destinationContractAddress,
          status: 'executed',
          size: 1,
        }))?.data?.[0] }

        const { gasUsed } = { ...(express_executed || executed)?.receipt }

        setEstimatedGasUsed(gasUsed ? toNumber(gasUsed) : getDefaultGasLimit(destinationChain))
      }
    }

    getEstimatedGasUsed()
  }, [data, estimatedGasUsed, setEstimatedGasUsed])

  // interval update
  useEffect(() => {
    getData()

    const interval = !ended && setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tx, searchParams, ended, setData, setEnded, getData])

  // sdk
  useEffect(() => {
    try {
      setSDK(new AxelarGMPRecoveryAPI({
        environment: ENVIRONMENT,
        axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
        axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL,
      }))
    } catch (error) {
      setSDK(undefined)
    }
  }, [])

  // toast
  useEffect(() => {
    const { status, message, hash, chain } = { ...response }
    const chainData = getChainData(chain, chains)

    toast.remove()

    if (message) {
      if ((hash && chainData?.explorer) || status === 'failed') {
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
              <span className="text-zinc-700 whitespace-pre-wrap">
                {message}
              </span>
            </div>
            {chainData?.explorer && (
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
            )}
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

  const isChainSupportedAddGas = (chain, chainType) => {
    // evm / cosmos
    if (chainType !== 'vm') return true

    // amplifier chain that actually evm chain
    if (isNumber(getChainData(chain, chains)?.chain_id)) return true

    // amplifier chains that already custom addGas function
    return ['sui', 'stellar', 'xrpl'].includes(headString(chain))
  }

  const isWalletConnected = (chain, chainType) => {
    // cosmos
    if (chainType === 'cosmos') return !!cosmosWalletStore?.signer

    // evm / evm amplifier
    if (isNumber(getChainData(chain, chains)?.chain_id)) return !!signer

    chain = headString(chain)
    if (chain === 'sui') return !!suiWalletStore?.address
    if (chain === 'stellar') return !!stellarWalletStore?.address
    if (chain === 'xrpl') return !!xrplWalletStore?.address

    return
  }

  const getWalletComponent = (chain, chainType) => {
    const { chain_id } = { ...getChainData(chain, chains) }

    // cosmos
    if (chainType === 'cosmos') return <CosmosWallet connectChainId={chain_id} />

    // evm / evm amplifier
    if (isNumber(chain_id)) return <EVMWallet connectChainId={chain_id} />

    chain = headString(chain)
    if (chain === 'sui') return <SuiWallet />
    if (chain === 'stellar') return <StellarWallet />
    if (chain === 'xrpl') return <XRPLWallet />

    return
  }

  const needSwitchChain = (id, chainType) => id !== (chainType === 'cosmos' ? cosmosWalletStore?.chainId : isNumber(id) ? chainId : id)

  const getDefaultGasLimit = chain => ({
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
    'xrpl-evm': 500000,
    'xrpl-evm-2': 7000000,
  }[toCase(chain, 'lower')] || 700000)

  // addNativeGas for evm, addGasToCosmosChain for cosmos, amplifier (addGasToSuiChain, addGasToStellarChain, addGasToXrplChain)
  const addGas = async data => {
    if (data?.call && sdk && isWalletConnected(data.call.chain, data.call.chain_type)) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Adding gas...' })

      try {
        const { chain, chain_type, destination_chain_type, transactionHash, logIndex } = { ...data.call }
        const { sender, destinationChain, messageId } = { ...data.call.returnValues }
        const { base_fee, express_fee, source_token } = { ...data.fees }

        let gasAddedAmount

        if (isAxelar(destinationChain)) {
          let nextHopDestinationChain

          if (data.interchain_transfer?.destinationChain) {
            nextHopDestinationChain = data.interchain_transfer.destinationChain
          }
          else if (data.interchain_token_deployment_started?.destinationChain) {
            nextHopDestinationChain = data.interchain_token_deployment_started.destinationChain
          }
          else if (data.link_token_started?.destinationChain) {
            nextHopDestinationChain = data.link_token_started.destinationChain
          }
          else {
            switch (headString(chain)) {
              case 'xrpl':
                if (chain.startsWith('xrpl-evm')) {
                  nextHopDestinationChain = ENVIRONMENT === 'devnet-amplifier' ? 'xrpl-dev2' : 'xrpl'
                }
                else {
                  nextHopDestinationChain = ENVIRONMENT === 'devnet-amplifier' ? 'xrpl-evm-2' : 'xrpl-evm'
                }
                break
              default:
                nextHopDestinationChain = ENVIRONMENT === 'mainnet' ? 'ethereum' : ENVIRONMENT === 'devnet-amplifier' ? 'eth-sepolia' : 'ethereum-sepolia'
                break
            }
          }

          const totalGasAmount = await estimateITSFee({
            sourceChain: chain,
            destinationChain: nextHopDestinationChain,
            sourceTokenSymbol: source_token?.symbol,
            gasLimit: getDefaultGasLimit(nextHopDestinationChain),
            gasMultiplier: 1.1,
            event: data.interchain_token_deployment_started ? 'InterchainTokenDeployment' :
              data.link_token_started ? 'LinkToken' :
              data.token_metadata_registered ? 'TokenMetadataRegistered' :
              undefined,
          })

          if (totalGasAmount) {
            gasAddedAmount = toBigNumber(totalGasAmount)
          }
        }

        const gasLimit = isNumber(estimatedGasUsed) ? estimatedGasUsed : 700000
        const decimals = source_token?.decimals || (headString(chain) === 'sui' ? 9 : 18)

        if (!gasAddedAmount) {
          gasAddedAmount = toBigNumber(BigInt(parseUnits((base_fee + express_fee) * 1.1, decimals)) + BigInt(parseUnits(gasLimit * source_token?.gas_price, decimals)))
        }

        if (chain_type === 'evm' || isNumber(sourceChainData?.chain_id)) {
          console.log('[addGas request]', { chain, destinationChain, transactionHash, logIndex, estimatedGasUsed: gasLimit, refundAddress: address })

          const response = await sdk.addNativeGas(chain, transactionHash, gasLimit, {
            evmWalletDetails: {
              useWindowEthereum: true,
              provider,
              signer,
            },
            destChain: destinationChain,
            logIndex,
            refundAddress: address,
          })

          console.log('[addGas response]', response)

          const { success, error, transaction } = { ...response }

          if (success) {
            await sleep(1000)
          }

          setResponse({
            status: success ? 'success' : 'failed',
            message: parseError(error)?.message || error || 'Pay gas successful',
            hash: transaction?.transactionHash,
            chain,
          })

          if (success) {
            const _data = await getData()

            if (_data && chain_type !== 'vm' && (destination_chain_type === 'cosmos' ? !data.executed && !_data.executed : !data.approved && !_data.approved)) {
              await approve(_data, true)
            }
          }
        }
        else if (chain_type === 'cosmos' && !isAxelar(chain)) {
          const token = 'autocalculate'
          const sendOptions = {
            environment: ENVIRONMENT,
            offlineSigner: cosmosWalletStore.signer,
            txFee: { gas: '300000', amount: [{ denom: sourceChainData?.native_token?.denom, amount: '30000' }] },
          }

          console.log('[addGas request]', { chain, transactionHash, messageId, estimatedGasUsed: gasLimit, token, sendOptions })

          const response = await sdk.addGasToCosmosChain({
            txHash: transactionHash,
            messageId,
            gasLimit,
            chain,
            token,
            sendOptions,
          })

          console.log('[addGas response]', response)

          const { success, error, broadcastResult } = { ...response }

          if (success) {
            await sleep(1000)
          }

          setResponse({
            status: success ? 'success' : 'failed',
            message: parseError(error)?.message || error || 'Pay gas successful',
            hash: broadcastResult?.transactionHash,
            chain,
          })

          if (success && !broadcastResult?.code) {
            const _data = await getData()

            if (_data && (destination_chain_type === 'cosmos' ? !data.executed && !_data.executed : !data.approved && !_data.approved)) {
              await approve(_data, true)
            }
          }
        }
        else if (headString(chain) === 'sui') {
          console.log('[addGas request]', { chain, messageId, gasAddedAmount, refundAddress: suiWalletStore.address })

          let response = await sdk.addGasToSuiChain({
            messageId,
            amount: gasAddedAmount,
            gasParams: '0x',
            refundAddress: suiWalletStore.address,
          })

          if (response) {
            response = await suiSignAndExecuteTransaction({
              transaction: response,
              chain: `sui:${ENVIRONMENT === 'mainnet' ? 'mainnet' : 'testnet'}`,
              options: { showEffects: true, showEvents: true, showObjectChanges: true },
            })

            console.log('[addGas response]', response)

            setResponse({
              status: response?.error ? 'failed' : 'success',
              message: parseError(response?.error)?.message || response?.error || 'Pay gas successful',
              hash: response?.digest,
              chain,
            })
          }
        }
        else if (headString(chain) === 'stellar') {
          console.log('[addGas request]', { chain, messageId, gasAddedAmount, refundAddress: stellarWalletStore.address })

          let response = await sdk.addGasToStellarChain({
            senderAddress: sender,
            messageId,
            amount: gasAddedAmount,
            spender: stellarWalletStore.address,
          })

          if (response && stellarWalletStore.provider && stellarWalletStore.network?.sorobanRpcUrl) {
            const server = new StellarSDK.rpc.Server(sourceChainData?.endpoints?.rpc?.[0] || stellarWalletStore.network.sorobanRpcUrl, { allowHttp: true })

            const preparedTransaction = await server.prepareTransaction(StellarSDK.TransactionBuilder.fromXDR(response, stellarWalletStore.network.networkPassphrase))
            response = await stellarWalletStore.provider.signTransaction(preparedTransaction.toXDR(), stellarWalletStore.network.network === 'STANDALONE' ? ENVIRONMENT === 'mainnet' ? 'PUBLIC' : 'TESTNET' : stellarWalletStore.network.network)

            if (response?.signedTxXdr) {
              console.log('[stellar sendTransaction]', { ...response, network: stellarWalletStore.network })

              try {
                response = await server.sendTransaction(StellarSDK.TransactionBuilder.fromXDR(response.signedTxXdr, stellarWalletStore.network.networkPassphrase))
                response.error = JSON.parse(JSON.stringify(response.errorResult))._attributes.result._switch.name
              } catch (error) {}
            }

            console.log('[addGas response]', response)

            setResponse({
              status: response?.error || response?.status === 'ERROR' ? 'failed' : 'success',
              message: parseError(response?.error)?.message || response?.error || 'Pay gas successful',
              hash: response?.hash,
              chain,
            })
          }
        }
        else if (headString(chain) === 'xrpl') {
          console.log('[addGas request]', { chain, messageId, gasAddedAmount: formatUnits(gasAddedAmount, decimals), refundAddress: xrplWalletStore.address })

          let response = await sdk.addGasToXrplChain({
            senderAddress: xrplWalletStore.address,
            messageId,
            amount: formatUnits(gasAddedAmount, decimals),
          })

          if (response) {
            response = await xrplSignAndSubmitTransaction(response, `xrpl:${ENVIRONMENT === 'mainnet' ? '0' : ENVIRONMENT === 'devnet-amplifier' ? '2' : '1'}`)

            console.log('[addGas response]', response)

            setResponse({
              status: response?.tx_json?.meta?.TransactionResult === 'tesSUCCESS' ? 'success' : 'failed',
              message: parseError(response?.error)?.message || response?.error || 'Pay gas successful',
              hash: response?.tx_hash,
              chain,
            })
          }
        }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }

      setProcessing(false)
    }
  }

  // manualRelayToDestChain (confirm source evm, approve destination evm, RouteMessage destination cosmos)
  const approve = async (data, afterPayGas = false) => {
    if (data?.call && sdk) {
      setProcessing(true)

      if (!afterPayGas) {
        setResponse({ status: 'pending', message: (!data.confirm || data.confirm_failed) && data.call.chain_type !== 'cosmos' ? 'Confirming...' : data.call.destination_chain_type === 'cosmos' ? 'Executing...' : 'Approving...' })
      }

      try {
        const { destination_chain_type, transactionHash, logIndex, eventIndex, message_id } = { ...data.call }

        console.log('[manualRelayToDestChain request]', { transactionHash, logIndex, eventIndex, message_id })
        const response = await sdk.manualRelayToDestChain(transactionHash, logIndex, eventIndex, { useWindowEthereum: true, provider, signer }, false, message_id)
        console.log('[manualRelayToDestChain response]', response)

        const { success, error, confirmTx, signCommandTx, routeMessageTx } = { ...response }

        if (success) {
          await sleep(15 * 1000)
        }
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

  // execute for evm only
  const execute = async data => {
    if (data?.approved && sdk && signer) {
      setProcessing(true)
      setResponse({ status: 'pending', message: 'Executing...' })

      try {
        const { transactionHash, logIndex } = { ...data.call }
        const gasLimitBuffer = '200000'

        console.log('[execute request]', { transactionHash, logIndex, gasLimitBuffer })
        const response = await sdk.execute(transactionHash, logIndex, { useWindowEthereum: true, provider, signer, gasLimitBuffer })
        console.log('[execute response]', response)

        const { success, error, transaction } = { ...response }

        setResponse({
          status: success && transaction ? 'success' : 'failed',
          message: parseError(error)?.message || error || (transaction ? 'Execute successful' : 'Error Execution. Please see the error on console.'),
          hash: transaction?.transactionHash,
          chain: data.approved.chain,
        })

        if (success && transaction) {
          getData()
        }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }

      setProcessing(false)
    }
  }

  const { call, gas_paid, confirm, approved, executed, error, gas } = { ...data }

  const sourceChainData = getChainData(call?.chain, chains)
  const destinationChainData = getChainData(call?.returnValues?.destinationChain, chains)

  let addGasButton
  let approveButton
  let executeButton

  if (call) {
    // addGasButton
    if (sourceChainData && !isAxelar(call.chain)) {
      if (
        // supported chain
        isChainSupportedAddGas(call.chain, call.chain_type) &&
        // no gas added response
        response?.message !== 'Pay gas successful' &&
        // when need more gas by itself
        ((
          // not executed / approved / confirmed / not cosmos call or called more than 1 min
          !executed && !data.is_executed && !approved && !(confirm && !data.confirm_failed) && (call.chain_type !== 'cosmos' || timeDiff(call.block_timestamp * 1000) >= 60) &&
          // no gas paid or not enough gas
          (!(gas_paid || data.gas_paid_to_callback) || data.is_insufficient_fee || data.is_invalid_gas_paid || data.not_enough_gas_to_execute || gas?.gas_remain_amount < 0.000001)
        ) ||
        // when need more gas by another
        (
          data.callbackData && (
            // not enough gas
            data.callbackData.is_insufficient_fee || data.callbackData.not_enough_gas_to_execute ||
            // some patterns of error is detected
            checkNeedMoreGasFromError(data.callbackData.error)
          ) && timeDiff(data.callbackData.created_at?.ms) > 60
        )) ||
        // when need more gas by itself on destination axelar
        (isAxelar(call.returnValues?.destinationChain) && checkNeedMoreGasFromError(error))
      ) {
        addGasButton = (
          <div key="addGas" className="flex items-center gap-x-1">
            {isWalletConnected(call.chain, call.chain_type) && !needSwitchChain(sourceChainData.chain_id || sourceChainData.id, call.chain_type) && (
              <button
                disabled={processing}
                onClick={() => addGas(data)}
                className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
              >
                {gas_paid ? 'Add' : 'Pay'}{processing ? 'ing' : ''} gas{processing ? '...' : ''}
              </button>
            )}
            {getWalletComponent(call.chain, call.chain_type)}
          </div>
        )
      }
    }

    // approveButton
    const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : 600

    if (
      // not amplifier call
      call.chain_type !== 'vm' &&
      // not approved
      !(call.destination_chain_type === 'cosmos' ? (call.chain_type === 'cosmos' && executed?.transactionHash) || (confirm && confirm.poll_id !== data.confirm_failed_event?.poll_id) : approved || call.destination_chain_type === 'vm') && !data.is_executed &&
      // not executed / wait for IBC
      (!executed || (executed.axelarTransactionHash && !executed.transactionHash && (error || timeDiff(executed.block_timestamp * 1000) >= 3600))) &&
      // confirmed / confirm failed / called more than finality
      (confirm || data.confirm_failed || timeDiff(call.block_timestamp * 1000) >= finalityTime) &&
      // confirmed or called more than 1 min
      timeDiff((confirm || call).block_timestamp * 1000) >= 60 &&
      // valid call and sufficient fee / gas
      !data.is_invalid_call && !data.is_insufficient_fee && (gas?.gas_remain_amount || data.gas_paid_to_callback || data.is_call_from_relayer || call.proposal_id)
    ) {
      approveButton = (
        <div key="approve" className="flex items-center gap-x-1">
          <button
            disabled={processing}
            onClick={() => approve(data)}
            className={clsx('h-6 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1', processing ? 'pointer-events-none bg-blue-400 dark:bg-blue-400' : 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600')}
          >
            {(!confirm || data.confirm_failed) && !isAxelar(call.chain) && call.chain_type !== 'cosmos' ? 'Confirm' : call.chain_type === 'cosmos' ? 'Execut' : 'Approv'}{processing ? 'ing...' : (!confirm || data.confirm_failed) && !isAxelar(call.chain) && call.chain_type !== 'cosmos' ? '' : 'e'}
          </button>
        </div>
      )
    }

    // executeButton
    if (call.destination_chain_type !== 'vm' && !isAxelar(call.returnValues?.destinationChain) && call.returnValues?.payload) {
      if (
        // approved
        (call.destination_chain_type === 'cosmos' ? confirm || call.chain_type === 'cosmos' : approved) &&
        // no executed txhash or the same with error txhash
        (!executed?.transactionHash || equalsIgnoreCase(executed.transactionHash, error?.transactionHash)) && !data.is_executed &&
        // error or confirmed / approved or called more than 5 mins for cosmos, 2 mins for evm
        (error || timeDiff(((call.destination_chain_type === 'cosmos' ? confirm?.block_timestamp : approved.block_timestamp) || call.block_timestamp) * 1000) >= (call.destination_chain_type === 'cosmos' ? 300 : 120))
      ) {
        executeButton = (
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
      }
    }
  }

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        data.status === 'errorOnGetData' ? <Response data={data} /> :
        <div className="max-w-7xl flex flex-col gap-y-4">
          <Toaster />
          <Info
            data={data}
            estimatedTimeSpent={estimatedTimeSpent}
            executeData={executeData}
            buttons={Object.fromEntries(Object.entries({
              pay_gas: addGasButton,
              execute: executeButton,
              [(!confirm || data.confirm_failed) && !isAxelar(call.chain) && sourceChainData?.chain_type !== 'cosmos' ? 'confirm' : sourceChainData?.chain_type === 'cosmos' && !executeButton ? 'execute' : 'approve']: approveButton,
            }).filter(([k, v]) => v))}
            tx={tx}
            lite={lite}
          />
          {!lite && (
            <>
              {data.originData && (
                <Details data={{
                  ...data.originData,
                  callbackData: Object.fromEntries(Object.entries(data).filter(([k, v]) => !find(k, ['originData', 'callbackData']))),
                }} />
              )}
              <Details data={data} />
              {data.callbackData && (
                <Details data={{
                  ...data.callbackData,
                  originData: Object.fromEntries(Object.entries(data).filter(([k, v]) => !find(k, ['originData', 'callbackData']))),
                }} />
              )}
            </>
          )}
        </div>
      }
    </Container>
  )
}
