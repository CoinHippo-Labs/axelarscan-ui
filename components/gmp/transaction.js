import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { BigNumber as EthersBigNumber, constants, providers, utils } from 'ethers'
import BigNumber from 'bignumber.js'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa'
import { BsFileEarmarkX } from 'react-icons/bs'
import { BiEditAlt, BiSave } from 'react-icons/bi'
import { RiCloseCircleFill } from 'react-icons/ri'
import { MdRefresh } from 'react-icons/md'

import Copy from '../copy'
import Widget from '../widget'
import Popover from '../popover'
import Notification from '../notifications'
import Wallet from '../wallet'

import { search } from '../../lib/api/gmp'
import { chainTitle } from '../../lib/object/chain'
import { numberFormat, ellipseAddress, sleep } from '../../lib/utils'
import IAxelarExecutable from '../../data/contracts/interfaces/IAxelarExecutable.json'
import { WALLET_DATA } from '../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Transaction() {
  const dispatch = useDispatch()
  const { preferences, chains, assets, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { default_chain_id, chain_id, provider, web3_provider, address, signer } = { ...wallet_data }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [transaction, setTransaction] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)
  const [executeResponse, setExecuteResponse] = useState(null)
  const [executeResponseCountDown, setExecuteResponseCountDown] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [txHashExecutedEditing, setTxHashExecutedEditing] = useState(false)
  const [txHashExecutedSaving, setTxHashExecutedSaving] = useState(false)
  const [txHashExecuted, setTxHashExecuted] = useState(null)

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = async e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))

            if (provider) {
              const web3Provider = new providers.Web3Provider(provider)
              const signer = web3Provider.getSigner()
              const address = await signer.getAddress()
              dispatch({
                type: WALLET_DATA,
                value: {
                  chain_id: Web3.utils.hexToNumber(e?.chainId),
                  web3_provider: web3Provider,
                  address,
                  signer,
                },
              })
            }
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3, provider])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    const getData = async () => {
      if (tx) {
        let data
        const params = {
          txHash: tx,
        }
        const response = await search(params)
        setTransaction({ data: response?.data?.[0], tx })
      }
    }

    if (transaction?.tx !== tx) {
      setTransaction(null)
      resetEditTxHashExecuted()
    }

    if (!executing && !txHashExecutedEditing) {
      getData()
    }

    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [tx, executing, txHashExecutedEditing])

  useEffect(() => {
    if (typeof executeResponseCountDown === 'number') {
      if (executeResponseCountDown === 0) {
        setExecuteResponse(null)
      }
      else {
        const interval = setInterval(() => {
          if (executeResponseCountDown - 1 > -1) {
            setExecuteResponseCountDown(executeResponseCountDown - 1)
          }
        }, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [executeResponseCountDown])

  useEffect(() => {
    if (['success'].includes(executeResponse?.status)) {
      if (!executeResponseCountDown) {
        setExecuteResponseCountDown(10)
      }
    }
  }, [executeResponse])

  const addTokenToMetaMask = async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  }

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const saveGMP = async (tx_hash, event, chain, contract_address, relayer_address, error) => {
    if (process.env.NEXT_PUBLIC_GMP_API_URL && event && chain && contract_address) {
      // initial params
      const params = {
        method: 'saveGMP',
        event: {
          event: `${error ? 'errorE' : 'e'}xecute${event.event?.endsWith('WithMint') ? 'WithToken' : ''}`,
          transactionHash: tx_hash,
          sourceTransactionHash: event.returnValues?.sourceTxHash,
          sourceChain: event.returnValues?.sourceChain,
          from: relayer_address,
          error,
        },
        chain,
        contractAddress: contract_address,
      }
      // request api
      await fetch(process.env.NEXT_PUBLIC_GMP_API_URL, {
        method: 'POST',
        body: JSON.stringify(params),
      }).catch(error => { return null })
      resetEditTxHashExecuted()
    }
  }

  const resetEditTxHashExecuted = () => {
    setTxHashExecutedEditing(false)
    setTxHashExecuted(null)
    setTxHashExecutedSaving(false)
    setExecuteResponse(null)
  }

  const execute = async data => {
    setExecuting(true)
    setExecuteResponse(null)
    if (signer && data) {
      try {
        setExecuteResponse({ status: 'pending', message: 'Executing' })
        const contract = new web3.eth.Contract(IAxelarExecutable.abi, data.call?.returnValues?.destinationContractAddress);
        if (data.call?.event === 'ContractCall') {
          contract.methods.execute(
            data.approved?.returnValues?.commandId,
            data.approved?.returnValues?.sourceChain,
            data.approved?.returnValues?.sourceAddress,
            data.call?.returnValues?.payload,
          ).send({ from: address })
          .on('transactionHash', hash => {
            setExecuteResponse({ status: 'pending', message: 'Wait for Confirmation', tx_hash: hash })
          })
          .on('receipt', async receipt => {
            setExecuteResponse({ status: 'success', message: 'Execute successful', tx_hash: receipt?.transactionHash })
            await saveGMP(receipt?.transactionHash, data.approved, data.approved?.chain, data.approved?.contract_address, address)
            await sleep(2 * 1000)
            setExecuting(false)
          })
          .on('error', async (error, receipt) => {
            setExecuteResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message, tx_hash: receipt?.transactionHash })
            await sleep(2 * 1000)
            await saveGMP(receipt?.transactionHash, data.approved, data.approved?.chain, data.approved?.contract_address, address, error)
            setExecuting(false)
          })
        }
        else if (data.call?.event === 'ContractCallWithToken') {
          contract.methods.executeWithToken(
            data.approved?.returnValues?.commandId,
            data.approved?.returnValues?.sourceChain,
            data.approved?.returnValues?.sourceAddress,
            data.call?.returnValues?.payload,
            data.approved?.returnValues?.symbol,
            EthersBigNumber.from(data.approved?.returnValues?.amount).toString(),
          ).send({ from: address })
          .on('transactionHash', hash => {
            setExecuteResponse({ status: 'pending', message: 'Wait for Confirmation', tx_hash: hash })
          })
          .on('receipt', async receipt => {
            setExecuteResponse({ status: 'success', message: 'Execute successful', tx_hash: receipt?.transactionHash })
            await saveGMP(receipt?.transactionHash, data.approved, data.approved?.chain, data.approved?.contract_address, address)
            await sleep(2 * 1000)
            setExecuting(false)
          })
          .on('error', async (error, receipt) => {
            setExecuteResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message, tx_hash: receipt?.transactionHash })
            await sleep(2 * 1000)
            await saveGMP(receipt?.transactionHash, data.approved, data.approved?.chain, data.approved?.contract_address, address, error)
            setExecuting(false)
          })
        }
        else {
          setExecuteResponse({ status: 'failed', message: 'No response' })
          setExecuting(false)
        }
      } catch (error) {
        setExecuteResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message })
        setExecuting(false)
      }
    }
  }

  const { data } = { ...transaction }
  const { call, gas_paid, approved, executed, error } = { ...data }

  const asset = assets_data?.find(a => a?.symbol?.toLowerCase() === call?.returnValues?.symbol?.toLowerCase())
  const fromChain = chains_data?.find(c => c.id === call?.chain)
  const toChain = chains_data?.find(c => c.id === call?.returnValues?.destinationChain?.toLowerCase())
  const fromContract = asset?.contracts?.find(c => c.chain_id === fromChain?.chain_id)
  const toContract = asset?.contracts?.find(c => c.chain_id === toChain?.chain_id)

  const addToMetaMaskButton = fromContract && fromContract.contract_address !== constants.AddressZero && (
    <button
      onClick={() => addTokenToMetaMask(fromChain?.chain_id, { ...asset, ...fromContract })}
      className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
    >
      <Img
        src="/logos/wallets/metamask.png"
        alt=""
        className="w-3.5 h-3.5"
      />
    </button>
  )

  const mustSwitchChain = typeof chain_id === 'number' && chain_id !== toChain?.chain_id
  const executeButton = call?.returnValues?.payload && approved && !executed && !data?.is_executed && (error || moment().diff(moment(approved.block_timestamp * 1000), 'minutes') >= 2) && (
    <div className="flex items-center space-x-2">
      {web3_provider && !mustSwitchChain && (
        <button
          onClick={() => execute(data)}
          className={`bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500 ${executing ? 'pointer-events-none' : ''} rounded-lg flex items-center text-white font-semibold space-x-1.5 py-1 px-2 sm:px-3`}
        >
          {executing && (
            <Loader type="Oval" color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" />
          )}
          <span>Execute</span>
        </button>
      )}
      <Wallet
        connectChainId={mustSwitchChain && (toChain?.chain_id || default_chain_id)}
      />
    </div>
  )

  const call_timestamp = (call?.block_timestamp || 0) * 1000
  const executed_timestamp = (executed?.block_timestamp || 0) * 1000
  const time_spent = call_timestamp && executed_timestamp && moment(executed_timestamp).diff(moment(call_timestamp), 'seconds')
  const time_spent_component = time_spent > 0 && (
    <div className="flex items-center space-x-1">
      <span className="whitespace-nowrap text-gray-400 dark:text-gray-500">
        time spent:
      </span>
      <span className="whitespace-nowrap font-semibold">
        {time_spent < 60 ?
          `${time_spent}s` : time_spent < 60 * 60 ?
          `${Math.floor(time_spent / 60)} min${time_spent % 60 > 0 ? ` ${time_spent % 60}s` : ''}` : time_spent < 24 * 60 * 60 ?
          moment.utc(time_spent * 1000).format('HH:mm:ss') : `${moment(executed_timestamp).diff(moment(call_timestamp), 'days')} day`
        }
      </span>
    </div>
  )

  return (
    <div className="max-w-6.5xl mb-3 mx-auto">
      {executeResponse && (
        <Notification
          hideButton={true}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${executeResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : executeResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={executeResponse.status === 'failed' ?
            <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
            :
            executeResponse.status === 'success' ?
              <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
              :
              <FaClock className="w-4 h-4 stroke-current mr-2" />
          }
          content={<span className="flex flex-wrap items-center">
            <span className="mr-1.5">{executeResponse.message}</span>
            {executeResponse.status === 'pending' && (
              <Loader type="TailSpin" color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" className="mr-1.5" />
            )}
            {toChain?.explorer?.url && executeResponse.tx_hash && (
              <a
                href={`${toChain.explorer.url}${toChain.explorer.transaction_path?.replace('{tx}', executeResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center font-semibold mx-1.5"
              >
                <span>View on {toChain.explorer.name}</span>
                <TiArrowRight size={20} className="transform -rotate-45" />
              </a>
            )}
            {['success'].includes(executeResponse.status) && typeof executeResponseCountDown === 'number' && (
              <span className="font-mono">(close in {executeResponseCountDown}s)</span>
            )}
          </span>}
        />
      )}
      {!transaction || data ?
        <>
          <div className="mt-2 xl:mt-4">
            <Widget
              title={<div className="leading-4 uppercase text-gray-400 dark:text-gray-600 text-sm sm:text-base font-semibold mb-2">General Message Passing</div>}
              right={executeButton || time_spent_component}
              className="overflow-x-auto border-0 shadow-md rounded-2xl ml-auto px-5 lg:px-3 xl:px-5"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between space-y-8 sm:space-y-0 my-2">
                {transaction ?
                  call?.returnValues?.sender ?
                    <div className="min-w-max">
                      <div className="flex items-center space-x-1">
                      <Copy
                        text={call.returnValues.sender}
                        copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                          {ellipseAddress(call.returnValues.sender, 8)}
                        </span>}
                      />
                      {fromChain?.explorer?.url && (
                        <a
                          href={`${fromChain.explorer.url}${fromChain.explorer.address_path?.replace('{address}', call.returnValues.sender)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {fromChain.explorer.icon ?
                            <Img
                              src={fromChain.explorer.icon}
                              alt=""
                              className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={16} className="transform -rotate-45" />
                          }
                        </a>
                      )}
                    </div>
                    {fromChain && (
                      <div className="flex items-center space-x-2 mt-1.5">
                        <Img
                          src={fromChain.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(fromChain)}</span>
                      </div>
                    )}
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                  :
                  <div className="flex flex-col space-y-2.5 my-1">
                    <div className="skeleton w-36 h-6" />
                    <div className="skeleton w-24 h-7 mx-auto sm:ml-0" />
                  </div>
                }
                {transaction ?
                  <div className="flex flex-col items-center justify-center space-y-1 mx-auto">
                    <div className="flex items-center space-x-1">
                      <a
                        href={fromChain?.explorer?.url ? `${fromChain.explorer.url}${call ? fromChain.explorer.transaction_path?.replace('{tx}', call.transactionHash) : fromChain.explorer.address_path?.replace('{address}', call?.returnValues?.sender)}` : null}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${call ? 'green-600' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}
                      >
                        {call ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          <Loader type="TailSpin" color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${call ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{call ? 'Call' : 'Calling'}</div>
                      </a>
                      {call?.transactionHash && (
                        <Copy text={call.transactionHash} />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <a
                        href={fromChain?.explorer?.url ? `${fromChain.explorer.url}${gas_paid ? fromChain.explorer.transaction_path?.replace('{tx}', gas_paid.transactionHash) : fromChain.explorer.address_path?.replace('{address}', call?.returnValues?.sender)}` : null}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${gas_paid ? 'green-600' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}
                      >
                        {gas_paid ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          executed ?
                            <FaCheckCircle size={14} className="text-gray-400 dark:text-gray-500 dark:text-white" />
                            :
                            <Loader type="TailSpin" color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${gas_paid ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{gas_paid ? 'Gas Paid' : 'No Gas Paid'}</div>
                      </a>
                      {gas_paid?.transactionHash && (
                        <Copy text={gas_paid.transactionHash} />
                      )}
                    </div>
                  </div>
                  :
                  <div className="flex flex-col items-center justify-center space-y-2 my-1 mx-auto">
                    <div className="skeleton w-16 h-6" />
                    <div className="skeleton w-16 h-6" />
                  </div>
                }
                <div className="mx-auto pt-1">
                  {transaction ?
                    call?.event ?
                      <div className="min-w-max">
                        <div className="flex items-center space-x-2">
                          <div className="max-w-min bg-blue-100 dark:bg-blue-800 border border-blue-500 dark:border-blue-700 rounded-lg py-0.5 px-2 mb-1.5 mx-auto">
                            {call.event === 'ContractCall' ?
                              'callContract'
                              :
                              call.event === 'ContractCallWithToken' ?
                                'callContractWithToken'
                                :
                                call.event
                            }
                          </div>
                          {asset && (
                            <div className="flex items-center justify-center space-x-2 -mt-2">
                              <div className="min-w-max max-w-min bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center space-x-2 py-1 px-3">
                                {asset?.image && (
                                  <Img
                                    src={asset.image}
                                    alt=""
                                    className="w-6 sm:w-5 lg:w-6 h-6 sm:h-5 lg:h-6 rounded-full"
                                  />
                                )}
                                <span className="flex items-center text-gray-700 dark:text-gray-300 text-sm font-semibold">
                                  <span className="font-mono mr-1.5">
                                    {call.returnValues?.amount ?
                                      numberFormat(BigNumber(EthersBigNumber.from(call.returnValues.amount).toString())
                                        .shiftedBy(-(fromContract?.contract_decimals || toContract?.contract_decimals || 6)).toNumber()
                                      , '0,0.00000000', true)
                                      :
                                      '-'
                                    }
                                  </span>
                                  <span className="normal-case">
                                    {ellipseAddress(asset?.symbol || call.returnValues?.symbol, 12)}
                                  </span>
                                </span>
                              </div>
                              {addToMetaMaskButton && (
                                <Popover
                                  placement="top"
                                  title={<span className="normal-case text-xs">Add token</span>}
                                  content={<div className="w-36 text-xs">Add <span className="font-semibold">{asset.symbol}</span> to MetaMask</div>}
                                  titleClassName="py-1"
                                >
                                  {addToMetaMaskButton}
                                </Popover>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                          <Copy
                            text={call.contract_address}
                            copyTitle={<span className="normal-case text-gray-600 dark:text-gray-400 text-xs font-medium">
                              {ellipseAddress(call.contract_address, 8)}
                            </span>}
                          />
                          {fromChain?.explorer?.url && (
                            <a
                              href={`${fromChain.explorer.url}${fromChain.explorer.address_path?.replace('{address}', call.contract_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {fromChain.explorer.icon ?
                                <Img
                                  src={fromChain.explorer.icon}
                                  alt=""
                                  className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={20} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-center space-x-2.5 mt-0.5">
                          <span className="text-gray-500 dark:text-gray-500 text-xs font-medium">Gateway Address</span>
                        </div>
                      </div>
                      :
                      <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                    :
                    <div className="flex flex-col space-y-2.5 my-1">
                      <div className="skeleton w-36 h-6" />
                      <div className="skeleton w-24 h-5 mx-auto" />
                    </div>
                  }
                </div>
                {transaction ?
                  <div className="flex flex-col items-center justify-center space-y-1 mx-auto">
                    <div className="flex items-center space-x-1">
                      <a
                        href={toChain?.explorer?.url ? `${toChain.explorer.url}${approved ? toChain.explorer.transaction_path?.replace('{tx}', approved.transactionHash) : toChain.explorer.address_path?.replace('{address}', call?.returnValues?.sender)}` : null}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${approved ? 'green-600' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}
                      >
                        {approved ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          <Loader type="TailSpin" color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${approved ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{approved ? 'Approved' : 'Not Approved'}</div>
                      </a>
                      {approved?.transactionHash && (
                        <Copy text={approved.transactionHash} />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <a
                        href={toChain?.explorer?.url ? `${toChain.explorer.url}${executed ? toChain.explorer.transaction_path?.replace('{tx}', executed.transactionHash) : toChain.explorer.address_path?.replace('{address}', call?.transaction?.from || call?.receipt?.from || call?.returnValues?.sender)}` : null}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${executed ? 'green-600' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}
                      >
                        {executed || data?.is_executed ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          error ?
                            <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                            :
                            <Loader type="TailSpin" color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${executed ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{executed || data?.is_executed ? 'Executed' : 'Not Executed'}</div>
                      </a>
                      {executed?.transactionHash && (
                        <Copy text={executed.transactionHash} />
                      )}
                    </div>
                  </div>
                  :
                  <div className="flex flex-col items-center justify-center space-y-2 my-1 mx-auto">
                    <div className="skeleton w-16 h-6" />
                    <div className="skeleton w-16 h-6" />
                  </div>
                }
                {transaction ?
                  call?.returnValues?.destinationContractAddress ?
                    <div className="min-w-max">
                      <div className="flex items-center space-x-1">
                        <Copy
                          text={call.returnValues.destinationContractAddress}
                          copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs font-medium">
                            {ellipseAddress(call.returnValues.destinationContractAddress, 8)}
                          </span>}
                        />
                        {toChain?.explorer?.url && (
                          <a
                            href={`${toChain.explorer.url}${toChain.explorer.address_path?.replace('{address}', call.returnValues.destinationContractAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {toChain.explorer.icon ?
                              <Img
                                src={toChain.explorer.icon}
                                alt=""
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={16} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                      {toChain && (
                        <div className="flex items-center space-x-2 mt-1.5">
                          <Img
                            src={toChain.image}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-gray-900 dark:text-white text-xs font-semibold">{chainTitle(toChain)}</span>
                        </div>
                      )}
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                  :
                  <div className="flex flex-col space-y-2.5 my-1">
                    <div className="skeleton w-36 h-6" />
                    <div className="skeleton w-24 h-7 mx-auto sm:mr-0" />
                  </div>
                }
              </div>
            </Widget>
          </div>
          <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6 mt-4 xl:mt-6">
            {[call, gas_paid, approved, executed || error].map((t, i) => (
              <Widget
                key={i}
                title={<div className="flex items-center space-x-3 mb-4">
                  <Img
                    src={(i < 2 ? fromChain : toChain)?.image}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="uppercase text-gray-400 dark:text-gray-600 text-base font-semibold">
                    {i === 0 ? call?.event || 'Call' : i === 1 ? 'Gas Paid' : i === 2 ? 'Approved' : 'Execute'} Details
                  </span>
                </div>}
                className="border-0 shadow-md rounded-2xl p-5 lg:px-3 xl:px-5"
              >
                <div className="w-full flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 whitespace-nowrap text-xs lg:text-base font-semibold">
                      TX Hash:
                    </span>
                    {transaction ?
                      <>
                        {(i < 3 || !txHashExecutedEditing) && t?.transactionHash && (
                          <div className="flex items-center">
                            {(i < 2 ? fromChain : toChain)?.explorer?.url ?
                              <a
                                href={`${(i < 2 ? fromChain : toChain).explorer.url}${(i < 2 ? fromChain : toChain).explorer.transaction_path?.replace('{tx}', t.transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white text-xs lg:text-base font-medium mr-1.5"
                              >
                                {ellipseAddress(t.transactionHash, 16)}
                              </a>
                              :
                              <span className="text-xs lg:text-base mr-1.5">{ellipseAddress(t.transactionHash, 16)}</span>
                            }
                            <Copy size={18} text={t.transactionHash} />
                            {i === 3 && !t.block_timestamp && (
                              <button
                                disabled={txHashExecutedSaving}
                                onClick={async () => {
                                  setTxHashExecutedSaving(true)
                                  await saveGMP(t.transactionHash, approved, approved?.chain, approved?.contract_address, address)
                                }}
                                className="text-blue-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-white ml-1"
                              >
                                {txHashExecutedSaving ?
                                  <Loader type="Oval" color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
                                  :
                                  <MdRefresh size={20} />
                                }
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          {i === 3 && txHashExecutedEditing ?
                            <input
                              disabled={txHashExecutedSaving}
                              placement="Tx Hash"
                              value={txHashExecuted}
                              onChange={e => setTxHashExecuted(e.target.value)}
                              className="bg-gray-50 dark:bg-gray-800 rounded text-base py-1 px-2"
                            />
                            :
                            !t?.transactionHash && (
                              <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                            )
                          }
                          {i === 3 && approved && address && (
                            <div className="flex items-center space-x-1">
                              {txHashExecutedEditing ?
                                <>
                                  <button
                                    disabled={txHashExecutedSaving}
                                    onClick={() => resetEditTxHashExecuted()}
                                    className="text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500"
                                  >
                                    <RiCloseCircleFill size={20} />
                                  </button>
                                  <button
                                    disabled={!txHashExecuted || txHashExecutedSaving}
                                    onClick={async () => {
                                      setTxHashExecutedSaving(true)
                                      await saveGMP(txHashExecuted, approved, approved.chain, approved.contract_address, address)
                                    }}
                                    className="text-blue-400 hover:text-blue-500 dark:text-gray-400 dark:hover:text-white"
                                  >
                                    {txHashExecutedSaving ?
                                      <Loader type="Oval" color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
                                      :
                                      <BiSave size={20} />
                                    }
                                  </button>
                                </>
                                :
                                <button
                                  onClick={() => setTxHashExecutedEditing(true)}
                                  className="text-white hover:text-gray-400 dark:text-gray-900 dark:hover:text-gray-500"
                                >
                                  <BiEditAlt size={20} />
                                </button>
                              }
                            </div>
                          )}
                        </div>
                      </>
                      :
                      <div className="skeleton w-72 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Block:</span>
                    {transaction ?
                      t?.blockNumber ?
                        (i < 2 ? fromChain : toChain)?.explorer?.url ?
                          <a
                            href={`${(i < 2 ? fromChain : toChain).explorer.url}${(i < 2 ? fromChain : toChain).explorer.block_path?.replace('{block}', t.blockNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs lg:text-base"
                          >
                            {numberFormat(t.blockNumber, '0,0')}
                          </a>
                          :
                          <span className="text-xs lg:text-base">{numberFormat(t.blockNumber, '0,0')}</span>
                        :
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                      :
                      <div className="skeleton w-24 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Status:</span>
                    {transaction ?
                      <div className={`max-w-min h-6 bg-gray-100 dark:bg-${t ? t?.receipt?.status ? 'green-600' : 'red-700' : 'blue-700'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                        {t || data?.is_executed ?
                          t?.receipt?.status || data?.is_executed ?
                            <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                            :
                            <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                          :
                          <Loader type="TailSpin" color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`whitespace-nowrap uppercase ${t ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>
                          {t || data?.is_executed ?
                            t?.receipt?.status || data?.is_executed ?
                              'Success'
                              :
                              'Error'
                            :
                            'Pending'
                          }
                        </div>
                      </div>
                      :
                      <div className="skeleton w-24 h-5 lg:h-7 mt-1" />
                    }
                  </div>
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Time:</span>
                    {transaction ?
                      t?.block_timestamp ?
                        <span className="text-xs lg:text-base">
                          <span className="text-gray-400 dark:text-gray-600 mr-1">{moment(t.block_timestamp * 1000).fromNow()}</span>
                          <span>({moment(t.block_timestamp * 1000).format('MMM D, YYYY h:mm:ss A')})</span>
                        </span>
                        :
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                      :
                      <div className="skeleton w-60 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                  {i < 2 && (
                    <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                      <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Sender Address:</span>
                      {transaction ?
                        t?.transaction?.from || t?.receipt?.from ?
                          <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                            <Copy
                              text={t?.transaction?.from || t?.receipt?.from}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs lg:text-base font-medium">
                                {ellipseAddress(t?.transaction?.from || t?.receipt?.from, 8)}
                              </span>}
                            />
                            {fromChain?.explorer?.url && (
                              <a
                                href={`${fromChain.explorer.url}${fromChain.explorer.address_path?.replace('{address}', t?.transaction?.from || t?.receipt?.from)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {fromChain.explorer.icon ?
                                  <Img
                                    src={fromChain.explorer.icon}
                                    alt=""
                                    className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={20} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                          :
                          <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                        :
                        <div className="skeleton w-48 h-4 lg:h-6 mt-1" />
                      }
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">{i < 2 ? 'Source' : 'Relayer'} Address:</span>
                    {transaction ?
                      (i < 2 ? call?.returnValues?.sender : (t?.transaction?.from || t?.from)) ?
                        <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                          <Copy
                            text={(i < 2 ? call.returnValues.sender : (t.transaction?.from || t.from))}
                            copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs lg:text-base font-medium">
                              {ellipseAddress((i < 2 ? call.returnValues.sender : (t.transaction?.from || t.from)), 8)}
                            </span>}
                          />
                          {(i < 2 ? fromChain : toChain)?.explorer?.url && (
                            <a
                              href={`${(i < 2 ? fromChain : toChain).explorer.url}${(i < 2 ? fromChain : toChain).explorer.address_path?.replace('{address}', (i < 2 ? call.returnValues.sender : (t.transaction?.from || t.from)))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {(i < 2 ? fromChain : toChain).explorer.icon ?
                                <Img
                                  src={(i < 2 ? fromChain : toChain).explorer.icon}
                                  alt=""
                                  className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={20} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                        :
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                      :
                      <div className="skeleton w-48 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 min-w-max text-xs lg:text-base font-semibold">{i < 1 ? 'Gateway' : i < 2 ? 'Gas Receiver' : i < 3 ? 'Gateway' : 'Destination'} Contract:</span>
                    {transaction ?
                      (i < 3 ? t?.contract_address : call?.returnValues?.destinationContractAddress) ?
                        <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                          <Copy
                            text={i < 3 ? t.contract_address : call.returnValues.destinationContractAddress}
                            copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs lg:text-base font-medium">
                              {ellipseAddress(i < 3 ? t.contract_address : call.returnValues.destinationContractAddress, 8)}
                            </span>}
                          />
                          {(i < 2 ? fromChain : toChain)?.explorer?.url && (
                            <a
                              href={`${(i < 2 ? fromChain : toChain).explorer.url}${(i < 2 ? fromChain : toChain).explorer.address_path?.replace('{address}', i < 3 ? t.contract_address : call.returnValues.destinationContractAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {(i < 2 ? fromChain : toChain).explorer.icon ?
                                <Img
                                  src={(i < 2 ? fromChain : toChain).explorer.icon}
                                  alt=""
                                  className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={20} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                        :
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                      :
                      <div className="skeleton w-48 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                  {i === 3 && (
                    <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                      <span className="md:w-20 xl:w-40 min-w-max text-xs lg:text-base font-semibold">Receiver Address:</span>
                      {transaction ?
                        call?.transaction?.from ?
                          <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                            <Copy
                              text={call.transaction.from}
                              copyTitle={<span className="normal-case text-gray-700 dark:text-gray-300 text-xs lg:text-base font-medium">
                                {ellipseAddress(call.transaction.from, 8)}
                              </span>}
                            />
                            {toChain?.explorer?.url && (
                              <a
                                href={`${toChain.explorer.url}${toChain.explorer.address_path?.replace('{address}', call.transaction.from)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {toChain.explorer.icon ?
                                  <Img
                                    src={toChain.explorer.icon}
                                    alt=""
                                    className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={20} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                          :
                          <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                        :
                        <div className="skeleton w-48 h-4 lg:h-6 mt-1" />
                      }
                    </div>
                  )}
                  {i === 3 && !executed && error && (
                    <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                      <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Error:</span>
                      {transaction ?
                        <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                          {error.error?.code && (
                            <div className="max-w-min bg-red-100 dark:bg-red-800 border border-red-500 dark:border-red-700 rounded-lg py-0.5 px-2 mx-auto">
                              {error.error.code}
                            </div>
                          )}
                          <span className="text-red-500">{error.error?.body?.replaceAll('"""', '') || error.error?.reason}</span>
                        </div>
                        :
                        <div className="skeleton w-72 h-4 lg:h-6 mt-1" />
                      }
                    </div>
                  )}
                </div>
              </Widget>
            ))}
          </div>
          <div className="mt-4 mb-6">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2.5">
                <span className="text-base font-semibold">Payload Hash</span>
                {transaction ?
                  call?.returnValues?.payloadHash ?
                    <div className="flex items-start">
                      <div className="w-full bg-gray-100 dark:bg-gray-900 break-all rounded-xl text-gray-400 dark:text-gray-600 text-xs lg:text-sm mr-2 p-4">
                        {call.returnValues.payloadHash}
                      </div>
                      <Copy size={20} text={call.returnValues.payloadHash} className="mt-4" />
                    </div>
                    :
                    <span className="text-xs lg:text-base">-</span>
                  :
                  <div className="flex flex-col space-y-3">
                    {[...Array(1).keys()].map(i => (
                      <div key={i} className="skeleton w-full h-4 lg:h-6" />
                    ))}
                  </div>
                }
              </div>
              <div className="flex flex-col space-y-2.5">
                <span className="text-base font-semibold">Payload</span>
                {transaction ?
                  call?.returnValues?.payload ?
                    <div className="flex items-start">
                      <div className="w-full bg-gray-100 dark:bg-gray-900 break-all rounded-xl text-gray-400 dark:text-gray-600 text-xs lg:text-sm mr-2 p-4">
                        {call.returnValues.payload}
                      </div>
                      <Copy size={20} text={call.returnValues.payload} className="mt-4" />
                    </div>
                    :
                    <span className="text-xs lg:text-base">-</span>
                  :
                  <div className="flex flex-col space-y-3">
                    {[...Array(8).keys()].map(i => (
                      <div key={i} className="skeleton w-full h-4 lg:h-6" />
                    ))}
                  </div>
                }
              </div>
            </div>
          </div>
        </>
        :
        <div className="h-96 bg-transparent rounded-xl border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-600 text-lg font-medium space-x-1.5 mt-2 xl:mt-4">
          <BsFileEarmarkX size={32} />
          <span>Transaction not found</span>
        </div>
      }
    </div>
  )
}