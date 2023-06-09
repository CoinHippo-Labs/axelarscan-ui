import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { ProgressBar, TailSpin, Watch } from 'react-loader-spinner'
import { BiCheckCircle, BiXCircle, BiKey, BiRightArrowCircle } from 'react-icons/bi'
import { MdOutlineWatchLater } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'
import { BsFillArrowLeftCircleFill } from 'react-icons/bs'

import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import Notification from '../notifications'
import Wallet from '../wallet'
import { batched_commands } from '../../lib/api/lcd'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'
import IAxelarGateway from '../../data/contracts/interfaces/IAxelarGateway.json'

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
  const {
    wallet_data,
  } = { ...wallet }
  const {
    default_chain_id,
    web3_provider,
    signer,
  } = { ...wallet_data }

  const wallet_chain_id = wallet_data?.chain_id

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    chain,
    id,
  } = { ...query }

  const [data, setData] = useState(null)
  const [types, setTypes] = useState(null)
  const [filterTypes, setFilterTypes] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [executeResponse, setExecuteResponse] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        if (chain && id) {
          const response = await batched_commands(chain, id)
          const data = { ...response }
          setData({ data, chain, id })
        }
      }

      getData()

      const interval = setInterval(() => getData(true), 3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [chain, id],
  )

  useEffect(
    () => {
      if (id && data?.id === id) {
        const {
          commands,
        } = { ...data.data }

        setTypes(
          _.countBy(
            _.uniqBy(commands || [], 'id')
              .map(c => c?.type)
              .filter(t => t)
          )
        )
      }
    },
    [id, data],
  )

  const execute = async () => {
    const {
      execute_data,
    } = { ...data?.data }

    if (signer && execute_data) {
      try {
        setExecuting(true)
        setExecuteResponse(
          {
            status: 'pending',
            message: 'Executing',
          }
        )

        const response = await signer.sendTransaction({ to: gateway_address, data: `0x${execute_data}` })

        const {
          hash,
        } = { ...response }

        setExecuteResponse(
          {
            status: 'pending',
            message: 'Wait for Confirmation',
            txHash: hash,
          }
        )

        const receipt = await signer.provider.waitForTransaction(hash)

        const {
          status,
        } = { ...receipt }

        setExecuting(false)
        setExecuteResponse(
          {
            status: status ? 'success' : 'failed',
            message: status ? 'Execute successful' : 'Failed to execute',
            txHash: hash,
          }
        )
      } catch (error) {
        setExecuting(false)
        setExecuteResponse(
          {
            status: 'failed',
            message: error?.reason || error?.data?.message || error?.data?.text || error?.message,
          }
        )
      }
    }
  }

  const chains_data = _.concat(evm_chains_data, cosmos_chains_data)

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
    name,
    image,
    explorer,
    gateway_address,
  } = { ...chain_data }

  const {
    url,
    transaction_path,
    address_path,
    icon,
  } = { ...explorer }

  const {
    key_id,
    status,
    created_at,
    commands,
    signature,
    prev_batched_commands_id,
    proof,
  } = { ...data?.data }

  const {
    signatures,
  } = { ...proof }

  const commands_filtered = commands && commands.filter(d => !(filterTypes?.length > 0) || filterTypes.includes(d?.type))

  const matched = equalsIgnoreCase(data?.id, id)

  const notificationResponse = executeResponse

  const wrong_chain = chain_data && wallet_chain_id !== chain_id && !executing

  const executeButton =
    matched && data?.data?.execute_data && equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNED') &&
    (commands || []).filter(c => c?.executed).length < (commands || []).length &&
    moment().diff(moment(created_at?.ms), 'minutes') >= 10 &&
    (
      <div className="flex items-center space-x-2">
        {
          web3_provider && !wrong_chain &&
          (
            <button
              disabled={executing}
              onClick={() => execute()}
              className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 ${executing ? 'pointer-events-none' : ''} rounded flex items-center text-white space-x-1.5 py-1 px-2`}
            >
              {
                executing &&
                (
                  <TailSpin
                    color="white"
                    width="16"
                    height="16"
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
          connectChainId={wrong_chain && (chain_id || default_chain_id)}
        />
      </div>
    )

  const executed = commands && commands.length === commands.filter(c => c?.executed).length

  return (
    <div className="space-y-6 mt-2 mb-6">
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
                  url && notificationResponse.txHash &&
                  (
                    <a
                      href={`${url}${transaction_path?.replace('{tx}', notificationResponse.txHash)}`}
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
            onClose={() => setExecuteResponse(null)}
          />
        )
      }
      <div className="space-y-3">
        <div className="flex items-center justify-between">
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
            <span className="text-base font-semibold">
              {name}
            </span>
          </div>
          {
            status &&
            (
              <div className={`max-w-min ${executed ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700' : 'bg-slate-100 dark:bg-slate-800'} rounded-lg flex items-center space-x-1 py-0.5 px-1.5`}>
                {equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNED') || executed ?
                  <BiCheckCircle
                    size={18}
                  /> :
                  equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNING') ?
                    <MdOutlineWatchLater
                      size={18}
                    /> :
                    <BiXCircle
                      size={18}
                    />
                }
                <span className="capitalize text-xs font-semibold">
                  {(executed ? 'Executed' : status.replace('BATCHED_COMMANDS_STATUS_', '')).toLowerCase()}
                </span>
              </div>
            )
          }
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          {matched ?
            <div className="flex items-center text-slate-700 dark:text-slate-300 space-x-2">
              <BiKey
                size={20}
              />
              <span className="text-base font-medium">
                {key_id || 'Unknown'}
              </span>
            </div> :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="32"
              height="32"
            />
          }
          {matched ?
            created_at &&
            (
              <div className="text-slate-400 dark:text-slate-600 font-normal">
                {moment(created_at.ms).format('MMM D, YYYY h:mm:ss A')}
              </div>
            ) :
            <ProgressBar
              borderColor={loader_color(theme)}
              width="32"
              height="32"
            />
          }
        </div>
      </div>
      {commands_filtered ?
        <div className="space-y-2">
          <div className="overflow-x-auto block sm:flex sm:flex-wrap items-center justify-start sm:space-x-2.5 mx-2.5">
            {Object.entries({ ...types })
              .map(([k, v]) => (
                <div
                  key={k}
                  onClick={() => setFilterTypes(_.uniq(filterTypes?.includes(k) ? filterTypes.filter(t => !equalsIgnoreCase(t, k)) : _.concat(filterTypes || [], k)))}
                  className={`max-w-min bg-trasparent ${filterTypes?.includes(k) ? 'font-bold' : 'text-slate-400 hover:text-black dark:text-slate-600 dark:hover:text-white hover:font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs space-x-1 mr-1 mb-1`}
                  style={{ textTransform: 'none' }}
                >
                  <span>
                    {k === 'undefined' ? 'Unknown' : k}
                  </span>
                  <span className="text-blue-500 dark:text-white">
                    {number_format(v, '0,0')}
                  </span>
                </div>
              ))
            }
          </div>
          <Datatable
            columns={
              [
                {
                  Header: 'Command ID',
                  accessor: 'id',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      transactionHash,
                    } = { ...props.row.original }

                    return (
                      <div className="flex items-center space-x-1">
                        {transactionHash && url ?
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {ellipse(value, 8)}
                          </a> :
                          <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                            {ellipse(value, 8)}
                          </span>
                        }
                        <Copy
                          value={value}
                        />
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Type',
                  accessor: 'type',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      transactionHash,
                      executed,
                    } = { ...props.row.original }

                    const typeComponent = (
                      <div
                        title={executed ? 'Executed' : ''}
                        className={`w-fit max-w-min ${executed ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700 font-semibold py-0.5 px-1.5' : 'bg-slate-100 dark:bg-slate-900 font-medium py-1 px-2'} rounded-lg capitalize text-xs`}
                      >
                        {value}
                      </div>
                    )

                    return (
                      value ?
                        typeComponent &&
                        (transactionHash && url ?
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                          >
                            {typeComponent}
                          </a> :
                          typeComponent
                        ) :
                        <span className="text-slate-400 dark:text-slate-600">
                          Unknown
                        </span>
                    )
                  },
                },
                {
                  Header: 'Params',
                  accessor: 'params.account',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    const {
                      id,
                      params,
                      type,
                      deposit_address,
                    } = { ...props.row.original }

                    const {
                      salt,
                      newOwners,
                      newOperators,
                      newWeights,
                      name,
                      decimals,
                      cap,
                      sourceChain,
                      sourceTxHash,
                      contractAddress,
                    } = { ...params }

                    const source_chain_data = getChain(sourceChain, chains_data)

                    const transfer_id = parseInt(id, 16)

                    return (
                      value ?
                        <div className="flex items-center space-x-1">
                          {
                            ['mintToken'].includes(type) && typeof transfer_id === 'number' &&
                            (
                              <div className="flex items-center space-x-1">
                                <Link href={`/transfer?transfer_id=${transfer_id}`}>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                  >
                                    Transfer
                                  </a>
                                </Link>
                              </div>
                            )
                          }
                          <EnsProfile
                            address={value}
                            fallback={
                              value &&
                              (
                                <Copy
                                  value={value}
                                  title={
                                    <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                      <span className="xl:hidden">
                                        {ellipse(value, 6)}
                                      </span>
                                      <span className="hidden xl:block">
                                        {ellipse(value, 8)}
                                      </span>
                                    </span>
                                  }
                                />
                              )
                            }
                            className="tracking-wider text-black dark:text-white text-sm font-medium"
                          />
                          {
                            url &&
                            (
                              <a
                                href={`${url}${address_path?.replace('{address}', value)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
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
                        </div> :
                        source_chain_data ?
                          <div className="flex items-center space-x-2">
                            {source_chain_data.image ?
                              <Image
                                src={source_chain_data.image}
                                className="w-5 h-5 rounded-full"
                              /> :
                              <span className="font-medium">
                                {source_chain_data.name}
                              </span>
                            }
                            {
                              sourceTxHash &&
                              (
                                <div className="flex items-center space-x-1">
                                  <Link href={`/gmp/${sourceTxHash}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      GMP
                                    </a>
                                  </Link>
                                  {
                                    source_chain_data.explorer?.url &&
                                    (
                                      <a
                                        href={`${source_chain_data.explorer.url}${source_chain_data.explorer.transaction_path?.replace('{tx}', sourceTxHash)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                      >
                                        {source_chain_data.explorer.icon ?
                                          <Image
                                            src={source_chain_data.explorer.icon}
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
                              )
                            }
                            {
                              contractAddress &&
                              (
                                <>
                                  <BiRightArrowCircle
                                    size={18}
                                  />
                                  <div className="flex items-center space-x-1">
                                    <EnsProfile
                                      address={contractAddress}
                                      fallback={
                                        contractAddress &&
                                        (
                                          <Copy
                                            value={contractAddress}
                                            title={
                                              <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                                <span className="xl:hidden">
                                                  {ellipse(contractAddress, 6)}
                                                </span>
                                                <span className="hidden xl:block">
                                                  {ellipse(contractAddress, 8)}
                                                </span>
                                              </span>
                                            }
                                          />
                                        )
                                      }
                                      className="tracking-wider text-black dark:text-white text-sm font-medium"
                                    />
                                    {
                                      url &&
                                      (
                                        <a
                                          href={`${url}${address_path?.replace('{address}', contractAddress)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
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
                                </>
                              )
                            }
                          </div> :
                          salt ?
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400 dark:text-slate-600 font-medium">
                                {deposit_address ? 'Deposit address' : 'Salt'}:
                              </span>
                              {deposit_address ?
                                <>
                                  <a
                                    href={`/account/${deposit_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 dark:text-slate-600 text-xs font-medium"
                                  >
                                    {ellipse(deposit_address, 8)}
                                  </a>
                                  <Copy
                                    value={deposit_address}
                                  />
                                </> :
                                <Copy
                                  value={salt}
                                  title={
                                    <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                      {ellipse(salt, 8)}
                                    </span>
                                  }
                                />
                              }
                            </div> :
                            newOwners || newOperators ?
                              <>
                                {
                                  newWeights &&
                                  (
                                    <div className="flex items-center space-x-1 mb-1">
                                      <span className="text-slate-400 dark:text-slate-600 font-medium">
                                        Weight:
                                      </span>
                                      <span className="font-medium">
                                        [{number_format(_.sum(newWeights.split(';').map(w => Number(w))), '0,0')}]
                                      </span>
                                    </div>
                                  )
                                }
                                <div className="max-w-xl flex flex-wrap">
                                  {(newOwners || newOperators)
                                    .split(';')
                                    .map((o, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center space-x-1 mb-1 mr-3"
                                      >
                                        <EnsProfile
                                          address={o}
                                          fallback={
                                            o &&
                                            (
                                              <Copy
                                                value={o}
                                                title={
                                                  <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                                    <span className="xl:hidden">
                                                      {ellipse(o, 6)}
                                                    </span>
                                                    <span className="hidden xl:block">
                                                      {ellipse(o, 8)}
                                                    </span>
                                                  </span>
                                                }
                                              />
                                            )
                                          }
                                          className="tracking-wider text-black dark:text-white text-sm font-medium"
                                        />
                                        {
                                          url &&
                                          (
                                            <a
                                              href={`${url}${address_path?.replace('{address}', o)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
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
                                        {
                                          newWeights &&
                                          (
                                            <span className="font-medium">
                                              [{number_format(newWeights.split(';')[i], '0,0')}]
                                            </span>
                                          )
                                        }
                                      </div>
                                    ))}
                                </div>
                              </> :
                              name ?
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {name}
                                  </span>
                                  <div className="flex items-center space-x-1.5">
                                    {
                                      decimals &&
                                      (
                                        <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                          <span className="font-medium">
                                            decimals:
                                          </span>
                                          <span>
                                            {number_format(decimals, '0,0')}
                                          </span>
                                        </span>
                                      )
                                    }
                                    {
                                      cap &&
                                      (
                                        <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                          <span className="font-medium">
                                            cap:
                                          </span>
                                          <span>
                                            {number_format(cap, '0,0')}
                                          </span>
                                        </span>
                                      )
                                    }
                                  </div>
                                </div> :
                                <span className="text-slate-400 dark:text-slate-600">
                                  Unknown
                                </span>
                    )
                  },
                },
                {
                  Header: 'Amount',
                  accessor: 'params.amount',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      params,
                      type,
                    } = { ...props.row.original }

                    let {
                      symbol,
                      amount,
                      newThreshold,
                    } = { ...params }

                    const asset_data = (assets_data || [])
                      .find(a =>
                        equalsIgnoreCase(a?.symbol, symbol) ||
                        (a?.contracts || []).findIndex(c => c?.chain_id === chain_id && equalsIgnoreCase(c.symbol, symbol)) > -1 ||
                        (a?.contracts || []).findIndex(c => equalsIgnoreCase(c.symbol, symbol)) > -1 ||
                        (a?.ibc || []).findIndex(c => equalsIgnoreCase(c.symbol, symbol)) > -1
                      )

                    const {
                      contracts,
                    } = { ...asset_data }

                    const contract_data = (contracts || []).find(c => c?.chain_id === chain_id)

                    let {
                      decimals,
                      image,
                    } = { ...contract_data }

                    decimals = decimals || asset_data?.decimals || ([asset_data?.id].findIndex(s => s?.includes('-wei')) > -1 ? 18 : 6)
                    symbol = contract_data?.symbol || asset_data?.symbol || symbol
                    image = image || asset_data?.image

                    return (
                      <div className="flex items-center space-x-2">
                        {symbol && !['approveContractCall'].includes(type) ?
                          <div className="min-w-max max-w-min flex items-center justify-center sm:justify-end space-x-1.5">
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  className="w-5 h-5 rounded-full"
                                />
                              )
                            }
                            <span className="text-sm font-medium">
                              {
                                amount > 0 &&
                                (
                                  <span className="mr-1">
                                    {number_format(utils.formatUnits(BigNumber.from(amount), decimals), '0,0.000000', true)}
                                  </span>
                                )
                              }
                              <span>
                                {symbol}
                              </span>
                            </span>
                          </div> :
                          newThreshold &&
                          (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">
                                Threshold:
                              </span>
                              <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                {number_format(newThreshold, '0,0')}
                              </span>
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                },
                {
                  Header: 'Max Gas Cost',
                  accessor: 'max_gas_cost',
                  disableSortBy: true,
                  Cell: props => (
                    <div className="font-medium text-right">
                      {number_format(props.value, '0,0.00000000', true)}
                    </div>
                  ),
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
              ]
            }
            data={commands_filtered}
            noPagination={commands_filtered.length <= 10}
            defaultPageSize={10}
            className="min-h-full small no-border"
          />
        </div> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="32"
          height="32"
        />
      }
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="tracking-wider text-base font-medium">
            Signed Commands
          </span>
          {executeButton}
        </div>
        {matched ?
          data?.data?.execute_data ?
            <div className="flex items-start">
              <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                {data.data.execute_data}
              </div>
              <div className="mt-4">
                <Copy
                  size={20}
                  value={data.data.execute_data}
                />
              </div>
            </div> :
            <div className="text-xs lg:text-base">
              -
            </div> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="32"
            height="32"
          />
        }
      </div>
      <div className="space-y-2">
        <span className="tracking-wider text-base font-medium">
          Commands
        </span>
        {matched ?
          data?.data?.data ?
            <div className="flex items-start">
              <div className="w-full bg-slate-100 dark:bg-slate-900 break-all rounded-xl text-slate-400 dark:text-slate-600 text-xs lg:text-sm mr-2 p-4">
                {data.data.data}
              </div>
              <div className="mt-4">
                <Copy
                  size={20}
                  value={data.data.data}
                />
              </div>
            </div> :
            <div className="text-xs lg:text-base">
              -
            </div> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="32"
            height="32"
          />
        }
      </div>
      <div className="space-y-2">
        <span className="tracking-wider text-base font-medium">
          Signature
        </span>
        {matched ?
          signatures || signature ?
            <div className="flex flex-col space-y-1.5">
              {(signatures || signature)
                .map((s, i) => (
                  <div
                    key={i}
                    className="max-w-min bg-slate-200 dark:bg-slate-800 rounded py-1 px-2"
                  >
                    <Copy
                      value={s}
                      title={
                        <span className="cursor-pointer text-slate-600 dark:text-slate-400 text-xs font-medium">
                          <span className="lg:hidden">
                            {ellipse(s, 20)}
                          </span>
                          <span className="hidden lg:block">
                            {s}
                          </span>
                        </span>
                      }
                    />
                  </div>
                ))
              }
            </div> :
            <div className="text-xs lg:text-base">
              -
            </div> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="32"
            height="32"
          />
        }
      </div>
      {
        matched && prev_batched_commands_id &&
        (
          <div>
            <Link href={`${pathname?.replace('[chain]', chain).replace('[id]', prev_batched_commands_id)}`}>
              <a className="flex items-center tracking-wider text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 space-x-2">
                <BsFillArrowLeftCircleFill
                  size={20}
                />
                <span className=" font-medium">
                  Previous Batch
                </span>
              </a>
            </Link>
            <div className="ml-7">
              <Copy
                value={prev_batched_commands_id}
                title={
                  <span className="cursor-pointer text-slate-400 dark:text-slate-600 font-medium">
                    {ellipse(prev_batched_commands_id, 8)}
                  </span>
                }
              />
            </div>
          </div>
        )
      }
    </div>
  )
}