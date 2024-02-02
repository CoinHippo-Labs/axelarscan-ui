import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Alert, Chip, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'
import { BsArrowRightShort, BsArrowLeftShort } from 'react-icons/bs'
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTimeOutline } from 'react-icons/io5'

import Spinner from '../../spinner'
import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import Image from '../../image'
import Copy from '../../copy'
import AccountProfile from '../../profile/account'
import ExplorerLink from '../../explorer/link'
import EVMWallet from '../../wallet/evm'
import { batchedCommands } from '../../../lib/api/batches'
import { getChainData, getAssetData } from '../../../lib/config'
import { formatUnits } from '../../../lib/number'
import { split, toArray, ellipse, equalsIgnoreCase, parseError } from '../../../lib/utils'

import IAxelarGateway from '../../../data/contracts/interfaces/IAxelarGateway.json'

const PAGE_SIZE = 10
const EXECUTE_PERIOD_SECONDS = 10 * 60
const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export default () => {
  const { chains, assets, contracts, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, contracts: state.contracts, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { contracts_data } = { ...contracts }
  const { wallet_data } = { ...wallet }
  const { signer } = { ...wallet_data }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { chain, id } = { ...query }

  const [data, setData] = useState(null)
  const [types, setTypes] = useState(null)
  const [typesFiltered, setTypesFiltered] = useState(null)
  const [executing, setExecuting] = useState(null)
  const [executeResponse, setExecuteResponse] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        if (chain && id) {
          const data = await batchedCommands(chain, id, { index: true })
          console.log('[data]', data)
          setData(data)
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [chain, id],
  )

  useEffect(
    () => {
      if (data) {
        const { commands } = { ...data }
        setTypes(_.countBy(_.uniqBy(toArray(commands), 'id'), 'type'))
      }
    },
    [data],
  )

  const {
    key_id,
    commands,
    status,
    created_at,
    execute_data,
    signature,
    prev_batched_commands_id,
    proof,
  } = { ...data }
  const { signatures } = { ...proof }

  const execute = async () => {
    if (execute_data && signer) {
      setExecuting(true)
      setExecuteResponse({ status: 'pending', message: 'Executing...' })
      try {
        const { gateway_contracts } = { ...contracts_data }
        const gateway_address = gateway_contracts?.[chain_data?.id]?.address
        const { hash } = { ...await signer.sendTransaction({ to: gateway_address, data: `0x${execute_data}` }) }
        setExecuteResponse({ status: 'pending', message: 'Wait for Confirmation', hash })
        const { status } = { ...hash && await signer.provider.waitForTransaction(hash) }
        setExecuteResponse({ status: status ? 'success' : 'failed', message: status ? 'Execute successful' : 'Failed to execute', hash })
      } catch (error) {
        setExecuteResponse({ status: 'failed', ...parseError(error) })
      }
      setExecuting(false)
    }
  }

  const commandsFiltered = toArray(commands).filter(d => toArray(typesFiltered).length < 1 || typesFiltered.includes(d.type))
  const matched = equalsIgnoreCase(id, data?.id)
  const executed = toArray(commands).length === toArray(commands).filter(d => d.executed).length
  const chain_data = getChainData(chain, chains_data)
  const { chain_id, name, image, explorer } = { ...chain_data }
  const { url, transaction_path } = { ...explorer }

  const wrongChain = chain_id && chain_id !== wallet_data?.chain_id
  const executeButton =
    matched && equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNED') && execute_data && !executed && moment().diff(moment(created_at?.ms), 'seconds') > EXECUTE_PERIOD_SECONDS && (
      <div className="flex items-center space-x-2">
        {signer && !wrongChain && (
          <button
            disabled={executing}
            onClick={() => execute()}
            className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 ${executing ? 'pointer-events-none' : ''} rounded flex items-center text-white py-1 px-2`}
          >
            {executing && <Spinner width={14} height={14} color="white" />}
            <span className="font-medium">
              Execute
            </span>
          </button>
        )}
        <EVMWallet connectChainId={chain_id} />
      </div>
    )

  const { message, hash } = { ...executeResponse }
  const _status = executeResponse?.status

  return (
    <div className="children">
      {data ?
        <div className="max-w-6xl space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 3xl:space-x-3">
              <Image
                src={image}
                width={24}
                height={24}
                className="3xl:w-8 3xl:h-8 rounded-full"
              />
              <span className="text-base 3xl:text-lg font-semibold">
                {name}
              </span>
            </div>
            {status && (
              <Chip
                color={executed ? 'green' : equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNED') ? 'teal' : equalsIgnoreCase(status, 'BATCHED_COMMANDS_STATUS_SIGNING') ? 'blue' : 'red'}
                value={executed ? 'Executed' : status.replace('BATCHED_COMMANDS_STATUS_', '')}
                className="chip normal-case font-medium"
              />
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3">
            {matched ?
              <Copy
                size={18}
                value={key_id}
                title={
                  <span className="cursor-pointer text-slate-400 dark:text-slate-500">
                    {ellipse(key_id, 16)}
                  </span>
                }
              /> :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
            {matched ?
              created_at && (
                <div className="text-slate-400 dark:text-slate-500">
                  {moment(created_at.ms).format(TIME_FORMAT)}
                </div>
              ) :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
          </div>
          <div className="space-y-2">
            {Object.keys({ ...types }).length > 0 && Object.values(types).findIndex(v => v > 1) > -1 && (
              <div className="overflow-x-auto flex flex-wrap items-center">
                {Object.entries(types).map(([k, v]) => (
                  <div
                    key={k}
                    onClick={() => setTypesFiltered(_.uniq(toArray(typesFiltered).includes(k) ? typesFiltered.filter(t => !equalsIgnoreCase(t, k)) : _.concat(toArray(typesFiltered), k)))}
                    className={`min-w-max ${toArray(typesFiltered).includes(k) ? 'text-blue-400 dark:text-white font-semibold' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'} cursor-pointer whitespace-nowrap flex items-center text-xs sm:text-sm space-x-1 mr-3`}
                  >
                    <span>{k}</span>
                    <NumberDisplay
                      value={v}
                      format="0,0"
                      className="text-blue-400 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
            <Datatable
              columns={[
                {
                  Header: 'Command ID',
                  accessor: 'id',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { transactionHash } = { ...row.original }

                    const idComponent = value && (
                      <span className="font-semibold">
                        {ellipse(value, 8)}
                      </span>
                    )

                    return (
                      <div className="flex items-center space-x-1">
                        {transactionHash && url ?
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-blue-500"
                          >
                            {idComponent}
                          </a> :
                          <span className="text-slate-400 dark:text-slate-500">
                            {idComponent}
                          </span>
                        }
                        <Copy value={value} />
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
                    const { value, row } = { ...props }
                    const { transactionHash, executed } = { ...row.original }

                    const typeComponent = (
                      <Tooltip placement="top-start" content={executed ? 'Executed' : 'Unexecuted'}>
                        <Chip
                          color={executed ? 'green' : 'cyan'}
                          value={value}
                          className="chip normal-case text-xs font-medium mr-2 py-1 px-2.5"
                        />
                      </Tooltip>
                    )

                    return (
                      value ?
                        transactionHash && url ?
                          <a
                            href={`${url}${transaction_path?.replace('{tx}', transactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 dark:text-blue-500"
                          >
                            {typeComponent}
                          </a> :
                          typeComponent :
                        <span className="text-slate-400 dark:text-slate-500">
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
                    const { value, row } = { ...props }
                    const { id, type, params, deposit_address } = { ...row.original }
                    const {
                      name,
                      cap,
                      salt,
                      newOwners,
                      newOperators,
                      newWeights,
                      decimals,
                      sourceChain,
                      sourceTxHash,
                      contractAddress,
                    } = { ...params }
                    const transfer_id = parseInt(id, 16)
                    const source_chain_data = getChainData(sourceChain, chains_data)
                    return (
                      value ?
                        <div className="flex flex-wrap items-start">
                          {type === 'mintToken' && typeof transfer_id === 'number' && (
                            <div className="flex items-center space-x-1 mr-1">
                              <Link
                                href={`/transfer?transfer_id=${transfer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 dark:text-blue-500 font-medium"
                              >
                                Transfer
                              </Link>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <BsArrowRightShort size={18} />
                            <div className="flex items-center space-x-1">
                              <AccountProfile address={value} explorer={explorer} chain={chain} />
                              <ExplorerLink value={value} explorer={explorer} />
                            </div>
                          </div>
                        </div> :
                        source_chain_data ?
                          <div className="flex items-start space-x-1">
                            <Tooltip content={source_chain_data.name}>
                              <div className="w-fit">
                                <Image
                                  src={source_chain_data.image}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              </div>
                            </Tooltip>
                            {sourceTxHash && (
                              <div className="flex items-center space-x-1">
                                <Link
                                  href={`/gmp/${sourceTxHash}${source_chain_data.chain_type === 'cosmos' && id ? `?command_id=${id}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 dark:text-blue-500 font-medium"
                                >
                                  GMP
                                </Link>
                                {source_chain_data.chain_type !== 'cosmos' && <ExplorerLink value={sourceTxHash} explorer={source_chain_data.explorer} />}
                              </div>
                            )}
                            {contractAddress && (
                              <>
                                <BsArrowRightShort size={18} />
                                <div className="flex items-center space-x-1">
                                  <AccountProfile address={contractAddress} explorer={explorer} chain={chain} />
                                  <ExplorerLink value={contractAddress} explorer={explorer} />
                                </div>
                              </>
                            )}
                          </div> :
                          salt ?
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">{deposit_address ? 'Deposit address' : 'Salt'}:</span>
                              {deposit_address ?
                                <>
                                  <a
                                    href={`/account/${deposit_address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-400 dark:text-slate-500 text-sm font-medium"
                                  >
                                    {ellipse(deposit_address, 8)}
                                  </a>
                                  <Copy value={deposit_address} />
                                </> :
                                <Copy
                                  value={salt}
                                  title={
                                    <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                                      {ellipse(salt, 8)}
                                    </span>
                                  }
                                />
                              }
                            </div> :
                            newOwners || newOperators ?
                              <>
                                {newWeights && (
                                  <NumberDisplay
                                    value={_.sum(split(newWeights, 'normal', ';').map(w => Number(w)))}
                                    format="0,0"
                                    prefix=" Weight:"
                                    noTooltip={true}
                                    className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                  />
                                )}
                                <div className="max-w-xl flex flex-wrap">
                                  {split(newOwners || newOperators, 'normal', ';').map((a, i) => (
                                    <div key={i} className="flex items-center space-x-1 mb-1 mr-2">
                                      <AccountProfile address={a} explorer={explorer} chain={chain} />
                                      <ExplorerLink value={a} explorer={explorer} />
                                      {newWeights && (
                                        <NumberDisplay
                                          value={split(newWeights, 'normal', ';')[i]}
                                          format="0,0"
                                          noTooltip={true}
                                          className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </> :
                              name ?
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">
                                    {name}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {decimals && (
                                      <NumberDisplay
                                        value={decimals}
                                        format="0,0"
                                        prefix="Decimals: "
                                        className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                      />
                                    )}
                                    {cap && (
                                      <NumberDisplay
                                        value={cap}
                                        format="0,0"
                                        prefix="Cap: "
                                        className="text-slate-600 dark:text-slate-200 text-xs font-medium"
                                      />
                                    )}
                                  </div>
                                </div> :
                                <span className="text-slate-400 dark:text-slate-500">
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
                    const { type, params } = { ...props.row.original }
                    const { amount, newThreshold } = { ...params }
                    let { symbol, decimals } = { ...params }
                    const asset_data = getAssetData(symbol, assets_data)
                    const { addresses } = { ...asset_data }

                    const token_data = addresses?.[chain]
                    symbol = token_data?.symbol || asset_data?.symbol || symbol
                    decimals = token_data?.decimals || asset_data?.decimals || decimals || 18
                    const image = token_data?.image || asset_data?.image

                    return (
                      <div className="flex flex-wrap items-start">
                        {symbol && !['approveContractCall'].includes(type) && (
                          <div className="min-w-max max-w-min flex items-center justify-center space-x-1 mr-2">
                            {image && (
                              <Image
                                src={image}
                                width={20}
                                height={20}
                              />
                            )}
                            {!!(amount) && (
                              <NumberDisplay
                                value={formatUnits(amount, decimals)}
                                format="0,0.000000"
                              />
                            )}
                            <span className="text-sm font-semibold">
                              {symbol}
                            </span>
                          </div>
                        )}
                        {newThreshold && (
                          <NumberDisplay
                            value={newThreshold}
                            format="0,0"
                            prefix={'Threshold: '}
                            noTooltip={true}
                            className="text-xs font-medium mr-2"
                          />
                        )}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Max Gas Cost',
                  accessor: 'max_gas_cost',
                  disableSortBy: true,
                  Cell: props => (
                    <div className="justify-end text-right">
                      <NumberDisplay
                        value={props.value}
                        format="0,0"
                        className="font-medium"
                      />
                    </div>
                  ),
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
              ]}
              data={commandsFiltered}
              defaultPageSize={PAGE_SIZE}
              noPagination={commandsFiltered.length < PAGE_SIZE}
              className="no-border no-shadow"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-base font-semibold">
                {executed ? 'Signed Commands' : 'Execute Data'}
              </span>
              {executeButton}
            </div>
            {executeResponse && (
              <Alert
                show={!!executeResponse}
                color={_status === 'success' ? 'green' : _status === 'failed' ? 'red' : 'blue'}
                icon={_status === 'success' ? <IoCheckmarkCircleOutline size={26} /> : _status === 'failed' ? <IoCloseCircleOutline size={26} /> : <IoTimeOutline size={26} />}
                animate={{ mount: { y: 0 }, unmount: { y: 32 } }}
                onClose={() => setExecuteResponse(null)}
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
            {matched ?
              <div className="text-xs lg:text-base">
                {execute_data ?
                  <div className="flex items-start">
                    <div className="w-full bg-slate-50 dark:bg-slate-900 break-all rounded text-slate-400 dark:text-slate-500 mr-2 py-3 px-4">
                      {ellipse(execute_data, 256)}
                    </div>
                    <div className="mt-4">
                      <Copy size={20} value={execute_data} />
                    </div>
                  </div> :
                  '-'
                }
              </div> :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
          </div>
          <div className="space-y-2">
            <span className="text-base font-semibold">
              Data
            </span>
            {matched ?
              <div className="text-xs lg:text-base">
                {data?.data ?
                  <div className="flex items-start">
                    <div className="w-full bg-slate-50 dark:bg-slate-900 break-all rounded text-slate-400 dark:text-slate-500 mr-2 py-3 px-4">
                      {ellipse(data.data, 256)}
                    </div>
                    <div className="mt-4">
                      <Copy size={20} value={data.data} />
                    </div>
                  </div> :
                  '-'
                }
              </div> :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
          </div>
          <div className="space-y-2">
            <span className="text-base font-semibold">
              Signature
            </span>
            {matched ?
              <div className="flex flex-wrap text-xs lg:text-base">
                {signatures || signature ?
                  toArray(signatures || signature).map((s, i) => (
                    <div key={i} className="max-w-min bg-slate-50 dark:bg-slate-900 rounded mr-1 mb-1 py-1 pl-2 pr-1.5">
                      <Copy
                        size={16}
                        value={s}
                        title={
                          <Tooltip content={s}>
                            <span className="cursor-pointer text-slate-600 dark:text-slate-400 text-xs font-medium">
                              {ellipse(s, 12)}
                            </span>
                          </Tooltip>
                        }
                      />
                    </div>
                  )) :
                  '-'
                }
              </div> :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
          </div>
          {matched && prev_batched_commands_id && (
            <div>
              <Link
                href={`${pathname?.replace('[chain]', chain).replace('[id]', prev_batched_commands_id)}`}
                className="flex items-center text-blue-400 dark:text-blue-500 space-x-1"
              >
                <BsArrowLeftShort size={20} />
                <span className="font-semibold">
                  Previous Batch
                </span>
              </Link>
              <div className="ml-6">
                <Copy
                  value={prev_batched_commands_id}
                  title={
                    <span className="cursor-pointer text-slate-400 dark:text-slate-500">
                      {ellipse(prev_batched_commands_id, 8)}
                    </span>
                  }
                />
              </div>
            </div>
          )}
        </div> :
        <div className="loading">
          <Spinner name="Blocks" />
        </div>
      }
    </div>
  )
}