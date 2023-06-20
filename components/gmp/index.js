import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { BigNumber, Contract, FixedNumber, constants, providers, utils } from 'ethers'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { ProgressBar, TailSpin, Watch, ColorRing } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { BiCheckCircle, BiXCircle, BiTime, BiSave, BiEditAlt } from 'react-icons/bi'
import { MdRefresh } from 'react-icons/md'
import { HiArrowSmRight, HiArrowSmLeft } from 'react-icons/hi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'
import { RiCloseCircleFill, RiTimerFlashLine } from 'react-icons/ri'

import EnsProfile from '../ens-profile'
import AccountProfile from '../account-profile'
import Image from '../image'
import Copy from '../copy'
import Notification from '../notifications'
import Wallet from '../wallet'
import parameters from '../../data/gmp/parameters'
import { isContractCallApproved } from '../../lib/api/gmp'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equalsIgnoreCase, total_time_string, loader_color, sleep } from '../../lib/utils'
import IAxelarExecutable from '../../data/contracts/interfaces/IAxelarExecutable.json'

const MIN_GAS_REMAIN_AMOUNT = 0.000001

export default () => {
  const {
    preferences,
    evm_chains,
    cosmos_chains,
    assets,
    wallet,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        cosmos_chains: state.cosmos_chains,
        assets: state.assets,
        wallet: state.wallet,
      },
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
  const {
    wallet_data,
  } = { ...wallet }
  const {
    default_chain_id,
    chain_id,
    provider,
    web3_provider,
    address,
    signer,
  } = { ...wallet_data }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    tx,
    edit,
  } = { ...query }

  const [api, setApi] = useState(null)
  const [gmp, setGmp] = useState(null)
  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [executeResponse, setExecuteResponse] = useState(null)
  const [gasAdding, setGasAdding] = useState(null)
  const [gasAddResponse, setGasAddResponse] = useState(null)
  const [refunding, setRefunding] = useState(null)
  const [refundResponse, setRefundResponse] = useState(null)
  const [txHashEdit, setTxHashEdit] = useState(null)
  const [txHashEditing, setTxHashEditing] = useState(false)
  const [txHashEditUpdating, setTxHashEditUpdating] = useState(false)
  const [txHashRefundEdit, setTxHashRefundEdit] = useState(null)
  const [txHashRefundEditing, setTxHashRefundEditing] = useState(false)
  const [txHashRefundEditUpdating, setTxHashRefundEditUpdating] = useState(false)

  useEffect(
    () => {
      if (!api) {
        setApi(new AxelarGMPRecoveryAPI({ environment: process.env.NEXT_PUBLIC_ENVIRONMENT, axelarRpcUrl: process.env.NEXT_PUBLIC_RPC_URL, axelarLcdUrl: process.env.NEXT_PUBLIC_LCD_URL }))
      }
    },
    [],
  )

  useEffect(
    () => {
      const getData = () => getMessage()

      if (!approving && !executing && !txHashEditing && !txHashRefundEditing) {
        getData()
      }

      const interval = setInterval(() => getData(), 0.15 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [evm_chains_data, cosmos_chains_data, tx, api, approving, executing, txHashEditing, txHashRefundEditing],
  )

  const getMessage = async () => {
    if (evm_chains_data && cosmos_chains_data && tx && api) {
      if (gmp) {
        await sleep(2 * 1000)

        if (gmp.tx !== tx) {
          setGmp(null)
          resetTxHashEdit()
        }
      }

      const response =
        await api.execGet(
          process.env.NEXT_PUBLIC_GMP_API_URL,
          {
            method: 'searchGMP',
            txHash: tx,
          },
        )

      const data = _.head(response)

      const {
        approved,
      } = { ...data }

      // callback data of 2-way call (if exists)
      let {
        callback,
      } = { ...data }

      if (callback?.transactionHash) {
        const _response =
          await api.execGet(
            process.env.NEXT_PUBLIC_GMP_API_URL,
            {
              method: 'searchGMP',
              txHash: callback.transactionHash,
              txIndex: callback.transactionIndex,
              txLogIndex: callback.logIndex,
            },
          )

        callback = (_response || []).find(d => equalsIgnoreCase(d?.call?.transactionHash, callback.transactionHash))
      }

      // origin data of 2-way call (query on 2nd call only)
      let origin

      const {
        call,
        gas_paid,
        gas_paid_to_callback,
        is_call_from_relayer,
      } = { ...data }

      if (call && !gas_paid && (gas_paid_to_callback || is_call_from_relayer)) {
        const _response =
          await api.execGet(
            process.env.NEXT_PUBLIC_GMP_API_URL,
            {
              method: 'searchGMP',
              txHash: call.transactionHash,
            },
          )

        origin = (_response || []).find(d => equalsIgnoreCase(d?.executed?.transactionHash, call.transactionHash))
      }

      let execute_data
      let is_approved

      if (approved) {
        const {
          destinationChain,
          payload,
        } = { ...data.call?.returnValues }

        const {
          contractAddress,
          commandId,
          sourceChain,
          sourceAddress,
          payloadHash,
          symbol,
          amount,
        } = { ...approved.returnValues }

        // setup provider
        const chain_data = getChain(destinationChain, chains_data)

        const {
          chain_id,
          provider_params,
        } = { ...chain_data }

        const {
          rpcUrls,
        } = { ..._.head(provider_params) }

        const rpcs = rpcUrls || []

        const provider =
          rpcs.length === 1 ?
            new providers.StaticJsonRpcProvider(_.head(rpcs), chain_id) :
            new providers.FallbackProvider(
              rpcs.map((url, i) => {
                return {
                  provider: new providers.StaticJsonRpcProvider(url, chain_id),
                  priority: i + 1,
                  stallTimeout: 1000,
                }
              }),
              rpcs.length / 3,
            )

        const contract = new Contract(contractAddress, IAxelarExecutable.abi, provider)

        const method = `execute${symbol ? 'WithToken' : ''}`

        let _response

        switch (method) {
          case 'execute':
            _response =
              await contract
                .populateTransaction
                .execute(
                  commandId,
                  sourceChain,
                  sourceAddress,
                  payload,
                )
            break
          case 'executeWithToken':
            _response =
              await contract
                .populateTransaction
                .executeWithToken(
                  commandId,
                  sourceChain,
                  sourceAddress,
                  payload,
                  symbol,
                  BigNumber.from(amount),
                )
            break
          default:
            break
        }

        if (_response?.data) {
          execute_data = _response.data
        }

        if (staging || editable) {
          try {
            const _response =
              await isContractCallApproved(
                {
                  method: 'isContractCallApproved',
                  destinationChain,
                  commandId,
                  sourceChain,
                  sourceAddress,
                  contractAddress,
                  payloadHash,
                  symbol: symbol || undefined,
                  amount: amount ? BigNumber.from(amount).toString() : undefined,
                },
              )

            const {
              result,
            } = { ..._response }

            is_approved = result       
          } catch (error) {}
        }
      }

      const _gmp = {
        data,
        execute_data,
        is_approved,
        callback,
        origin,
        tx,
      }

      console.log(
        '[data]',
        _gmp,
      )

      setGmp(_gmp)

      return data
    }

    return null
  }

  const resetTxHashEdit = () => {
    setApproveResponse(null)
    setExecuteResponse(null)
    setGasAddResponse(null)
    setRefundResponse(null)
    setTxHashEdit(null)
    setTxHashEditing(false)
    setTxHashEditUpdating(false)
    setTxHashRefundEdit(null)
    setTxHashRefundEditing(false)
    setTxHashRefundEditUpdating(false)
  }

  const saveGMP = async (
    sourceTransactionHash,
    sourceTransactionIndex,
    sourceTransactionLogIndex,
    transactionHash,
    relayerAddress,
    error,
    event,
  ) => {
    const params = {
      method: 'saveGMP',
      sourceTransactionHash,
      sourceTransactionIndex,
      sourceTransactionLogIndex,
      transactionHash,
      relayerAddress,
      error,
      event,
    }

    await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })

    getMessage()
    resetTxHashEdit()
  }

  const approve = async (
    data,
    is_after_pay_gas = false,
  ) => {
    if (api && data) {
      try {
        setApproving(true)

        if (!is_after_pay_gas) {
          setApproveResponse(
            {
              status: 'pending',
              message: 'Approving',
            }
          )
        }

        const {
          call,
        } = { ...data }

        const {
          transactionHash,
          transactionIndex,
          logIndex,
        } = { ...call }

        console.log(
          '[approve request]',
          { transactionHash },
        )

        const response = await api.manualRelayToDestChain(transactionHash)

        console.log(
          '[approve response]',
          response,
        )

        const {
          success,
          error,
          signCommandTx,
        } = { ...response }

        if (success) {
          await sleep(15 * 1000)
        }

        setApproving(false)

        if (!is_after_pay_gas || success) {
          setApproveResponse(
            {
              status: success ? 'success' : 'failed',
              message: error?.message || error || 'Approve successful',
              txHash: signCommandTx?.txhash,
              is_axelar_transaction: true,
            }
          )
        }
      } catch (error) {
        const message = error?.reason || error?.data?.message || error?.data?.text || error?.message

        setApproving(false)
        setApproveResponse(
          {
            status: 'failed',
            message,
          }
        )
      }
    }
  }

  const execute = async data => {
    if (api && signer && data) {
      try {
        setExecuting(true)
        setExecuteResponse(
          {
            status: 'pending',
            message: 'Executing',
          }
        )

        const {
          call,
          approved,
        } = { ...data }

        const {
          transactionHash,
          transactionIndex,
          logIndex,
        } = { ...call }

        const {
          chain,
        } = { ...approved }

        const {
          execute_gas_limit_buffer,
        } = { ...parameters }

        const gasLimitBuffer = execute_gas_limit_buffer[process.env.NEXT_PUBLIC_ENVIRONMENT]?.[chain] || execute_gas_limit_buffer[process.env.NEXT_PUBLIC_ENVIRONMENT]?.default

        console.log(
          '[execute request]',
          {
            transactionHash,
            logIndex,
            gasLimitBuffer,
          },
        )

        const response =
          await api.execute(
            transactionHash,
            logIndex,
            {
              useWindowEthereum: true,
              gasLimitBuffer,
            },
          )

        console.log(
          '[execute response]',
          response,
        )

        const {
          success,
          error,
          transaction,
        } = { ...response }

        setExecuting(false)
        setExecuteResponse(
          {
            status: success && transaction ? 'success' : 'failed',
            message: error?.message || error || (transaction ? 'Execute successful' : 'Error Execution. Please see the error on console.'),
            txHash: transaction?.transactionHash,
          }
        )
      } catch (error) {
        const message = error?.reason || error?.data?.message || error?.data?.text || error?.message

        setExecuting(false)
        setExecuteResponse(
          {
            status: 'failed',
            message,
          }
        )
      }
    }
  }

  const addNativeGas = async data => {
    if (api && signer && data) {
      try {
        setGasAdding(true)
        setGasAddResponse(
          {
            status: 'pending',
            message: 'Estimating & Paying gas',
          }
        )

        const {
          call,
          approved,
        } = { ...data }

        const {
          chain,
          transactionHash,
          transactionIndex,
          logIndex,
          returnValues,
        } = { ...call }

        const {
          destinationChain,
        } = { ...returnValues }

        const {
          gas_add_adjustment,
        } = { ...parameters }

        const gasMultipler = gas_add_adjustment[process.env.NEXT_PUBLIC_ENVIRONMENT]?.[destinationChain?.toLowerCase()] || gas_add_adjustment[process.env.NEXT_PUBLIC_ENVIRONMENT]?.default

        console.log(
          '[addNativeGas request]',
          {
            chain,
            transactionHash,
            refundAddress: address,
            gasMultipler,
          },
        )

        const response =
          await api.addNativeGas(
            chain,
            transactionHash,
            {
              useWindowEthereum: true,
              refundAddress: address,
              gasMultipler,
            },
          )

        console.log(
          '[addNativeGas response]',
          response,
        )

        const {
          success,
          error,
          transaction,
        } = { ...response }

        let _data

        if (success) {
          await sleep(1 * 1000)
          _data = await getMessage()
        }

        setGasAdding(false)
        setGasAddResponse(
          {
            status: success ? 'success' : 'failed',
            message: error?.message || error || 'Pay gas successful',
            txHash: transaction?.transactionHash,
          }
        )

        if (success && !approved) {
          if (_data) {
            data = _data
          }

          if (!data.approved) {
            approve(data, true)
          }
        }
      } catch (error) {
        const message = error?.reason || error?.data?.message || error?.data?.text || error?.message

        setGasAdding(false)
        setGasAddResponse(
          {
            status: 'failed',
            message,
          }
        )
      }
    }
  }

  const refund = async data => {
    if (api && data) {
      try {
        setRefunding(true)
        setRefundResponse(
          {
            status: 'pending',
            message: 'Refunding',
          }
        )

        const {
          call,
        } = { ...data }

        const {
          transactionHash,
          transactionIndex,
          logIndex,
        } = { ...call }

        const params = {
          method: 'saveGMP',
          sourceTransactionHash: transactionHash,
          sourceTransactionIndex: transactionIndex,
          sourceTransactionLogIndex: logIndex,
          event: 'to_refund',
        }

        console.log(
          '[refund request]',
          { ...params },
        )

        const _response = await api.execPost(process.env.NEXT_PUBLIC_GMP_API_URL, '', params)

        console.log(
          '[refund response]',
          _response,
        )

        const {
          response,
        } = { ..._response }

        const {
          result,
        } = { ...response }

        const success = result === 'updated' || _response?.event === 'to_refund'

        if (success) {
          await sleep(15 * 1000)
        }

        setRefunding(false)
        setRefundResponse(
          {
            status: success ? 'success' : 'failed',
            message: success ? 'Start refund process successful' : 'Cannot start refund process',
          }
        )
      } catch (error) {
        const message = error?.reason || error?.data?.message || error?.data?.text || error?.message

        setRefunding(false)
        setRefundResponse(
          {
            status: 'failed',
            message,
          }
        )
      }
    }
  }

  const {
    data,
    execute_data,
    callback,
    origin,
  } = { ...gmp }

  const {
    call,
    gas_paid,
    gas_paid_to_callback,
    express_executed,
    confirm,
    approved,
    executed,
    is_executed,
    error,
    refunded,
    fees,
    status,
    gas,
    is_invalid_destination_chain,
    is_invalid_call,
    is_insufficient_fee,
    is_call_from_relayer,
    not_enough_gas_to_execute,
    command_id,
  } = { ...data }
  let {
    is_not_enough_gas,
    no_gas_remain,
  } = { ...data }

  const {
    event,
    chain,
    chain_type,
    destination_chain_type,
  } = { ...call }

  const {
    sender,
    destinationChain,
    destinationContractAddress,
    payloadHash,
    payload,
    symbol,
    amount,
  } = { ...call?.returnValues }

  const {
    from,
  } = { ...call?.transaction }

  const {
    sourceChain,
  } = { ...approved?.returnValues }
  let {
    commandId,
  } = { ...approved?.returnValues }

  commandId = commandId || command_id

  const relayer = executed?.transaction?.from

  is_not_enough_gas =
    is_not_enough_gas ||
    (error?.transaction?.gasLimit && error.receipt?.gasUsed ?
      Number(
        FixedNumber.fromString(BigNumber.from(error.receipt.gasUsed).toString())
          .divUnsafe(
            FixedNumber.fromString(BigNumber.from(error.transaction.gasLimit).toString())
          )
          .toString()
      ) > 0.95 :
      is_not_enough_gas
    )

  no_gas_remain = gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT || (typeof no_gas_remain === 'boolean' ? no_gas_remain : refunded && !refunded.receipt?.status)

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const source_chain_data = getChain(chain, chains_data)
  const axelar_chain_data = getChain('axelarnet', chains_data)
  const destination_chain_data = getChain(destinationChain, chains_data)

  const asset_data = (assets_data || [])
    .find(a =>
      equalsIgnoreCase(a?.symbol, symbol) ||
      (a?.contracts || []).findIndex(c => c?.chain_id === source_chain_data?.chain_id && equalsIgnoreCase(c.symbol, symbol)) > -1 ||
      (a?.contracts || []).findIndex(c => equalsIgnoreCase(c.symbol, symbol)) > -1 ||
      (a?.ibc || []).findIndex(c => equalsIgnoreCase(c.symbol, symbol)) > -1
    )

  const source_contract_data = (asset_data?.contracts || []).find(c => c.chain_id === source_chain_data?.chain_id)

  const decimals = source_contract_data?.decimals || asset_data?.decimals || 18
  const _symbol = source_contract_data?.symbol || asset_data?.symbol || symbol
  const asset_image = source_contract_data?.image || asset_data?.image

  const wrong_source_chain = source_chain_data && chain_id !== source_chain_data.chain_id && !gasAdding
  const wrong_destination_chain = destination_chain_data && chain_id !== destination_chain_data.chain_id && !executing

  const staging = ['staging', 'localhost'].findIndex(s => process.env.NEXT_PUBLIC_SITE_URL?.includes(s)) > -1
  const editable = edit === 'true' && (staging || !['mainnet'].includes(process.env.NEXT_PUBLIC_ENVIRONMENT))

  const approveButton =
    call && (confirm || moment().diff(moment(call.block_timestamp * 1000), 'minutes') >= 5) && !(destination_chain_type === 'cosmos' ? confirm : approved) && !executed && !is_executed &&
    !(is_invalid_destination_chain || is_invalid_call || is_insufficient_fee || !gas?.gas_remain_amount) &&
    moment().diff(moment((confirm || call).block_timestamp * 1000), 'minutes') >= 1 &&
    (
      <div className="flex items-center space-x-2">
        <button
          disabled={approving}
          onClick={() => approve(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${approving ? 'pointer-events-none' : ''} rounded flex items-center text-white space-x-1.5 py-1 px-2`}
        >
          {
            approving &&
            (
              <TailSpin
                width="16"
                height="16"
                color="white"
              />
            )
          }
          <span>
            Approve
          </span>
        </button>
      </div>
    )

  const executeButton =
    payload && approved && !executed && !is_executed && destination_chain_type !== 'cosmos' &&
    (error || moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2) &&
    (
      <>
        <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs pt-1">
          Execute at destination chain
        </span>
        <div className="flex items-center space-x-2">
          {
            web3_provider && !wrong_destination_chain &&
            (
              <button
                disabled={executing}
                onClick={() => execute(data)}
                className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${executing ? 'pointer-events-none' : ''} rounded flex items-center text-white space-x-1.5 py-1 px-2`}
              >
                {
                  executing &&
                  (
                    <TailSpin
                      width="16"
                      height="16"
                      color="white"
                    />
                  )
                }
                <span>
                  Execute
                </span>
              </button>
            )
          }
          <Wallet
            connectChainId={wrong_destination_chain && (destination_chain_data.chain_id || default_chain_id)}
          />
        </div>
      </>
    )

  const gasAddButton = (is_insufficient_fee || !(gas_paid || gas_paid_to_callback)) &&
    !executed && !is_executed && chain_type !== 'cosmos' &&
    (is_not_enough_gas || !(gas_paid || gas_paid_to_callback) || is_insufficient_fee || gas?.gas_remain_amount < MIN_GAS_REMAIN_AMOUNT || not_enough_gas_to_execute) &&
    (
      <>
        <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs">
          {gas_paid ? 'Add' : 'Pay'} gas at source chain
        </span>
        <div className="flex items-center space-x-2">
          {
            web3_provider && !wrong_source_chain &&
            (
              <button
                disabled={gasAdding}
                onClick={() => addNativeGas(data)}
                className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${gasAdding ? 'pointer-events-none' : ''} rounded flex items-center text-white space-x-1.5 py-1 px-2`}
              >
                {
                  gasAdding &&
                  (
                    <TailSpin
                      width="16"
                      height="16"
                      color="white"
                    />
                  )
                }
                <span className="whitespace-nowrap">
                  Add gas
                </span>
              </button>
            )
          }
          <Wallet
            connectChainId={wrong_source_chain && (source_chain_data.chain_id || default_chain_id)}
          />
        </div>
      </>
    )

  const refundButton =
    !approveButton && !executeButton && !no_gas_remain && call?.chain_type !== 'cosmos' &&
    ((executed && (!callback || moment().diff(moment((executed.block_timestamp) * 1000), 'minutes') >= 10)) || error || is_executed || is_invalid_destination_chain || is_invalid_call || is_insufficient_fee) &&
    (approved?.block_timestamp < moment().subtract(3, 'minutes').unix() || is_invalid_destination_chain || is_invalid_call || is_insufficient_fee) &&
    (
      editable ||
      (
        (
          (gas?.gas_remain_amount >= MIN_GAS_REMAIN_AMOUNT && (gas.gas_remain_amount / gas.gas_paid_amount > 0.1 || gas.gas_remain_amount * fees?.source_token?.token_price?.usd > 1)) ||
          (gas?.gas_remain_amount >= MIN_GAS_REMAIN_AMOUNT && gas?.gas_paid_amount < gas?.gas_base_fee_amount && gas.gas_paid_amount * fees?.source_token?.token_price?.usd > 1 && is_insufficient_fee)
        ) &&
        (!refunded || refunded.error || refunded.block_timestamp < gas_paid?.block_timestamp)
      )
    ) &&
    (
      <div className="flex items-center space-x-2">
        <button
          disabled={refunding}
          onClick={() => refund(data)}
          className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${refunding ? 'pointer-events-none' : ''} rounded flex items-center text-white space-x-1.5 py-1 px-2`}
        >
          {
            refunding &&
            (
              <TailSpin
                width="16"
                height="16"
                color="white"
              />
            )
          }
          <span>
            Refund
          </span>
        </button>
      </div>
    )

  const steps = [
    {
      id: 'call',
      title: staging ? 'Called' : 'Contract Call',
      chain_data: source_chain_data,
      data: call,
    },
    {
      id: 'gas_paid',
      title: 'Gas Paid',
      chain_data: source_chain_data,
      data: gas_paid,
    },
    express_executed &&
    {
      id: 'express_executed',
      title: 'Express Executed',
      chain_data: destination_chain_data,
      data: express_executed,
    },
    call?.chain_type !== 'cosmos' &&
    {
      id: 'confirm',
      title: 'Confirmed',
      chain_data: axelar_chain_data,
      data: confirm,
    },
    call?.destination_chain_type !== 'cosmos' &&
    {
      id: 'approved',
      title: staging ? 'Approved' : 'Call Approved',
      chain_data: destination_chain_data,
      data: approved,
    },
    {
      id: 'executed',
      title: 'Executed',
      chain_data: executed?.axelarTransactionHash && !executed.transactionHash ? axelar_chain_data : destination_chain_data,
      data: executed,
    },
    refunded && (refunded.receipt?.status || no_gas_remain === false) &&
    {
      id: 'refunded',
      title: 'Refunded',
      chain_data: source_chain_data,
      data: refunded,
    },
  ]
  .filter(s => s)

  let current_step

  switch (status) {
    case 'called':
      current_step =
        steps.findIndex(s => s.id === (gas_paid || gas_paid_to_callback ? 'gas_paid' : 'call')) + 
        (!is_invalid_destination_chain && !is_invalid_call && !is_insufficient_fee && (gas_paid || gas_paid_to_callback || equalsIgnoreCase(call?.transactionHash, gas_paid?.transactionHash)) ? 1 : 0) +
        (confirm && steps.findIndex(s => s.id === 'confirm') > -1 ? 1 : 0)
      break
    case 'express_executed':
      current_step = steps.findIndex(s => s.id === 'express_executed') + (steps.findIndex(s => s.id === 'confirm') > -1 && confirm ? 1 : 0) + 1
      break
    case 'confirmed':
      current_step = (steps.findIndex(s => s.id === 'confirm') > -1 ? steps.findIndex(s => s.id === 'confirm') : steps.findIndex(s => s.id === 'approved') - 1) + 1
      break
    case 'approved':
    case 'executing':
      current_step =
        steps.findIndex(s => s.id === (gas_paid || gas_paid_to_callback ? 'approved' : 'call')) +
        (not_enough_gas_to_execute ? 0 : 1)
      break
    case 'executed':
    case 'error':
      current_step =
        steps.findIndex(s => s.id === 'executed') +
        (executed || (error && (error?.block_timestamp || approved?.block_timestamp) && moment().diff(moment((error?.block_timestamp || approved.block_timestamp) * 1000), 'seconds') >= 120) ? 1 : 0)
      break
    default:
      break
  }

  const detail_steps = steps

  const express_execute_time_spent = total_time_string(call?.block_timestamp, express_executed?.block_timestamp)
  const time_spent = total_time_string(call?.block_timestamp, executed?.block_timestamp)

  const notificationResponse = executeResponse || approveResponse || gasAddResponse || refundResponse

  const explorer = notificationResponse && (notificationResponse.is_axelar_transaction ? axelar_chain_data : executeResponse ? destination_chain_data : source_chain_data)?.explorer

  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 dark:bg-opacity-75 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 py-6 px-5'
  const titleClassName = 'w-fit bg-slate-100 dark:bg-slate-800 bg-opacity-75 dark:bg-opacity-75 rounded whitespace-nowrap uppercase text-base font-semibold py-1 px-2'

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      {tx && equalsIgnoreCase(gmp?.tx, tx) ?
        <>
          {
            notificationResponse &&
            (
              <Notification
                hideButton={true}
                outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
                innerClassNames={`${notificationResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : notificationResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
                animation="animate__animated animate__fadeInDown"
                icon={
                  notificationResponse.status === 'failed' ?
                    <BiXCircle
                      className="w-6 h-6 stroke-current mr-2"
                    /> :
                    notificationResponse.status === 'success' ?
                      <BiCheckCircle
                        className="w-6 h-6 stroke-current mr-2"
                      /> :
                      <div className="mr-2">
                        <Watch
                          color="white"
                          width="20"
                          height="20"
                        />
                      </div>
                }
                content={
                  <div className="flex items-center">
                    <span className="break-all mr-2">
                      {notificationResponse.message}
                    </span>
                    {
                      explorer?.url && notificationResponse.txHash &&
                      (
                        <a
                          href={`${explorer.url}${explorer.transaction_path?.replace('{tx}', notificationResponse.txHash)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mr-2"
                        >
                          <span className="font-semibold">
                            View on {explorer.name}
                          </span>
                        </a>
                      )
                    }
                    {
                      notificationResponse.status === 'failed' && notificationResponse.message &&
                      (
                        <Copy
                          size={20}
                          value={notificationResponse.message}
                          className="cursor-pointer text-slate-200 hover:text-white"
                        />
                      )
                    }
                  </div>
                }
                onClose={
                  () => {
                    setApproveResponse(null)
                    setExecuteResponse(null)
                    setGasAddResponse(null)
                    setRefundResponse(null)
                  }
                }
              />
            )
          }
          <div className="grid sm:grid-cols-4 gap-6">
            <div className={`${stepClassName} sm:col-span-4`}>
              <div className={`${titleClassName}`}>
                GMP
              </div>
              {data ?
                <div className="overflow-x-auto flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex flex-col space-y-3">
                    <div className="text-lg font-bold">
                      Method
                    </div>
                    <div className="space-y-1.5">
                      <div className="max-w-min bg-slate-200 dark:bg-slate-700 rounded-lg whitespace-nowrap text-base font-medium py-0.5 px-1.5">
                        {event === 'ContractCall' ? 'callContract' : event === 'ContractCallWithToken' ? 'callContractWithToken' : event || '-'}
                      </div>
                      {
                        amount && _symbol &&
                        (
                          <div className="flex items-center space-x-2">
                            {
                              asset_image &&
                              (
                                <Image
                                  src={asset_image}
                                  className="w-6 h-6 rounded-full"
                                />
                              )
                            }
                            <span className="text-sm font-semibold">
                              {
                                asset_data &&
                                (
                                  <span className="mr-1">
                                    {number_format(utils.formatUnits(BigNumber.from(amount), decimals), '0,0.000', true)}
                                  </span>
                                )
                              }
                              <span>
                                {_symbol}
                              </span>
                            </span>
                          </div>
                        )
                      }
                      {
                        gas &&
                        (
                          <div className="flex items-center space-x-1.5">
                            <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 font-medium">
                              {['executed'].includes(status) || refunded ? 'Total Gas Paid' : 'Gas Deposited'}:
                            </span>
                            {
                              typeof gas.gas_paid_amount === 'number' &&
                              (
                                <div className="max-w-min whitespace-nowrap">
                                  <span className="text-xs font-semibold">
                                    <span className="mr-1">
                                      {number_format(gas.gas_paid_amount - (refunded?.amount || 0), '0,0.00000000', true)}
                                    </span>
                                    <span>
                                      {fees?.source_token?.symbol || _.head(source_chain_data?.provider_params)?.nativeCurrency?.symbol}
                                    </span>
                                  </span>
                                </div>
                              )
                            }
                          </div>
                        )
                      }
                    </div>
                    {
                      callback?.call &&
                      (
                        <div className="space-y-1.5">
                          <Link href={`/gmp/${callback.call.transactionHash}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="max-w-min bg-blue-50 hover:bg-blue-100 dark:bg-blue-400 dark:hover:bg-blue-500 border border-blue-500 rounded-lg cursor-pointer whitespace-nowrap flex items-center text-blue-600 dark:text-white space-x-0.5 py-0.5 pl-2 pr-1"
                            >
                              <span className="text-xs font-semibold hover:font-bold">
                                2-Way Call
                              </span>
                              <HiArrowSmRight
                                size={16}
                              />
                            </a>
                          </Link>
                          <div className="flex items-center space-x-1">
                            <Link href={`/gmp/${callback.call.transactionHash}`}>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <span className="xl:hidden">
                                    {ellipse(callback.call.transactionHash, 8)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(callback.call.transactionHash, 12)}
                                  </span>
                                </div>
                              </a>
                            </Link>
                            <Copy
                              value={callback.call.transactionHash}
                            />
                          </div>
                        </div>
                      )
                    }
                    {
                      origin?.call &&
                      (
                        <div className="space-y-1.5">
                          <Link href={`/gmp/${origin.call.transactionHash}`}>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              className="max-w-min bg-blue-50 hover:bg-blue-100 dark:bg-blue-400 dark:hover:bg-blue-500 border border-blue-500 rounded-lg cursor-pointer whitespace-nowrap flex items-center text-blue-600 dark:text-white space-x-0.5 py-0.5 pl-1 pr-2"
                            >
                              <HiArrowSmLeft
                                size={16}
                              />
                              <span className="text-xs font-semibold hover:font-bold">
                                2-Way Call
                              </span>
                            </a>
                          </Link>
                          <div className="flex items-center space-x-1">
                            <Link href={`/gmp/${origin.call.transactionHash}`}>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <span className="xl:hidden">
                                    {ellipse(origin.call.transactionHash, 8)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(origin.call.transactionHash, 12)}
                                  </span>
                                </div>
                              </a>
                            </Link>
                            <Copy
                              value={origin.call.transactionHash}
                            />
                          </div>
                        </div>
                      )
                    }
                  </div>
                  <div className="flex flex-col space-y-3">
                    <div className="text-lg font-bold">
                      Source
                    </div>
                    <div className="h-8 sm:h-6 lg:h-8 flex items-center space-x-3 sm:space-x-2 lg:space-x-3">
                      {
                        source_chain_data?.image &&
                        (
                          <Image
                            src={source_chain_data.image}
                            className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                          />
                        )
                      }
                      <span className="text-base sm:text-sm lg:text-lg font-semibold">
                        {source_chain_data?.name || chain}
                      </span>
                    </div>
                    {
                      from &&
                      (
                        <div className="flex flex-col">
                          <span className="text-slate-400 dark:text-slate-200 font-medium">
                            Sender address
                          </span>
                          {from.startsWith('0x') ?
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', from)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={from}
                                  no_copy={true}
                                  fallback={
                                    <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                      {ellipse(from, 12, source_chain_data?.prefix_address)}
                                    </div>
                                  }
                                />
                              </a>
                              <Copy
                                value={from}
                              />
                            </div> :
                            <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                              <AccountProfile
                                address={from}
                                prefix={source_chain_data?.prefix_address}
                              />
                            </div>
                          }
                        </div>
                      )
                    }
                    {
                      sender &&
                      (
                        <div className="flex flex-col">
                          <span className="text-slate-400 dark:text-slate-200 font-medium">
                            Source address
                          </span>
                          {sender.startsWith('0x') ?
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={sender}
                                  no_copy={true}
                                  fallback={
                                    <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                      {ellipse(sender, 12, source_chain_data?.prefix_address)}
                                    </div>
                                  }
                                />
                              </a>
                              <Copy
                                value={sender}
                              />
                            </div> :
                            <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                              <AccountProfile
                                address={sender}
                                prefix={source_chain_data?.prefix_address}
                              />
                            </div>
                          }
                        </div>
                      )
                    }
                  </div>
                  <div className="flex flex-col space-y-3">
                    <div className="text-lg font-bold">
                      Destination
                    </div>
                    <div className="h-8 sm:h-6 lg:h-8 flex items-center space-x-3 sm:space-x-2 lg:space-x-3">
                      {
                        destination_chain_data?.image &&
                        (
                          <Image
                            src={destination_chain_data.image}
                            className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                          />
                        )
                      }
                      <span className="text-base sm:text-sm lg:text-lg font-semibold">
                        {destination_chain_data?.name || destinationChain}
                      </span>
                    </div>
                    {
                      is_invalid_destination_chain &&
                      (
                        <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                          Invalid Chain
                        </div>
                      )
                    }
                    {
                      destinationContractAddress &&
                      (
                        <div className="flex flex-col">
                          <span className="text-slate-400 dark:text-slate-200 font-medium">
                            Contract address
                          </span>
                          {destinationContractAddress.startsWith('0x') ?
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', destinationContractAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={destinationContractAddress}
                                  no_copy={true}
                                  fallback={
                                    <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                      {ellipse(destinationContractAddress, 12, destination_chain_data?.prefix_address)}
                                    </div>
                                  }
                                />
                              </a>
                              <Copy
                                value={destinationContractAddress}
                              />
                            </div> :
                            <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                              <AccountProfile
                                address={destinationContractAddress}
                                prefix={destination_chain_data?.prefix_address}
                              />
                            </div>
                          }
                        </div>
                      )
                    }
                    {
                      equalsIgnoreCase(status, 'executed') && relayer &&
                      (
                        <div className="flex flex-col">
                          <span className="text-slate-400 dark:text-slate-200 font-medium">
                            Relayer address
                          </span>
                          {relayer.startsWith('0x') ?
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', relayer)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={relayer}
                                  no_copy={true}
                                  fallback={
                                    <div className="h-5 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                      {ellipse(relayer, 12, destination_chain_data?.prefix_address)}
                                    </div>
                                  }
                                />
                              </a>
                              <Copy
                                value={relayer}
                              />
                            </div> :
                            <div className="flex items-center text-blue-500 dark:text-blue-500 font-medium">
                              <AccountProfile
                                address={relayer}
                                prefix={destination_chain_data?.prefix_address}
                              />
                            </div>
                          }
                        </div>
                      )
                    }
                  </div>
                  <div className="w-fit flex flex-col space-y-3">
                    <div className="text-lg font-bold">
                      Status
                    </div>
                    <div className="flex flex-col">
                      {steps
                        .filter(s => !['refunded'].includes(s.id) || s.data?.receipt?.status)
                        .map((s, i) => {
                          const _error =
                            error && (error.block_timestamp || approved?.block_timestamp) ?
                              moment().diff(moment((error.block_timestamp || approved.block_timestamp) * 1000), 'seconds') >= 45 ?
                                error :
                                null :
                              error

                          const step_finish =
                            (!['refunded'].includes(s.id) && s.data) ||
                            (['gas_paid'].includes(s.id) && (gas_paid_to_callback || (is_call_from_relayer && approved))) ||
                            (['confirm'].includes(s.id) && (confirm || approved)) ||
                            (['executed'].includes(s.id) && is_executed) ||
                            (['refunded'].includes(s.id) && s.data?.receipt?.status)

                          const text_color =
                            step_finish ?
                              'text-green-500 dark:text-green-400' :
                              i === current_step && !['refunded'].includes(s.id) ?
                                'text-yellow-500 dark:text-yellow-400' :
                                (['executed'].includes(s.id) && _error) || (['refunded'].includes(s.id) && !s.data?.receipt?.status) ?
                                  'text-red-500 dark:text-red-400' :
                                  'text-slate-300 dark:text-slate-700'

                          const {
                            explorer,
                          } = { ...s.chain_data }

                          const {
                            url,
                            transaction_path,
                            icon,
                          } = { ...explorer }

                          const link_id = s.id === 'confirm' ? s.data?.poll_id : s.data?.transactionHash || s.data?.axelarTransactionHash || error?.transactionHash
                          const link_url = link_id && (s.id === 'confirm' ? `${url}/evm-poll/${link_id}` : `${url}${transaction_path?.replace('{tx}', link_id)}`)

                          return (
                            <div
                              key={i}
                              className="min-w-max flex items-center space-x-1.5 pb-0.5"
                            >
                              {step_finish ?
                                <BiCheckCircle
                                  size={18}
                                  className="text-green-500 dark:text-green-400"
                                /> :
                                i === current_step && !['refunded'].includes(s.id) ?
                                  <ProgressBar
                                    borderColor="#ca8a04"
                                    barColor="#facc15"
                                    width="18"
                                    height="18"
                                  /> :
                                  (['executed'].includes(s.id) && _error) || (['refunded'].includes(s.id) && !s.data?.receipt?.status) ?
                                    <BiXCircle
                                      size={18}
                                      className="text-red-500 dark:text-red-400"
                                    /> :
                                    <FiCircle
                                      size={18}
                                      className="text-slate-300 dark:text-slate-700"
                                    />
                              }
                              <div className="flex items-center space-x-1">
                                {link_id ?
                                  <Copy
                                    value={link_id}
                                    title={
                                      <span className={`cursor-pointer uppercase ${text_color} text-xs font-semibold`}>
                                        {s.title}
                                      </span>
                                    }
                                  /> :
                                  <span className={`uppercase ${text_color} text-xs font-medium`}>
                                    {s.title}
                                  </span>
                                }
                                {
                                  url && link_url &&
                                  (
                                    <a
                                      href={link_url}
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
                        })
                      }
                      <div className="flex flex-col space-y-1">
                        {
                          is_invalid_call &&
                          (
                            <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                              Invalid Call
                            </div>
                          )
                        }
                        {
                          is_insufficient_fee &&
                          (
                            <div className="w-fit bg-red-100 dark:bg-red-900 bg-opacity-75 dark:bg-opacity-75 border border-red-500 dark:border-red-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                              Insufficient Fee
                            </div>
                          )
                        }
                        {
                          not_enough_gas_to_execute &&
                          (
                            <div className="w-fit bg-yellow-100 dark:bg-yellow-900 bg-opacity-75 dark:bg-opacity-75 border border-yellow-500 dark:border-yellow-500 rounded whitespace-nowrap text-xs font-medium mt-1 py-0.5 px-1.5">
                              Not enough gas
                            </div>
                          )
                        }
                        {
                          express_execute_time_spent &&
                          (
                            <Tooltip
                              placement="bottom"
                              content="Express execute time spent"
                              className="z-50 bg-black bg-opacity-75 text-white text-xs -ml-7"
                            >
                              <div className="flex items-center space-x-1">
                                <RiTimerFlashLine
                                  size={18}
                                  className="text-green-500 dark:text-green-400"
                                />
                                <span className="whitespace-nowrap text-xs font-bold">
                                  {express_execute_time_spent}
                                </span>
                              </div>
                            </Tooltip>
                          )
                        }
                        {gasAddButton}
                        {refundButton}
                        {
                          approveButton || executeButton ||
                          (
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
                          )
                        }
                      </div>
                    </div>
                  </div>
                </div> :
                <span className="text-slate-400 dark:text-slate-500 text-base">
                  Data not found
                </span>
              }
            </div>
            {data && detail_steps
              .map((s, i) => {
                const {
                  callback,
                } = { ...gmp }

                const {
                  call,
                  gas_paid,
                  gas_added_transactions,
                  express_executed,
                  confirm,
                  approved,
                  executed,
                  error,
                  refunded,
                  refunded_more_transactions,
                  express_gas_price_rate,
                  gas_price_rate,
                  is_execute_from_relayer,
                  is_error_from_relayer,
                  fees,
                  status,
                  gas,
                  is_invalid_destination_chain,
                  is_invalid_call,
                  is_insufficient_fee,
                  not_enough_gas_to_execute,
                } = { ...gmp.data }

                const {
                  gas_express_fee_amount,
                  gas_approve_amount,
                  gas_remain_amount,
                } = { ...gas }

                const {
                  title,
                  chain_data,
                  data,
                } = { ...s }

                const _data =
                  ['executed'].includes(s.id) ?
                    data ||
                    (error && (error?.block_timestamp || approved?.block_timestamp) ?
                      moment().diff(moment((error?.block_timestamp || approved.block_timestamp) * 1000), 'seconds') >= 45 ?
                        error :
                        null :
                      error
                    ) :
                    data

                const {
                  logIndex,
                  _logIndex,
                  axelarTransactionHash,
                  blockNumber,
                  axelarBlockNumber,
                  block_timestamp,
                  contract_address,
                  returnValues,
                  transaction,
                  receipt,
                  poll_id,
                  transfer_id,
                } = { ..._data }

                let {
                  transactionHash,
                } = { ..._data }

                transactionHash = transactionHash || receipt?.transactionHash

                const {
                  sender,
                } = { ...returnValues }

                const source_chain = call?.chain
                const destination_chain = call?.returnValues?.destinationChain

                const source_chain_data = getChain(source_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                const {
                  gasToken,
                  gasFeeAmount,
                  refundAddress,
                } = { ...gas_paid?.returnValues }

                const {
                  source_token,
                  destination_native_token,
                } = { ...gas_price_rate }

                const event_receipt = s.id === 'approved' ? approved?.receipt : executed?.receipt || error?.receipt

                const {
                  gasUsed,
                  effectiveGasPrice,
                  l1Fee,
                } = { ...event_receipt }
                let {
                  gasPrice,
                } = { ...event_receipt }

                gasPrice = gasPrice || effectiveGasPrice

                if (!gasPrice) {
                  if (s.id === 'approved') {
                    if (approved) {
                      gasPrice = approved.transaction?.gasPrice
                    }
                  }
                  else {
                    if (executed) {
                      gasPrice = executed.transaction?.gasPrice
                    }
                    else if (error) {
                      gasPrice = error.transaction?.gasPrice
                    }
                  }
                }

                let source_gas_data
                let destination_gas_data
                let source_gas_used
                let callback_gas_used
                let source_express_executed_gas_used

                if (gasFeeAmount) {
                  source_gas_data =
                    gasToken && gasToken !== constants.AddressZero ?
                      (assets_data || []).find(a => equalsIgnoreCase(a.symbol, gasToken) || (a?.contracts || []).findIndex(c => c?.chain_id === source_chain_data?.chain_id && equalsIgnoreCase(c?.contract_address, gasToken)) > -1) :
                      { ..._.head(source_chain_data?.provider_params)?.nativeCurrency, ...fees?.source_token, image: source_chain_data?.image }

                  if (source_gas_data?.contracts) {
                    source_gas_data = {
                      ...source_gas_data,
                      ...source_gas_data.contracts.find(c => c?.chain_id === source_chain_data?.chain_id),
                    }
                  }
                }
                else if (gas_paid_to_callback) {
                  source_gas_data = { ..._.head(source_chain_data?.provider_params)?.nativeCurrency, ...fees?.source_token, image: source_chain_data?.image }
                }

                destination_gas_data = {
                  ..._.head(destination_chain_data?.provider_params)?.nativeCurrency,
                  ...fees?.destination_native_token,
                  image: destination_chain_data?.image,
                }

                try {
                  if (executed?.receipt ? is_execute_from_relayer === false : error?.receipt ? is_error_from_relayer === false : false) {
                    source_gas_used = 0
                  }
                  else {
                    const decimals = express_gas_price_rate?.destination_native_token?.decimals || destination_native_token.decimals || 18

                    source_gas_used =
                      Number(
                        utils.formatUnits(
                          FixedNumber.fromString(BigNumber.from(gasUsed).toString())
                            .mulUnsafe(
                              FixedNumber.fromString(BigNumber.from(gasPrice).toString())
                            )
                            .addUnsafe(
                              FixedNumber.fromString((l1Fee || '0').toString())
                            )
                            .mulUnsafe(
                              FixedNumber.fromString((destination_native_token.token_price.usd / source_token.token_price.usd).toFixed(decimals))
                            )
                            .round(0)
                            .toString()
                            .replace('.0', ''),
                          decimals,
                        )
                      )
                  }
                } catch (error) {
                  source_gas_used = 0
                }

                if (callback) {
                  if (typeof gas?.gas_callback_amount === 'number') {
                    callback_gas_used = gas.gas_callback_amount
                  }
                  else {
                    const receipt = callback.executed?.receipt || callback.error?.receipt

                    const {
                      gasUsed,
                      effectiveGasPrice,
                      l1Fee,
                    } = { ...receipt }
                    let {
                      gasPrice,
                    } = { ...receipt }

                    gasPrice = gasPrice || effectiveGasPrice

                    if (!gasPrice) {
                      if (callback.executed) {
                        gasPrice = callback.executed.transaction?.gasPrice
                      }
                      else if (callback.error) {
                        gasPrice = callback.error.transaction?.gasPrice
                      }
                    }

                    try {
                      if (callback.executed?.receipt ? callback.is_execute_from_relayer === false : callback.error?.receipt ? callback.is_error_from_relayer === false : false) {
                        callback_gas_used = 0
                      }
                      else {
                        callback_gas_used =
                          Number(
                            utils.formatUnits(
                              FixedNumber.fromString(BigNumber.from(gasUsed || '0').toString())
                                .mulUnsafe(
                                  FixedNumber.fromString(BigNumber.from(gasPrice || '0').toString())
                                )
                                .addUnsafe(
                                  FixedNumber.fromString((l1Fee || '0').toString())
                                )
                                .round(0)
                                .toString()
                                .replace('.0', ''),
                              source_token.decimals,
                            )
                          )
                      }
                    } catch (error) {
                      callback_gas_used = 0
                    }
                  }
                }

                try {
                  source_express_executed_gas_used =
                    Number(
                      utils.formatUnits(
                        FixedNumber.fromString(BigNumber.from(express_executed?.receipt?.gasUsed || '0').toString())
                          .mulUnsafe(
                            FixedNumber.fromString(BigNumber.from(express_executed?.receipt?.gasPrice || express_executed?.receipt?.effectiveGasPrice || express_executed?.transaction?.gasPrice || '0').toString())
                          )
                          .addUnsafe(
                            FixedNumber.fromString((express_executed?.receipt?.l1Fee || '0').toString())
                          )
                          .mulUnsafe(
                            FixedNumber.fromString(
                              (
                                (express_gas_price_rate?.destination_native_token?.token_price?.usd || destination_native_token?.token_price?.usd) /
                                (express_gas_price_rate?.source_token?.token_price?.usd || source_token?.token_price?.usd)
                              )
                              .toString()
                            )
                          )
                          .round(0)
                          .toString()
                          .replace('.0', ''),
                        express_gas_price_rate?.destination_native_token?.decimals || destination_native_token.decimals,
                      )
                    )
                } catch (error) {
                  source_express_executed_gas_used = 0
                }

                const refunded_amount = gasFeeAmount && refunded?.amount
                const from = receipt?.from || transaction?.from
                const to =
                  !['executed', 'refunded'].includes(s.id) ?
                    contract_address :
                    ['refunded'].includes(s.id) ?
                      _data?.to || refundAddress :
                      destinationContractAddress

                const {
                  explorer,
                } = { ...chain_data }

                const {
                  url,
                  transaction_path,
                  block_path,
                  address_path,
                  icon,
                } = { ...explorer }

                const destination_address_chain_data = to?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? axelar_chain_data : ['call', 'gas_paid', 'express_executed'].includes(s.id) ? source_chain_data : destination_chain_data
                const destination_address_explorer = destination_address_chain_data?.explorer
                const from_address_explorer = (from?.startsWith(process.env.NEXT_PUBLIC_PREFIX_ACCOUNT) ? axelar_chain_data : chain_data)?.explorer

                const refreshButton =
                  editable && ['executed', 'refunded'].includes(s.id) &&
                  (
                    (s.id === 'executed' && ((!executed && (is_executed || error)) || executed)) ||
                    (['refunded'].includes(s.id) && typeof receipt?.status !== 'number') ||
                    !block_timestamp
                  ) &&
                  (
                    <button
                      disabled={s.id === 'refunded' ? txHashRefundEditUpdating : txHashEditUpdating}
                      onClick={
                        async () => {
                          if (s.id === 'refunded') {
                            setTxHashRefundEditUpdating(true)
                          }
                          else {
                            setTxHashEditUpdating(true)
                          }

                          await saveGMP(
                            call?.transactionHash,
                            call?.transactionIndex,
                            call?.logIndex,
                            transactionHash,
                            transaction?.from,
                            undefined,
                            ['refunded'].includes(s.id) ?
                              s.id :
                              s.id === 'executed' && !executed && (is_executed || error || not_enough_gas_to_execute) ?
                                'not_executed' :
                                executed ?
                                  're_execute' :
                                  undefined,
                          )

                          if (s.id === 'refunded') {
                            setTxHashRefundEditUpdating(false)
                          }
                          else {
                            setTxHashEditUpdating(false)
                          }
                        }
                      }
                      className={`${(s.id === 'refunded' ? txHashRefundEditUpdating : txHashEditUpdating) ? 'hidden' : ''} cursor-pointer text-white hover:text-blue-500 dark:text-slate-900 dark:hover:text-white`}
                    >
                      <MdRefresh
                        size={20}
                      />
                    </button>
                  )

                const success =
                  receipt?.status ||
                  (typeof receipt?.status !== 'number' && transactionHash && !['executed', 'refunded'].includes(s.id)) ||
                  (typeof receipt?.status !== 'number' && ['executed'].includes(s.id) && is_executed) ||
                  ['confirm'].includes(s.id)

                const rowClassName = 'flex flex-col space-y-0.5'
                const rowTitleClassName = `text-sm lg:text-base font-bold`

                return (
                  <div
                    key={i}
                    className={`${stepClassName} sm:col-span-3 lg:col-span-2`}
                  >
                    <div className={`${titleClassName}`}>
                      {title}
                    </div>
                    <div className="flex flex-col space-y-3">
                      {['executed'].includes(s.id) && (executeButton || refreshButton || (!data && is_executed)) ?
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Tx Hash
                          </span>
                          <div className="flex items-center space-x-0.5">
                            {txHashEditing ?
                              <input
                                disabled={txHashEditUpdating}
                                placement="Transaction Hash"
                                value={txHashEdit}
                                onChange={e => setTxHashEdit(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 rounded-lg py-1 px-2"
                              /> :
                              transactionHash ?
                                <>
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 dark:text-blue-500 font-medium"
                                  >
                                    <div>
                                      <span className="xl:hidden">
                                        {ellipse(transactionHash, 12)}
                                      </span>
                                      <span className="hidden xl:block">
                                        {ellipse(transactionHash, 16)}
                                      </span>
                                    </div>
                                  </a>
                                  <Copy
                                    value={transactionHash}
                                  />
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
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
                                </> :
                                !(!data && is_executed) && !error && !is_invalid_destination_chain && !is_invalid_call && !is_insufficient_fee && !not_enough_gas_to_execute &&
                                (
                                  <ColorRing
                                    color={loader_color(theme)}
                                    width="32"
                                    height="32"
                                  />
                                )
                            }
                            {txHashEditing ?
                              <>
                                <button
                                  disabled={txHashEditUpdating}
                                  onClick={() => resetTxHashEdit()}
                                  className="text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500"
                                >
                                  <RiCloseCircleFill
                                    size={20}
                                  />
                                </button>
                                <button
                                  disabled={!txHashEdit || txHashEditUpdating}
                                  onClick={
                                    async () => {
                                      setTxHashEditUpdating(true)

                                      await saveGMP(
                                        call?.transactionHash,
                                        call?.transactionIndex,
                                        call?.logIndex,
                                        txHashEdit,
                                        address,
                                      )
                                    }
                                  }
                                  className="text-blue-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                                >
                                  {txHashEditUpdating ?
                                    <TailSpin
                                      color={loader_color(theme)}
                                      width="16"
                                      height="16"
                                    /> :
                                    <BiSave
                                      size={20}
                                    />
                                  }
                                </button>
                              </> :
                              editable &&
                              (
                                <button
                                  onClick={() => setTxHashEditing(true)}
                                  className="text-white hover:text-slate-400 dark:text-slate-900 dark:hover:text-slate-400"
                                >
                                  <BiEditAlt
                                    size={20}
                                  />
                                </button>
                              )
                            }
                          </div>
                          {refreshButton}
                        </div> :
                        ['refunded'].includes(s.id) && (!data || data.error) ?
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Tx Hash
                            </span>
                            <div className="flex items-center space-x-0.5">
                              {txHashRefundEditing ?
                                <input
                                  disabled={txHashRefundEditUpdating}
                                  placement="Transaction Hash"
                                  value={txHashRefundEdit}
                                  onChange={e => setTxHashRefundEdit(e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-800 rounded-lg py-1 px-2"
                                /> :
                                transactionHash ?
                                  <>
                                    <a
                                      href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-500 font-medium"
                                    >
                                      <div>
                                        <span className="xl:hidden">
                                          {ellipse(transactionHash, 12)}
                                        </span>
                                        <span className="hidden xl:block">
                                          {ellipse(transactionHash, 16)}
                                        </span>
                                      </div>
                                    </a>
                                    <Copy
                                      value={transactionHash}
                                    />
                                    <a
                                      href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
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
                                  </> :
                                  null
                              }
                              {txHashRefundEditing ?
                                <>
                                  <button
                                    disabled={txHashRefundEditUpdating}
                                    onClick={() => resetTxHashEdit()}
                                    className="text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500"
                                  >
                                    <RiCloseCircleFill
                                      size={20}
                                    />
                                  </button>
                                  <button
                                    disabled={!txHashRefundEdit || txHashRefundEditUpdating}
                                    onClick={
                                      async () => {
                                        setTxHashRefundEditUpdating(true)

                                        await saveGMP(
                                          call?.transactionHash,
                                          call?.transactionIndex,
                                          call?.logIndex,
                                          txHashRefundEdit,
                                          address,
                                          undefined,
                                          'refunded',
                                        )
                                      }
                                    }
                                    className="text-blue-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                                  >
                                    {txHashRefundEditUpdating ?
                                      <TailSpin
                                        color={loader_color(theme)}
                                        width="16"
                                        height="16"
                                      /> :
                                      <BiSave
                                        size={20}
                                      />
                                    }
                                  </button>
                                </> :
                                editable &&
                                (
                                  <button
                                    onClick={() => setTxHashRefundEditing(true)}
                                    className="text-white hover:text-slate-400 dark:text-slate-900 dark:hover:text-slate-400"
                                  >
                                    <BiEditAlt
                                      size={20}
                                    />
                                  </button>
                                )
                              }
                            </div>
                          </div> :
                          poll_id ?
                            <div className={rowClassName}>
                              <span className={rowTitleClassName}>
                                Poll
                              </span>
                              <div className="flex items-center space-x-0.5">
                                <a
                                  href={`${url}/evm-poll/${poll_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 dark:text-blue-500 font-medium"
                                >
                                  <div>
                                    <span className="xl:hidden">
                                      {ellipse(poll_id, 12)}
                                    </span>
                                    <span className="hidden xl:block">
                                      {ellipse(poll_id, 16)}
                                    </span>
                                  </div>
                                </a>
                                <Copy
                                  value={poll_id}
                                />
                                <a
                                  href={`${url}/evm-poll/${poll_id}`}
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
                              </div>
                            </div> :
                            transactionHash ?
                              <div className={rowClassName}>
                                <span className={rowTitleClassName}>
                                  Tx Hash
                                </span>
                                <div className="flex items-center space-x-0.5">
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 dark:text-blue-500 font-medium"
                                  >
                                    <div>
                                      <span className="xl:hidden">
                                        {ellipse(transactionHash, 12)}
                                      </span>
                                      <span className="hidden xl:block">
                                        {ellipse(transactionHash, 16)}
                                      </span>
                                    </div>
                                  </a>
                                  <Copy
                                    value={transactionHash}
                                  />
                                  <a
                                    href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
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
                                </div>
                              </div> :
                              axelarTransactionHash ?
                                <div className={rowClassName}>
                                  <span className={rowTitleClassName}>
                                    Tx Hash
                                  </span>
                                  <div className="flex items-center space-x-0.5">
                                    <a
                                      href={`${url}${transaction_path?.replace('{tx}', axelarTransactionHash)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-500 font-medium"
                                    >
                                      <div>
                                        <span className="xl:hidden">
                                          {ellipse(axelarTransactionHash, 12)}
                                        </span>
                                        <span className="hidden xl:block">
                                          {ellipse(axelarTransactionHash, 16)}
                                        </span>
                                      </div>
                                    </a>
                                    <Copy
                                      value={axelarTransactionHash}
                                    />
                                    <a
                                      href={`${url}${transaction_path?.replace('{tx}', axelarTransactionHash)}`}
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
                                  </div>
                                </div> :
                                ['gas_paid'].includes(s.id) && origin?.call ?
                                  <div className="space-y-1.5">
                                    <Link href={`/gmp/${origin.call.transactionHash}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="max-w-min bg-blue-50 hover:bg-blue-100 dark:bg-blue-400 dark:hover:bg-blue-500 border border-blue-500 rounded-lg cursor-pointer whitespace-nowrap flex items-center text-blue-600 dark:text-white space-x-0.5 py-0.5 pl-1 pr-2"
                                      >
                                        <HiArrowSmLeft
                                          size={16}
                                        />
                                        <span className="text-xs font-semibold hover:font-bold">
                                          from 1st Call
                                        </span>
                                      </a>
                                    </Link>
                                    <div className="flex items-center space-x-0.5">
                                      <Link href={`/gmp/${origin.call.transactionHash}`}>
                                        <a
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                            <span className="xl:hidden">
                                              {ellipse(origin.call.transactionHash, 8)}
                                            </span>
                                            <span className="hidden xl:block">
                                              {ellipse(origin.call.transactionHash, 12)}
                                            </span>
                                          </div>
                                        </a>
                                      </Link>
                                      <Copy
                                        value={origin.call.transactionHash}
                                      />
                                    </div>
                                  </div> :
                                  ['gas_paid'].includes(s.id) && ['executed', 'error'].includes(status) ?
                                    <span className="text-slate-400 dark:text-slate-200 text-base font-medium">
                                      No transaction
                                    </span> :
                                    !is_invalid_destination_chain && !is_invalid_call && !is_insufficient_fee && !not_enough_gas_to_execute &&
                                    (current_step === i ?
                                      <ColorRing
                                        color={loader_color(theme)}
                                        width="32"
                                        height="32"
                                      /> :
                                      i < current_step ?
                                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm font-medium">
                                          The data will be updated shortly.
                                        </span> :
                                        null
                                    )
                      }
                      {
                        typeof logIndex === 'number' &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Log Index
                            </span>
                            <div className="flex items-center space-x-1">
                              <a
                                href={`${url}${transaction_path?.replace('{tx}', transactionHash)}#eventlog`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-500 font-medium"
                              >
                                {number_format(logIndex, '0,0')}
                              </a>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['call'].includes(s.id) && typeof _logIndex === 'number' &&
                        (
                          <div className={rowClassName}>
                            <Tooltip
                              placement="right"
                              content="Index of the event within the tx"
                              className="z-50 bg-black bg-opacity-75 text-white text-xs"
                            >
                              <span className={`w-fit ${rowTitleClassName}`}>
                                Event Index
                              </span>
                            </Tooltip>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">
                                {number_format(_logIndex, '0,0')}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      {
                        typeof blockNumber === 'number' &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Block
                            </span>
                            <a
                              href={`${url}${block_path?.replace('{block}', blockNumber)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500 font-medium"
                            >
                              {number_format(blockNumber, '0,0')}
                            </a>
                          </div>
                        )
                      }
                      {
                        typeof axelarBlockNumber === 'number' &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Axelar Block
                            </span>
                            <a
                              href={`${axelar_chain_data?.explorer?.url}${axelar_chain_data?.explorer?.block_path?.replace('{block}', axelarBlockNumber)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 dark:text-blue-500 font-medium"
                            >
                              {number_format(axelarBlockNumber, '0,0')}
                            </a>
                          </div>
                        )
                      }
                      {
                        (_data || (['executed'].includes(s.id) && is_executed)) &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Status
                            </span>
                            <div className={`${success ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} flex items-center space-x-1`}>
                              {success ?
                                <BiCheckCircle
                                  size={18}
                                /> :
                                <BiXCircle
                                  size={18}
                                />
                              }
                              <span className="uppercase text-xs font-semibold">
                                {success ? 'Success' : 'Error'}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      {
                        block_timestamp &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Time
                            </span>
                            <span className="flex flex-wrap text-slate-400 dark:text-slate-500 font-medium">
                              <span className="whitespace-nowrap mr-0.5">
                                {moment(block_timestamp * 1000).fromNow()}
                              </span>
                              <span className="whitespace-nowrap">
                                ({moment(block_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')})
                              </span>
                            </span>
                          </div>
                        )
                      }
                      {
                        transfer_id &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Transfer ID
                            </span>
                            <Copy
                              value={transfer_id}
                              title={
                                <span className="cursor-pointer break-all font-medium">
                                  {transfer_id}
                                </span>
                              }
                            />
                          </div>
                        )
                      }
                      {
                        ['gas_paid', 'refunded'].includes(s.id) && gasFeeAmount && source_gas_data &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Gas Deposited
                            </span>
                            <div className="flex flex-wrap items-center">
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2 mb-0.5 mr-1">
                                {
                                  source_gas_data.image &&
                                  (
                                    <Image
                                      src={source_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    {number_format(utils.formatUnits(BigNumber.from(gasFeeAmount), source_gas_data.decimals), '0,0.00000000', true)}
                                  </span>
                                  <span>
                                    {ellipse(source_gas_data.symbol)}
                                  </span>
                                </span>
                              </div>
                              {(gas_added_transactions || [])
                                .map((g, j) => {
                                  const {
                                    transactionHash,
                                    returnValues,
                                  } = { ...g }

                                  const {
                                    gasFeeAmount,
                                  } = { ...returnValues }

                                  return (
                                    <a
                                      key={j}
                                      href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2 mb-0.5 mr-1"
                                    >
                                      <span className="text-2xs font-medium">
                                        <span className="mr-1">
                                          {number_format(utils.formatUnits(BigNumber.from(gasFeeAmount), source_gas_data.decimals), '+0,0.00000000', true)}
                                        </span>
                                        <span>
                                          {ellipse(source_gas_data.symbol)}
                                        </span>
                                      </span>
                                    </a>
                                  )
                                })
                              }
                            </div>
                          </div>
                        )
                      }
                      {
                        ['express_executed', 'refunded'].includes(s.id) && express_executed?.receipt?.gasUsed && (express_executed.receipt.gasPrice || express_executed.receipt.effectiveGasPrice || express_executed.transaction?.gasPrice) && destination_gas_data &&
                        (
                          <>
                            <div className={rowClassName}>
                              <span className={rowTitleClassName}>
                                {['express_executed', 'refunded'].includes(s.id) ? 'Express Gas' : 'Gas Used'}
                              </span>
                              <div className="flex flex-wrap items-center">
                                {
                                  (express_gas_price_rate || gas_price_rate) &&
                                  (
                                    <>
                                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 mr-2 py-1 px-2">
                                        {
                                          source_gas_data?.image &&
                                          (
                                            <Image
                                              src={source_gas_data.image}
                                              className="w-5 h-5 rounded-full"
                                            />
                                          )
                                        }
                                        <span className="text-sm font-medium">
                                          <span className="mr-1">
                                            {number_format(source_express_executed_gas_used, '0,0.00000000', true)}
                                          </span>
                                          <span>
                                            {ellipse(source_gas_data?.symbol)}
                                          </span>
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium mr-2">
                                        =
                                      </span>
                                    </>
                                  )
                                }
                                <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 py-1 px-2">
                                  {
                                    destination_gas_data?.image &&
                                    (
                                      <Image
                                        src={destination_gas_data.image}
                                        className="w-5 h-5 rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-sm font-medium">
                                    <span className="mr-1">
                                      {number_format(
                                        utils.formatUnits(
                                          FixedNumber.fromString(BigNumber.from(express_executed.receipt.gasUsed).toString())
                                            .mulUnsafe(
                                              FixedNumber.fromString(BigNumber.from(express_executed.receipt.gasPrice || express_executed.receipt.effectiveGasPrice || express_executed.transaction.gasPrice).toString())
                                            )
                                            .round(0)
                                            .toString()
                                            .replace('.0', ''),
                                          destination_gas_data.decimals,
                                        ),
                                        '0,0.00000000',
                                        true,
                                      )}
                                    </span>
                                    <span>
                                      {ellipse(destination_gas_data.symbol)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            {
                              gas_express_fee_amount > 0 &&
                              (
                                <div className={rowClassName}>
                                  <span className={rowTitleClassName}>
                                    Express Fee
                                  </span>
                                  <div className="flex flex-wrap items-center">
                                    <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 py-1 px-2">
                                      {
                                        source_gas_data?.image &&
                                        (
                                          <Image
                                            src={source_gas_data.image}
                                            className="w-5 h-5 rounded-full"
                                          />
                                        )
                                      }
                                      <span className="text-sm font-medium">
                                        <span className="mr-1">
                                          {number_format(gas_express_fee_amount, '0,0.00000000', true)}
                                        </span>
                                        <span>
                                          {ellipse(source_gas_data?.symbol)}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                          </>
                        )
                      }
                      {
                        ['gas_paid', 'refunded'].includes(s.id) && [typeof gas?.gas_base_fee_amount, typeof fees?.base_fee].includes('number') && source_gas_data && (s.id !== 'refunded' || !gas_approve_amount) &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Base Fee
                            </span>
                            <div className="flex flex-wrap items-center">
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2 mb-0.5 mr-1">
                                {
                                  source_gas_data.image &&
                                  (
                                    <Image
                                      src={source_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    {number_format(gas?.gas_base_fee_amount || fees?.base_fee, '0,0.00000000', true)}
                                  </span>
                                  <span>
                                    {ellipse(source_gas_data.symbol)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['approved', 'refunded'].includes(s.id) && gas_approve_amount > 0 && source_gas_data &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Approve Gas
                            </span>
                            <div className="flex flex-wrap items-center">
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 mr-2 py-1 px-2">
                                {
                                  source_gas_data.image &&
                                  (
                                    <Image
                                      src={source_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    {number_format(gas_approve_amount, '0,0.00000000', true)}
                                  </span>
                                  <span>
                                    {ellipse(source_gas_data.symbol)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['executed', 'refunded'].includes(s.id) && gasUsed && gasPrice && destination_gas_data &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Execute Gas
                            </span>
                            <div className="flex flex-wrap items-center">
                              {
                                source_token?.token_price?.usd && destination_native_token?.token_price?.usd &&
                                (
                                  <>
                                    <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 mr-2 py-1 px-2">
                                      {
                                        source_gas_data?.image &&
                                        (
                                          <Image
                                            src={source_gas_data.image}
                                            className="w-5 h-5 rounded-full"
                                          />
                                        )
                                      }
                                      <span className="text-sm font-medium">
                                        <span className="mr-1">
                                          {number_format(source_gas_used, '0,0.00000000', true)}
                                        </span>
                                        <span>
                                          {ellipse(source_gas_data?.symbol)}
                                        </span>
                                      </span>
                                    </div>
                                    {
                                      (success ? is_execute_from_relayer : is_error_from_relayer) &&
                                      (
                                        <span className="text-sm font-medium mr-2">
                                          =
                                        </span>
                                      )
                                    }
                                  </>
                                )
                              }
                              {
                                (success ? is_execute_from_relayer : is_error_from_relayer) &&
                                (
                                  <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 my-0.5 py-1 px-2">
                                    {
                                      destination_gas_data?.image &&
                                      (
                                        <Image
                                          src={destination_gas_data.image}
                                          className="w-5 h-5 rounded-full"
                                        />
                                      )
                                    }
                                    <span className="text-sm font-medium">
                                      <span className="mr-1">
                                        {number_format(
                                          utils.formatUnits(
                                            FixedNumber.fromString(BigNumber.from(gasUsed).toString())
                                              .mulUnsafe(
                                                FixedNumber.fromString(BigNumber.from(gasPrice).toString())
                                              )
                                              .addUnsafe(
                                                FixedNumber.fromString((l1Fee || '0').toString())
                                              )
                                              .round(0)
                                              .toString()
                                              .replace('.0', ''),
                                            destination_gas_data.decimals,
                                          ),
                                          '0,0.00000000',
                                          true,
                                        )}
                                      </span>
                                      <span>
                                        {ellipse(destination_gas_data.symbol)}
                                      </span>
                                    </span>
                                  </div>
                                )
                              }
                            </div>
                          </div>
                        )
                      }
                      {
                        ['refunded'].includes(s.id) && callback_gas_used > 0 && source_gas_data &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Gas Callback
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2">
                                {
                                  source_gas_data.image &&
                                  (
                                    <Image
                                      src={source_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    {number_format(callback_gas_used, '0,0.00000000', true)}
                                  </span>
                                  <span>
                                    {ellipse(source_gas_data.symbol)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['refunded'].includes(s.id) && receipt?.status === 1 && source_token?.token_price?.usd && destination_native_token?.token_price?.usd && refunded_amount > 0 &&
                        (!(executed?.block_timestamp || error?.block_timestamp) || block_timestamp !== (executed?.block_timestamp || error?.block_timestamp)) &&
                        (
                          <>
                            {
                              gas_remain_amount > refunded_amount &&
                              (
                                <div className={rowClassName}>
                                  <span className={rowTitleClassName}>
                                    Refund Tx Gas Estimate
                                  </span>
                                  <div className="flex flex-wrap items-center">
                                    <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 mr-1 py-1 px-2">
                                      {
                                        source_gas_data?.image &&
                                        (
                                          <Image
                                            src={source_gas_data.image}
                                            className="w-5 h-5 rounded-full"
                                          />
                                        )
                                      }
                                      <span className="text-sm font-medium">
                                        <span className="mr-1">
                                          {number_format(gas_remain_amount - refunded_amount, '0,0.00000000', true)}
                                        </span>
                                        <span>
                                          {ellipse(source_gas_data?.symbol)}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                            <div className={rowClassName}>
                              <span className={rowTitleClassName}>
                                Gas Refunded
                              </span>
                              <div className="flex flex-wrap items-center">
                                <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 mr-1 py-1 px-2">
                                  {
                                    source_gas_data?.image &&
                                    (
                                      <Image
                                        src={source_gas_data.image}
                                        className="w-5 h-5 rounded-full"
                                      />
                                    )
                                  }
                                  <span className="text-sm font-medium">
                                    <span className="mr-1">
                                      {number_format(refunded_amount, '0,0.00000000', true)}
                                    </span>
                                    <span>
                                      {ellipse(source_gas_data?.symbol)}
                                    </span>
                                  </span>
                                </div>
                                {(refunded_more_transactions || [])
                                  .filter(r => r?.amount > 0)
                                  .map((r, j) => {
                                    const {
                                      transactionHash,
                                      amount,
                                    } = { ...r }

                                    return (
                                      <a
                                        key={j}
                                        href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2 mb-0.5 mr-1"
                                      >
                                        <span className="text-2xs font-medium">
                                          <span className="mr-1">
                                            {number_format(amount, '+0,0.00000000', true)}
                                          </span>
                                          <span>
                                            {ellipse(source_gas_data.symbol)}
                                          </span>
                                        </span>
                                      </a>
                                    )
                                  })
                                }
                              </div>
                            </div>
                          </>
                        )
                      }
                      {
                        ['refunded'].includes(s.id) && source_token && destination_native_token &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Gas Price
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2">
                                {
                                  source_gas_data?.image &&
                                  (
                                    <Image
                                      src={source_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    1
                                  </span>
                                  <span>
                                    {ellipse(source_gas_data?.symbol)}
                                  </span>
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                =
                              </span>
                              <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2">
                                {
                                  destination_gas_data?.image &&
                                  (
                                    <Image
                                      src={destination_gas_data.image}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )
                                }
                                <span className="text-sm font-medium">
                                  <span className="mr-1">
                                    {number_format(source_token.token_price?.usd / destination_native_token.token_price?.usd, '0,0.00000000', true)}
                                  </span>
                                  <span>
                                    {ellipse(destination_gas_data?.symbol)}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      {
                        to && !['confirm'].includes(s.id) &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              {['gas_paid'].includes(s.id) ?
                                'Gas Service' :
                                ['express_executed'].includes(s.id) ?
                                  'Express Service' :
                                  ['executed'].includes(s.id) ?
                                    'Destination' :
                                    ['refunded'].includes(s.id) ?
                                      'Receiver' :
                                      'Gateway'
                              }
                            </span>
                            <div className="flex items-center space-x-0.5">
                              {to.startsWith('0x') ?
                                <div className="flex items-center space-x-1">
                                  <a
                                    href={`${url}${address_path?.replace('{address}', to)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <EnsProfile
                                      address={to}
                                      no_copy={true}
                                      fallback={
                                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                          {ellipse(to, 12, chain_data?.prefix_address)}
                                        </div>
                                      }
                                    />
                                  </a>
                                  <Copy
                                    value={to}
                                  />
                                </div> :
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <AccountProfile
                                    address={to}
                                    prefix={destination_address_chain_data?.prefix_address}
                                  />
                                </div>
                              }
                              <a
                                href={`${destination_address_explorer?.url}${destination_address_explorer?.address_path?.replace('{address}', to)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-500"
                              >
                                {destination_address_explorer?.icon ?
                                  <Image
                                    src={destination_address_explorer.icon}
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  /> :
                                  <TiArrowRight
                                    size={16}
                                    className="transform -rotate-45"
                                  />
                                }
                              </a>
                            </div>
                          </div>
                        )
                      }
                      {
                        from &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              {!['express_executed', 'approved', 'executed'].includes(s.id) ?
                                'Sender' :
                                ['refunded'].includes(s.id) ?
                                  'Sender' :
                                  ['express_executed'].includes(s.id) ?
                                    'Express Relayer' :
                                    'Relayer'
                              }
                            </span>
                            <div className="flex items-center space-x-0.5">
                              {from.startsWith('0x') ?
                                <div className="flex items-center space-x-1">
                                  <a
                                    href={`${url}${address_path?.replace('{address}', from)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <EnsProfile
                                      address={from}
                                      no_copy={true}
                                      fallback={
                                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                          {ellipse(from, 12, chain_data?.prefix_address)}
                                        </div>
                                      }
                                    />
                                  </a>
                                  <Copy
                                    value={from}
                                  />
                                </div> :
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <AccountProfile
                                    address={from}
                                    prefix={chain_data?.prefix_address}
                                  />
                                </div>
                              }
                              <a
                                href={`${from_address_explorer?.url}${from_address_explorer?.address_path?.replace('{address}', from)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-500"
                              >
                                {from_address_explorer?.icon ?
                                  <Image
                                    src={from_address_explorer.icon}
                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                  /> :
                                  <TiArrowRight
                                    size={16}
                                    className="transform -rotate-45"
                                  />
                                }
                              </a>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['call'].includes(s.id) && sender &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Source
                            </span>
                            <div className="flex items-center space-x-0.5">
                              {sender.startsWith('0x') ?
                                <div className="flex items-center space-x-1">
                                  <a
                                    href={`${url}${address_path?.replace('{address}', sender)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <EnsProfile
                                      address={sender}
                                      no_copy={true}
                                      fallback={
                                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                          {ellipse(sender, 12, chain_data?.prefix_address)}
                                        </div>
                                      }
                                    />
                                  </a>
                                  <Copy
                                    value={sender}
                                  />
                                </div> :
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <AccountProfile
                                    address={sender}
                                    prefix={chain_data?.prefix_address}
                                  />
                                </div>
                              }
                              <a
                                href={`${url}${address_path?.replace('{address}', sender)}`}
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
                            </div>
                          </div>
                        )
                      }
                      {/*
                        ['express_executed', 'executed'].includes(s.id) && call?.transaction?.from &&
                        (
                          <div className={rowClassName}>
                            <span className={rowTitleClassName}>
                              Recipient
                            </span>
                            <div className="flex items-center space-x-0.5">
                              {call.transaction.from.startsWith('0x') ?
                                <div className="flex items-center space-x-1">
                                  <a
                                    href={`${url}${address_path?.replace('{address}', call.transaction.from)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <EnsProfile
                                      address={call.transaction.from}
                                      no_copy={true}
                                      fallback={
                                        <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                          {ellipse(call.transaction.from, 12, chain_data?.prefix_address)}
                                        </div>
                                      }
                                    />
                                  </a>
                                  <Copy
                                    value={call.transaction.from}
                                  />
                                </div> :
                                <div className="h-6 flex items-center text-blue-500 dark:text-blue-500 font-medium">
                                  <AccountProfile
                                    address={call.transaction.from}
                                    prefix={chain_data?.prefix_address}
                                  />
                                </div>
                              }
                              <a
                                href={`${url}${address_path?.replace('{address}', call.transaction.from)}`}
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
                            </div>
                          </div>
                        )
                      */}
                      {
                        ['executed'].includes(s.id) && !data && _data &&
                        (
                          <div className={rowClassName}>
                            <span
                              className={rowTitleClassName}
                              style={{ minWidth: '8rem' }}
                            >
                              Error
                            </span>
                            <div className="flex flex-col space-y-1.5">
                              {
                                (_data.error?.data?.message || _data.error?.message) &&
                                (
                                  <div className="flex flex-col space-y-1.5">
                                    {[{ id: 'message', value: _data.error?.data?.message || _data.error?.message }]
                                      .filter(e => e?.value)
                                      .map((e, j) => (
                                        <div
                                          key={j}
                                          className={`${['body'].includes(e.id) ? 'bg-slate-100 dark:bg-slate-800 rounded-lg p-2' : 'text-red-500'} font-semibold`}
                                        >
                                          {ellipse(e.value, 256)}
                                          <a
                                            href="https://docs.axelar.dev/dev/general-message-passing/debug/error-debugging"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 dark:text-blue-500 text-xs font-normal ml-1"
                                          >
                                            Transaction recovery guidelines
                                          </a>
                                        </div>
                                      ))
                                    }
                                  </div>
                                )
                              }
                              {
                                _data.error?.reason &&
                                (
                                  <div className="flex flex-col space-y-1.5">
                                    {[{ id: 'reason', value:  _data.error?.reason && `Reason: ${_data.error.reason}` }]
                                      .filter(e => e?.value)
                                      .map((e, j) => (
                                        <div
                                          key={j}
                                          className={`${['body'].includes(e.id) ? 'bg-slate-100 dark:bg-slate-800 rounded-lg p-2' : 'text-red-400'}`}
                                        >
                                          {ellipse(e.value, 256)}
                                        </div>
                                      ))
                                    }
                                  </div>
                                )
                              }
                              {
                                (_data.error?.code || is_not_enough_gas) &&
                                (
                                  <div className="flex items-center space-x-1.5">
                                    {
                                      _data.error?.code &&
                                      (
                                        <a
                                          href={!isNaN(_data.error.code) ? 'https://docs.metamask.io/guide/ethereum-provider.html#errors' : `https://docs.ethers.io/v5/api/utils/logger/#errors-${_data.error.code ? `-${_data.error.code.toLowerCase().split('_').join('-')}` : 'ethereum'}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="max-w-min bg-slate-50 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-300 text-2xs font-medium py-1 px-2"
                                        >
                                          {_data.error.code}
                                        </a>
                                      )
                                    }
                                    {
                                      is_not_enough_gas &&
                                      (
                                        <div className="max-w-min bg-yellow-100 dark:bg-yellow-300 rounded whitespace-nowrap uppercase text-slate-400 dark:text-yellow-600 text-2xs font-medium py-1 px-2">
                                          {`${_data.error?.reason === 'transaction failed' ? 'Can be n' : 'N'}ot enough gas`}
                                        </div>
                                      )
                                    }
                                  </div>
                                )
                              }
                              <div className="flex flex-col space-y-1.5">
                                {[{ id: 'body', value: (_data.error?.body || '').replaceAll('"""', '') }]
                                  .filter(e => e?.value)
                                  .map((e, j) => (
                                    <div
                                      key={j}
                                      className={`${['body'].includes(e.id) ? 'bg-slate-100 dark:bg-slate-800 rounded-lg break-all p-2' : 'text-red-400'}`}
                                    >
                                      {ellipse( e.value, 256)}
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          </div>
                        )
                      }
                      {
                        ['refunded'].includes(s.id) && _data?.error && !receipt?.status &&
                        (
                          <div className={rowClassName}>
                            <span
                              className={rowTitleClassName}
                              style={{ minWidth: '8rem' }}
                            >
                              Error
                            </span>
                            <div className="flex flex-col space-y-1.5">
                              {
                                _data.error?.code &&
                                (
                                  <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg font-semibold py-0.5 px-2">
                                    {_data.error.code}
                                  </div>
                                )
                              }
                              <div className="flex flex-col space-y-1.5">
                                {
                                  [
                                    {
                                      id: 'reason',
                                      value: _data.error?.reason && `Reason: ${_data.error.reason}`,
                                    },
                                    {
                                      id: 'message',
                                      value: _data.error?.data?.message || _data.error?.message,
                                    },
                                    {
                                      id: 'body',
                                      value: (_data.error?.body || '').replaceAll('"""', ''),
                                    },
                                  ]
                                  .filter(e => e?.value)
                                  .map((e, j) => (
                                    <div
                                      key={j}
                                      className={`${['body'].includes(e.id) ? 'bg-slate-100 dark:bg-slate-800 rounded-lg p-2' : 'text-red-500 dark:text-red-600'} ${['reason'].includes(e.id) ? 'font-semibold' : 'font-medium'}`}
                                    >
                                      {ellipse(e.value, 256)}
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          </div>
                        )
                      }
                    </div>
                  </div>
                )
              })
            }
            <div className="max-w-6.5xl sm:col-span-4 grid sm:grid-cols-4 gap-6 mx-auto">
              {
                no_gas_remain && (!refunded || (refunded.receipt && !refunded.receipt.status)) && (executed || error) &&
                (
                  <div className="w-fit bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-200 text-base font-medium p-3">
                    No refund for this GMP call.
                  </div>
                )
              }
              {
                payloadHash &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      Payload Hash
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {payloadHash}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={payloadHash}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                approved &&
                (
                  <>
                    <div className="sm:col-span-4 space-y-2">
                      <div className="text-lg font-semibold">
                        Methods
                      </div>
                      <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded-lg text-base font-medium py-0.5 px-1.5">
                        execute{symbol ? 'WithToken' : ''}
                      </div>
                    </div>
                    <div className="sm:col-span-4 text-lg font-semibold">
                      Arguments
                    </div>
                  </>
                )
              }
              {
                commandId &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      commandId
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {commandId}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={commandId}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                (sourceChain || chain) &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      sourceChain
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {sourceChain || getChain(chain, chains_data)?.chain_name || chain}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={sourceChain || getChain(chain, chains_data)?.chain_name || chain}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                sender &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      sourceAddress
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {sender}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={sender}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                destinationContractAddress &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      destinationContractAddress
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {destinationContractAddress}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={destinationContractAddress}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                payload &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      payload
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {payload}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={payload}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                symbol &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      symbol
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {symbol}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={symbol}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                (approved?.returnValues?.amount || call?.returnValues?.amount) &&
                (
                  <div className="sm:col-span-4 space-y-2">
                    <span className="text-base font-medium">
                      amount
                    </span>
                    <div className="flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {BigNumber.from(approved?.returnValues?.amount || call?.returnValues?.amount).toString()}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={BigNumber.from(approved?.returnValues?.amount || call?.returnValues?.amount).toString()}
                        />
                      </div>
                    </div>
                  </div>
                )
              }
              {
                execute_data &&
                (
                  <>
                    <div className="sm:col-span-4 text-lg font-semibold">
                      Execute Data
                    </div>
                    <div className="sm:col-span-4 flex items-start">
                      <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-lg text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                        {execute_data}
                      </div>
                      <div className="mt-4">
                        <Copy
                          size={20}
                          value={execute_data}
                        />
                      </div>
                    </div>
                  </>
                )
              }
            </div>
          </div>
        </> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}