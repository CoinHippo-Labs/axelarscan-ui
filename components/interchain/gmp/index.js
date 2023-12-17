import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Alert } from '@material-tailwind/react'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { Contract } from 'ethers'
import _ from 'lodash'
import moment from 'moment'
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTimeOutline } from 'react-icons/io5'

import Info from './info'
import Details from './details'
import Arguments from './arguments'
import Spinner from '../../spinner'
import ExplorerLink from '../../explorer/link'
import EVMWallet from '../../wallet/evm'
import COSMOSWallet from '../../wallet/cosmos'
import { searchGMP, saveGMP, isContractCallApproved, estimateTimeSpent } from '../../../lib/api/gmp'
import { getProvider } from '../../../lib/chain/evm'
import { getChainData, getAssetData } from '../../../lib/config'
import { toBigNumber } from '../../../lib/number'
import { split, toArray, equalsIgnoreCase, sleep, parseError } from '../../../lib/utils'

import IAxelarExecutable from '../../../data/contracts/interfaces/IAxelarExecutable.json'
import parameters from '../../../config/gmp/parameters'

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT
const MIN_GAS_REMAIN_AMOUNT = 0.000001

const getTransactionKey = tx => {
  const DELIMETERS = ['_', ':']
  let txHash
  let txIndex
  let txLogIndex

  if (tx && DELIMETERS.findIndex(s => tx.includes(s)) > -1) {
    let hash_split = tx
    for (const delimeter of DELIMETERS) {
      hash_split = split(hash_split, 'normal', delimeter).join(_.head(DELIMETERS))
    }
    hash_split = split(hash_split, 'normal', _.head(DELIMETERS))

    txHash = _.head(hash_split)
    if (hash_split.length > 2) {
      txIndex = hash_split[1]
    }
    txLogIndex = _.last(hash_split)
  }
  else {
    txHash = tx
  }

  txIndex = !isNaN(txIndex) ? Number(txIndex) : undefined
  txLogIndex = !isNaN(txLogIndex) ? Number(txLogIndex) : undefined
  return [txHash, txIndex, txLogIndex]
}

export default () => {
  const { chains, assets, wallet, cosmos_wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet, cosmos_wallet: state.cosmos_wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { cosmos_wallet_data } = { ...cosmos_wallet }
  const { chain_id, signer, address } = { ...wallet_data }

  const router = useRouter()
  const { query } = { ...router }
  const { tx, command_id, edit } = { ...query }

  const [api, setAPI] = useState(null)
  const [data, setData] = useState(null)
  const [estimatedTimeSpent, setEstimatedTimeSpent] = useState(null)

  const [processing, setProcessing] = useState(null)
  const [response, setResponse] = useState(null)
  const [txHashExpress, setTxHashExpress] = useState('')
  const [txHashExecuted, setTxHashExecuted] = useState('')
  const [txHashRefunded, setTxHashRefunded] = useState('')

  useEffect(
    () => {
      if (!api) {
        try {
          setAPI(new AxelarGMPRecoveryAPI({ environment: ENVIRONMENT, axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL, axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL }))
        } catch (error) {
          setAPI(undefined)
        }
      }
    },
    [],
  )

  useEffect(
    () => {
      setEstimatedTimeSpent(null)
      setProcessing(null)
      setResponse(null)
      resetTxHashEdit()
    },
    [tx],
  )

  useEffect(
    () => {
      getData()
      const interval = setInterval(() => getData(), 0.15 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [tx, command_id, chains_data, api, processing],
  )

  const resetTxHashEdit = () => {
    setTxHashExpress('')
    setTxHashExecuted('')
    setTxHashRefunded('')
  }

  const getData = async () => {
    if (command_id) {
      const response = await searchGMP({ commandId: command_id, size: 1 })
      const { call } = { ..._.head(response?.data) }
      const { transactionHash } = { ...call }
      if (transactionHash) {
        router.push(`/gmp/${transactionHash}`)
      }
      else {
        setData({})
      }
    }
    else if (tx && chains_data && (api || api === undefined) && !processing && !(matched && data && ['received', 'failed'].includes(data.simplified_status) && (data.executed || data.error) && (data.express_executed || !fees?.express_supported || !EDITABLE) && (data.executed || !EDITABLE) && (data.refunded || data.not_to_refund))) {
      if (data) {
        await sleep(3 * 1000)
        if (!matched) {
          setData(null)
        }
      }

      const response = await searchGMP({ txHash: tx, size: 1 })
      const _data = _.head(response?.data)

      if (_data) {
        const { call, gas_paid, gas_paid_to_callback, approved, executed, callback, is_call_from_relayer, command_id } = { ..._data }

        // callback
        if (callback?.transactionHash) {
          const { transactionHash, transactionIndex, logIndex } = { ...callback }
          const response = await searchGMP({ txHash: transactionHash, txIndex: transactionIndex, txLogIndex: logIndex })
          const callback_data = toArray(response?.data).find(d => equalsIgnoreCase(d.call?.transactionHash, transactionHash))
          if (callback_data) {
            _data.callback_data = callback_data
          }
        }
        else if (executed?.transactionHash) {
          const { transactionHash } = { ...executed }
          const response = await searchGMP({ txHash: transactionHash })
          const callback_data = toArray(response?.data).find(d => equalsIgnoreCase(d.call?.transactionHash, transactionHash))
          if (callback_data) {
            _data.callback_data = callback_data
          }
        }

        // origin
        if (call && (gas_paid_to_callback || is_call_from_relayer)) {
          const { transactionHash } = { ...call }
          const response = await searchGMP({ txHash: transactionHash })
          const origin_data = toArray(response?.data).find(d => toArray([d.express_executed?.transactionHash, d.executed?.transactionHash]).findIndex(hash => equalsIgnoreCase(hash, transactionHash)) > -1)
          if (origin_data) {
            _data.origin_data = origin_data
          }
        }

        if (call) {
          const { sender, destinationContractAddress, destinationChain, payload } = { ...call.returnValues }
          let { contractAddress, commandId, sourceChain, sourceAddress, payloadHash, symbol, amount } = { ...approved?.returnValues }
          contractAddress = contractAddress || destinationContractAddress
          commandId = commandId || command_id
          sourceChain = sourceChain || getChainData(call.chain, chains_data)?.chain_name
          sourceAddress = sourceAddress || sender
          payloadHash = payloadHash || call.returnValues?.payloadHash
          const { addresses } = { ...getAssetData(call.returnValues?.symbol, assets_data) }
          symbol = symbol || addresses?.[destinationChain?.toLowerCase()]?.symbol || call.returnValues?.symbol
          amount = amount || call.returnValues?.amount

          if (call.chain && !estimatedTimeSpent) {
            const response = await estimateTimeSpent({ sourceChain: call.chain, destinationChain })
            setEstimatedTimeSpent(toArray(response).find(d => d.key === call.chain))
          }

          if ((STAGING || EDITABLE) && call.destination_chain_type === 'evm') {
            try {
              const { result } = { ...await isContractCallApproved({ destinationChain, commandId, sourceChain, sourceAddress, contractAddress, payloadHash, symbol, amount }) }
              _data.is_approved = result
            } catch (error) {}
          }

          try {
            const provider = getProvider(destinationChain, chains_data)
            const contract = new Contract(contractAddress, IAxelarExecutable.abi, provider)
            const { data } = { ...(symbol ? await contract/*.executeWithToken*/.populateTransaction.executeWithToken(commandId, sourceChain, sourceAddress, payload, symbol, toBigNumber(amount)) : await contract/*.execute*/.populateTransaction.execute(commandId, sourceChain, sourceAddress, payload)) }
            if (data) {
              _data.execute_data = data
            }
          } catch (error) {}
        }

        console.log('[data]', _data)
        setData(_data)
        return _data
      }
      else {
        setData({})
      }
    }
    return null
  }

  const save = async params => {
    const response = await saveGMP(params)
    getData()
    return response
  }

  const addGas = async data => {
    if ((chain_type === 'cosmos' ? cosmos_wallet_data?.signer : signer) && api && data) {
      setProcessing(true)
      resetTxHashEdit()
      try {
        setResponse({ status: 'pending', message: 'Adding gas' })

        const { call, approved } = { ...data }
        const { chain, transactionHash, transactionIndex, logIndex, returnValues } = { ...call }
        const { destinationChain, messageId } = { ...returnValues }
        const { gas_add_adjustment } = { ...parameters }
        const gasMultipler = gas_add_adjustment[ENVIRONMENT]?.[destinationChain?.toLowerCase()] || gas_add_adjustment[ENVIRONMENT]?.default

        const token = 'autocalculate'
        const { native_token } = { ...getChainData(chain, chains_data) }
        const { denom } = { ...native_token }
        const sendOptions = chain_type === 'cosmos' && {
          environment: ENVIRONMENT,
          offlineSigner: cosmos_wallet_data.signer,
          txFee: {
            gas: '250000',
            amount: [{ denom, amount: '30000' }],
          },
        }

        console.log('[addGas request]', { chain, transactionHash, logIndex, messageId, refundAddress: address, gasMultipler, token, sendOptions })
        const response = chain_type === 'cosmos' ? await api.addGasToCosmosChain({ txHash: transactionHash, messageId, chain, token, sendOptions }) : await api.addNativeGas(chain, transactionHash/*, logIndex*/, { useWindowEthereum: true, signer, refundAddress: address, gasMultipler })
        console.log('[addGas response]', response)
        const { success, error, transaction, broadcastResult } = { ...response }
        const { message } = { ...error }

        if (success) {
          await sleep(1 * 1000)
        }
        const _data = success && await getData()
        setResponse({
          status: success ? 'success' : 'failed',
          message: message || error || 'Pay gas successful',
          hash: (chain_type === 'cosmos' ? broadcastResult : transaction)?.transactionHash,
          chain,
        })

        if (success && !broadcastResult?.code && _data && (destination_chain_type === 'cosmos' ? !executed && !_data.executed : !approved && !_data.approved) && !_data.is_insufficient_fee) {
          approve(_data, true)
        }
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const approve = async (data, afterPayGas = false) => {
    if (api && data) {
      setProcessing(true)
      resetTxHashEdit()
      try {
        if (!afterPayGas) {
          setResponse({ status: 'pending', message: chain_type !== 'cosmos' && !confirm ? 'Confirming' : destination_chain_type === 'cosmos' ? 'Executing' : 'Approving' })
        }

        const { call } = { ...data }
        const { transactionHash, transactionIndex, logIndex, _logIndex, returnValues } = { ...call }
        let { messageId } = { ...returnValues }
        const eventIndex = _logIndex
        messageId = messageId || (transactionHash && typeof _logIndex === 'number' ? `${transactionHash}-${_logIndex}` : null)
        const escapeAfterConfirm = false

        console.log('[manualRelayToDestChain request]', { transactionHash, logIndex, eventIndex, escapeAfterConfirm, messageId })
        const response = await api.manualRelayToDestChain(transactionHash, logIndex, eventIndex, { useWindowEthereum: true, signer }, escapeAfterConfirm, messageId)
        console.log('[manualRelayToDestChain response]', response)
        const { success, error, confirmTx, signCommandTx, routeMessageTx } = { ...response }
        const { message } = { ...error }

        if (success) {
          await sleep(15 * 1000)
        }
        if (!afterPayGas || success) {
          setResponse({
            status: success || !error ? 'success' : 'failed',
            message: message || error || `${destination_chain_type === 'cosmos' ? 'Execute' : 'Approve'} successful`,
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
    if (signer && api && data) {
      setProcessing(true)
      resetTxHashEdit()
      try {
        setResponse({ status: 'pending', message: 'Executing' })

        const { call, approved } = { ...data }
        const { transactionHash, transactionIndex, logIndex } = { ...call }
        const { chain } = { ...approved }
        const { execute_gas_limit_buffer } = { ...parameters }
        const gasLimitBuffer = execute_gas_limit_buffer[ENVIRONMENT]?.[chain] || execute_gas_limit_buffer[ENVIRONMENT]?.default

        console.log('[execute request]', { transactionHash, logIndex, gasLimitBuffer })
        const response = await api.execute(transactionHash, logIndex, { useWindowEthereum: true, signer, gasLimitBuffer })
        console.log('[execute response]', response)
        const { success, error, transaction } = { ...response }
        const { message } = { ...error }

        setResponse({
          status: success && transaction ? 'success' : 'failed',
          message: message || error || (transaction ? 'Execute successful' : 'Error Execution. Please see the error on console.'),
          hash: transaction?.transactionHash,
          chain,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const reExecute = async data => {
    if (data) {
      setProcessing(true)
      resetTxHashEdit()
      try {
        setResponse({ status: 'pending', message: 'Re-Executing' })

        const { call } = { ...data }
        const { transactionHash, transactionIndex, logIndex, messageIdIndex } = { ...call }
        const params = {
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: messageIdIndex || logIndex,
          event: 'not_executed',
        }

        console.log('[reExecute request]', { ...params })
        const response = await save(params)
        console.log('[reExecute response]', response)
        const { result } = { ...response?.response }
        const success = result === 'updated' || response?.event === 'not_executed'

        if (success) {
          await sleep(15 * 1000)
        }
        setResponse({
          status: success ? 'success' : 'failed',
          message: success ? 'Start re-execute process successful' : 'Cannot start re-execute process',
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const refund = async data => {
    if (data) {
      setProcessing(true)
      resetTxHashEdit()
      try {
        setResponse({ status: 'pending', message: 'Refunding' })

        const { call } = { ...data }
        const { transactionHash, transactionIndex, logIndex, messageIdIndex } = { ...call }
        const params = {
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: messageIdIndex || logIndex,
          event: 'to_refund',
        }

        console.log('[refund request]', { ...params })
        const response = await save(params)
        console.log('[refund response]', response)
        const { result } = { ...response?.response }
        const success = result === 'updated' || response?.event === 'to_refund'

        if (success) {
          await sleep(15 * 1000)
        }
        setResponse({
          status: success ? 'success' : 'failed',
          message: success ? 'Start refund process successful' : 'Cannot start refund process',
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
    }
  }

  const setExpress = async data => {
    if (data) {
      setProcessing(true)
      try {
        setResponse({ status: 'pending', message: 'Editing' })

        const { call, approved } = { ...data }
        const { transactionHash, transactionIndex, logIndex, messageIdIndex, returnValues } = { ...call }
        const { symbol, amount } = { ...returnValues }
        const { chain } = { ...approved }
        const isWithToken = !!(symbol && amount)
        const params = {
          event: isWithToken ? 'expressExecuteWithToken' : 'expressExecute',
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: messageIdIndex || logIndex,
          transactionHash: txHashExpress,
        }

        console.log('[setExpress request]', { ...params })
        const response = await save(params)
        console.log('[setExpress response]', response)
        const { result } = { ...response }
        const success = result === 'updated'

        setResponse({
          status: success ? 'success' : 'failed',
          message: success ? 'Edit express successful' : 'Failed to edit express',
          hash: txHashExpress,
          chain,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
      resetTxHashEdit()
    }
  }

  const setExecuted = async data => {
    if (data) {
      setProcessing(true)
      try {
        setResponse({ status: 'pending', message: 'Editing' })

        const { call, approved } = { ...data }
        const { transactionHash, transactionIndex, logIndex, messageIdIndex } = { ...call }
        const { chain } = { ...approved }
        const params = {
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: messageIdIndex || logIndex,
          transactionHash: txHashExecuted,
          relayerAddress: address,
        }

        console.log('[setExecuted request]', { ...params })
        const response = await save(params)
        console.log('[setExecuted response]', response)
        const { result } = { ...response }
        const success = result === 'updated'

        setResponse({
          status: success ? 'success' : 'failed',
          message: success ? 'Edit executed successful' : 'Failed to edit executed',
          hash: txHashExecuted,
          chain,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
      resetTxHashEdit()
    }
  }

  const setRefunded = async data => {
    if (data) {
      setProcessing(true)
      try {
        setResponse({ status: 'pending', message: 'Editing' })

        const { call } = { ...data }
        const { chain, transactionHash, transactionIndex, logIndex, messageIdIndex } = { ...call }
        const params = {
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: messageIdIndex || logIndex,
          transactionHash: txHashRefunded,
          relayerAddress: address,
          event: 'refunded',
        }

        console.log('[setRefunded request]', { ...params })
        const response = await save(params)
        console.log('[setRefunded response]', response)
        const { result } = { ...response }
        const success = result === 'updated'

        setResponse({
          status: success ? 'success' : 'failed',
          message: success ? 'Edit refunded successful' : 'Failed to edit refunded',
          hash: txHashRefunded,
          chain,
        })
      } catch (error) {
        setResponse({ status: 'failed', ...parseError(error) })
      }
      setProcessing(false)
      resetTxHashEdit()
    }
  }

  const {
    call,
    gas_paid,
    gas_paid_to_callback,
    express_executed,
    confirm,
    confirm_failed,
    confirm_failed_event,
    approved,
    executed,
    is_executed,
    error,
    refunded,
    fees,
    gas,
    is_invalid_destination_chain,
    is_invalid_call,
    is_call_from_relayer,
    is_insufficient_fee,
    is_not_enough_gas,
    not_enough_gas_to_execute,
    no_gas_remain,
    not_to_refund,
    callback_data,
  } = { ...data }
  const { chain, chain_type, destination_chain_type, proposal_id } = { ...call }
  const { destinationChain, payload, symbol } = { ...call?.returnValues }
  const { usd } = { ...fees?.source_token?.token_price }

  const source_chain_data = getChainData(chain, chains_data)
  const destination_chain_data = getChainData(destinationChain, chains_data)

  const [txHash, txIndex, txLogIndex] = getTransactionKey(tx)
  const matched = ((equalsIgnoreCase(txHash, data?.call?.transactionHash) || equalsIgnoreCase(txHash.substring(txHash?.startsWith('0x') ? 2 : 0), data?.call?.axelarTransactionHash) || data?.id?.startsWith(txHash?.toLowerCase())) && (typeof txIndex !== 'number' || txIndex === data.call.transactionIndex) && (typeof txLogIndex !== 'number' || txLogIndex === data.call.logIndex || txLogIndex === data.call.messageIdIndex)) || (txHash && Object.values({ ...data }).filter(d => typeof d === 'object').findIndex(d => equalsIgnoreCase(txHash, d?.transactionHash) || equalsIgnoreCase(txHash, d?.axelarTransactionHash)) > -1)
  const notFound = data && Object.keys(data).length < 1
  const STAGING = process.env.NEXT_PUBLIC_APP_URL?.includes('staging') || (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  const EDITABLE = edit === 'true' && (ENVIRONMENT !== 'mainnet' || STAGING)
  const wrongSourceChain = source_chain_data && source_chain_data.chain_id !== (chain_type === 'cosmos' ? cosmos_wallet_data?.chain_id : chain_id)
  const wrongDestinationChain = destination_chain_data && destination_chain_data.chain_id !== (destination_chain_type === 'cosmos' ? cosmos_wallet_data?.chain_id : chain_id)
  const { status, message, hash } = { ...response }
  const { explorer } = { ...getChainData(response?.chain, chains_data) }

  const addGasButton = chain_type === 'cosmos' ?
    (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee) && !executed && !is_executed &&
    call && moment().diff(moment(call.block_timestamp * 1000), 'minutes') >= 1 &&
    (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee || is_not_enough_gas || not_enough_gas_to_execute || gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT) && (
      <div key="pay_gas" className="flex items-center space-x-1">
        {cosmos_wallet_data?.signer && !wrongSourceChain && (
          <button
            disabled={processing}
            onClick={() => addGas(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
          >
            <span className="whitespace-nowrap font-medium">
              {gas_paid ? 'Add' : 'Pay'} gas
            </span>
          </button>
        )}
        <COSMOSWallet connectChainId={source_chain_data?.chain_id} />
      </div>
    ) :
    (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee) && !executed && !is_executed && chain_type !== 'cosmos' &&
    (!(gas_paid || gas_paid_to_callback) || is_insufficient_fee || is_not_enough_gas || not_enough_gas_to_execute || gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT) && (
      <div key="pay_gas" className="flex items-center space-x-1">
        {signer && !wrongSourceChain && (
          <button
            disabled={processing}
            onClick={() => addGas(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
          >
            <span className="whitespace-nowrap font-medium">
              {gas_paid ? 'Add' : 'Pay'} gas
            </span>
          </button>
        )}
        <EVMWallet connectChainId={source_chain_data?.chain_id} />
      </div>
    )

  const { finality } = { ...parameters }
  const finalityTime = estimatedTimeSpent?.confirm ? estimatedTimeSpent.confirm + 15 : finality[ENVIRONMENT]?.[chain] || finality[ENVIRONMENT]?.default
  const approveButton =
    call && !confirm_failed && !(destination_chain_type === 'cosmos' ? confirm && confirm.poll_id !== confirm_failed_event?.poll_id : approved) && (!executed || (error && executed.axelarTransactionHash && !executed.transactionHash)) && !is_executed &&
    !(is_invalid_destination_chain || is_invalid_call || (is_insufficient_fee && !EDITABLE) || (!gas?.gas_remain_amount && !gas_paid_to_callback && !is_call_from_relayer && !proposal_id)) &&
    (confirm || moment().diff(moment(call.block_timestamp * 1000), 'seconds') >= finalityTime) &&
    moment().diff(moment((confirm || call).block_timestamp * 1000), 'minutes') >= 1 && (
      <div key="approve" className="flex items-center space-x-1">
        <button
          disabled={processing}
          onClick={() => approve(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            {chain_type !== 'cosmos' && !confirm ? 'Confirm' : 'Approve'}
          </span>
        </button>
      </div>
    )

  const executeButton = destination_chain_type === 'cosmos' ?
    payload && (chain_type !== 'evm' || confirm) && !executed && !is_executed && (error || moment().diff(moment((confirm?.block_timestamp || call.block_timestamp) * 1000), 'minutes') >= 5) && (
      <div key="execute" className="flex items-center space-x-1">
        <button
          disabled={processing}
          onClick={() => approve(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Execute
          </span>
        </button>
      </div>
    ) :
    payload && approved && !executed && !is_executed && destination_chain_type !== 'cosmos' &&
    (error || moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2) && (
      <div key="execute" className="flex items-center space-x-1">
        {signer && !wrongDestinationChain && (
          <button
            disabled={processing}
            onClick={() => execute(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
          >
            <span className="font-medium">
              Execute
            </span>
          </button>
        )}
        <EVMWallet connectChainId={destination_chain_data?.chain_id} />
      </div>
    )

  const reExecuteButton =
    EDITABLE && approved && !executed && (is_executed || (error && !error.receipt)) &&
    moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2 && (
      <div key="re_execute" className="flex items-center space-x-1">
        <button
          disabled={processing}
          onClick={() => reExecute(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Re-Execute
          </span>
        </button>
      </div>
    )

  const refundButton =
    EDITABLE && !approveButton && !executeButton && !no_gas_remain && call?.chain_type !== 'cosmos' && gas_paid && (approved?.block_timestamp < moment().subtract(5, 'minutes').unix() || is_invalid_destination_chain || is_invalid_call || is_insufficient_fee) &&
    ((executed && (!callback_data || moment().diff(moment((executed.block_timestamp) * 1000), 'minutes') >= 10)) || is_executed || error || is_invalid_destination_chain || is_invalid_call || is_insufficient_fee) &&
    (EDITABLE || (
      !not_to_refund && gas?.gas_remain_amount >= MIN_GAS_REMAIN_AMOUNT && (gas.gas_remain_amount / gas.gas_paid_amount > 0.1 || gas.gas_remain_amount * usd > 1 || (is_insufficient_fee && gas.gas_paid_amount < gas.gas_base_fee_amount && gas.gas_paid_amount * usd > 1)) &&
      (!refunded || refunded.error || refunded.block_timestamp < gas_paid?.block_timestamp)
    )) && (
      <div key="refund" className="flex items-center space-x-1">
        <button
          disabled={processing}
          onClick={() => refund(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Refund
          </span>
        </button>
      </div>
    )

  const setExpressButton =
    EDITABLE && fees?.express_supported && call && !express_executed && moment().diff(moment(call.block_timestamp * 1000), 'minutes') >= 2 && (
      <div key="set_express" className="flex items-center space-x-1">
        <input
          placeholder="Tx Hash"
          value={txHashExpress}
          onChange={e => setTxHashExpress(split(e.target.value, 'normal', ' ').join(''))}
          className="w-32 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2"
        />
        <button
          disabled={processing || !txHashExpress}
          onClick={() => setExpress(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Save
          </span>
        </button>
      </div>
    )

  const setExecutedButton =
    EDITABLE && approved && !executed && moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2 && (
      <div key="set_executed" className="flex items-center space-x-1">
        <input
          placeholder="Tx Hash"
          value={txHashExecuted}
          onChange={e => setTxHashExecuted(split(e.target.value, 'normal', ' ').join(''))}
          className="w-32 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium py-1 px-2"
        />
        <button
          disabled={processing || !txHashExecuted}
          onClick={() => setExecuted(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Save
          </span>
        </button>
      </div>
    )

  const setRefundedButton =
    EDITABLE && (executed || is_executed || error) &&
    moment().diff(moment((executed?.block_timestamp || error?.block_timestamp || approved?.block_timestamp || confirm?.block_timestamp) * 1000), 'minutes') >= 10 && (
      <div key="set_refunded" className="flex items-center space-x-1">
        <input
          placeholder="Tx Hash"
          value={txHashRefunded}
          onChange={e => setTxHashRefunded(split(e.target.value, 'normal', ' ').join(''))}
          className="w-32 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-200 text-xs font-medium text-base py-1 px-2"
        />
        <button
          disabled={processing || !txHashRefunded}
          onClick={() => setRefunded(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${processing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
        >
          <span className="font-medium">
            Save
          </span>
        </button>
      </div>
    )

  return (
    <div className="children px-3">
      {data && (matched || notFound) ?
        <div className="max-w-6xl space-y-8 sm:space-y-12 pt-6 sm:pt-8 mx-auto">
          {notFound ?
            <span className="text-slate-400 dark:text-slate-500 text-base">
              Transaction not found
            </span> :
            <>
              <div className="space-y-4 sm:space-y-6">
                <Info
                  data={{ ...data, estimated_time_spent: estimatedTimeSpent }}
                  buttons={
                    Object.fromEntries(
                      toArray([
                        addGasButton && ['pay_gas', addGasButton],
                        setExpressButton && ['express', setExpressButton],
                        approveButton && [chain_type !== 'cosmos' && !confirm ? 'confirm' : 'approve', approveButton],
                        (executeButton || reExecuteButton || refundButton || setExecutedButton) && ['execute', toArray([executeButton, reExecuteButton, refundButton, setExecutedButton])],
                        setRefundedButton && ['refund', setRefundedButton],
                      ])
                    )
                  }
                />
                {response && (
                  <Alert
                    show={!!response}
                    color={status === 'success' ? 'green' : status === 'failed' ? 'red' : 'blue'}
                    icon={status === 'success' ? <IoCheckmarkCircleOutline size={26} /> : status === 'failed' ? <IoCloseCircleOutline size={26} /> : <IoTimeOutline size={26} />}
                    animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                    onClose={() => setResponse(null)}
                    className="alert-box flex"
                  >
                    <div className="flex flex-col text-base">
                      <span>{message}</span>
                      {hash && (
                        <ExplorerLink
                          value={hash}
                          explorer={explorer}
                          width={18}
                          height={18}
                          iconOnly={false}
                          viewOnClassName="font-semibold pr-0.5"
                        />
                      )}
                    </div>
                  </Alert>
                )}
              </div>
              <Details data={data} />
              <Arguments data={data} />
            </>
          }
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}