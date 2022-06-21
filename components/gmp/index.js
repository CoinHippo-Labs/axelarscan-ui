import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { BigNumber, FixedNumber, providers, utils } from 'ethers'
import { AxelarGMPRecoveryAPI } from '@axelar-network/axelarjs-sdk'
import { TailSpin, Watch, Puff, FallingLines } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle, BiSave, BiEditAlt } from 'react-icons/bi'
import { FiCircle } from 'react-icons/fi'
import { TiArrowRight } from 'react-icons/ti'
import { RiCloseCircleFill } from 'react-icons/ri'

import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import Notification from '../notifications'
import Wallet from '../wallet'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equals_ignore_case, total_time_string, loader_color, sleep } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets, wallet } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { default_chain_id, chain_id, provider, web3_provider, address, signer } = { ...wallet_data }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [api, setApi] = useState(null)
  const [gmp, setGmp] = useState(null)
  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [executeResponse, setExecuteResponse] = useState(null)
  const [gasAdding, setGasAdding] = useState(null)
  const [gasAddResponse, setGasAddResponse] = useState(null)
  const [txHashEdit, setTxHashEdit] = useState(null)
  const [txHashEditing, setTxHashEditing] = useState(false)
  const [txHashEditUpdating, setTxHashEditUpdating] = useState(false)

  useEffect(() => {
    if (!api) {
      setApi(new AxelarGMPRecoveryAPI({ environment: process.env.NEXT_PUBLIC_ENVIRONMENT }))
    }
  }, [])

  useEffect(() => {
    const getData = async () => {
      if (tx && api) {
        if (gmp) {
          await sleep(2 * 1000)
          if (gmp.tx !== tx) {
            setGmp(null)
            resetTxHashEdit()
          }
        }
        const response = await api.execGet(process.env.NEXT_PUBLIC_GMP_API_URL, {
          method: 'searchGMP',
          txHash: tx,
        })
        setGmp({
          data: response?.[0],
          tx,
        })
      }
    }
    if (!approving && !executing && !txHashEditing) {
      getData()
    }
    const interval = setInterval(() => getData(), 0.15 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [tx, api, approving, executing, txHashEditing])

  const resetTxHashEdit = () => {
    setApproveResponse(null)
    setExecuteResponse(null)
    setGasAddResponse(null)
    setTxHashEdit(null)
    setTxHashEditing(false)
    setTxHashEditUpdating(false)
  }

  const saveGMP = async (sourceTransactionHash, transactionHash, relayerAddress, error) => {
    const params = {
      method: 'saveGMP',
      sourceTransactionHash,
      transactionHash,
      relayerAddress,
      error,
    }
    // request api
    await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, {
      method: 'POST',
      body: JSON.stringify(params),
    }).catch(error => { return null })
    resetTxHashEdit()
  }

  const approve = async data => {
    if (api && data) {
      setApproving(true)
      setApproveResponse({
        status: 'pending',
        message: 'Approving',
      })
      const { call } = { ...data }
      const { chain, transactionHash } = { ...call }
      const { destinationChain } = { ...call?.returnValues }
      if (transactionHash && chain && destinationChain) {
        await api.manualRelayToDestChain({
          txHash: transactionHash,
          src: chain,
          dest: destinationChain,
          debug: true,
        })
        await sleep(15 * 1000)
      }
      setApproving(false)
      setApproveResponse({
        status: 'success',
        message: 'Approve successful',
      })
    }
  }

  const execute = async data => {
    if (api && signer && data) {
      setExecuting(true)
      setExecuteResponse({
        status: 'pending',
        message: 'Executing',
      })
      await api.executeManually(data, response => {
        if (response?.status !== 'pending') {
          setExecuting(false)
        }
        setExecuteResponse(response)
      })
    }
  }

  const addNativeGas = async data => {
    if (api && signer && data) {
      try {
        setGasAdding(true)
        setGasAddResponse({
          status: 'pending',
          message: 'Estimating & Paying gas',
        })
        const { call } = { ...data }
        const { chain, transactionHash } = { ...call }
        const response = await api.addNativeGas(chain, transactionHash, {
          refundAddress: address,
        })
        if (response?.success) {
          await sleep(15 * 1000)
        }
        setGasAdding(false)
        setGasAddResponse({
          status: response?.success ? 'success' : 'failed',
          message: response?.error || 'Pay gas successful',
          txHash: response?.transaction?.transactionHash,
        })
      } catch (error) {
        setGasAdding(false)
        setGasAddResponse({
          status: 'failed',
          message: error?.reason || error?.data?.message || error?.data?.text || error?.message,
        })
      }
    }
  }

  const getGasPrice = async (sourceChain, destinationChain, sourceTokenSymbol) => {
    const params = {
      method: 'getGasPrice',
      sourceChain,
      destinationChain,
      sourceTokenSymbol,
    }
    // request api
    const res = await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, {
      method: 'POST',
      body: JSON.stringify(params),
    }).catch(error => { return null })
    return res && await res.json()
  }

  const _addNativeGas = async data => {
    if (api && signer && data) {
      try {
        const { call, approved } = { ...data }
        const { transactionHash, logIndex, event } = { ...call }
        const { destinationChain, destinationContractAddress, payload } = { ...call?.returnValues }
        const { commandId, sourceChain, sourceAddress, symbol, amount } = { ...approved?.returnValues }
        setGasAdding(true)
        setGasAddResponse({
          status: 'pending',
          message: `Estimating gas for execution on ${destinationChain}`,
        })
        let web3 = new Web3(getChain(destinationChain, evm_chains_data)?.provider_params?.[0]?.rpcUrls?.[0])
        // abi (IAxelarExecutable) (temporary hardcoded for now)
        const destination_contract = new web3.eth.Contract(
          [{ "inputs": [{ "internalType": "bytes32", "name": "commandId", "type": "bytes32" }, { "internalType": "string", "name": "sourceChain", "type": "string" }, { "internalType": "string", "name": "sourceAddress", "type": "string" }, { "internalType": "bytes", "name": "payload", "type": "bytes" }], "name": "execute", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "commandId", "type": "bytes32" }, { "internalType": "string", "name": "sourceChain", "type": "string" }, { "internalType": "string", "name": "sourceAddress", "type": "string" }, { "internalType": "bytes", "name": "payload", "type": "bytes" }, { "internalType": "string", "name": "tokenSymbol", "type": "string" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "executeWithToken", "outputs": [], "stateMutability": "nonpayable", "type": "function" }],
          destinationContractAddress
        )
        let value, errorEstimateGas
        switch (event) {
          case 'ContractCall':
            try {
              value = await destination_contract.methods.execute(commandId, sourceChain, sourceAddress, payload).estimateGas()
            } catch (error) {
              errorEstimateGas = error
            }
            break
          case 'ContractCallWithToken':
            try {
              value = await destination_contract.methods.executeWithToken(commandId, sourceChain, sourceAddress, payload, symbol, BigNumber.from(amount).toString()).estimateGas()
            } catch (error) {
              errorEstimateGas = error
            }
            break
          default:
            break
        }
        if (typeof value === 'number') {
          const response = await getGasPrice(sourceChain, destinationChain, getChain(sourceChain, evm_chains_data)?.provider_params?.[0]?.nativeCurrency?.symbol)
          const { source_token } = { ...response?.result }
          if (source_token?.gas_price) {
            value = FixedNumber.fromString(value.toString())
              .mulUnsafe(FixedNumber.fromString(source_token.gas_price.toString()))
              .mulUnsafe(FixedNumber.fromString(utils.parseUnits('1.5', source_token.decimals).toString()))
              .round(0).toString().replace('.0', '')
          }
          setGasAddResponse({
            status: 'pending',
            message: `Paying gas${source_token ? ` (${number_format(utils.formatUnits(value.toString(), source_token.decimals), '0,0.000000')} ${source_token.symbol})` : ''}`,
          })
          web3 = new Web3(provider)
          // abi (IAxelarGasService) & contract address (temporary hardcoded for now)
          const gas_service_contract = new web3.eth.Contract(
            [{ "inputs": [{ "internalType": "bytes32", "name": "txHash", "type": "bytes32" }, { "internalType": "uint256", "name": "txIndex", "type": "uint256" }, { "internalType": "address", "name": "gasToken", "type": "address" }, { "internalType": "uint256", "name": "gasFeeAmount", "type": "uint256" }, { "internalType": "address", "name": "refundAddress", "type": "address" }], "name": "addGas", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "txHash", "type": "bytes32" }, { "internalType": "uint256", "name": "logIndex", "type": "uint256" }, { "internalType": "address", "name": "refundAddress", "type": "address" }], "name": "addNativeGas", "outputs": [], "stateMutability": "payable", "type": "function" }],
            data.gas_paid?.contract_address || '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6'
          )
          gas_service_contract.methods.addNativeGas(transactionHash, logIndex, address).send({ from: address, value })
            .on('transactionHash', hash => {
              const txHash = hash
              setGasAddResponse({
                status: 'pending',
                message: 'Wait for confirmation',
                txHash,
              })
            })
            .on('receipt', async receipt => {
              const txHash = receipt?.transactionHash
              await sleep(15 * 1000)
              setGasAdding(false)
              setGasAddResponse({
                status: 'success',
                message: 'Pay gas successful',
                txHash,
              })
            })
            .on('error', (error, receipt) => {
              const txHash = receipt?.transactionHash
              setGasAdding(false)
              setGasAddResponse({
                status: 'failed',
                message: error?.reason || error?.data?.message || error?.message,
                txHash,
              })
            })
        }
        else {
          setGasAdding(false)
          setGasAddResponse({
            status: 'failed',
            message: `Cannot estimate gas on ${destinationChain}${errorEstimateGas ? `: ${errorEstimateGas.message}` : ''}`,
          })
        }
      } catch (error) {
        setGasAdding(false)
        setGasAddResponse({
          status: 'failed',
          message: error?.message,
        })
      }
    }
  }

  const { data } = { ...gmp }
  const { call, gas_paid, approved, executed, is_executed, error, is_not_enough_gas, status } = { ...data }
  const { event, chain } = { ...call }
  const { sender, destinationChain, destinationContractAddress, payloadHash, payload, symbol, amount } = { ...call?.returnValues }
  const { from } = { ...call?.transaction }
  const relayer = executed?.transaction?.from
  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
  const source_chain_data = getChain(chain, chains_data)
  const axelar_chain_data = getChain('axelarnet', chains_data)
  const destination_chain_data = getChain(destinationChain, chains_data)
  const asset_data = assets_data?.find(a => equals_ignore_case(a?.symbol, symbol))
  const source_contract_data = asset_data?.contracts?.find(c => c.chain_id === source_chain_data?.chain_id)
  const decimals = source_contract_data?.decimals || asset_data?.decimals || 18
  const _symbol = source_contract_data?.symbol || asset_data?.symbol || symbol
  const asset_image = source_contract_data?.image || asset_data?.image
  const wrong_source_chain = source_chain_data && chain_id !== source_chain_data.chain_id && !gasAdding
  const wrong_destination_chain = destination_chain_data && chain_id !== destination_chain_data.chain_id && !executing
  const approveButton = call && !approved && !executed && !is_executed && moment().diff(moment(call.block_timestamp * 1000), 'minutes') >= 2 && (
    <div className="flex items-center space-x-2">
      <button
        disabled={approving}
        onClick={() => approve(data)}
        className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${approving ? 'pointer-events-none' : ''} rounded-lg flex items-center text-white bold space-x-1.5 py-1 px-2`}
      >
        {approving && (
          <TailSpin color="white" width="16" height="16" />
        )}
        <span>
          Approve
        </span>
      </button>
    </div>
  )
  const executeButton = payload && approved && !executed && !is_executed && (error || moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2) && (
    <>
      <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs pt-1">
        Execute at destination chain
      </span>
      <div className="flex items-center space-x-2">
        {web3_provider && !wrong_destination_chain && (
          <button
            disabled={executing}
            onClick={() => execute(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${executing ? 'pointer-events-none' : ''} rounded-lg flex items-center text-white bold space-x-1.5 py-1 px-2`}
          >
            {executing && (
              <TailSpin color="white" width="16" height="16" />
            )}
            <span>
              Execute
            </span>
          </button>
        )}
        <Wallet
          connectChainId={wrong_destination_chain && (destination_chain_data.chain_id || default_chain_id)}
        />
      </div>
    </>
  )
  const gasAddButton = executeButton && (is_not_enough_gas || !gas_paid) && (
    <>
      <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs">
        Pay new gas (SDK) at source chain
      </span>
      <div className="flex items-center space-x-2">
        {web3_provider && !wrong_source_chain && (
          <button
            disabled={gasAdding}
            onClick={() => addNativeGas(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${gasAdding ? 'pointer-events-none' : ''} rounded-lg flex items-center text-white bold space-x-1.5 py-1 px-2`}
          >
            {gasAdding && (
              <TailSpin color="white" width="16" height="16" />
            )}
            <span className="whitespace-nowrap">
              Pay new gas
            </span>
          </button>
        )}
        <Wallet
          connectChainId={wrong_source_chain && (source_chain_data.chain_id || default_chain_id)}
        />
      </div>
    </>
  )
  const _gasAddButton = executeButton && (is_not_enough_gas || !gas_paid) && (
    <>
      <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs">
        Pay new gas at source chain
      </span>
      <div className="flex items-center space-x-2">
        {web3_provider && !wrong_source_chain && (
          <button
            disabled={gasAdding}
            onClick={() => _addNativeGas(data)}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${gasAdding ? 'pointer-events-none' : ''} rounded-lg flex items-center text-white bold space-x-1.5 py-1 px-2`}
          >
            {gasAdding && (
              <TailSpin color="white" width="16" height="16" />
            )}
            <span className="whitespace-nowrap">
              Pay new gas
            </span>
          </button>
        )}
        <Wallet
          connectChainId={wrong_source_chain && (source_chain_data.chain_id || default_chain_id)}
        />
      </div>
    </>
  )

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
  const detail_steps = steps
  const time_spent = total_time_string(call?.block_timestamp, executed?.block_timestamp)
  const stepClassName = 'min-h-full bg-white dark:bg-slate-900 rounded-lg space-y-2 py-4 px-5'
  const titleClassName = 'whitespace-nowrap uppercase text-lg font-bold'
  const notificationResponse = executeResponse || gasAddResponse || approveResponse
  const explorer = notificationResponse && (
    notificationResponse.is_axelar_transaction ?
      axelar_chain_data : executeResponse ?
      destination_chain_data : source_chain_data
  )?.explorer

  return (
    <div className="space-y-4 mt-2 mb-6 mx-auto">
      {tx && equals_ignore_case(gmp?.tx, tx) ?
        <>
          {notificationResponse && (
            <Notification
              hideButton={true}
              outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
              innerClassNames={`${notificationResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : notificationResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
              animation="animate__animated animate__fadeInDown"
              icon={notificationResponse.status === 'failed' ?
                <BiXCircle className="w-6 h-6 stroke-current mr-2" />
                :
                notificationResponse.status === 'success' ?
                  <BiCheckCircle className="w-6 h-6 stroke-current mr-2" />
                  :
                  <div className="mr-2">
                    <Watch color="white" width="20" height="20" />
                  </div>
              }
              content={<div className="flex items-center">
                <span className="break-all mr-2">
                  {notificationResponse.message}
                </span>
                {explorer?.url && notificationResponse.txHash && (
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
                )}
                {notificationResponse.status === 'failed' && notificationResponse.message && (
                  <Copy
                    value={notificationResponse.message}
                    size={20}
                    className="cursor-pointer text-slate-200 hover:text-white"
                  />
                )}
              </div>}
              onClose={() => {
                setApproveResponse(null)
                setExecuteResponse(null)
                setGasAddResponse(null)
              }}
            />
          )}
          <div className="grid sm:grid-cols-4 gap-6">
            <div className={`${stepClassName} sm:col-span-4`}>
              <div className={`${titleClassName}`}>
                GMP
              </div>
              {data ?
                <div className="overflow-x-auto flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex flex-col space-y-2">
                    <div className="pb-1">
                      <span className="bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-1.5 px-2.5">
                        Method
                      </span>
                    </div>
                    <div className="max-w-min bg-slate-100 dark:bg-slate-900 rounded-lg text-xs lg:text-sm font-semibold -mt-0.5 py-0.5 px-1.5">
                      {event === 'ContractCall' ?
                        'callContract' :
                        event === 'ContractCallWithToken' ?
                          'callContractWithToken' :
                          event || '-'
                      }
                    </div>
                    {amount && _symbol && (
                      <div className="min-w-max max-w-min bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center sm:justify-end space-x-1.5 py-1 px-2.5">
                        {asset_image && (
                          <Image
                            src={asset_image}
                            className="w-7 sm:w-5 lg:w-7 h-7 sm:h-5 lg:h-7 rounded-full"
                          />
                        )}
                        <span className="text-base sm:text-sm lg:text-base font-semibold">
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
                  <div className="flex flex-col space-y-2">
                    <div className="pb-1">
                      <span className="bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-1.5 px-2.5">
                        Source
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {source_chain_data?.image && (
                        <Image
                          src={source_chain_data.image}
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-base sm:text-sm lg:text-base font-bold">
                        {source_chain_data?.name || chain}
                      </span>
                    </div>
                    {from && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Sender address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', from)}`}
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
                                    {ellipse(from, 8, source_chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(from, 12, source_chain_data?.prefix_address)}
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
                            href={`${source_chain_data?.explorer?.url}${source_chain_data?.explorer?.address_path?.replace('{address}', sender)}`}
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
                                    {ellipse(sender, 8, source_chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(sender, 12, source_chain_data?.prefix_address)}
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
                  <div className="flex flex-col space-y-2">
                    <div className="pb-1">
                      <span className="bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-1.5 px-2.5">
                        Destination
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {destination_chain_data?.image && (
                        <Image
                          src={destination_chain_data.image}
                          className="w-8 sm:w-6 lg:w-8 h-8 sm:h-6 lg:h-8 rounded-full"
                        />
                      )}
                      <span className="text-base sm:text-sm lg:text-base font-bold">
                        {destination_chain_data?.name || destinationChain}
                      </span>
                    </div>
                    {destinationContractAddress && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Contract address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', destinationContractAddress)}`}
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
                                    {ellipse(destinationContractAddress, 8, destination_chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(destinationContractAddress, 12, destination_chain_data?.prefix_address)}
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
                    {equals_ignore_case(status, 'executed') && relayer && (
                      <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-600 font-semibold">
                          Relayer address
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${destination_chain_data?.explorer?.url}${destination_chain_data?.explorer?.address_path?.replace('{address}', relayer)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={relayer}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(relayer, 8, destination_chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(relayer, 12, destination_chain_data?.prefix_address)}
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
                  <div className="min-w-max flex flex-col space-y-1">
                    <div className="pb-2">
                      <span className="bg-slate-50 dark:bg-slate-800 rounded-xl text-base font-semibold py-1.5 px-2.5">
                        Status
                      </span>
                    </div>
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
                    {gasAddButton}
                    {_gasAddButton}
                    {approveButton || executeButton || (time_spent && (
                      <div className="flex items-center space-x-1 mx-1 pt-0.5">
                        <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 font-medium">
                          time spent:
                        </span>
                        <span className="whitespace-nowrap font-bold">
                          {time_spent}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                :
                <span className="text-slate-400 dark:text-slate-200 text-base font-semibold">
                  Data not found
                </span>
              }
            </div>
            {data && detail_steps.map((s, i) => {
              const { error, is_not_enough_gas } = { ...gmp.data }
              const { title, chain_data, data } = { ...s }
              const _data = i === 3 ? data || error : data
              const { transactionHash, blockNumber, block_timestamp, contract_address, returnValues, transaction, receipt } = { ..._data }
              const { sender } = { ...returnValues }
              const from = receipt?.from || transaction?.from
              const to = i < 3 ? contract_address : destinationContractAddress
              const { explorer } = { ...chain_data }
              const { url, transaction_path, block_path, address_path, icon } = { ...explorer }
              const rowClassName = 'flex space-x-4'
              const rowTitleClassName = `w-32 text-black dark:text-slate-300 text-sm lg:text-base font-bold`
              return (
                <div
                  key={i}
                  className={`${stepClassName} sm:col-span-3 lg:col-span-2`}
                >
                  <div className={`${titleClassName}`}>
                    {title}
                  </div>
                  <div className="flex flex-col space-y-3">
                    {i === 3 && (executeButton || (!data && is_executed)) ?
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Tx Hash:
                        </span>
                        <div className="flex items-center space-x-1">
                          {txHashEditing ?
                            <input
                              disabled={txHashEditUpdating}
                              placement="Transaction Hash"
                              value={txHashEdit}
                              onChange={e => setTxHashEdit(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 rounded-lg text-base py-1 px-2"
                            />
                            :
                            transactionHash ?
                              <>
                                <a
                                  href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-white"
                                >
                                  <div className="text-sm lg:text-base font-bold">
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
                                  size={18}
                                />
                                <a
                                  href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
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
                              </>
                              :
                              !(!data && is_executed) && (
                                <FallingLines color={loader_color(theme)} width="32" height="32" />
                              )
                          }
                          {txHashEditing ?
                            <>
                              <button
                                disabled={txHashEditUpdating}
                                onClick={() => resetTxHashEdit()}
                                className="text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-500"
                              >
                                <RiCloseCircleFill size={20} />
                              </button>
                              <button
                                disabled={!txHashEdit || txHashEditUpdating}
                                onClick={async () => {
                                  setTxHashEditUpdating(true)
                                  await saveGMP(call?.transactionHash, txHashEdit, address)
                                }}
                                className="text-blue-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
                              >
                                {txHashEditUpdating ?
                                  <TailSpin color={loader_color(theme)} width="16" height="16" /> :
                                  <BiSave size={20} />
                                }
                              </button>
                            </>
                            :
                            <button
                              onClick={() => setTxHashEditing(true)}
                              className="text-white hover:text-slate-400 dark:text-slate-900 dark:hover:text-slate-400"
                            >
                              <BiEditAlt size={20} />
                            </button>
                          }
                        </div>
                      </div>
                      :
                      transactionHash ?
                        <div className={rowClassName}>
                          <span className={rowTitleClassName}>
                            Tx Hash:
                          </span>
                          <div className="flex items-center space-x-1">
                            <a
                              href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              <div className="text-sm lg:text-base font-bold">
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
                              size={18}
                            />
                            <a
                              href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
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
                          </div>
                        </div>
                        :
                        <FallingLines color={loader_color(theme)} width="32" height="32" />
                    }
                    {blockNumber && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Block:
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${block_path?.replace('{block}', blockNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white text-sm lg:text-base font-bold"
                          >
                            {number_format(blockNumber, '0,0')}
                          </a>
                        </div>
                      </div>
                    )}
                    {(_data || (i === 3 && is_executed)) && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Status:
                        </span>
                        <div className={`${data || (i === 3 && is_executed) ? 'text-green-500 dark:text-green-600' : 'text-red-500 dark:text-red-600'} uppercase flex items-center text-sm lg:text-base font-bold space-x-1`}>
                          {data || (i === 3 && is_executed) ?
                            <BiCheckCircle size={20} /> :
                            <BiXCircle size={20} />
                          }
                          <span>
                            {receipt?.status || (i === 3 && is_executed) ?
                              'Success' : 'Error'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    {block_timestamp && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Time:
                        </span>
                        <span className="text-slate-400 dark:text-slate-600 text-sm lg:text-base font-medium">
                          {moment(block_timestamp * 1000).fromNow()} ({moment(block_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')})
                        </span>
                      </div>
                    )}
                    {to && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          {i === 1 ? 'Gas Service' : i === 3 ? 'Destination' : 'Gateway'}:
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', to)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={to}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm lg:text-base font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(to, 10, chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(to, 12, chain_data?.prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={to}
                            size={18}
                          />
                          <a
                            href={`${url}${address_path?.replace('{address}', to)}`}
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
                        </div>
                      </div>
                    )}
                    {from && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          {i < 2 ? 'Sender' : 'Relayer'}:
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
                                <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm lg:text-base font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(from, 10, chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(from, 12, chain_data?.prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={from}
                            size={18}
                          />
                          <a
                            href={`${url}${address_path?.replace('{address}', from)}`}
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
                        </div>
                      </div>
                    )}
                    {i < 1 && sender && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Source:
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
                                <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm lg:text-base font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(sender, 10, chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(sender, 12, chain_data?.prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={sender}
                            size={18}
                          />
                          <a
                            href={`${url}${address_path?.replace('{address}', sender)}`}
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
                        </div>
                      </div>
                    )}
                    {i === 3 && call?.transaction?.from && (
                      <div className={rowClassName}>
                        <span className={rowTitleClassName}>
                          Receiver:
                        </span>
                        <div className="flex items-center space-x-1">
                          <a
                            href={`${url}${address_path?.replace('{address}', call.transaction.from)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            <EnsProfile
                              address={call.transaction.from}
                              no_copy={true}
                              fallback={(
                                <div className="h-6 flex items-center text-blue-600 dark:text-white text-sm lg:text-base font-bold">
                                  <span className="xl:hidden">
                                    {ellipse(call.transaction.from, 10, chain_data?.prefix_address)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(call.transaction.from, 12, chain_data?.prefix_address)}
                                  </span>
                                </div>
                              )}
                            />
                          </a>
                          <Copy
                            value={call.transaction.from}
                            size={18}
                          />
                          <a
                            href={`${url}${address_path?.replace('{address}', call.transaction.from)}`}
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
                        </div>
                      </div>
                    )}
                    {i === 3 && !data && _data && (
                      <div className={rowClassName}>
                        <span
                          className={rowTitleClassName}
                          style={{ minWidth: '8rem' }}
                        >
                          Error:
                        </span>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1.5">
                            {_data.error?.code && (
                              <div className="max-w-min bg-red-100 dark:bg-red-700 border border-red-500 dark:border-red-600 rounded-lg font-semibold py-0.5 px-2">
                                {_data.error.code}
                              </div>
                            )}
                            {is_not_enough_gas && (
                              <div className="max-w-min bg-yellow-100 dark:bg-yellow-500 border border-yellow-500 dark:border-yellow-600 rounded-lg whitespace-nowrap uppercase font-semibold py-0.5 px-2">
                                {`${_data.error?.reason === 'transaction failed' ? 'Can be n' : 'N'}ot enough gas`}
                              </div>
                            )}
                          </div>
                          <span className="text-red-500 dark:text-red-600 font-semibold">
                            {ellipse(_data.error?.body?.replaceAll('"""', '') || _data.error?.reason, 256)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {payloadHash && (
              <div className="sm:col-span-4 space-y-2">
                <span className="text-base font-semibold">
                  Payload Hash
                </span>
                <div className="flex items-start">
                  <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                    {payloadHash}
                  </div>
                  <div className="mt-4">
                    <Copy
                      value={payloadHash}
                      size={20}
                    />
                  </div>
                </div>
              </div>
            )}
            {payload && (
              <div className="sm:col-span-4 space-y-2">
                <span className="text-base font-semibold">
                  Payload
                </span>
                <div className="flex items-start">
                  <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                    {payload}
                  </div>
                  <div className="mt-4">
                    <Copy
                      value={payload}
                      size={20}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}